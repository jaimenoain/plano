# Agent Instructions

This file contains critical instructions and context for AI agents working on this codebase. Please read this carefully before making changes.

## General Preferences

### Titles
*   **Film Titles**: Use `original_title` (for movies) or `original_name` (for TV) as the main title whenever possible. The localized `title` or `name` should be displayed as a secondary, smaller subtitle only if it differs from the original.

## Database Logic & Statistics

### Group Statistics (`update_group_stats`)
*   **Ranking Context Sparkline (`ranking_data`)**:
    *   **CRITICAL**: The `ranking_data` array used for the sparkline must **ONLY** include films that have been part of a session in the specific group (`group_sessions`).
    *   **DO NOT** modify the query to include all films rated by group members. The purpose of this sparkline is to show the "Session History" context.
    *   The SQL query must always filter by `film_id = ANY(v_session_film_ids)` (or equivalent logic ensuring restriction to session films).


## Testing & QA Standards

### 🚫 User Creation Policy (CRITICAL)
* **DO NOT create new user accounts** for reproduction, verification, or testing.
* **DO NOT sign up** via the UI to test flows.
* **ALWAYS** use the pre-defined credentials in `TEST_USERS.md`.
    * *Reasoning:* Creating users clutters the database and bypasses the specific state configurations (e.g., specific group memberships) needed for accurate testing.

### Authentication
* Refer to `TEST_USERS.md` for:
    * **Credentials**: Valid email/password combinations.
    * **Selectors**: The correct CSS selectors for the login form.
    * **Session**: How to handle session persistence (e.g., mocking LocalStorage vs. cookies).

### Test Data
* If a test requires specific data (e.g., a movie rating), check if a user in `TEST_USERS.md` already has this data state before creating it.
