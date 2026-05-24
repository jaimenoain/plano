1. Read `docs/ROADMAP.md`. If every phase header R0–R9 is `[x]`, read `docs/REMAINING_SURFACES_ROADMAP.md` instead and execute from there (phases P0–P10). Find the first unchecked `[ ]` phase. Execute it. Do not skip or batch phases.
2. If the phase references other files, read them. Do not add work the phase doesn't ask for.
3. Mark the phase done: change `[ ]` to `[x]`.
4. Check the next unchecked phase. If it requires manual action (credentials, environment setup, external service, browser action, human decision), surface it now. If the just-completed phase produced or updated a migration file, treat it as requiring manual action (run the migration on Supabase).
5. Say what you did in 1–2 sentences, then end with exactly one of:

*➡️ Ready for next phase ➡️*

*🎉 Roadmap complete 🎉*

*🔴 Action required 🔴 [plain-English instruction — what to do, where, and what to reply when done. No technical jargon.]*