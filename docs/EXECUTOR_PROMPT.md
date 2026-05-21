1. Read `docs/ROADMAP.md`. Find the first unchecked `[ ]` slice. Execute it. Do not skip or batch slices.
2. If the slice references other files, read them. Do not add work the slice doesn't ask for.
3. Mark the slice done: change `[ ]` to `[x]`.
4. Check the next unchecked slice. If it requires manual action (credentials, environment setup, external service, browser action, human decision), surface it now. If the just-completed slice produced or updated a migration file, treat it as requiring manual action (run the migration on Supabase).
5. Say what you did in 1–2 sentences, then end with exactly one of:

*➡️ Ready for next slice ➡️*

*🎉 Roadmap complete 🎉*

*🔴 Action required 🔴 [plain-English instruction — what to do, where, and what to reply when done. No technical jargon.]*