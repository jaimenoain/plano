import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter, type EntryContext } from "react-router";

interface LocalStorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  clear(): void;
  key(index: number): string | null;
  readonly length: number;
}

// Temporary SSR guard: some client libraries still touch localStorage during
// module initialisation. Provide a no-op shim so the server renderer doesn't crash.
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

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  routerContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    const { pipe } = renderToPipeableStream(
      <ServerRouter context={routerContext} url={request.url} />,
      {
        onShellReady() {
          responseHeaders.set("Content-Type", "text/html");
          const stream = new PassThrough();
          resolve(
            new Response(stream as unknown as ReadableStream, {
              status: responseStatusCode,
              headers: responseHeaders,
            }),
          );
          pipe(stream);
        },
        onShellError: reject,
      },
    );
  });
}


