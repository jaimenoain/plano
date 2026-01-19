# Production Outage Debug Guide

This guide will help us gather the necessary information to diagnose the Black/White Screen of Death on the production site.

## Part 1: Client-Side Forensics (Browser Error Log)

We need the specific error message and stack trace from your browser console.

1.  **Open Chrome Developer Tools**:
    *   Right-click anywhere on the crashed page (the white/black screen).
    *   Select **Inspect**.
    *   Alternatively, press `F12` or `Ctrl+Shift+I` (Windows/Linux) or `Cmd+Opt+I` (Mac).

2.  **Navigate to the Console**:
    *   Click on the **Console** tab at the top of the Developer Tools panel.

3.  **Reproduce the Error**:
    *   Reload the page (`F5` or `Cmd+R`).
    *   Wait for the crash to occur.

4.  **Identify the Error**:
    *   Look for **red text** in the Console.
    *   You are looking for an error that looks like a crash, such as:
        *   `Uncaught TypeError: Cannot read property 'map' of undefined`
        *   `e.hot_groups is not a function`
        *   `Minified React error #...`

5.  **Copy the Stack Trace**:
    *   Expand the error message by clicking the small triangle arrow next to it (if available).
    *   Take a screenshot OR copy the entire text of the error and stack trace.

**Please share this error message and stack trace with us.**

---

## Part 2: Historical Code Retrieval

We suspect a mismatch between the current code and what is deployed. We need to see the previous versions of specific files.

Please run the following git commands in your local repository and share the output:

### 1. Retrieve previous version of `src/types/admin.ts`

```bash
# View the history of changes to this file
git log -p src/types/admin.ts
```

Or, to see the file as it was 1 commit ago (adjust `HEAD~1` if you suspect the issue is older):

```bash
git show HEAD~1:src/types/admin.ts
```

### 2. Retrieve previous version of `src/pages/admin/Dashboard.tsx`

```bash
git log -p src/pages/admin/Dashboard.tsx
```

Or:

```bash
git show HEAD~1:src/pages/admin/Dashboard.tsx
```

**Please provide the output of these commands or the file contents from the previous version.**
