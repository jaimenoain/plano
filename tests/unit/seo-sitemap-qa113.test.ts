import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  personPageStructuredData,
  companyPageStructuredData,
  SITE_URL,
} from "@/features/buildings/utils/structuredData";
import { meta as personPageMeta } from "@/features/credits/pages/PersonDetails";
import { meta as companyPageMeta } from "@/features/credits/pages/CompanyDetails";
import type { PersonDetailsLoaderData } from "@/features/credits/pages/PersonDetails.loader";
import type { CompanyDetailsLoaderData } from "@/features/credits/pages/CompanyDetails.loader";

/**
 * QA 11.3 — automated slice: sitemap source, robots.txt, hosting doc, sitemap proxy,
 * Schema.org builders, and SSR `meta()` tags for person/company public pages.
 * Manual: live GET /sitemap.xml, Rich Results Test on deployed URLs, production `<head>` spot-check.
 */

describe("QA 11.3 — SEO / sitemap / meta (automated)", () => {
  const root = process.cwd();

  it("sitemap Edge Function emits /person/ and /company/ locs and never /architect/", () => {
    const path = join(root, "supabase/functions/sitemap/index.ts");
    const src = readFileSync(path, "utf8");
    expect(src).toContain("${SITE_URL}/person/");
    expect(src).toContain("${SITE_URL}/company/");
    expect(src).not.toContain("/architect/");
  });

  it("public/robots.txt does not broadly block /person/ or /company/ (edit paths only)", () => {
    const robots = readFileSync(join(root, "public/robots.txt"), "utf8");
    const lines = robots.split("\n").map((l) => l.trim());

    // Only the general `User-agent: *` group governs indexing of real content by
    // search engines. Scoped scraper groups (e.g. FacebookBot) may block content
    // paths wholesale without deindexing from Google — so restrict the check to
    // the `*` group's Disallow rules.
    let inWildcardGroup = false;
    for (const line of lines) {
      const uaMatch = /^user-agent:\s*(.+)$/i.exec(line);
      if (uaMatch) {
        inWildcardGroup = uaMatch[1]!.trim() === "*";
        continue;
      }
      if (!inWildcardGroup) continue;
      if (!/^disallow:/i.test(line)) continue;
      const path = line.replace(/^disallow:\s*/i, "").trim();
      if (path.startsWith("/person")) {
        expect(path).toBe("/person/*/edit");
      }
      if (path.startsWith("/company")) {
        expect(path).toBe("/company/*/edit");
      }
    }
    expect(robots).toContain("User-agent: facebookexternalhit");
    expect(robots).toContain("Allow: /");
  });

  it("docs/LAUNCH_HOSTING documents legacy architect URLs and 301 behaviour", () => {
    const md = readFileSync(join(root, "docs/LAUNCH_HOSTING.md"), "utf8");
    expect(md).toMatch(/legacy.*architect/i);
    expect(md).toContain("301");
  });

  it("vercel.json rewrites /sitemap.xml to the sitemap proxy route", () => {
    const v = readFileSync(join(root, "vercel.json"), "utf8");
    expect(v).toContain("/sitemap.xml");
    expect(v).toContain("/api/sitemap-proxy");
  });

  it("personPageStructuredData and companyPageStructuredData emit Person / Organization with canonical URLs", () => {
    const person = personPageStructuredData({
      name: "Ada",
      slug: "ada",
      nationality: null,
      imageAbsoluteUrl: null,
    });
    expect(person["@type"]).toBe("Person");
    expect(person.url).toBe(`${SITE_URL}/person/ada`);

    const org = companyPageStructuredData({
      name: "Studio",
      slug: "studio",
      country: null,
      logoAbsoluteUrl: null,
      website: null,
    });
    expect(org["@type"]).toBe("Organization");
    expect(org.url).toBe(`${SITE_URL}/company/studio`);
  });

  it("PersonDetails and CompanyDetails meta() include description, canonical, and JSON-LD", () => {
    const personLd = personPageStructuredData({
      name: "Ada",
      slug: "ada",
      nationality: "British",
      imageAbsoluteUrl: null,
    });
    const personData = {
      canonical: `${SITE_URL}/person/ada`,
      metaTitle: "Ada — buildings, projects and credits on Plano",
      description: "Ada on Plano.",
      ogImage: `${SITE_URL}/cover.jpg`,
      structuredData: personLd,
    } as unknown as PersonDetailsLoaderData;

    const pTags = personPageMeta({ data: personData } as Parameters<
      typeof personPageMeta
    >[0]);
    expect(
      pTags.some(
        (t) =>
          typeof t === "object" &&
          t !== null &&
          "name" in t &&
          (t as { name: string }).name === "description" &&
          "content" in t &&
          String((t as { content: string }).content).length > 0,
      ),
    ).toBe(true);
    expect(
      pTags.some(
        (t) =>
          typeof t === "object" &&
          t !== null &&
          "tagName" in t &&
          (t as { tagName: string }).tagName === "link" &&
          "rel" in t &&
          (t as { rel: string }).rel === "canonical" &&
          "href" in t &&
          (t as { href: string }).href === `${SITE_URL}/person/ada`,
      ),
    ).toBe(true);
    const pLd = pTags.find(
      (t): t is { "script:ld+json": Record<string, unknown> } =>
        typeof t === "object" &&
        t !== null &&
        "script:ld+json" in t,
    );
    expect(pLd?.["script:ld+json"]["@type"]).toBe("Person");

    const companyLd = companyPageStructuredData({
      name: "Studio Co",
      slug: "studio-co",
      country: "United Kingdom",
      logoAbsoluteUrl: null,
      website: "https://studio.example",
    });
    const companyData = {
      canonical: `${SITE_URL}/company/studio-co`,
      metaTitle: "Studio Co — architecture and engineering projects on Plano",
      description: "Studio Co on Plano.",
      ogImage: `${SITE_URL}/cover.jpg`,
      structuredData: companyLd,
    } as unknown as CompanyDetailsLoaderData;

    const cTags = companyPageMeta({ data: companyData } as Parameters<
      typeof companyPageMeta
    >[0]);
    expect(
      cTags.some(
        (t) =>
          typeof t === "object" &&
          t !== null &&
          "name" in t &&
          (t as { name: string }).name === "description",
      ),
    ).toBe(true);
    expect(
      cTags.some(
        (t) =>
          typeof t === "object" &&
          t !== null &&
          "tagName" in t &&
          (t as { tagName: string }).tagName === "link" &&
          "rel" in t &&
          (t as { rel: string }).rel === "canonical" &&
          "href" in t &&
          (t as { href: string }).href === `${SITE_URL}/company/studio-co`,
      ),
    ).toBe(true);
    const cLd = cTags.find(
      (t): t is { "script:ld+json": Record<string, unknown> } =>
        typeof t === "object" &&
        t !== null &&
        "script:ld+json" in t,
    );
    expect(cLd?.["script:ld+json"]["@type"]).toBe("Organization");
  });
});
