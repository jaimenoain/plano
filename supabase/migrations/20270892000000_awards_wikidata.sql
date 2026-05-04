ALTER TABLE public.awards
  ADD COLUMN wikidata_qid       TEXT UNIQUE,
  ADD COLUMN wikidata_sitelinks INTEGER,
  ADD COLUMN wikidata_fetched_at TIMESTAMPTZ;

ALTER TABLE public.awards
  ADD CONSTRAINT awards_wikidata_qid_format
  CHECK (wikidata_qid IS NULL OR wikidata_qid ~ '^Q[0-9]+$');

CREATE INDEX awards_wikidata_sitelinks_idx ON public.awards (wikidata_sitelinks DESC NULLS LAST);
