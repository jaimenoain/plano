import { useEffect } from "react";
import { useSearchParams } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import type { CompanyWithCredits } from "../types";
import {
  companyClaimDisputeOpenQueryKey,
  companyQueryKey,
  companyStewardRequestPendingQueryKey,
  companyStewardsQueryKey,
} from "../api/companies";

interface UseCompanyClaimParamEffectsArgs {
  slug: string;
  companyId: string;
  isSteward: boolean;
  stewardsLoading: boolean;
  onOpenEdit: () => void;
}

/**
 * The company page's one-shot query-param effects — the landing points of the
 * claim / steward / dispute round trips:
 *
 *   ?claimVerified=1    email link verified → refetch, toast, open the editor
 *   ?stewardApproved=1  owner approved access → refetch, toast, open the editor
 *   ?edit=1             deep link into the editor (stewards only)
 *   ?disputeSubmitted=1 dispute filed → refetch the viewer's open dispute
 *
 * Each effect consumes only its own param and replaces the URL, so unrelated
 * params (notably `?section=`) survive the cleanup.
 */
export function useCompanyClaimParamEffects({
  slug,
  companyId,
  isSteward,
  stewardsLoading,
  onOpenEdit,
}: UseCompanyClaimParamEffectsArgs) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    if (searchParams.get("stewardApproved") !== "1") return;
    let cancelled = false;
    void (async () => {
      await queryClient.refetchQueries({ queryKey: companyQueryKey(slug) });
      const pack = queryClient.getQueryData(companyQueryKey(slug)) as CompanyWithCredits | undefined;
      const cid = pack?.company.id ?? companyId;
      await queryClient.refetchQueries({ queryKey: companyStewardsQueryKey(cid) });
      await queryClient.invalidateQueries({ queryKey: companyStewardRequestPendingQueryKey(cid) });
      if (cancelled) return;
      toast({
        title: "Access approved",
        description: "You can edit this company page as a steward.",
      });
      onOpenEdit();
      const next = new URLSearchParams(searchParams);
      next.delete("stewardApproved");
      setSearchParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, queryClient, slug, companyId, toast, onOpenEdit]);

  useEffect(() => {
    if (searchParams.get("edit") !== "1") return;
    if (stewardsLoading) return;
    if (isSteward) onOpenEdit();
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    setSearchParams(next, { replace: true });
  }, [searchParams, setSearchParams, stewardsLoading, isSteward, onOpenEdit]);

  useEffect(() => {
    if (searchParams.get("claimVerified") !== "1") return;
    let cancelled = false;
    void (async () => {
      await queryClient.refetchQueries({ queryKey: companyQueryKey(slug) });
      const pack = queryClient.getQueryData(companyQueryKey(slug)) as CompanyWithCredits | undefined;
      const cid = pack?.company.id ?? companyId;
      await queryClient.refetchQueries({ queryKey: companyStewardsQueryKey(cid) });
      if (cancelled) return;
      toast({
        title: "Company claimed",
        description: "You can edit public details and invite stewards below.",
      });
      onOpenEdit();
      const next = new URLSearchParams(searchParams);
      next.delete("claimVerified");
      setSearchParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, queryClient, slug, companyId, toast, onOpenEdit]);

  useEffect(() => {
    if (searchParams.get("disputeSubmitted") !== "1") return;
    let cancelled = false;
    void (async () => {
      await queryClient.invalidateQueries({ queryKey: companyClaimDisputeOpenQueryKey(companyId) });
      if (cancelled) return;
      const next = new URLSearchParams(searchParams);
      next.delete("disputeSubmitted");
      setSearchParams(next, { replace: true });
    })();
    return () => {
      cancelled = true;
    };
  }, [searchParams, setSearchParams, queryClient, companyId]);
}
