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
  name: string;
  main_image_url: string | null;
  address?: string | null;
  architects?: string[] | null;
  year_completed?: number | null;
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
  watch_with_users?: WatchWithUser[];
}
