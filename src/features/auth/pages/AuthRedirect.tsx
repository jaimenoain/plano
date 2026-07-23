import { redirect, type LoaderFunctionArgs } from "react-router";

/**
 * Legacy `/auth` entry point.
 *
 * The auth page has been split into two canonical URLs — `/login` (sign in) and
 * `/signup` (create account). This route keeps every existing `/auth` link,
 * `navigate("/auth")`, and server `redirect("/auth?…")` working by forwarding to
 * the right destination while preserving query params (`redirect`, `invited_by`, …).
 *
 * `?signup=1` or an `invited_by` invite lands on `/signup`; everything else on `/login`.
 */
export function loader({ request }: LoaderFunctionArgs) {
  const url = new URL(request.url);
  const params = url.searchParams;

  const goSignup = params.get("signup") === "1" || params.has("invited_by");
  // `signup` was only ever a mode flag — the path now carries that meaning.
  params.delete("signup");

  const target = goSignup ? "/signup" : "/login";
  const query = params.toString();
  return redirect(query ? `${target}?${query}` : target);
}

export default function AuthRedirect() {
  return null;
}
