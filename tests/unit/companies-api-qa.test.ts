import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createCompany,
  getCompanyPortfolio,
  getCompanyStewards,
  getCompanyWithClient,
  searchCompanies,
  updateCompany,
} from "@/features/credits/api/companies";

describe("QA 2.2 — companies API (injected client + empty search)", () => {
  describe("getCompanyWithClient", () => {
    it("returns null for unknown slug without throwing", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const client = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle })),
          })),
        })),
      } as unknown as SupabaseClient;

      await expect(getCompanyWithClient(client, "unknown-slug")).resolves.toBeNull();
    });

    it("returns company with credits array joined to buildings", async () => {
      const companyRow = {
        id: "co1",
        name: "Arup",
        slug: "arup",
        bio: null,
        country: "GB",
        founded_year: null,
        dissolved_year: null,
        logo_url: null,
        website: null,
        verified_domain: null,
        claim_status: "claimed",
        created_at: "t0",
        updated_at: "t0",
      };

      const building = {
        id: "b1",
        name: "Bridge",
        slug: "bridge",
        short_id: 1,
        city: "London",
        country: "GB",
        year_completed: 2000,
        hero_image_url: "h.jpg",
        community_preview_url: null,
      };

      const creditRow = {
        id: "cr1",
        building_id: building.id,
        person_id: null,
        company_id: "co1",
        role: "structural_engineer",
        role_custom: null,
        credit_tier: "primary",
        is_lead: true,
        contribution_notes: null,
        year_from: null,
        year_to: null,
        project_url: null,
        status: "active",
        flag_reason: null,
        flag_notes: null,
        flagged_at: null,
        flagged_by_user_id: null,
        added_by_user_id: null,
        display_order: 0,
        created_at: "t0",
        updated_at: "t0",
        person: null,
        company: { id: "co1", name: "Arup", slug: "arup" },
        building,
      };

      const maybeSingle = vi.fn().mockResolvedValue({ data: companyRow, error: null });

      const from = vi.fn((table: string) => {
        if (table === "companies") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle })),
            })),
          };
        }
        if (table === "building_credits") {
          return {
            select: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [creditRow], error: null }),
            })),
          };
        }
        throw new Error(`unexpected table ${table}`);
      });

      const client = { from } as unknown as SupabaseClient;
      const result = await getCompanyWithClient(client, "arup");

      expect(result).not.toBeNull();
      expect(result!.company.slug).toBe("arup");
      expect(result!.credits).toHaveLength(1);
      expect(result!.credits[0]!.building.name).toBe("Bridge");
      expect(result!.credits[0]!.creditTier).toBe("primary");
    });
  });

  describe("searchCompanies", () => {
    it("returns empty array for empty or whitespace query without error", async () => {
      await expect(searchCompanies("")).resolves.toEqual([]);
      await expect(searchCompanies("   ")).resolves.toEqual([]);
    });
  });
});

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe("QA 2.2 — companies API (mocked supabase client)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("createCompany uses slug test-company then test-company-2 on collision", async () => {
    let selectCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table !== "companies") throw new Error(`unexpected ${table}`);
      return {
        select: vi.fn((cols: string) => {
          if (cols === "id") {
            return {
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  selectCalls += 1;
                  if (selectCalls === 1) return { data: null, error: null };
                  if (selectCalls === 2) return { data: { id: "existing" }, error: null };
                  if (selectCalls === 3) return { data: null, error: null };
                  return { data: null, error: null };
                }),
              })),
            };
          }
          return { eq: vi.fn(() => ({ maybeSingle: vi.fn(), single: vi.fn() })) };
        }),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: crypto.randomUUID(),
                name: "Test Company",
                slug: selectCalls <= 1 ? "test-company" : "test-company-2",
                bio: null,
                country: null,
                founded_year: null,
                dissolved_year: null,
                logo_url: null,
                website: null,
                verified_domain: null,
                claim_status: "unclaimed",
                created_at: "t",
                updated_at: "t",
              },
              error: null,
            }),
          })),
        })),
      };
    });

    const first = await createCompany({ name: "Test Company" });
    expect(first.slug).toBe("test-company");

    const second = await createCompany({ name: "Test Company" });
    expect(second.slug).toBe("test-company-2");
  });

  it("updateCompany surfaces Supabase error when RLS denies update", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== "companies") throw new Error(`unexpected ${table}`);
      return {
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({
                data: null,
                error: { message: "new row violates row-level security policy", code: "42501" },
              }),
            })),
          })),
        })),
      };
    });

    await expect(updateCompany("other-id", { bio: "x" })).rejects.toMatchObject({ code: "42501" });
  });

  it("getCompanyPortfolio returns empty tiers when company id is unknown", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "companies") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
            })),
          })),
        };
      }
      if (table === "building_credits") {
        return {
          select: vi.fn(() => {
            const builder = {
              eq() {
                return builder;
              },
              then(
                onFulfilled?: (value: { data: never[]; error: null }) => unknown,
                onRejected?: (reason: unknown) => unknown,
              ) {
                return Promise.resolve({ data: [], error: null }).then(onFulfilled, onRejected);
              },
            };
            return builder;
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    });

    const out = await getCompanyPortfolio("00000000-0000-4000-8000-000000000000");
    expect(out).toEqual({
      byTier: { primary: [], contributor: [], ancillary: [] },
      orderedFlat: [],
    });
  });

  it("getCompanyPortfolio with roleFilter returns only matching role credits", async () => {
    const companySummary = { id: "co1", name: "Co", slug: "co" };

    const building = {
      id: "b1",
      name: "B",
      slug: "b",
      short_id: 1,
      city: null,
      country: null,
      year_completed: null,
      hero_image_url: null,
      community_preview_url: null,
    };

    const mkCredit = (id: string, role: string) => ({
      id,
      building_id: building.id,
      person_id: null,
      company_id: companySummary.id,
      role,
      role_custom: null,
      credit_tier: "primary",
      is_lead: false,
      contribution_notes: null,
      year_from: null,
      year_to: null,
      project_url: null,
      status: "active",
      flag_reason: null,
      flag_notes: null,
      flagged_at: null,
      flagged_by_user_id: null,
      added_by_user_id: null,
      display_order: 0,
      company_portfolio_rank: null,
      created_at: "t",
      updated_at: "t",
      person: null,
      company: { id: companySummary.id, name: companySummary.name, slug: companySummary.slug },
      building,
    });

    const allCredits = [mkCredit("c1", "structural_engineer"), mkCredit("c2", "design_architect")];

    mockFrom.mockImplementation((table: string) => {
      if (table === "companies") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: companySummary, error: null }),
            })),
          })),
        };
      }
      if (table === "building_credits") {
        return {
          select: vi.fn(() => {
            const state = { roleFilter: null as string | null };
            const builder = {
              eq(col: string, val: unknown) {
                if (col === "role") state.roleFilter = val as string;
                return builder;
              },
              then(
                onFulfilled?: (value: { data: typeof allCredits; error: null }) => unknown,
                onRejected?: (reason: unknown) => unknown,
              ) {
                const data =
                  state.roleFilter === "structural_engineer"
                    ? allCredits.filter((c) => c.role === "structural_engineer")
                    : allCredits;
                return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected);
              },
            };
            return builder;
          }),
        };
      }
      throw new Error(`unexpected ${table}`);
    });

    const all = await getCompanyPortfolio(companySummary.id);
    expect(all.byTier.primary).toHaveLength(2);
    expect(all.orderedFlat).toHaveLength(2);

    const filtered = await getCompanyPortfolio(companySummary.id, "structural_engineer");
    expect(filtered.byTier.primary).toHaveLength(1);
    expect(filtered.byTier.primary[0]!.credit.role).toBe("structural_engineer");
  });

  it("getCompanyStewards returns empty array when RLS yields no rows", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== "company_stewards") throw new Error(`unexpected ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      };
    });

    await expect(getCompanyStewards("co1")).resolves.toEqual([]);
  });

  it("getCompanyStewards maps steward rows when RLS allows", async () => {
    const row = {
      id: "s1",
      company_id: "co1",
      user_id: "u1",
      role: "owner",
      invited_by: null,
      created_at: "2020-01-01",
    };

    mockFrom.mockImplementation((table: string) => {
      if (table !== "company_stewards") throw new Error(`unexpected ${table}`);
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({ data: [row], error: null }),
          })),
        })),
      };
    });

    const list = await getCompanyStewards("co1");
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      id: "s1",
      companyId: "co1",
      userId: "u1",
      role: "owner",
    });
  });
});
