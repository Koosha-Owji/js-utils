import { storageSettings } from "../index.js";
import { SessionBase, StorageKeys } from "../types.js";
import { splitString } from "../../utils/splitString.js";

let expoSecureStore: typeof import("expo-secure-store") | undefined = undefined;

async function waitForExpoSecureStore() {
  let tries = 0;
  while (!expoSecureStore && tries < 20) {
    await new Promise((resolve) => setTimeout(resolve, 100));
    tries++;
  }
}

/**
 * Provides a expo local store based session manager implementation for the browser.
 * @class ExpoSecureStore
 */
export class ExpoSecureStore<
  V extends string = StorageKeys,
> extends SessionBase<V> {
  constructor() {
    super();
    this.loadExpoStore();
  }

  private async loadExpoStore() {
    try {
      expoSecureStore = await import("expo-secure-store");
    } catch (error) {
      console.error("Error loading dependency expo storage:", error);
    }
  }

  /**
   * Clears all items from session store.
   * @returns {void}
   */
  async destroySession(): Promise<void> {
    const keys = Object.values(StorageKeys);
    keys.forEach(async (key) => {
      await this.removeSessionItem(key);
    });
  }

  /**
   * Sets the provided key-value store to ExpoSecureStore.
   * @param {string} itemKey
   * @param {unknown} itemValue
   * @returns {void}
   */
  async setSessionItem(
    itemKey: V | StorageKeys,
    itemValue: unknown,
  ): Promise<void> {
    await waitForExpoSecureStore();
    // clear items first
    await this.removeSessionItem(itemKey);

    if (typeof itemValue === "string") {
      splitString(itemValue, Math.min(storageSettings.maxLength, 2048)).forEach(
        async (splitValue, index) => {
          await expoSecureStore!.setItemAsync(
            `${storageSettings.keyPrefix}${itemKey}${index}`,
            splitValue,
          );
        },
      );
      return;
    } else {
      throw new Error("Item value must be a string");
    }
  }

  /**
   * Gets the item for the provided key from the ExpoSecureStore.
   * @param {string} itemKey
   * @returns {unknown | null}
   */
  async getSessionItem(itemKey: V | StorageKeys): Promise<unknown | null> {
    await waitForExpoSecureStore();

    const chunks = [];
    let index = 0;

    let chunk = await expoSecureStore!.getItemAsync(
      `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
    );

    while (chunk) {
      chunks.push(chunk);
      index++;

      chunk = await expoSecureStore!.getItemAsync(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      );
    }

    return chunks.join("") || null;
  }

  /**
   * Removes the item for the provided key from the ExpoSecureStore.
   * @param {string} itemKey
   * @returns {void}
   */
  async removeSessionItem(itemKey: V | StorageKeys): Promise<void> {
    await waitForExpoSecureStore();

    let index = 0;

    let chunk = await expoSecureStore!.getItemAsync(
      `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
    );

    while (chunk) {
      await expoSecureStore!.deleteItemAsync(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      );
      index++;

      chunk = await expoSecureStore!.getItemAsync(
        `${storageSettings.keyPrefix}${String(itemKey)}${index}`,
      );
    }
  }
}
