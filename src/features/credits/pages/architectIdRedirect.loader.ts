import { replace, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function redirectLegacyProfileId(
  request: Request,
  id: string,
  withEditQuery: boolean,
) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);
  headers.set(
    "Cache-Control",
    "public, s-maxage=600, stale-while-revalidate=86400",
  );
  const suffix = withEditQuery ? "?edit=1" : "";

  const { data: person, error: personErr } = await supabase
    .from("people")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (personErr) throw personErr;
  if (person?.slug) {
    throw replace(`/person/${person.slug}${suffix}`, { status: 301, headers });
  }

  const { data: company, error: companyErr } = await supabase
    .from("companies")
    .select("slug")
    .eq("id", id)
    .maybeSingle();

  if (companyErr) throw companyErr;
  if (company?.slug) {
    throw replace(`/company/${company.slug}${suffix}`, { status: 301, headers });
  }

  throw new Response("Not found", { status: 404 });
}

/** Legacy profile UUID route (ArchitectIdRedirect). */
export async function architectIdRedirectLoader({
  request,
  params,
}: LoaderFunctionArgs) {
  const id = params.id;
  if (!id || !UUID_RE.test(id)) {
    throw new Response("Not found", { status: 404 });
  }
  return redirectLegacyProfileId(request, id, false);
}

/** Legacy profile UUID edit route (ArchitectEditRedirect). */
export async function architectEditRedirectLoader({
  request,
  params,
}: LoaderFunctionArgs) {
  const id = params.id;
  if (!id || !UUID_RE.test(id)) {
    throw new Response("Not found", { status: 404 });
  }
  return redirectLegacyProfileId(request, id, true);
}
