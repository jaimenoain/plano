export interface FavoriteItem {
  id: number | string;
  title: string;
  poster_path?: string | null;
  rating?: number;
  reviewId?: string;
  type?: 'genre' | 'person' | 'quote' | 'building';
  media_type?: 'building';
  year_completed?: string;
  quote_source?: string;
}
