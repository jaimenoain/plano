export interface FavoriteItem {
  id: number | string;
  title: string;
  image_url?: string | null;
  rating?: number;
  reviewId?: string;
  type?: 'genre' | 'person' | 'quote' | 'building' | 'style' | 'architect';
  media_type?: 'building';
  year_completed?: string;
  quote_source?: string;
}
