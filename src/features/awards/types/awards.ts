export type AwardOutcome =
  | 'winner' | 'finalist' | 'shortlisted' | 'longlisted'
  | 'nominated' | 'commended' | 'highly_commended' | 'special_mention';

export type RecipientType = 'building' | 'person' | 'company';

export interface AwardDTO {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  website: string | null;
  country: string | null;
  frequency: 'annual' | 'biennial' | 'ad_hoc' | 'other';
  awardingBodyType: 'company' | 'person' | 'organisation' | null;
  awardingBodyCompanyId: string | null;
  awardingBodyName: string | null;
  isActive: boolean;
  createdAt: string;
  // Joined:
  awardingBodyCompany?: { id: string; name: string; slug: string } | null;
  editionCount?: number;
}

export interface AwardEditionDTO {
  id: string;
  awardId: string;
  year: number | null;
  editionDate: string | null;   // ISO date
  ceremonyLocation: string | null;
  notes: string | null;
  createdAt: string;
  // Joined:
  award?: AwardDTO;
  recipientCount?: number;
}

export interface AwardCategoryDTO {
  id: string;
  awardId: string;
  name: string;
  description: string | null;
  isActive: boolean;
  validFromEditionId: string | null;
  validToEditionId: string | null;
  createdAt: string;
}

export interface AwardRecipientDTO {
  id: string;
  editionId: string;
  categoryId: string;
  recipientType: RecipientType;
  recipientBuildingId: string | null;
  recipientPersonId: string | null;
  recipientCompanyId: string | null;
  outcome: AwardOutcome;
  notes: string | null;
  createdAt: string;
  // Joined (populated by queries):
  building?: { id: string; name: string; slug: string; heroImageUrl: string | null } | null;
  person?:   { id: string; name: string; slug: string; avatarUrl: string | null } | null;
  company?:  { id: string; name: string; slug: string } | null;
  edition?:  { year: number | null; editionDate: string | null };
  category?: { name: string };
  award?:    { name: string; slug: string };
}
