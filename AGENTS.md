# Agent Instructions (Plano)

## Project Context
This is an architecture and mapping application ("Plano").
* **Domain**: Buildings, Architects, Maps, and Urban Planning.
* **Entities**: We deal with `Buildings` (not Movies), `Architects` (not Directors), and `Collections`.

**DETECT & RESPECT:**
Before generating any code or plans, you must SCAN the existing file structure to determine the established tech stack.
1. **Read Configuration:** Check `package.json`, `pyproject.toml`, `go.mod`, or similar logic files to identify dependencies.
2. **Match Versioning:** Use the exact package manager (e.g., `pnpm`, `yarn`, `pip`, `poetry`) and language versions defined in these files.
3. **Mimic Patterns:** adopting the code style, folder structure, and naming conventions of existing files.

**DO NOT** assume generic defaults. **DO NOT** create new configuration files (like `requirements.txt` or `.babelrc`) if a different standard (like `pyproject.toml` or `vite.config.ts`) already exists.

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
