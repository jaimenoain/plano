# Plano — security notes (tokens & sensitive flows)

This document complements `docs/DATA_CONTRACT.md` with **security-relevant patterns** for opaque tokens and verification links. It is not a full threat model.

## Opaque tokens: general rules

1. **Store hashes, not secrets.** User-facing tokens are long random strings (typically 64 hex characters). The database stores **SHA-256** digests (`bytea`, 32 octets). Plaintext tokens appear only in email links and browser URLs, not in Postgres rows.
2. **Mint with elevated privileges.** Token generation runs in **`SECURITY DEFINER`** RPCs or Edge Functions using the **service role**, not the end-user JWT. The anon/authenticated client receives only the secret in the email or redirect URL.
3. **Redeem with validation.** Redemption RPCs decode the hex, hash it, **lock** the matching row (`FOR UPDATE`), and enforce **expiry**, **single use** (`used_at` / `consumed_at`), and **caller rules** (e.g. matching `auth.uid()` where required).
4. **RLS default deny.** Tables that only exist to back tokens (`credit_removal_tokens`, `credit_notification_log`, `company_claim_verification_tokens`, `company_steward_invites`, `company_steward_request_approval_tokens`, etc.) enable RLS with **no** policies for `anon` / `authenticated` so browser clients cannot read or guess other users’ tokens from the database.
5. **Email privacy.** Notification logs store **SHA-256(normalized email)** for dedupe/audit, not plaintext addresses (see §9e in the data contract).

## Credit removal (one-click from email)

- **Mint:** `generate_credit_removal_token(credit_id)` — service role only; inserts `credit_removal_tokens` with `token_hash`, `expires_at` (default ~30 days), `used_at` null; returns 64-char hex.
- **Send:** Edge Function `notify-credited-entities` calls the mint RPC per credit, emails **Remove this credit** links to `/remove-credit/{hex}`, logs `credit_notification_log` with recipient and token hashes.
- **Redeem:** RPC `redeem_credit_removal_token(p_token_hex)` — granted to **`anon` and `authenticated`** so recipients need not sign in; sets credit `status = hidden` and `used_at` on success. Wrong/expired/used tokens return structured errors without side effects.

Details and column lists: **DATA_CONTRACT §9e**.

## Company first claim (work-email verification)

- **Mint:** Edge Function `verify-company-claim` inserts `company_claim_verification_tokens` with `token_hash`, `expires_at` (7-day pattern in product), `consumed_at` null; emails **`/verify-company-claim/{hex}`**.
- **Redeem:** RPC `redeem_company_claim_token` — **authenticated** only; requires `requester_user_id = auth.uid()`, valid token, company still unclaimed, no stewards; creates owner `company_steward` row and sets `claim_status`.
- **Domain mismatch:** When the company is already claimed, the function may return a structured response so the client can route to the **dispute** flow instead of minting a claim token.

Details: **DATA_CONTRACT §9b Component 3b**.

## Other token-backed flows (same pattern)

- **Steward invite:** `company_steward_invites.token_hash`; redeem RPC + `invite-company-steward` Edge Function (manual JWT verification). **DATA_CONTRACT §9b Component 3a.**
- **Steward access request (owner approval links):** `company_steward_request_approval_tokens`; `approve_company_steward_request` plus dashboard RPCs by id. **DATA_CONTRACT §9b Component 3c.**

## Manual verification gate (Edge Functions)

Functions that must allow **CORS preflight** without JWT are deployed with **`verify_jwt = false`** and **must** call `auth.getUser()` on the `Authorization` header before performing sensitive work. See `AGENTS.md` (Manual Gatekeeper pattern) and per-function notes in **DATA_CONTRACT** Edge Function registry.
