import { useEffect } from "react";

interface MetaHeadProps {
  title?: string;
  description?: string;
  image?: string;
  type?: string;
  canonicalUrl?: string;
  structuredData?: Record<string, unknown>;
  noIndex?: boolean;
}

export function MetaHead({
  title,
  description = "Track your architecture visits, rate buildings, and discover what friends are exploring.",
  image = "/cover.jpg",
  type = "website",
  canonicalUrl,
  structuredData,
  noIndex = false,
}: MetaHeadProps) {
  void description;
  void image;
  void type;
  void canonicalUrl;
  void structuredData;
  void noIndex;

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = title ? `${title} | Plano` : "Plano";
  }, [title]);

  return null;
}
