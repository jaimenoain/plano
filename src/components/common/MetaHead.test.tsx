import { cleanup, render, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { MetaHead } from "./MetaHead";

function clearPlanoMetaHeadNodes(): void {
  document.head.querySelectorAll("[data-plano-metahead]").forEach((n) => n.remove());
}

beforeEach(() => {
  clearPlanoMetaHeadNodes();
  document.title = "";
});

afterEach(() => {
  cleanup();
  clearPlanoMetaHeadNodes();
});

describe("MetaHead", () => {
  it("writes canonical, description, and og:title", async () => {
    render(
      <MetaHead
        title="Home"
        description="Test description"
        canonicalUrl="https://plano.app/"
      />,
    );
    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://plano.app/",
      );
      expect(document.querySelector('meta[name="description"]')?.getAttribute("content")).toBe(
        "Test description",
      );
      expect(document.querySelector('meta[property="og:title"]')?.getAttribute("content")).toBe(
        "Home | Plano",
      );
    });
  });

  it("updates canonical href when canonicalUrl changes without duplicate link tags", async () => {
    const { rerender } = render(
      <MetaHead title="A" canonicalUrl="https://plano.app/a" />,
    );
    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://plano.app/a",
      );
    });
    rerender(<MetaHead title="B" canonicalUrl="https://plano.app/b" />);
    await waitFor(() => {
      expect(document.querySelector('link[rel="canonical"]')?.getAttribute("href")).toBe(
        "https://plano.app/b",
      );
    });
    expect(document.querySelectorAll('link[rel="canonical"]').length).toBe(1);
  });

  it("sets robots to noindex when noIndex is true and index,follow when false", async () => {
    const { rerender } = render(<MetaHead title="X" noIndex />);
    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
        "noindex, nofollow",
      );
    });
    rerender(<MetaHead title="X" noIndex={false} />);
    await waitFor(() => {
      expect(document.querySelector('meta[name="robots"]')?.getAttribute("content")).toBe(
        "index,follow",
      );
    });
  });

  it("adds JSON-LD when structuredData is set and removes the script when unset", async () => {
    const { rerender } = render(
      <MetaHead title="X" structuredData={{ "@type": "Thing", name: "T" }} />,
    );
    await waitFor(() => {
      const script = document.querySelector(
        'script[type="application/ld+json"][data-meta="ld"]',
      );
      expect(script).toBeTruthy();
      expect(script?.textContent).toContain("Thing");
    });
    rerender(<MetaHead title="X" />);
    await waitFor(() => {
      expect(
        document.querySelector('script[type="application/ld+json"][data-meta="ld"]'),
      ).toBeNull();
    });
  });

  it("removes managed head nodes on unmount", async () => {
    const { unmount } = render(
      <MetaHead title="Z" canonicalUrl="https://plano.app/z" structuredData={{ x: 1 }} />,
    );
    await waitFor(() => {
      expect(document.head.querySelectorAll("[data-plano-metahead]").length).toBeGreaterThan(0);
    });
    unmount();
    expect(document.head.querySelectorAll("[data-plano-metahead]").length).toBe(0);
  });
});
