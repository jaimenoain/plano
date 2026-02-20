export interface ReviewImage {
  id: string;
  url: string;
  likes_count: number;
  is_liked: boolean;
}

export interface ReviewUser {
  username: string | null;
  avatar_url: string | null;
}

export interface ReviewBuilding {
  id: string;
  short_id?: number | null;
  slug?: string | null;
  name: string;
  address?: string | null;
  main_image_url?: string | null;
  architects?: string[] | { id: string; name: string }[] | null;
  year_completed?: number | null;
  city?: string | null;
  country?: string | null;
}

export interface WatchWithUser {
  id: string;
  avatar_url: string | null;
  username: string | null;
}

export interface FeedReview {
  id: string;
  content: string | null;
  rating: number | null;
  tags?: string[] | null;
  created_at: string;
  edited_at?: string | null;
  status?: string; // Made optional to match ReviewCard usage, though usually present
  user_id?: string; // Optional as ReviewCard doesn't explicitly require it in the type, but Index provides it
  group_id?: string | null;
  user: ReviewUser;
  building: ReviewBuilding;
  likes_count: number;
  comments_count: number;
  is_liked: boolean;
  images?: ReviewImage[];
  video_url?: string | null;
  watch_with_users?: WatchWithUser[];
  is_suggested?: boolean;
  suggestion_reason?: string;
}
