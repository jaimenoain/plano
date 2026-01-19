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
  description = "Track your films and share reviews.",
  image = "/cover.jpg",
  type = "website",
  canonicalUrl,
  structuredData,
  noIndex = false,
}: MetaHeadProps) {
  // Ensure image is absolute URL
  const getAbsoluteImageUrl = (img: string) => {
    if (img.startsWith("http")) return img;
    return `${window.location.origin}${img.startsWith("/") ? "" : "/"}${img}`;
  };

  const absoluteImage = getAbsoluteImageUrl(image);

  return (
    <Helmet>
      {/* Standard Metadata */}
      <title>{title ? `${title} | Cineforum` : "Cineforum"}</title>
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
      <meta property="og:title" content={title ? `${title} | Cineforum` : "Cineforum"} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImage} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={title ? `${title} | Cineforum` : "Cineforum"} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImage} />
    </Helmet>
  );
}
