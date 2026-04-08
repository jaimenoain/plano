const MAX_RECIPIENTS = 15;

function isValidEmail(email: string): boolean {
  if (email.length < 3 || email.length > 320) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export type ParseCreditNotifyEmailsResult = {
  /** Normalized (trimmed, lowercased), unique, valid; at most `MAX_RECIPIENTS`. */
  accepted: string[];
  /** Raw tokens that are not valid email shape. */
  invalid: string[];
  /** Number of valid unique addresses dropped after the cap. */
  truncated: number;
};

/**
 * Parses comma / newline / semicolon / whitespace–separated addresses, dedupes case-insensitively, caps at 15.
 */
export function parseCreditNotifyEmails(raw: string): ParseCreditNotifyEmailsResult {
  const tokens = raw
    .split(/[\s,;]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  const seen = new Set<string>();
  const validOrdered: string[] = [];
  const invalid: string[] = [];

  for (const t of tokens) {
    const norm = t.toLowerCase();
    if (!isValidEmail(norm)) {
      if (!invalid.includes(t)) invalid.push(t);
      continue;
    }
    if (seen.has(norm)) continue;
    seen.add(norm);
    validOrdered.push(norm);
  }

  const truncated = Math.max(0, validOrdered.length - MAX_RECIPIENTS);
  const accepted = validOrdered.slice(0, MAX_RECIPIENTS);

  return { accepted, invalid, truncated };
}

export const CREDIT_NOTIFY_MAX_RECIPIENTS = MAX_RECIPIENTS;
