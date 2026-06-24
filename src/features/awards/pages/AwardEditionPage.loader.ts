import {
  getAwardBySlug,
  getEditionByAwardAndYear,
  getEditionBySlug,
  getRecipientsByEdition,
} from "@/features/awards/api/awards";
import { getEditionDisplayLabel, type AwardDTO, type AwardEditionDTO, type AwardRecipientDTO } from "@/features/awards/types/awards";
import { data, type LoaderFunctionArgs } from "react-router";

export interface AwardEditionLoaderData {
  award: AwardDTO;
  edition: AwardEditionDTO;
  recipients: AwardRecipientDTO[];
  metaTitle: string;
  description: string;
  canonical: string;
}

export async function awardEditionLoader({ request, params }: LoaderFunctionArgs) {
  const { slug, editionSlug } = params;
  if (!slug || !editionSlug) throw new Response("Award slug and edition slug required", { status: 400 });

  // Public award catalog content — CDN-cache the data-only response (see
  // AwardPage.loader / the stale-content post-mortem in docs/AI_STATUS.md).
  const headers = new Headers();
  if (new URL(request.url).pathname.endsWith(".data")) {
    headers.set("Cache-Control", "public, s-maxage=300, stale-while-revalidate=3600");
  }

  try {
    const award = await getAwardBySlug(slug);

    // Try slug lookup first. If editionSlug is a pure integer, also try year lookup
    // so that existing year-based URLs (/award/riba/2024) continue to work.
    let edition: AwardEditionDTO;
    const yearNum = /^\d{4}$/.test(editionSlug) ? parseInt(editionSlug, 10) : NaN;
    if (!isNaN(yearNum)) {
      edition = await getEditionByAwardAndYear(award.id, yearNum);
    } else {
      edition = await getEditionBySlug(award.id, editionSlug);
    }

    const recipients = await getRecipientsByEdition(edition.id);

    const displayLabel = getEditionDisplayLabel(edition);
    const metaTitle = `${award.name} ${displayLabel} | Plano`;
    const description = `Discover all winners and recipients of the ${award.name} ${displayLabel} on Plano.`;
    const canonical = `https://plano.archi/award/${slug}/${edition.slug ?? editionSlug}`;

    const body: AwardEditionLoaderData = {
      award,
      edition,
      recipients,
      metaTitle,
      description,
      canonical,
    };
    return data(body, { headers });
  } catch {
    throw new Response("Award edition not found", { status: 404 });
  }
}
