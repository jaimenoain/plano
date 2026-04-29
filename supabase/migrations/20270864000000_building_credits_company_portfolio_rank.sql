-- Optional ordering for company steward portfolio (/company-portfolio).
-- NULL = legacy sort (credit tier, display_order, is_lead); non-null = global rank ascending within the portfolio view.

ALTER TABLE public.building_credits
  ADD COLUMN IF NOT EXISTS company_portfolio_rank integer NULL;

COMMENT ON COLUMN public.building_credits.company_portfolio_rank IS
  'When set, company portfolio dashboard sorts by this value (ascending) before falling back to tier/display order. Scoped to rows with company_id; stewards may update via existing building_credits_update policy.';

CREATE INDEX IF NOT EXISTS building_credits_company_portfolio_rank_idx
  ON public.building_credits (company_id, company_portfolio_rank)
  WHERE company_id IS NOT NULL AND company_portfolio_rank IS NOT NULL;
