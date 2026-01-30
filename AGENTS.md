# Agent Instructions (Plano)

## Project Context
This is an architecture and mapping application ("Plano").
* **Domain**: Buildings, Architects, Maps, and Urban Planning.
* **Entities**: We deal with `Buildings` (not Movies), `Architects` (not Directors), and `Collections`.

## Supabase Edge Functions & Security

### Security Policy: The "Manual Gatekeeper" Pattern
Due to CORS preflight limitations in browsers, we **cannot** use Supabase's automatic `verify_jwt: true` for functions called directly from the frontend that handle file uploads/deletions.

**Policy for Storage Functions (`delete-file`, `delete-storage-recursive`, `generate-upload-url`):**
1.  **Configuration:** Must be set to `verify_jwt = false` in `config.toml` (or deployment config).
2.  **Implementation:** The code **MUST** manually verify authentication.
    * Step 1: Handle `OPTIONS` requests immediately (return 200 OK + CORS headers).
    * Step 2: Initialize Supabase client using the request's `Authorization` header.
    * Step 3: **MANDATORY:** Call `await supabase.auth.getUser()`. If this fails or returns no user, throw a 401 Unauthorized error immediately.
    * *Reasoning:* This allows CORS preflight to succeed while preventing unauthenticated access to sensitive data.

### Code Style
* When generating SQL or TypeScript for buildings, ensure geolocation handling (PostGIS) is accurate.
