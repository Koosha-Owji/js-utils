import { describe, expect, it, beforeEach } from "vitest";
import { getRawToken } from "./getRawToken";
import { MemoryStorage, StorageKeys } from "../../sessionManager";
import { setActiveStorage } from ".";
import { createMockAccessToken } from "./testUtils";

describe("getRawToken", () => {
  it("return null when no active storage is defined", async () => {
    expect(await getRawToken("idToken")).toBe(null);
  });
});

describe("getRawToken", () => {
  beforeEach(() => {
    setActiveStorage(new MemoryStorage());
  });
  it("returns null when no idToken is set", async () => {
    const idToken = await getRawToken("idToken");
    expect(idToken).toBe(null);
  });
});

describe("getRawToken idToken", () => {
  let mockedToken = createMockAccessToken();
  beforeEach(() => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    mockedToken = createMockAccessToken({ unique: "test" });
    storage.setSessionItem(StorageKeys.idToken, mockedToken);
  });
  it("returns the decoded idToken with the correct org_code", async () => {
    const idToken = await getRawToken("idToken");
    if (idToken === null) {
      throw new Error("idToken is null");
    }
    console.log(mockedToken);
    expect(idToken).toBe(mockedToken);
  });
});

describe("getRawToken accessToken", () => {
  let mockedToken = createMockAccessToken();

  beforeEach(() => {
    const storage = new MemoryStorage();
    setActiveStorage(storage);
    mockedToken = createMockAccessToken({ unique: "test" });

    storage.setSessionItem(StorageKeys.accessToken, mockedToken);
  });
  it("returns the decoded accessToken with the correct org_code", async () => {
    const accessToken = await getRawToken("accessToken");
    if (accessToken === null) {
      throw new Error("accessToken is null");
    }
    expect(accessToken).toBe(mockedToken);
  });
});
