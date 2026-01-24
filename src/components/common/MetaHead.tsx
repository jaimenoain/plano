import { Helmet } from "react-helmet-async";

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
  description = "Track your architecture visits and share reviews.",
  image = "/cover.jpg",
  type = "website",
  canonicalUrl,
  structuredData,
  noIndex = false,
}: MetaHeadProps) {
  // Ensure image is absolute URL
  const getAbsoluteImageUrl = (img: string) => {
    if (!img) return undefined;
    if (img.startsWith("http")) return img;
    return `${window.location.origin}${img.startsWith("/") ? "" : "/"}${img}`;
  };

  const absoluteImage = getAbsoluteImageUrl(image || "/cover.jpg");

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{title ? `${title} | Archiforum` : "Archiforum"}</title>
      <meta name="description" content={description} />

      {/* Robots */}
      {noIndex && <meta name="robots" content="noindex, follow" />}

      {/* Canonical URL */}
      {canonicalUrl && <link rel="canonical" href={canonicalUrl} />}

      {/* Structured Data */}
      {structuredData && (
        <script type="application/ld+json">
          {JSON.stringify(structuredData)}
        </script>
      )}

      {/* Open Graph / Facebook */}
      <meta property="og:type" content={type} />
      <meta property="og:title" content={title ? `${title} | Archiforum` : "Archiforum"} />
      <meta property="og:description" content={description} />
      {absoluteImage && <meta property="og:image" content={absoluteImage} />}

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title ? `${title} | Archiforum` : "Archiforum"} />
      <meta name="twitter:description" content={description} />
      {absoluteImage && <meta name="twitter:image" content={absoluteImage} />}
    </Helmet>
  );
}
