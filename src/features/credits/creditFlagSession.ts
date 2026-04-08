const STORAGE_KEY = "plano-reported-credit-ids";

export function readSessionFlaggedCreditIds(): Set<string> {
  if (typeof sessionStorage === "undefined") return new Set();
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as unknown;
    if (!Array.isArray(arr)) return new Set();
    return new Set(arr.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

export function markCreditFlaggedInSession(creditId: string): void {
  if (typeof sessionStorage === "undefined") return;
  const next = readSessionFlaggedCreditIds();
  next.add(creditId);
  sessionStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
}
