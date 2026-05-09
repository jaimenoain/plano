export type AwardOutcome =
  | 'winner' | 'finalist' | 'shortlisted' | 'longlisted'
  | 'nominated' | 'commended' | 'highly_commended' | 'special_mention';

export type AwardEditionEventType =
  | 'nominations_open'
  | 'nominations_close'
  | 'longlist_announcement'
  | 'shortlist_announcement'
  | 'winner_announcement'
  | 'ceremony'
  | 'other';

export const editionEventTypeLabels: Record<AwardEditionEventType, string> = {
  nominations_open:       'Nominations Open',
  nominations_close:      'Nominations Close',
  longlist_announcement:  'Longlist Announced',
  shortlist_announcement: 'Shortlist Announced',
  winner_announcement:    'Winners Announced',
  ceremony:               'Ceremony',
  other:                  'Announcement',
};

export type RecipientType = 'building' | 'person' | 'company';

export type AwardClaimStatus = 'unclaimed' | 'claimed' | 'verified';
export type AwardAdminRole   = 'owner' | 'editor';

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
  claimStatus: AwardClaimStatus;
  wikidataQid: string | null;
  wikidataSitelinks: number | null;
  wikidataFetchedAt: string | null;
  createdAt: string;
  // Joined:
  awardingBodyCompany?: { id: string; name: string; slug: string } | null;
  editionCount?: number;
}

export interface AwardAdminDTO {
  id: string;
  awardId: string;
  userId: string;
  role: AwardAdminRole;
  invitedBy: string | null;
  createdAt: string;
  // Joined:
  profile?: { username: string; avatarUrl: string | null };
}

export interface AwardClaimRequestDTO {
  id: string;
  awardId: string;
  requesterUserId: string;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Joined:
  award?: { name: string; slug: string };
  requesterProfile?: { username: string; avatarUrl: string | null };
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

export interface AwardEditionEventDTO {
  id: string;
  editionId: string;
  eventType: AwardEditionEventType;
  eventDate: string;   // ISO date (YYYY-MM-DD)
  location: string | null;
  notes: string | null;
  createdAt: string;
}

export interface AwardSuggestionDTO {
  id: string;
  submittedBy: string;
  awardId: string;
  editionId: string | null;
  categoryId: string | null;
  recipientType: RecipientType;
  recipientBuildingId: string | null;
  recipientPersonId: string | null;
  recipientCompanyId: string | null;
  outcome: AwardOutcome;
  year: number | null;
  sourceUrl: string | null;
  notes: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy: string | null;
  reviewerNote: string | null;
  reviewedAt: string | null;
  createdAt: string;
  // Joined:
  award?: { name: string; slug: string };
  building?: { name: string; slug: string };
  person?: { name: string; slug: string };
  company?: { name: string; slug: string };
  submittedByProfile?: { name: string; avatarUrl: string | null };
}
