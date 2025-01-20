import { JWTDecoded } from "@kinde/jwt-decoder";
import { getDecodedToken, refreshToken } from ".";

export interface IsAuthenticatedPropsWithRefreshToken {
  useRefreshToken?: true;
  domain: string;
  clientId: string;
}

export interface IsAuthenticatedPropsWithoutRefreshToken {
  useRefreshToken?: false;
  domain?: never;
  clientId?: never;
}

type IsAuthenticatedProps =
  | IsAuthenticatedPropsWithRefreshToken
  | IsAuthenticatedPropsWithoutRefreshToken;

/**
 * check if the user is authenticated with option to refresh the token
 * @returns { Promise<boolean> }
 */
export const isAuthenticated = async (
  props?: IsAuthenticatedProps,
): Promise<boolean> => {
  try {
    const token = await getDecodedToken<JWTDecoded>("accessToken");
    if (!token) return false;

    if (!token.exp) {
      console.error("Token does not have an expiry");
      return false;
    }

    const isExpired = token.exp < Math.floor(Date.now() / 1000);

    if (isExpired && props?.useRefreshToken) {
      const refreshResult = await refreshToken({
        domain: props.domain,
        clientId: props.clientId,
      });
      return refreshResult.success;
    }
    return !isExpired;
  } catch (error) {
    console.error("Error checking authentication:", error);
    return false;
  }
};
