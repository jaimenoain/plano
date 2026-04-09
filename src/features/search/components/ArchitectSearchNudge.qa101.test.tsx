// @vitest-environment happy-dom
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { ArchitectSearchNudge } from "./ArchitectSearchNudge";
import type { PersonSummary } from "@/features/credits/types";

describe("ArchitectSearchNudge (QA 10.1)", () => {
  const person = (overrides: Partial<PersonSummary> & Pick<PersonSummary, "id" | "name" | "slug">): PersonSummary => ({
    id: overrides.id,
    name: overrides.name,
    slug: overrides.slug,
    claimStatus: overrides.claimStatus ?? "unclaimed",
    associatedCompanies: overrides.associatedCompanies ?? [],
    knownBuilding: overrides.knownBuilding ?? null,
    nationality: overrides.nationality,
    avatarUrl: overrides.avatarUrl,
    creditCount: overrides.creditCount,
  });

  it("renders single-match nudge with person name and does not reference legacy architect tables in source", () => {
    const path = join(process.cwd(), "src/features/search/components/ArchitectSearchNudge.tsx");
    const src = readFileSync(path, "utf8");
    const architectsTable = ["arch", "itects"].join("");
    expect(src).not.toMatch(
      new RegExp("from" + "\\(" + "['\"]" + architectsTable + "['\"]" + "\\)"),
    );
    const legacyJoinTable = ["building", ["arch", "itects"].join("")].join("_");
    expect(src).not.toMatch(new RegExp(legacyJoinTable));

    const onSingle = vi.fn();
    render(
      <ArchitectSearchNudge people={[person({ id: "p1", name: "Ada Design", slug: "ada-design" })]} onSingleMatch={onSingle} onMultipleMatch={vi.fn()} />,
    );
    expect(screen.getByText(/Ada Design/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /view profile/i }));
    expect(onSingle).toHaveBeenCalledWith("ada-design");
  });

  it("renders multi-match copy without crashing", () => {
    render(
      <ArchitectSearchNudge
        people={[
          person({ id: "p1", name: "A", slug: "a" }),
          person({ id: "p2", name: "B", slug: "b" }),
        ]}
        onSingleMatch={vi.fn()}
        onMultipleMatch={vi.fn()}
      />,
    );
    expect(screen.getByText(/2 people found matching your search/i)).toBeInTheDocument();
  });
});
