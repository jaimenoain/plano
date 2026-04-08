import { replace, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Legacy `/architect/:id` URLs (architect UUID from pre–Building Credits schema).
 * Individuals resolve to `people.id`; studios to `companies.id` (same UUID as migrated `architects`).
 */
export async function loader({ request, params }: LoaderFunctionArgs) {
  const id = params.id;
  if (!id || !UUID_RE.test(id)) {
    throw new Response("Not found", { status: 404 });
  }

  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set(
    "Cache-Control",
    "public, s-maxage=600, stale-while-revalidate=86400",
  );

  const { data: person, error: personErr } = await supabase
    .from("people")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (personErr) throw personErr;
  if (person?.slug) {
    throw replace(`/person/${person.slug}`, { status: 301, headers });
  }

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (companyErr) throw companyErr;
  if (company?.slug) {
    throw replace(`/company/${company.slug}`, { status: 301, headers });
  }

  throw new Response("Not found", { status: 404 });
}

export default function ArchitectIdRedirect() {
  return null;
}
