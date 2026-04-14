import { useEffect } from "react";

const SITE_ORIGIN = "https://plano.app";
const METAHEAD_MARK = "data-plano-metahead";

interface MetaHeadProps {
  /** When set, used as the full document and OG title (no `| Plano` suffix). */
  documentTitle?: string;
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
  noIndex?: boolean;
}

function absolutizeUrl(pathOrUrl: string): string {
  if (pathOrUrl.startsWith("http://") || pathOrUrl.startsWith("https://")) {
    return pathOrUrl;
  }
  const path = pathOrUrl.startsWith("/") ? pathOrUrl : `/${pathOrUrl}`;
  return `${SITE_ORIGIN}${path}`;
}

/**
 * Finds by selector; creates the element with attrKey=attrVal when missing; sets meta content.
 */
function setOrCreate(
  selector: string,
  attrKey: string,
  attrVal: string,
  content: string,
): void {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attrKey, attrVal);
    el.setAttribute(METAHEAD_MARK, "");
    document.head.appendChild(el);
  } else if (!el.hasAttribute(METAHEAD_MARK)) {
    el.setAttribute(METAHEAD_MARK, "");
  }
  el.setAttribute("content", content);
}

function upsertCanonical(href: string): void {
  const sel = 'link[rel="canonical"]';
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", "canonical");
    el.setAttribute(METAHEAD_MARK, "");
    document.head.appendChild(el);
  } else if (!el.hasAttribute(METAHEAD_MARK)) {
    el.setAttribute(METAHEAD_MARK, "");
  }
  el.setAttribute("href", href);
}

function removeManagedCanonical(): void {
  const el = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (el?.hasAttribute(METAHEAD_MARK)) {
    el.remove();
  }
}

function upsertJsonLd(data: Record<string, unknown>): void {
  const sel = 'script[type="application/ld+json"][data-meta="ld"]';
  let el = document.head.querySelector<HTMLScriptElement>(sel);
  if (!el) {
    el = document.createElement("script");
    el.type = "application/ld+json";
    el.setAttribute("data-meta", "ld");
    el.setAttribute(METAHEAD_MARK, "");
    document.head.appendChild(el);
  } else if (!el.hasAttribute(METAHEAD_MARK)) {
    el.setAttribute(METAHEAD_MARK, "");
  }
  el.textContent = JSON.stringify(data);
}

function removeManagedJsonLd(): void {
  const el = document.head.querySelector<HTMLScriptElement>(
    'script[type="application/ld+json"][data-meta="ld"]',
  );
  if (el?.hasAttribute(METAHEAD_MARK)) {
    el.remove();
  }
}

function clearManagedHeadNodes(): void {
  document.head.querySelectorAll(`[${METAHEAD_MARK}]`).forEach((node) => node.remove());
}

export function MetaHead({
  documentTitle,
  title,
  description = "Track your architecture visits, rate buildings, and discover what friends are exploring.",
  image = "/cover.jpg",
  type = "website",
  canonicalUrl,
  structuredData,
  noIndex = false,
}: MetaHeadProps) {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const fullTitle = documentTitle ?? (title ? `${title} | Plano` : "Plano");
    document.title = fullTitle;

    const absoluteImage = absolutizeUrl(image);
    const robotsContent = noIndex ? "noindex, nofollow" : "index,follow";
    const ogUrl =
      canonicalUrl != null && canonicalUrl !== ""
        ? absolutizeUrl(canonicalUrl)
        : typeof window !== "undefined"
          ? window.location.href
          : "";

    setOrCreate('meta[name="description"]', "name", "description", description);
    setOrCreate('meta[name="robots"]', "name", "robots", robotsContent);

    setOrCreate('meta[property="og:title"]', "property", "og:title", fullTitle);
    setOrCreate('meta[property="og:description"]', "property", "og:description", description);
    setOrCreate('meta[property="og:image"]', "property", "og:image", absoluteImage);
    if (ogUrl) {
      setOrCreate('meta[property="og:url"]', "property", "og:url", ogUrl);
    }
    setOrCreate('meta[property="og:type"]', "property", "og:type", type);

    setOrCreate('meta[name="twitter:card"]', "name", "twitter:card", "summary_large_image");
    setOrCreate('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    setOrCreate('meta[name="twitter:description"]', "name", "twitter:description", description);
    setOrCreate('meta[name="twitter:image"]', "name", "twitter:image", absoluteImage);

    if (canonicalUrl != null && canonicalUrl !== "") {
      upsertCanonical(absolutizeUrl(canonicalUrl));
    } else {
      removeManagedCanonical();
    }

    if (structuredData != null && Object.keys(structuredData).length > 0) {
      upsertJsonLd(structuredData);
    } else {
      removeManagedJsonLd();
    }

    return () => {
      clearManagedHeadNodes();
    };
  }, [documentTitle, title, description, image, type, canonicalUrl, structuredData, noIndex]);

  return null;
}
