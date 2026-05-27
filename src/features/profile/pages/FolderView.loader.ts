import { data, type LoaderFunctionArgs } from "react-router";
import { createSupabaseServerClient } from "~/lib/supabase.server";
import { SITE_URL } from "@/features/buildings/utils/structuredData";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function folderLoader({ request, params }: LoaderFunctionArgs) {
  const headers = new Headers();
  const supabase = createSupabaseServerClient(request, headers);

  const usernameParam = params.username?.trim();
  const slug = params.slug?.trim();
  if (!usernameParam || !slug) {
    throw new Response("Not found", { status: 404 });
  }

  const isUuid = UUID_RE.test(usernameParam);

  let profileQuery = supabase.from("profiles").select("id, username");
  if (isUuid) {
    profileQuery = profileQuery.eq("id", usernameParam);
  } else {
    profileQuery = profileQuery.ilike("username", usernameParam);
  }

  const { data: profile, error: profileError } = await profileQuery.maybeSingle();

  if (profileError) throw profileError;
  if (!profile?.id) {
    throw new Response("Not found", { status: 404 });
  }

  const { data: folderRow, error: folderError } = await supabase
    .from("user_folders")
    .select("name, slug, description, is_public")
    .eq("owner_id", profile.id)
    .eq("slug", slug)
    .maybeSingle();

  if (folderError) throw folderError;
  if (!folderRow) {
    throw new Response("Not found", { status: 404 });
  }

  const displayUsername = profile.username?.trim() || usernameParam;
  const folderName = folderRow.name?.trim() || "Folder";
  const title = `${folderName} by ${displayUsername} | Plano`;
  const description =
    typeof folderRow.description === "string" &&
    folderRow.description.trim().length > 0
      ? folderRow.description.trim()
      : `View ${folderName} folder on Plano.`;
  const canonical = `${SITE_URL}/${displayUsername}/folders/${folderRow.slug}`;
  const ogImage = `${SITE_URL}/cover.jpg`;

  if (!folderRow.is_public) {
    headers.set("Cache-Control", "private, no-store");
  } else if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

  return data(
    {
      title,
      description,
      canonical,
      ogImage,
      isPublic: folderRow.is_public === true,
    },
    { headers },
  );
}
