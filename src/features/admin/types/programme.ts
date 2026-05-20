export interface ProgrammePulse {
  activeChapters: number;
  formingChapters: number;
  inactiveChapters: number;
  activeChaptersDelta: number;
  formingChaptersDelta: number;
  inactiveChaptersDelta: number;
  pendingApplications: number;
  staleApplications: number;
}

export interface ProgrammeActivityDay {
  date: string;
  edits: number;
  photos: number;
}

export type ChapterFlagType = 'no_president' | 'president_inactive' | 'forming_stalled';

export interface FlaggedChapter {
  chapterId: string;
  chapterName: string;
  countryCode: string;
  flagType: ChapterFlagType;
  flagDetail: string | null;
}

export interface TopChapter {
  chapterId: string;
  chapterName: string;
  countryCode: string;
  memberCount: number;
  contributionCount: number;
}

export interface ProgrammeHealthSummary {
  pulse: ProgrammePulse;
  activityTrend: ProgrammeActivityDay[];
  flaggedChapters: FlaggedChapter[];
  topChapters: TopChapter[];
}

export interface ExcoMember {
  userId: string;
  username: string;
  avatarUrl: string | null;
  excoResponsibility: string | null;
}

export type InterventionFlagType =
  | 'no_president'
  | 'president_inactive'
  | 'forming_stalled'
  | 'at_capacity_open_apps'
  | 'no_chapter_activity';

export type InterventionSeverity = 'urgent' | 'warning' | 'info';

export interface InterventionFlag {
  flagType: InterventionFlagType;
  severity: InterventionSeverity;
  chapterId: string;
  chapterName: string;
  countryCode: string;
  description: string;
  suggestedAction: string;
  detectedAt: string;
}

export type BroadcastType = 'announcement' | 'action_required' | 'check_in';
export type RecipientScope = 'all' | 'country' | 'chapter';

export interface AdminBroadcast {
  id: string;
  subject: string;
  body: string;
  type: BroadcastType;
  recipientScope: RecipientScope;
  scopeValue: string | null;
  sentByUsername: string;
  sentAt: string;
  pinned: boolean;
  recipientCount: number;
  readCount: number;
}

export interface BroadcastReadStatus {
  chapterId: string;
  chapterName: string;
  presidentUsername: string;
  presidentUserId: string;
  readAt: string | null;
}

export interface BroadcastBanner {
  id: string;
  subject: string;
  body: string;
  type: BroadcastType;
  sentAt: string;
  isPinned: boolean;
}

export interface PresidentDirectoryRow {
  presidentUserId: string;
  presidentUsername: string;
  presidentAvatarUrl: string | null;
  chapterId: string;
  chapterName: string;
  countryCode: string;
  chapterStatus: string;
  memberCount: number;
  lastActiveAt: string | null;
  edits30d: number;
  openApplications: number;
  memberSince: string;
  excoMembers: ExcoMember[];
}
