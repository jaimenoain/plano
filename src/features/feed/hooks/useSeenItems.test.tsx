// @vitest-environment happy-dom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useSeenItems } from "./useSeenItems";
import {
  __resetNoteViewTracker,
  __setNoteViewClient,
} from "@/features/feed/utils/noteViewTracker";

describe("useSeenItems", () => {
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

  it("tracks ids in memory and reports hasSeen(true) after markSeen", () => {
    const { result } = renderHook(() => useSeenItems());

    expect(result.current.hasSeen("note-1")).toBe(false);

    act(() => {
      result.current.markSeen("note-1");
    });

    expect(result.current.hasSeen("note-1")).toBe(true);
    expect(result.current.hasSeen("note-2")).toBe(false);
  });

  it("queues a track_note_views RPC call when an id is first seen", async () => {
    const { result } = renderHook(() => useSeenItems());

    act(() => {
      result.current.markSeen("note-1");
      result.current.markSeen("note-2");
    });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(rpc).toHaveBeenCalledTimes(1);
    expect(rpc).toHaveBeenCalledWith("track_note_views", {
      p_note_ids: ["note-1", "note-2"],
    });
  });

  it("does not re-queue the same id within a session", async () => {
    const { result } = renderHook(() => useSeenItems());

    act(() => {
      result.current.markSeen("note-1");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    act(() => {
      result.current.markSeen("note-1");
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1500);
    });

    expect(rpc).toHaveBeenCalledTimes(1);
  });

  it("ignores empty ids", () => {
    const { result } = renderHook(() => useSeenItems());

    act(() => {
      result.current.markSeen("");
    });

    expect(result.current.hasSeen("")).toBe(false);
    expect(rpc).not.toHaveBeenCalled();
  });
});
