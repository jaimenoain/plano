export type FavoriteType = 'film' | 'genre' | 'person' | 'quote';

export interface FavoriteItem {
  id: number | string;
  type?: FavoriteType; // Defaults to 'film' if undefined

  // Common
  title?: string; // Used for Name (Person), Title (Film), Text (Quote)
  name?: string; // Alias for title

  // Visuals
  poster_path?: string | null; // Used for Film Poster, Person Photo
  backdrop_path?: string | null;

  // Film specific
  media_type?: "movie" | "tv";
  rating?: number;
  year?: string;
  reviewId?: string;
  username?: string;

  // Quote specific
  quote_source?: string; // e.g. "The Godfather"
}
