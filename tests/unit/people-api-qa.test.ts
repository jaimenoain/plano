import { describe, expect, it, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  createPerson,
  getPersonPortfolio,
  getPersonWithClient,
  searchPeople,
  updatePerson,
} from "@/features/credits/api/people";

describe("QA 2.1 — people API (automated checks)", () => {
  describe("getPersonWithClient", () => {
    it("returns null for unknown slug without throwing", async () => {
      const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
      const client = {
        from: vi.fn(() => ({
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ maybeSingle })),
          })),
        })),
      } as unknown as SupabaseClient;

      await expect(getPersonWithClient(client, "unknown-slug")).resolves.toBeNull();
    });

    it("returns credits with building name, city, year, and hero image URL", async () => {
      const personRow = {
        id: "p1",
        name: "Test",
        slug: "test",
        bio: null,
        nationality: null,
        birth_year: null,
        death_year: null,
        avatar_url: null,
        website: null,
        location_note: null,
        claimed_by_user_id: null,
        claim_status: "unclaimed",
        created_at: "t0",
        updated_at: "t0",
      };

      const creditRow = {
        id: "c1",
        building_id: "b1",
        person_id: "p1",
        company_id: null,
        role: "design_architect",
        role_custom: null,
        credit_tier: "primary",
        is_lead: true,
        contribution_notes: null,
        year_from: 2020,
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
        company: null,
        building: {
          id: "b1",
          name: "Tower",
          slug: "tower",
          short_id: 1,
          city: "London",
          country: "GB",
          year_completed: 2021,
          hero_image_url: "path/hero.jpg",
          community_preview_url: null,
        },
      };

      const maybeSingle = vi.fn().mockResolvedValue({ data: personRow, error: null });

      const from = vi.fn((table: string) => {
        if (table === "people") {
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
      const result = await getPersonWithClient(client, "test");

      expect(result).not.toBeNull();
      expect(result!.credits).toHaveLength(1);
      const b = result!.credits[0]!.building;
      expect(b.name).toBe("Tower");
      expect(b.city).toBe("London");
      expect(b.yearCompleted).toBe(2021);
      expect(b.heroImageUrl).toBe("path/hero.jpg");
    });
  });

  describe("searchPeople", () => {
    it("returns empty array for empty or whitespace query without error", async () => {
      await expect(searchPeople("")).resolves.toEqual([]);
      await expect(searchPeople("   ")).resolves.toEqual([]);
    });
  });
});

const mockFrom = vi.fn();

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

describe("QA 2.1 — people API (mocked supabase client)", () => {
  beforeEach(() => {
    mockFrom.mockReset();
  });

  it("getPersonPortfolio returns empty tiers when person id is unknown", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
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
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        };
      }
      throw new Error(`unexpected ${table}`);
    });

    const out = await getPersonPortfolio("00000000-0000-4000-8000-000000000000");
    expect(out).toEqual({ primary: [], contributor: [], ancillary: [] });
  });

  it("getPersonPortfolio includes primary, contributor, and ancillary when credits span tiers", async () => {
    const personSummary = { id: "p1", name: "Multi", slug: "multi" };
    const personRow = { ...personSummary };

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

    const mkCredit = (id: string, tier: string) => ({
      id,
      building_id: building.id,
      person_id: personSummary.id,
      company_id: null,
      role: "design_architect",
      role_custom: null,
      credit_tier: tier,
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
      created_at: "t",
      updated_at: "t",
      company: null,
      building,
    });

    mockFrom.mockImplementation((table: string) => {
      if (table === "people") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              maybeSingle: vi.fn().mockResolvedValue({ data: personRow, error: null }),
            })),
          })),
        };
      }
      if (table === "building_credits") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                mkCredit("c1", "primary"),
                mkCredit("c2", "contributor"),
                mkCredit("c3", "ancillary"),
              ],
              error: null,
            }),
          })),
        };
      }
      throw new Error(`unexpected ${table}`);
    });

    const out = await getPersonPortfolio(personSummary.id);
    expect(out.primary).toHaveLength(1);
    expect(out.contributor).toHaveLength(1);
    expect(out.ancillary).toHaveLength(1);
  });

  it("createPerson uses slug test-person then test-person-2 on collision", async () => {
    let peopleSelectCalls = 0;
    mockFrom.mockImplementation((table: string) => {
      if (table !== "people") throw new Error(`unexpected ${table}`);
      return {
        select: vi.fn((cols: string) => {
          if (cols === "id") {
            return {
              eq: vi.fn(() => ({
                maybeSingle: vi.fn().mockImplementation(async () => {
                  peopleSelectCalls += 1;
                  if (peopleSelectCalls === 1) return { data: null, error: null };
                  if (peopleSelectCalls === 2) return { data: { id: "existing" }, error: null };
                  if (peopleSelectCalls === 3) return { data: null, error: null };
                  return { data: null, error: null };
                }),
              })),
            };
          }
          return {
            eq: vi.fn(() => ({
              single: vi.fn(),
              maybeSingle: vi.fn(),
            })),
          };
        }),
        insert: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn().mockImplementation(async () => {
              const slug =
                peopleSelectCalls === 1 ? "test-person" : peopleSelectCalls <= 3 ? "test-person-2" : "test-person";
              return {
                data: {
                  id: crypto.randomUUID(),
                  name: "Test Person",
                  slug,
                  bio: null,
                  nationality: null,
                  birth_year: null,
                  death_year: null,
                  avatar_url: null,
                  website: null,
                  location_note: null,
                  claimed_by_user_id: null,
                  claim_status: "unclaimed",
                  created_at: "t",
                  updated_at: "t",
                },
                error: null,
              };
            }),
          })),
        })),
      };
    });

    const first = await createPerson({ name: "Test Person" });
    expect(first.slug).toBe("test-person");

    const second = await createPerson({ name: "Test Person" });
    expect(second.slug).toBe("test-person-2");
  });

  it("updatePerson surfaces Supabase error when RLS denies update", async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== "people") throw new Error(`unexpected ${table}`);
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

    await expect(updatePerson("other-person-id", { bio: "updated" })).rejects.toMatchObject({
      code: "42501",
    });
  });
});
