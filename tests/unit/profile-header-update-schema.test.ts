import { describe, it, expect } from "vitest";
import { profileHeaderUpdateSchema } from "@/lib/validations/profile";

describe("profileHeaderUpdateSchema", () => {
  it("trims and nulls empty strings", () => {
    const r = profileHeaderUpdateSchema.safeParse({
      bio: "  ",
      firm: "",
      website: "\t",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.bio).toBeNull();
      expect(r.data.firm).toBeNull();
      expect(r.data.website).toBeNull();
    }
  });

  it("accepts typical website input", () => {
    const r = profileHeaderUpdateSchema.safeParse({
      bio: "Hello",
      firm: "Studio",
      website: "example.com/path",
    });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.bio).toBe("Hello");
      expect(r.data.firm).toBe("Studio");
      expect(r.data.website).toBe("example.com/path");
    }
  });

  it("rejects bio over 500 chars", () => {
    const r = profileHeaderUpdateSchema.safeParse({
      bio: "x".repeat(501),
      firm: "",
      website: "",
    });
    expect(r.success).toBe(false);
  });
});
