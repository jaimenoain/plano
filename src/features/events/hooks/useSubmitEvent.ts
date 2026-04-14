import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { eventKeys } from "@/features/events/queryKeys";
import { makeEventSlug } from "@/features/events/utils/eventSlug";
import { SubmitEventSchema, type SubmitEventInput } from "@/features/events/schemas";
import type { TablesInsert } from "@/integrations/supabase/types";

export type SubmitEventMutationError = { code: string; message: string };

function err(code: string, message: string): SubmitEventMutationError {
  return { code, message };
}

export function useSubmitEvent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async (raw: SubmitEventInput): Promise<string> => {
      const cleaned: SubmitEventInput = {
        ...raw,
        description:
          raw.description && raw.description.trim().length > 0 ? raw.description.trim() : undefined,
        address: raw.address && raw.address.trim().length > 0 ? raw.address.trim() : undefined,
        externalLink: raw.externalLink?.trim() || undefined,
        coverImageUrl: raw.coverImageUrl?.trim() || undefined,
      };
      const parsed = SubmitEventSchema.parse(cleaned);

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        throw err("not_authenticated", "You must be signed in to share an event.");
      }

      const slug = makeEventSlug(parsed.title);
      const claimStatus = parsed.isSelfHosted ? ("claimed" as const) : ("unclaimed" as const);
      const organiserUserId = parsed.isSelfHosted ? user.id : null;

      let location: string | null = null;
      if (parsed.lat !== undefined && parsed.lng !== undefined) {
        location = `SRID=4326;POINT(${parsed.lng} ${parsed.lat})`;
      }

      const row: TablesInsert<"events"> = {
        title: parsed.title,
        description: parsed.description?.length ? parsed.description : null,
        slug,
        start_at: parsed.startAt,
        end_at: parsed.endAt && parsed.endAt.length > 0 ? parsed.endAt : null,
        address: parsed.address?.length ? parsed.address : null,
        location,
        external_link: parsed.externalLink ?? null,
        cover_image_url: parsed.coverImageUrl ?? null,
        is_self_hosted: parsed.isSelfHosted,
        claim_status: claimStatus,
        submitted_by_user_id: user.id,
        organiser_user_id: organiserUserId,
        organiser_person_id: null,
        organiser_company_id: null,
        is_deleted: false,
      };

      const { data: inserted, error: insertError } = await supabase
        .from("events")
        .insert(row)
        .select("id, slug")
        .single();

      if (insertError) {
        if (insertError.code === "23505") {
          throw err("slug_conflict", "That title produced a slug that already exists. Change the title slightly and try again.");
        }
        throw err("insert_failed", "Could not save the event. Please try again.");
      }

      if (!inserted?.slug) {
        throw err("insert_missing", "The event was saved but the response was incomplete.");
      }

      const uniqueBuildingIds = [...new Set(parsed.buildingIds)];
      if (uniqueBuildingIds.length > 0) {
        const junction: TablesInsert<"event_buildings">[] = uniqueBuildingIds.map((buildingId, index) => ({
          event_id: inserted.id,
          building_id: buildingId,
          sort_order: index,
        }));

        const { error: junctionError } = await supabase.from("event_buildings").insert(junction);
        if (junctionError) {
          throw err("junction_failed", "The event was created but linking buildings failed. You can edit links later from the event page when that is available.");
        }
      }

      return inserted.slug;
    },
    onSuccess: (newSlug) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      navigate(`/events/${newSlug}`);
    },
  });
}
