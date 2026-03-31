import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Helmet } from "react-helmet-async";
export function MetaHead({ title, description = "Track your architecture visits, rate buildings, and discover what friends are exploring.", image = "/cover.jpg", type = "website", canonicalUrl, structuredData, noIndex = false, }) {
    // Ensure image is absolute URL
    const getAbsoluteImageUrl = (img) => {
        if (!img)
            return undefined;
        if (img.startsWith("http"))
            return img;
        return `${window.location.origin}${img.startsWith("/") ? "" : "/"}${img}`;
    };
    const absoluteImage = getAbsoluteImageUrl(image || "/cover.jpg");
    return (_jsxs(Helmet, { children: [_jsx("title", { children: title ? `${title} | Plano` : "Plano" }), _jsx("meta", { name: "description", content: description }), noIndex && _jsx("meta", { name: "robots", content: "noindex, follow" }), canonicalUrl && _jsx("link", { rel: "canonical", href: canonicalUrl }), structuredData && (_jsx("script", { type: "application/ld+json", children: JSON.stringify(structuredData) })), _jsx("meta", { property: "og:type", content: type }), _jsx("meta", { property: "og:title", content: title ? `${title} | Plano` : "Plano" }), _jsx("meta", { property: "og:description", content: description }), absoluteImage && _jsx("meta", { property: "og:image", content: absoluteImage }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" }), _jsx("meta", { name: "twitter:title", content: title ? `${title} | Plano` : "Plano" }), _jsx("meta", { name: "twitter:description", content: description }), absoluteImage && _jsx("meta", { name: "twitter:image", content: absoluteImage })] }));
}
