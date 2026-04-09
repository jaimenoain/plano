// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import BuildingAudit from "./BuildingAudit";

const BUILDING_ID = "11111111-1111-4111-8111-111111111111";

const auditState = vi.hoisted(() => ({
  buildingLogs: [] as Record<string, unknown>[],
  adminLogs: [] as Record<string, unknown>[],
  buildingName: { name: "QA Building" },
  profiles: [] as { id: string; username: string | null }[],
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: vi.fn((table: string) => {
      if (table === "building_audit_logs") {
        return {
          select: () => ({
            eq: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: auditState.buildingLogs, error: null }),
              }),
            }),
            order: () => ({
              limit: () => Promise.resolve({ data: auditState.buildingLogs, error: null }),
            }),
          }),
        };
      }
      if (table === "admin_audit_logs") {
        return {
          select: () => ({
            in: () => ({
              order: () => ({
                limit: () => Promise.resolve({ data: auditState.adminLogs, error: null }),
              }),
            }),
          }),
        };
      }
      if (table === "buildings") {
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: () => Promise.resolve({ data: auditState.buildingName, error: null }),
            }),
          }),
        };
      }
      if (table === "profiles") {
        return {
          select: () => ({
            in: () => Promise.resolve({ data: auditState.profiles, error: null }),
          }),
        };
      }
      return {};
    }),
    rpc: vi.fn(() => Promise.resolve({ error: null })),
  },
}));

function renderWithBuildingFilter() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[`/admin/audit?building=${BUILDING_ID}`]}>
        <Routes>
          <Route path="/admin/audit" element={<BuildingAudit />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BuildingAudit (QA 8.3 credit audit merge)", () => {
  beforeEach(() => {
    auditState.buildingLogs = [
      {
        id: "bal-1",
        created_at: "2026-01-10T15:00:00.000Z",
        table_name: "buildings",
        operation: "UPDATE",
        old_data: { name: "Old Name" },
        new_data: { name: "New Name" },
        buildings: { name: "QA Building" },
        profiles: { username: "editor_one" },
      },
    ];
    auditState.adminLogs = [
      {
        id: "aal-1",
        created_at: "2026-01-10T14:00:00.000Z",
        admin_id: "actor-1",
        action_type: "credit_added",
        target_type: "credit",
        target_id: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
        details: { building_id: BUILDING_ID, role: "design_architect" },
      },
      {
        id: "aal-other",
        created_at: "2026-01-09T12:00:00.000Z",
        admin_id: "actor-2",
        action_type: "credit_added",
        target_type: "credit",
        target_id: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
        details: { building_id: "99999999-9999-4999-8999-999999999999", role: "other" },
      },
      {
        id: "aal-2",
        created_at: "2026-01-10T13:00:00.000Z",
        admin_id: "actor-1",
        action_type: "credit_status_changed",
        target_type: "credit",
        target_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        details: {
          building_id: BUILDING_ID,
          old_value: "active",
          new_value: "flagged",
        },
      },
    ];
    auditState.buildingName = { name: "QA Building" };
    auditState.profiles = [{ id: "actor-1", username: "credit_actor" }];
  });

  afterEach(() => {
    cleanup();
  });

  it("merges building_audit_logs with credit_added and credit_status_changed rows for the filtered building", async () => {
    renderWithBuildingFilter();

    const table = await screen.findByRole("table");
    expect(within(table).getByText("Credit added")).toBeInTheDocument();
    expect(within(table).getByText(/design_architect/)).toBeInTheDocument();
    expect(within(table).getByText("Credit status")).toBeInTheDocument();
    expect(within(table).getByText("active")).toBeInTheDocument();
    expect(within(table).getByText("flagged")).toBeInTheDocument();
    expect(within(table).getByText("editor_one")).toBeInTheDocument();
    expect(within(table).getAllByText("credit_actor")).toHaveLength(2);
    expect(within(table).queryByText("Role: other")).toBeNull();
  });
});
