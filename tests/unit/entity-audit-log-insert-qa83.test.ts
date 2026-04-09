import { describe, it, expect, vi, beforeEach } from "vitest";
import { insertEntityAuditLog, ENTITY_AUDIT_ACTION_TYPES } from "@/features/credits/api/entity-audit-log";

const insertMock = vi.fn(() => Promise.resolve({ error: null }));
const getUserMock = vi.fn();

vi.mock("@/integrations/supabase/client", async () => {
  const actual = await vi.importActual<typeof import("@/integrations/supabase/client")>(
    "@/integrations/supabase/client",
  );
  return {
    ...actual,
    supabase: {
      ...actual.supabase,
      auth: {
        ...actual.supabase.auth,
        getUser: () => getUserMock(),
      },
      from: vi.fn(() => ({
        insert: insertMock,
      })),
    },
  };
});

describe("insertEntityAuditLog (QA 8.3)", () => {
  beforeEach(() => {
    insertMock.mockClear();
    getUserMock.mockReset();
    getUserMock.mockResolvedValue({ data: { user: { id: "admin-actor" } }, error: null });
  });

  it("writes credit_added with target credit and JSON details only", async () => {
    await insertEntityAuditLog({
      actionType: "credit_added",
      targetType: "credit",
      targetId: "credit-uuid-1",
      details: {
        building_id: "building-uuid-1",
        role: "design_architect",
        credit_tier: "primary",
        person_id: "person-1",
        company_id: null,
      },
    });

    expect(insertMock).toHaveBeenCalledWith({
      admin_id: "admin-actor",
      action_type: "credit_added",
      target_type: "credit",
      target_id: "credit-uuid-1",
      details: {
        building_id: "building-uuid-1",
        role: "design_architect",
        credit_tier: "primary",
        person_id: "person-1",
        company_id: null,
      },
    });
  });

  it("writes credit_status_changed with old_value and new_value in details", async () => {
    await insertEntityAuditLog({
      actionType: "credit_status_changed",
      targetType: "credit",
      targetId: "credit-uuid-2",
      details: {
        building_id: "building-uuid-2",
        old_value: "active",
        new_value: "flagged",
      },
    });

    expect(insertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action_type: "credit_status_changed",
        target_type: "credit",
        target_id: "credit-uuid-2",
        details: {
          building_id: "building-uuid-2",
          old_value: "active",
          new_value: "flagged",
        },
      }),
    );
  });

  it("rejects person_claimed at validation (RPC-only audit type)", async () => {
    await expect(
      insertEntityAuditLog({
        actionType: "person_claimed" as never,
        targetType: "person",
        targetId: "p1",
        details: {},
      }),
    ).rejects.toThrow();
    expect(insertMock).not.toHaveBeenCalled();
  });

  it("documents person_claimed in full audit enum for spec alignment", () => {
    expect(ENTITY_AUDIT_ACTION_TYPES).toContain("person_claimed");
  });
});
