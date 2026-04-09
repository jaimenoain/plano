import { describe, it, expect, vi, beforeEach } from "vitest";
import type { LoaderFunctionArgs } from "react-router";
import { approveStewardRequestLoader } from "./ApproveStewardRequest.loader";

const createSupabaseServerClient = vi.fn();
const approveCompanyStewardRequestWithClient = vi.fn();
const notifyStewardRequestApprovedWithClient = vi.fn();

vi.mock("~/lib/supabase.server", () => ({
  createSupabaseServerClient: (...args: unknown[]) => createSupabaseServerClient(...args),
}));

vi.mock("@/features/credits/api/companies", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/features/credits/api/companies")>();
  return {
    ...actual,
    approveCompanyStewardRequestWithClient: (...args: unknown[]) =>
      approveCompanyStewardRequestWithClient(...args) as ReturnType<
        typeof actual.approveCompanyStewardRequestWithClient
      >,
    notifyStewardRequestApprovedWithClient: (...args: unknown[]) =>
      notifyStewardRequestApprovedWithClient(...args) as ReturnType<
        typeof actual.notifyStewardRequestApprovedWithClient
      >,
  };
});

const HEX_64 = `${"c".repeat(64)}`;

function args(token: string): LoaderFunctionArgs {
  return {
    request: new Request(`https://plano.app/approve-steward-request/${token}`),
    params: { token },
    context: undefined,
  } as LoaderFunctionArgs;
}

describe("approveStewardRequestLoader (QA 7.3)", () => {
  beforeEach(() => {
    createSupabaseServerClient.mockReset();
    approveCompanyStewardRequestWithClient.mockReset();
    notifyStewardRequestApprovedWithClient.mockReset();
    createSupabaseServerClient.mockReturnValue({
      auth: {
        getUser: vi.fn(),
      },
    });
  });

  it("returns invalid_format for malformed token without touching Supabase", async () => {
    const out = await approveStewardRequestLoader(args("short"));
    expect(out).toMatchObject({ type: "DataWithResponseInit" });
    expect((out as { data: unknown }).data).toEqual({ outcome: "invalid_format" });
    expect(createSupabaseServerClient).not.toHaveBeenCalled();
    expect(approveCompanyStewardRequestWithClient).not.toHaveBeenCalled();
  });

  it("returns needs_auth when there is no session", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
      },
    };
    createSupabaseServerClient.mockReturnValue(client);

    const out = await approveStewardRequestLoader(args(HEX_64));
    expect((out as { data: unknown }).data).toEqual({
      outcome: "needs_auth",
      returnPath: `/approve-steward-request/${HEX_64}`,
    });
    expect(approveCompanyStewardRequestWithClient).not.toHaveBeenCalled();
  });

  it("throws redirect with stewardApproved=1, notifies requester, and passes supabase to approve", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    };
    createSupabaseServerClient.mockReturnValue(client);
    approveCompanyStewardRequestWithClient.mockResolvedValue({
      ok: true,
      companySlug: "acme-co",
      requestId: "req-abc",
      alreadyProcessed: false,
    });

    try {
      await approveStewardRequestLoader(args(HEX_64));
      expect.fail("expected redirect Response to be thrown");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Response);
      const res = e as Response;
      expect(res.status).toBe(302);
      expect(res.headers.get("Location")).toBe("/company/acme-co?stewardApproved=1");
    }

    expect(approveCompanyStewardRequestWithClient).toHaveBeenCalledWith(client, HEX_64);
    expect(notifyStewardRequestApprovedWithClient).toHaveBeenCalledWith(client, "req-abc");
  });

  it("still redirects and notifies when RPC reports already_processed (idempotent approve)", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    };
    createSupabaseServerClient.mockReturnValue(client);
    approveCompanyStewardRequestWithClient.mockResolvedValue({
      ok: true,
      companySlug: "acme-co",
      requestId: "req-abc",
      alreadyProcessed: true,
    });

    try {
      await approveStewardRequestLoader(args(HEX_64));
      expect.fail("expected redirect Response to be thrown");
    } catch (e: unknown) {
      expect(e).toBeInstanceOf(Response);
      expect((e as Response).headers.get("Location")).toBe("/company/acme-co?stewardApproved=1");
    }

    expect(notifyStewardRequestApprovedWithClient).toHaveBeenCalledWith(client, "req-abc");
  });

  it("returns error outcome when approve RPC fails", async () => {
    const client = {
      auth: {
        getUser: vi.fn().mockResolvedValue({ data: { user: { id: "u1" } }, error: null }),
      },
    };
    createSupabaseServerClient.mockReturnValue(client);
    approveCompanyStewardRequestWithClient.mockResolvedValue({ ok: false, error: "expired" });

    const out = await approveStewardRequestLoader(args(HEX_64));
    expect((out as { data: unknown }).data).toEqual({ outcome: "error", error: "expired" });
    expect(notifyStewardRequestApprovedWithClient).not.toHaveBeenCalled();
  });
});
