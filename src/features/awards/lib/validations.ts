import { z } from 'zod';

export const CreateAwardSchema = z.object({
  name:                   z.string().min(1).max(300),
  slug:                   z.string().min(1).max(300).regex(/^[a-z0-9-]+$/),
  description:            z.string().max(5000).optional().nullable(),
  website:                z.string().url().max(2000).optional().nullable(),
  country:                z.string().max(200).optional().nullable(),
  frequency:              z.enum(['annual','biennial','ad_hoc','other']).default('annual'),
  awardingBodyType:       z.enum(['company','person','organisation']).optional().nullable(),
  awardingBodyCompanyId:  z.string().uuid().optional().nullable(),
  awardingBodyName:       z.string().max(500).optional().nullable(),
  isActive:               z.boolean().default(true),
  wikidataQid:            z.string().regex(/^Q[0-9]+$/).optional().nullable(),
});
export const UpdateAwardSchema = CreateAwardSchema.partial();

export const CreateEditionSchema = z.object({
  awardId:           z.string().uuid(),
  year:              z.number().int().min(1800).max(2100).optional().nullable(),
  editionDate:       z.string().optional().nullable(),   // ISO date
  ceremonyLocation:  z.string().max(500).optional().nullable(),
  notes:             z.string().max(2000).optional().nullable(),
}).refine(d => d.year != null || d.editionDate != null, {
  message: 'Either year or editionDate must be provided',
});

export const CreateCategorySchema = z.object({
  awardId:              z.string().uuid(),
  name:                 z.string().min(1).max(300),
  description:          z.string().max(2000).optional().nullable(),
  isActive:             z.boolean().default(true),
  validFromEditionId:   z.string().uuid().optional().nullable(),
  validToEditionId:     z.string().uuid().optional().nullable(),
});

const OutcomeEnum = z.enum([
  'winner','finalist','shortlisted','longlisted',
  'nominated','commended','highly_commended','special_mention',
]);

export const CreateRecipientSchema = z.object({
  editionId:             z.string().uuid(),
  categoryId:            z.string().uuid(),
  recipientType:         z.enum(['building','person','company']),
  recipientBuildingId:   z.string().uuid().optional().nullable(),
  recipientPersonId:     z.string().uuid().optional().nullable(),
  recipientCompanyId:    z.string().uuid().optional().nullable(),
  outcome:               OutcomeEnum.default('winner'),
  notes:                 z.string().max(2000).optional().nullable(),
}).refine(d => {
  const set = [d.recipientBuildingId, d.recipientPersonId, d.recipientCompanyId]
    .filter(Boolean).length;
  return set === 1;
}, { message: 'Exactly one recipient FK must be set' });

export const CreateSuggestionSchema = z.object({
  awardId:              z.string().uuid(),
  editionId:            z.string().uuid().optional().nullable(),
  categoryId:           z.string().uuid().optional().nullable(),
  recipientType:        z.enum(['building','person','company']),
  recipientBuildingId:  z.string().uuid().optional().nullable(),
  recipientPersonId:    z.string().uuid().optional().nullable(),
  recipientCompanyId:   z.string().uuid().optional().nullable(),
  outcome:              OutcomeEnum.default('winner'),
  year:                 z.number().int().min(1800).max(2100).optional().nullable(),
  sourceUrl:            z.string().url().max(2000),
  notes:                z.string().max(2000).optional().nullable(),
}).refine(d => {
  const set = [d.recipientBuildingId, d.recipientPersonId, d.recipientCompanyId]
    .filter(Boolean).length;
  return set === 1;
}, { message: 'Exactly one recipient FK must be set' });
