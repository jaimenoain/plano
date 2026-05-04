import { getAwardBySlug, getEditionsByAward } from "@/features/awards/api/awards";
import type { AwardDTO, AwardEditionDTO } from "@/features/awards/types/awards";
import type { LoaderFunctionArgs } from "react-router";

export interface AwardLoaderData {
  award: AwardDTO;
  editions: AwardEditionDTO[];
  metaTitle: string;
  description: string;
  canonical: string;
}

export async function awardLoader({ params }: LoaderFunctionArgs): Promise<AwardLoaderData> {
  const { slug } = params;
  if (!slug) throw new Response("Slug required", { status: 400 });

  try {
    const award = await getAwardBySlug(slug);
    const editions = await getEditionsByAward(award.id);

    const metaTitle = `${award.name} | Plano`;
    const description = award.description || `Explore the history of the ${award.name} on Plano.`;
    const canonical = `https://plano.archi/award/${slug}`;

    return {
      award,
      editions,
      metaTitle,
      description,
      canonical,
    };
  } catch (error) {
    console.error("Award loader error:", error);
    throw new Response("Award not found", { status: 404 });
  }
}
