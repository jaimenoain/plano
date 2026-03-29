# Test User Documentation & Authentication Strategy

## 1. Authentication Mechanism
> **Context for Agents:** This section defines how the application handles sessions. Use this to determine if you should mock network requests or perform UI-based login.

* **Auth Provider:** (e.g., Supabase, Firebase, Custom, Auth0)
* **Session Persistence:** (e.g., LocalStorage, HttpOnly Cookies, SessionStorage)
* **Storage Key Name:** (e.g., `sb-access-token`, `next-auth.session-token`)
    * *Tip: If the persistence is LocalStorage, avoid mocking network requests. Use UI login + `storageState`.*
* **Login URL:** `/login`
* **Post-Login Redirect:** (e.g., `/dashboard` or `/home`)

---


## 2. Test User Credentials
Use these exact credentials. Do not generate random emails.

```json
{
  "users": [
    {
      "role": "Standard User",
      "email": "tester@cineforum.eu",
      "password": "CnjFsiVD2YgX9iBuZrfj",
      "description": "User with standard access, member of default groups."
    }
  ]
}



---

## 3. Login Workflow Selectors
> **Context for Agents:** Use these selectors to script the login sequence reliably.

* **Email Input:** `input[name="email"]` or `data-testid="login-email"`
* **Password Input:** `input[name="password"]` or `data-testid="login-password"`
* **Submit Button:** `button[type="submit"]`
