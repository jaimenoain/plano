import { PassThrough } from "node:stream";
import { renderToPipeableStream } from "react-dom/server";
import { ServerRouter } from "react-router";
import type { EntryContext } from "react-router";

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

