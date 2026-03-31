export const getBuildingUrl = (id, slug, shortId) => {
    if (shortId && slug) {
        return `/building/${shortId}/${slug}`;
    }
    return `/building/${id}`;
};
/**
 * Converts a string into a URL-safe slug.
 *
 * - Normalizes characters (NFD) and removes diacritics
 * - Converts to lowercase
 * - Replaces non-alphanumeric character sequences with a single hyphen
 * - Strips leading and trailing hyphens
 */
export const slugify = (text) => {
    if (!text)
        return '';
    return text
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)/g, '');
};
