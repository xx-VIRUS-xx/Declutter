/**
 * Minimal in-memory fake of the chrome.storage.local API surface used by
 * src/shared/storage.ts, so storage logic can be unit tested under plain
 * Node without a browser or jsdom.
 */
export function installFakeChrome(): void {
  const store: Record<string, unknown> = {};

  (globalThis as any).chrome = {
    storage: {
      local: {
        get(
          keys: string[],
          callback: (result: Record<string, unknown>) => void
        ) {
          const result: Record<string, unknown> = {};
          for (const key of keys) {
            if (key in store) result[key] = store[key];
          }
          callback(result);
        },
        set(items: Record<string, unknown>, callback: () => void) {
          Object.assign(store, items);
          callback();
        },
      },
    },
    runtime: {
      lastError: undefined as { message: string } | undefined,
    },
  };
}

export function resetFakeChromeStore(): void {
  installFakeChrome();
}
