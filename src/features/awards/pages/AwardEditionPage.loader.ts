import { getAwardBySlug, getEditionByAwardAndYear, getRecipientsByEdition } from "@/features/awards/api/awards";
import type { AwardDTO, AwardEditionDTO, AwardRecipientDTO } from "@/features/awards/types/awards";
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
  const { slug, year: yearStr } = params;
  if (!slug || !yearStr) throw new Response("Slug and year required", { status: 400 });

  const year = parseInt(yearStr, 10);
  if (isNaN(year)) throw new Response("Invalid year", { status: 400 });

  try {
    const award = await getAwardBySlug(slug);
    const edition = await getEditionByAwardAndYear(award.id, year);
    const recipients = await getRecipientsByEdition(edition.id);

    const metaTitle = `${award.name} ${year} | Plano`;
    const description = `Discover all winners and recipients of the ${award.name} ${year} on Plano.`;
    const canonical = `https://plano.archi/award/${slug}/${year}`;

    return {
      award,
      edition,
      recipients,
      metaTitle,
      description,
      canonical,
    };
  } catch (error) {
    console.error("Award edition loader error:", error);
    throw new Response("Award edition not found", { status: 404 });
  }
}
