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
