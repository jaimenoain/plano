// @vitest-environment happy-dom
import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ReactNode } from "react";
import {
  useRequestCollaboration,
  useWithdrawCollaboration,
} from "./useCollectionCollaboration";

const { requestMock, withdrawMock, toastSuccessMock, toastErrorMock } = vi.hoisted(() => ({
  requestMock: vi.fn(),
  withdrawMock: vi.fn(),
  toastSuccessMock: vi.fn(),
  toastErrorMock: vi.fn(),
}));

vi.mock("../api/collaboration", () => ({
  requestCollectionCollaboration: requestMock,
  withdrawCollectionCollaboration: withdrawMock,
}));

vi.mock("sonner", () => ({
  toast: { success: toastSuccessMock, error: toastErrorMock },
}));

let queryClient: QueryClient;

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

beforeEach(() => {
  queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  requestMock.mockReset();
  withdrawMock.mockReset();
  toastSuccessMock.mockReset();
  toastErrorMock.mockReset();
});

describe("useRequestCollaboration", () => {
  it("shows a success toast with an Undo action wired to the new request id", async () => {
    requestMock.mockResolvedValue("req-1");

    const { result } = renderHook(() => useRequestCollaboration("collection-1"), { wrapper });

    result.current.mutate(undefined);

    await waitFor(() => expect(requestMock).toHaveBeenCalledWith("collection-1", undefined));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalled());

    const [, options] = toastSuccessMock.mock.calls[0];
    expect(options.action.label).toBe("Undo");

    // Clicking Undo withdraws the exact request id the RPC returned.
    withdrawMock.mockResolvedValue(undefined);
    options.action.onClick();

    await waitFor(() => expect(withdrawMock).toHaveBeenCalledWith("req-1"));
  });
});

describe("useWithdrawCollaboration", () => {
  it("shows a success toast and refreshes both the requester's and owner's status on success", async () => {
    withdrawMock.mockResolvedValue(undefined);
    const invalidate = vi.spyOn(queryClient, "invalidateQueries");

    const { result } = renderHook(() => useWithdrawCollaboration("collection-1"), { wrapper });

    result.current.mutate("req-1");

    await waitFor(() => expect(withdrawMock).toHaveBeenCalledWith("req-1"));
    await waitFor(() => expect(toastSuccessMock).toHaveBeenCalledWith("Request withdrawn."));
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["collection_collab_request", "mine", "collection-1"],
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: ["collection_collab_request", "pending", "collection-1"],
    });
  });

  it("shows a friendly error toast when the withdraw is rejected", async () => {
    withdrawMock.mockRejectedValue(new Error("already_reviewed"));

    const { result } = renderHook(() => useWithdrawCollaboration("collection-1"), { wrapper });

    result.current.mutate("req-1");

    await waitFor(() =>
      expect(toastErrorMock).toHaveBeenCalledWith(
        "The owner already responded — your request can't be undone.",
      ),
    );
  });
});
