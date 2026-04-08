import { describe, it, expect } from "vitest";
import {
  CREDIT_NOTIFY_MAX_RECIPIENTS,
  parseCreditNotifyEmails,
} from "@/lib/parse-credit-notify-emails";

describe("parseCreditNotifyEmails", () => {
  it("splits on commas, newlines, semicolons, and whitespace", () => {
    const r = parseCreditNotifyEmails("A@B.COM, c@d.org\nE@F.IO ;g@h.jk");
    expect(r.accepted).toEqual(["a@b.com", "c@d.org", "e@f.io", "g@h.jk"]);
    expect(r.invalid).toEqual([]);
    expect(r.truncated).toBe(0);
  });

  it("dedupes case-insensitively and preserves first-seen order", () => {
    const r = parseCreditNotifyEmails("x@y.com, X@Y.COM\nx@y.com");
    expect(r.accepted).toEqual(["x@y.com"]);
  });

  it("caps at CREDIT_NOTIFY_MAX_RECIPIENTS and reports truncated", () => {
    const many = Array.from({ length: 20 }, (_, i) => `u${i}@t.com`).join(", ");
    const r = parseCreditNotifyEmails(many);
    expect(r.accepted.length).toBe(CREDIT_NOTIFY_MAX_RECIPIENTS);
    expect(r.truncated).toBe(5);
  });

  it("collects invalid tokens separately", () => {
    const r = parseCreditNotifyEmails("good@ok.com not-an-email another@fine.org");
    expect(r.accepted).toEqual(["good@ok.com", "another@fine.org"]);
    expect(r.invalid).toContain("not-an-email");
  });
});
