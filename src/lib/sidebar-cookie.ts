/** Must match `SidebarProvider` / `writeSidebarOpenCookie` usage. */
export const SIDEBAR_COOKIE_NAME = "sidebar:state";
export const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

/**
 * Parse `sidebar:state` from a raw `Cookie` header or `document.cookie` string.
 */
export function parseSidebarOpenFromCookieString(cookieHeader: string): boolean | null {
  const parts = cookieHeader.split(";").map((s) => s.trim());
  for (const part of parts) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name !== SIDEBAR_COOKIE_NAME) continue;
    const raw = part.slice(idx + 1).trim();
    if (raw === "true") return true;
    if (raw === "false") return false;
  }
  return null;
}

export function parseSidebarOpenFromRequest(request: Request): boolean | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  return parseSidebarOpenFromCookieString(raw);
}

export function readSidebarOpenFromDocument(): boolean | null {
  if (typeof document === "undefined") return null;
  return parseSidebarOpenFromCookieString(document.cookie);
}

export function writeSidebarOpenCookie(openState: boolean): void {
  if (typeof document === "undefined") return;
  document.cookie = `${SIDEBAR_COOKIE_NAME}=${openState}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`;
}
