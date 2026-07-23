import { describe, it, expect } from "vitest";
import {
  collaborationCtaState,
  friendlyRequestError,
  friendlyReviewError,
} from "@/features/collections";

describe("collaborationCtaState", () => {
  it("shows a disabled pending state for a pending request", () => {
    expect(collaborationCtaState("pending")).toEqual({ kind: "pending" });
  });

  it("treats an accepted request as pending (in flight before editor access lands)", () => {
    expect(collaborationCtaState("accepted")).toEqual({ kind: "pending" });
  });

  it("lets a rejected requester ask again", () => {
    expect(collaborationCtaState("rejected")).toEqual({
      kind: "request",
      label: "Request again",
    });
  });

  it("offers the default invite when there is no prior request", () => {
    expect(collaborationCtaState(null)).toEqual({
      kind: "request",
      label: "Request to collaborate",
    });
    expect(collaborationCtaState(undefined)).toEqual({
      kind: "request",
      label: "Request to collaborate",
    });
  });
});

describe("friendlyRequestError", () => {
  it("maps known RPC errors to human copy", () => {
    expect(friendlyRequestError("already_owner")).toMatch(/already own/i);
    expect(friendlyRequestError("already_contributor")).toMatch(/already a collaborator/i);
    expect(friendlyRequestError("pending_exists")).toMatch(/pending request/i);
    expect(friendlyRequestError("not_authenticated")).toMatch(/sign in/i);
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(friendlyRequestError("some_unexpected_pg_error")).toMatch(/try again/i);
  });
});

describe("friendlyReviewError", () => {
  it("maps known review errors to human copy", () => {
    expect(friendlyReviewError("already_reviewed")).toMatch(/already been handled/i);
    expect(friendlyReviewError("not_authorized")).toMatch(/only the collection owner/i);
    expect(friendlyReviewError("request_not_found")).toMatch(/no longer exists/i);
  });

  it("falls back to a generic message for unknown errors", () => {
    expect(friendlyReviewError("boom")).toMatch(/try again/i);
  });
});
