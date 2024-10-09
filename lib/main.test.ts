import { describe, it, expect } from "vitest";
import * as index from "./main";
import * as types from "./types";
import * as utils from "./utils";
import * as sessionManager from "./sessionManager";

describe("index exports", () => {
  it("should export everything from types", () => {
    Object.keys(types).forEach((key) => {
      expect(index).toHaveProperty(key);
    });
  });

  it("should export everything from utils", () => {
    Object.keys(utils).forEach((key) => {
      expect(index).toHaveProperty(key);
    });
  });

  it("should export everything from sessionManager", () => {
    Object.keys(sessionManager).forEach((key) => {
      expect(index).toHaveProperty(key);
    });
  });

  it("should not export anything extra", () => {
    const actualExports = Object.keys(index);

    const expectedExports = [
      // types
      "IssuerRouteTypes",
      "Scopes",
      "StorageKeys",

      // utils
      "base64UrlEncode",
      "extractAuthResults",
      "generateAuthUrl",
      "generateRandomString",
      "mapLoginMethodParamsForUrl",
      "sanatizeURL",

      // session manager
      "MemoryStorage",
      "ChromeStore",
      "storageSettings",
      "ExpoSecureStore",

      // token utils
      "getActiveStorage",
      "getClaim",
      "getClaims",
      "getCurrentOrganization",
      "getDecodedToken",
      "getFlag",
      "getPermission",
      "getPermissions",
      "getRoles",
      "getUserOrganizations",
      "getUserProfile",
      "setActiveStorage",
    ];

    expect(actualExports.sort()).toEqual(expectedExports.sort());
  });
});
