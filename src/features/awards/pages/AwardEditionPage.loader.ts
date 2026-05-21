import {
  getAwardBySlug,
  getEditionByAwardAndYear,
  getEditionBySlug,
  getRecipientsByEdition,
} from "@/features/awards/api/awards";
import { getEditionDisplayLabel, type AwardDTO, type AwardEditionDTO, type AwardRecipientDTO } from "@/features/awards/types/awards";
import type { LoaderFunctionArgs } from "react-router";

export interface AwardEditionLoaderData {
  award: AwardDTO;
  edition: AwardEditionDTO;
  recipients: AwardRecipientDTO[];
  metaTitle: string;
  description: string;
  canonical: string;
}

export async function awardEditionLoader({ params }: LoaderFunctionArgs): Promise<AwardEditionLoaderData> {
  const { slug, editionSlug } = params;
  if (!slug || !editionSlug) throw new Response("Award slug and edition slug required", { status: 400 });

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

    return {
      award,
      edition,
      recipients,
      metaTitle,
      description,
      canonical,
    };
  } catch {
    throw new Response("Award edition not found", { status: 404 });
  }
}
