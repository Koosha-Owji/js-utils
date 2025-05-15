import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  MemoryStorage,
  StorageKeys,
  storageSettings,
} from "../../sessionManager";
import * as tokenUtils from ".";
import * as refreshTimer from "../refreshTimer";

describe("refreshToken", () => {
  const mockDomain = "https://example.com";
  const mockKindeDomain = "https://example.kinde.com";
  const mockClientId = "test-client-id";
  const mockRefreshTokenValue = "mock-refresh-token";
  const memoryStorage = new MemoryStorage();

  beforeEach(() => {
    vi.resetAllMocks();
    vi.spyOn(tokenUtils, "getDecodedToken").mockResolvedValue(null);
    vi.spyOn(memoryStorage, "setSessionItem");
    vi.spyOn(refreshTimer, "setRefreshTimer");
    vi.spyOn(tokenUtils, "refreshToken");
    tokenUtils.setActiveStorage(memoryStorage);
    global.fetch = vi.fn();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    memoryStorage.destroySession();
    vi.restoreAllMocks();
  });

  it("should return false if domain is not provided", async () => {
    const result = await tokenUtils.refreshToken({
      domain: "",
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "Domain is required for token refresh",
      success: false,
    });
  });

  it("should return false if clientId is not provided", async () => {
    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: "",
    });
    expect(result).toStrictEqual({
      error: "Client ID is required for token refresh",
      success: false,
    });
  });

  it("no active storage should error", async () => {
    tokenUtils.clearActiveStorage();
    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No active storage found",
      success: false,
    });
  });

  it("should return false if no refresh token is found", async () => {
    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No refresh token found",
      success: false,
    });
  });

  it("should return false if the fetch request fails", async () => {
    await memoryStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.mocked(global.fetch).mockRejectedValue(new Error("Network error"));

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No access token received: Error: Network error",
      success: false,
    });
  });

  it("should return false if the response is not ok", async () => {
    await memoryStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.mocked(global.fetch).mockResolvedValue({ ok: false } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "Failed to refresh token",
      success: false,
    });
  });

  it("should return false if the response does not contain an access token", async () => {
    await memoryStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({}),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      error: "No access token received",
      success: false,
    });
  });

  it("should return true and update tokens if the refresh is successful", async () => {
    const callback = vi.fn();

    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    };
    memoryStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockKindeDomain,
      clientId: mockClientId,
      onRefresh: callback,
    });

    expect(result).toStrictEqual({
      success: true,
      accessToken: "new-access-token",
      idToken: "new-id-token",
      refreshToken: "new-refresh-token",
    });
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.accessToken,
      "new-access-token",
    );
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.idToken,
      "new-id-token",
    );
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "new-refresh-token",
    );

    // callback was called
    expect(callback).toHaveBeenCalled();
  });

  it("should use sanitizeUrl for the domain", async () => {
    memoryStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ access_token: "new-token" }),
    } as Response);

    await tokenUtils.refreshToken({
      domain: "https://example.com/",
      clientId: mockClientId,
    });

    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining(`https://example.com/oauth2/token`),
      expect.any(Object),
    );
  });

  it("should use insecure storage for refresh token if useInsecureForRefreshToken is true", async () => {
    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    };
    storageSettings.useInsecureForRefreshToken = true;

    const insecureStorage = new MemoryStorage();

    tokenUtils.setInsecureStorage(insecureStorage);
    await insecureStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );
    vi.spyOn(insecureStorage, "setSessionItem");
    memoryStorage.getSessionItem = vi
      .fn()
      .mockResolvedValue(mockRefreshTokenValue);
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });

    expect(result).toStrictEqual({
      success: true,
      accessToken: "new-access-token",
      idToken: "new-id-token",
      refreshToken: "new-refresh-token",
    });
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.accessToken,
      "new-access-token",
    );
    expect(memoryStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.idToken,
      "new-id-token",
    );
    expect(insecureStorage.setSessionItem).toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "new-refresh-token",
    );
    expect(memoryStorage.setSessionItem).not.toHaveBeenCalledWith(
      StorageKeys.refreshToken,
      "new-refresh-token",
    );

    // reset storageSettings to default
    storageSettings.useInsecureForRefreshToken = false;
  });

  it("raise error when no session storage is found when useInsecureForRefreshToken", async () => {
    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
    };
    storageSettings.useInsecureForRefreshToken = true;

    tokenUtils.clearActiveStorage();

    const insecureStorage = new MemoryStorage();
    tokenUtils.setInsecureStorage(insecureStorage);
    await insecureStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockDomain,
      clientId: mockClientId,
    });

    expect(result).toStrictEqual({
      error: "No active storage found",
      success: false,
    });

    storageSettings.useInsecureForRefreshToken = false;
  });

  it("triggers new timer when expires_in supplied and calls refreshToken", async () => {
    vi.useFakeTimers();
    const mockResponse = {
      access_token: "new-access-token",
      id_token: "new-id-token",
      refresh_token: "new-refresh-token",
      expires_in: 1000,
    };

    const insecureStorage = new MemoryStorage();
    tokenUtils.setInsecureStorage(insecureStorage);
    await insecureStorage.setSessionItem(
      StorageKeys.refreshToken,
      mockRefreshTokenValue,
    );

    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve(mockResponse),
    } as Response);

    const result = await tokenUtils.refreshToken({
      domain: mockKindeDomain,
      clientId: mockClientId,
    });

    expect(refreshTimer.setRefreshTimer).toHaveBeenCalledWith(
      1000,
      expect.any(Function),
    );
    vi.runAllTimers();
    expect(tokenUtils.refreshToken).toHaveBeenCalledWith({
      domain: mockKindeDomain,
      clientId: mockClientId,
    });
    expect(result).toStrictEqual({
      accessToken: "new-access-token",
      idToken: "new-id-token",
      refreshToken: "new-refresh-token",
      success: true,
    });
  });
});
