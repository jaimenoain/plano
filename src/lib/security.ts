
export function isValidRedirect(url: string): boolean {
  if (!url) return false;

  // Allow relative URLs starting with / (but not // which could be protocol relative)
  if (url.startsWith('/') && !url.startsWith('//')) {
    return true;
  }

  // Allow absolute URLs that match the current origin
  try {
    const urlObj = new URL(url);
    return urlObj.origin === window.location.origin || urlObj.origin === 'https://plano.app';
  } catch (e) {
    return false;
  }
}

export function sanitizeCssValue(value: string): string {
  if (!value) return '';

  // Allow alphanumeric, dashes, underscores, spaces, dots, commas, parentheses, %, #
  // This covers hex codes, rgb/hsl functions, variable names, and standard units
  // but prevents injection of semicolons or closing braces
  if (/^[a-zA-Z0-9\-\_\s\.\,\(\)\%\#]+$/.test(value)) {
    return value;
  }

  return '';
}
