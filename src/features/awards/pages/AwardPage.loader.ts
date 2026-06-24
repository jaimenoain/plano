import { getAwardBySlug, getEditionsByAward, getAwardAdmins } from "@/features/awards/api/awards";
import type { AwardDTO, AwardEditionDTO, AwardAdminDTO } from "@/features/awards/types/awards";
import { data, type LoaderFunctionArgs } from "react-router";

export interface AwardLoaderData {
  award: AwardDTO;
  editions: AwardEditionDTO[];
  admins: AwardAdminDTO[];
  metaTitle: string;
  description: string;
  canonical: string;
}

export async function awardLoader({ request, params }: LoaderFunctionArgs) {
  const { slug } = params;
  if (!slug) throw new Response("Slug required", { status: 400 });

  // Public award catalog content — cache the data-only response at the CDN
  // (gated to `.data` so the HTML document is never CDN-cached; see the
  // stale-content post-mortem in docs/AI_STATUS.md).
  const headers = new Headers();
  if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

  try {
    const award = await getAwardBySlug(slug);
    const [editions, admins] = await Promise.all([
      getEditionsByAward(award.id),
      getAwardAdmins(award.id),
    ]);

    const metaTitle = `${award.name} | Plano`;
    const description = award.description || `Explore the history of the ${award.name} on Plano.`;
    const canonical = `https://plano.archi/award/${slug}`;

    const body: AwardLoaderData = {
      award,
      editions,
      admins,
      metaTitle,
      description,
      canonical,
    };
    return data(body, { headers });
  } catch {
    throw new Response("Award not found", { status: 404 });
  }
}
