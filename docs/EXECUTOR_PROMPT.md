1. Read `docs/ROADMAP.md`. Find the first unchecked `[ ]` 'PR'. Execute it. Do not skip or batch 'PR's.
2. If the 'PR' references other files, read them. Do not add work the 'PR' doesn't ask for.
3. Mark the 'PR' done: change `[ ]` to `[x]`.
4. Check the next unchecked 'PR'. If it requires manual action (credentials, environment setup, external service, browser action, human decision), surface it now. If the just-completed 'PR' produced or updated a migration file, apply it yourself with the Supabase MCP `apply_migration` tool (credentials are in `.env.local`) — do not surface it as manual action. Only surface it if the MCP apply fails and you cannot resolve it.
5. Say what you did in 1–2 sentences, then end with exactly one of:

*➡️ Ready for next 'PR' ➡️*

*🎉 Roadmap complete 🎉*

*🔴 Action required 🔴 [plain-English instruction — what to do, where, and what to reply when done. No technical jargon.]*