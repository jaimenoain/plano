import { useRef } from "react";

const DECOY_NAMES = [
  "website",
  "company_url",
  "phone_number",
  "fax",
  "referral_source",
] as const;

const honeypotStyle: React.CSSProperties = {
  position: "absolute",
  left: "-9999px",
  width: "1px",
  height: "1px",
  opacity: 0,
  pointerEvents: "none",
};

export interface HoneypotProps {
  name: string;
  style: React.CSSProperties;
  tabIndex: number;
  "aria-hidden": true;
  autoComplete: "off";
  defaultValue: "";
}

export interface UseHoneypotReturn {
  /** Spread onto a hidden <input> element inside your form. */
  honeypotProps: HoneypotProps;
  /** Returns true if the honeypot field was filled — indicates a bot. */
  isBot: () => boolean;
}

/**
 * Provides a honeypot hidden field to silently detect bot submissions.
 *
 * Usage:
 *   const { honeypotProps, isBot } = useHoneypot();
 *   // In JSX: <input {...honeypotProps} />
 *   // In submit handler: if (isBot()) return;
 *
 * The field name is randomised per page-load so it cannot be fingerprinted
 * across sessions. The field is visually hidden and excluded from tab order
 * and screen readers, so real users will never interact with it.
 */
export function useHoneypot(): UseHoneypotReturn {
  // Stable random name for the lifetime of this component mount.
  const nameRef = useRef<string>(
    DECOY_NAMES[Math.floor(Math.random() * DECOY_NAMES.length)] as string,
  );
  const inputRef = useRef<HTMLInputElement | null>(null);

  const honeypotProps: HoneypotProps = {
    name: nameRef.current,
    style: honeypotStyle,
    tabIndex: -1,
    "aria-hidden": true,
    autoComplete: "off",
    defaultValue: "",
    // Pass ref via spread won't work directly; callers must use ref={} separately
    // if they need imperative access. isBot() reads the DOM via name lookup instead.
  };

  const isBot = (): boolean => {
    if (inputRef.current) {
      return inputRef.current.value !== "";
    }
    // Fallback: query by name in case ref wasn't attached
    const el = document.querySelector<HTMLInputElement>(
      `input[name="${nameRef.current}"]`,
    );
    return el !== null && el.value !== "";
  };

  return { honeypotProps, isBot };
}
