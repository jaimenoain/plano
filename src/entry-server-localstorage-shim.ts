/**
 * Runs before `@vercel/react-router` renders. Some dependencies touch
 * `localStorage` at module scope; Node has none, so SSR would throw without this.
 */
interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

if (
  typeof globalThis !== "undefined" &&
  typeof (globalThis as { localStorage?: LocalStorageLike }).localStorage ===
    "undefined"
) {
  (globalThis as { localStorage?: LocalStorageLike }).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    key: () => null,
    get length() {
      return 0;
    },
  };
}
