import { expect } from "vitest";
import * as matchers from "@testing-library/jest-dom/matchers";

expect.extend(matchers);

class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverStub;

// Vite 7 changed module-resolution conditions so @supabase/realtime-js now loads a
// build that throws "Node.js detected but native WebSocket not found" at import time
// when no global WebSocket exists (jsdom/node test envs don't provide one). These are
// mocked unit tests that never open a socket, so a no-op stub satisfies the check.
class WebSocketStub {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSING = 2;
  static readonly CLOSED = 3;
  close() {}
  send() {}
  addEventListener() {}
  removeEventListener() {}
}

if (typeof globalThis.WebSocket === "undefined") {
  globalThis.WebSocket = WebSocketStub as unknown as typeof WebSocket;
}
