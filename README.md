# PLANO

A social platform for architecture enthusiasts to share ratings, organize field trips, and discover amazing buildings with friends.

## 🧠 AI Agent Context & Rules
> **Critical:** Before generating code or running tests, you **MUST** read the following files:

1.  **`AGENTS.md`**: Contains strict rules regarding **Database Logic** (specifically `ranking_data` sparklines) and **User Creation** policies.
2.  **`TEST_USERS.md`**: Contains the **ONLY** valid credentials you should use for testing. Do not sign up new users.
3.  **`src/features/search/documentation/SEARCH.md`**: Explains the complex 3-Tier search architecture (Friend vs. Community vs. TMDB).

---

## 🛠 Tech Stack

This project is a Single Page Application (SPA) built with the following core technologies. **Stick to these patterns when generating new components or logic.**

### Frontend Core
* **Framework:** React 18 + Vite
* **Language:** TypeScript
* **Styling:** Tailwind CSS + `shadcn-ui` (based on Radix UI)
* **State/Data Fetching:** TanStack Query (React Query) v5
* **Routing:** React Router DOM
* **Forms:** React Hook Form + Zod

### Backend & Data (Supabase)
* **Database:** PostgreSQL (managed by Supabase)
* **Auth:** Supabase Auth (see `TEST_USERS.md`)
* **API Strategy:**
    * **RPC Functions:** Used for complex queries (e.g., `search_films_tiered`).
    * **Edge Functions:** Used for external API integrations (e.g., TMDB fetching).
    * **Row Level Security (RLS):** heavily relied upon for data privacy.

### Testing
* **E2E:** Playwright
* **Strategy:** Use the `TEST_USERS.md` credentials. Do not mock auth network requests; use the UI login flow or storage state as described.

---

## 📂 Project Structure Map

* **`src/components/ui`**: Base UI components (shadcn). Do not modify these unless necessary.
* **`src/features`**: Complex, isolated modules (e.g., `search`). Check for local `README.md` files inside these folders.
* **`src/integrations/supabase`**: Generated types and client definitions.
* **`src/pages`**: Route views.
* **`supabase/migrations`**: Database schema changes.
* **`supabase/functions`**: Edge functions (Deno/TypeScript).

---

## 🚀 Development Scripts

* `npm run dev`: Start local Vite server.
* `npm run test`: Run Playwright tests.
