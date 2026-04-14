import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { supabase } from "@/integrations/supabase/client";
import { eventKeys } from "@/features/events/queryKeys";
import { SubmitEventSchema, type SubmitEventInput } from "@/features/events/schemas";
import type { EventClaimStatus } from "@/features/events/types";
import type { TablesUpdate } from "@/integrations/supabase/types";

export type UpdateEventMutationError = { code: string; message: string };

function err(code: string, message: string): UpdateEventMutationError {
  return { code, message };
}

export type UpdateEventPrior = {
  id: string;
  slug: string;
  isSelfHosted: boolean;
  claimStatus: EventClaimStatus;
  organiserPersonId: string | null;
  organiserCompanyId: string | null;
};

function organiserColumnsForUpdate(
  userId: string,
  parsed: SubmitEventInput,
  prior: UpdateEventPrior,
): Pick<
  TablesUpdate<"events">,
  "organiser_user_id" | "organiser_person_id" | "organiser_company_id" | "claim_status"
> {
  if (parsed.isSelfHosted) {
    return {
      organiser_user_id: userId,
      organiser_person_id: null,
      organiser_company_id: null,
      claim_status: "claimed",
    };
  }

  if (prior.isSelfHosted) {
    return {
      organiser_user_id: null,
      organiser_person_id: null,
      organiser_company_id: null,
      claim_status: "unclaimed",
    };
  }

  return {
    organiser_user_id: null,
    organiser_person_id: prior.organiserPersonId,
    organiser_company_id: prior.organiserCompanyId,
    claim_status: prior.claimStatus,
  };
}

export function useUpdateEvent() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: async ({ prior, raw }: { prior: UpdateEventPrior; raw: SubmitEventInput }): Promise<void> => {
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
        throw err("not_authenticated", "You must be signed in to update this event.");
      }

      let location: string | null = null;
      if (parsed.lat !== undefined && parsed.lng !== undefined) {
        location = `SRID=4326;POINT(${parsed.lng} ${parsed.lat})`;
      }

      const organiserCols = organiserColumnsForUpdate(user.id, parsed, prior);

      const updateRow: TablesUpdate<"events"> = {
        title: parsed.title,
        description: parsed.description?.length ? parsed.description : null,
        start_at: parsed.startAt,
        end_at: parsed.endAt && parsed.endAt.length > 0 ? parsed.endAt : null,
        address: parsed.address?.length ? parsed.address : null,
        location,
        external_link: parsed.externalLink ?? null,
        cover_image_url: parsed.coverImageUrl ?? null,
        is_self_hosted: parsed.isSelfHosted,
        ...organiserCols,
      };

      const { error: updateError } = await supabase
        .from("events")
        .update(updateRow)
        .eq("id", prior.id)
        .eq("submitted_by_user_id", user.id);

      if (updateError) {
        throw err("update_failed", "Could not update the event. Please try again.");
      }

      const { error: delError } = await supabase.from("event_buildings").delete().eq("event_id", prior.id);
      if (delError) {
        throw err("junction_clear_failed", "Could not update building links.");
      }

      const uniqueBuildingIds = [...new Set(parsed.buildingIds)];
      if (uniqueBuildingIds.length > 0) {
        const junction = uniqueBuildingIds.map((buildingId, index) => ({
          event_id: prior.id,
          building_id: buildingId,
          sort_order: index,
        }));
        const { error: insError } = await supabase.from("event_buildings").insert(junction);
        if (insError) {
          throw err("junction_failed", "Could not save building links.");
        }
      }
    },
    onSuccess: (_void, { prior }) => {
      void queryClient.invalidateQueries({ queryKey: eventKeys.detail(prior.slug) });
      void queryClient.invalidateQueries({ queryKey: eventKeys.lists() });
      navigate(`/events/${prior.slug}`);
    },
  });
}
