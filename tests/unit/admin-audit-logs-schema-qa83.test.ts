import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");

describe("admin_audit_logs schema (QA 8.3)", () => {
  it("Insert shape uses only existing columns; credit context stays in details JSON", () => {
    const types = readFileSync(join(repoRoot, "src/integrations/supabase/types.ts"), "utf8");
    const blockStart = types.indexOf("admin_audit_logs:");
    const blockEnd = types.indexOf("allowed_emails:", blockStart);
    expect(blockStart).toBeGreaterThanOrEqual(0);
    expect(blockEnd).toBeGreaterThan(blockStart);
    const block = types.slice(blockStart, blockEnd);
    const insertBody = block.split("Insert:")[1]?.split("Update:")[0] ?? "";
    const keys = [...insertBody.matchAll(/\n\s+(\w+)(\?)?:/g)].map((m) => m[1]);
    expect(new Set(keys)).toEqual(
      new Set(["action_type", "admin_id", "created_at", "details", "id", "target_id", "target_type"]),
    );
  });
});
