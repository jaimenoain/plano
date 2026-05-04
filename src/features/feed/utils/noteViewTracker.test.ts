import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  __resetNoteViewTracker,
  __setNoteViewClient,
  flushNoteViews,
  queueNoteView,
} from "./noteViewTracker";

describe("noteViewTracker", () => {
  let rpc: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.useFakeTimers();
    rpc = vi.fn().mockResolvedValue({ error: null });
    __setNoteViewClient({ rpc });
  });

  afterEach(() => {
    __resetNoteViewTracker();
    __setNoteViewClient(null);
    vi.useRealTimers();
  });

  it("batches queued ids into a single RPC call after the flush delay", async () => {
    queueNoteView("note-1");
    queueNoteView("note-2");
    queueNoteView("note-3");

    expect(rpc).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1500);
    await flushNoteViews();

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("track_note_views", {
      p_note_ids: ["note-1", "note-2", "note-3"],
    });
  });

  it("dedupes ids that have already been reported in the same session", async () => {
    queueNoteView("note-1");
    await vi.advanceTimersByTimeAsync(1500);
    await flushNoteViews();

    queueNoteView("note-1");
    queueNoteView("note-2");
    await vi.advanceTimersByTimeAsync(1500);
    await flushNoteViews();

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[1][1]).toEqual({ p_note_ids: ["note-2"] });
  });

  it("re-queues ids when the RPC reports an error so a later flush retries", async () => {
    rpc.mockResolvedValueOnce({ error: { message: "network" } });

    queueNoteView("note-1");
    await vi.advanceTimersByTimeAsync(1500);

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc.mock.calls[0][1]).toEqual({ p_note_ids: ["note-1"] });

    await vi.advanceTimersByTimeAsync(1500);

    expect(rpc).toHaveBeenCalledTimes(2);
    expect(rpc.mock.calls[1][1]).toEqual({ p_note_ids: ["note-1"] });
  });

  it("ignores empty ids and no-ops when the queue is empty", async () => {
    queueNoteView("");
    await vi.advanceTimersByTimeAsync(1500);
    await flushNoteViews();
    expect(rpc).not.toHaveBeenCalled();
  });
});
