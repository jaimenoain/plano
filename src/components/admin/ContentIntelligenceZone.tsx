import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DashboardStats } from "@/types/admin";

interface ContentIntelligenceZoneProps {
  trendingFilms: DashboardStats['content_intelligence']['trending_films'];
}

export function ContentIntelligenceZone({ trendingFilms }: ContentIntelligenceZoneProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Trending Films (Last 7 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {trendingFilms.map((film) => (
            <div key={film.film_id} className="flex flex-col items-center text-center space-y-2">
              <div className="relative aspect-[2/3] w-full overflow-hidden rounded-lg bg-muted">
                {film.poster_path ? (
                  <img
                    src={`https://image.tmdb.org/t/p/w200${film.poster_path}`}
                    alt={film.title}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    No Poster
                  </div>
                )}
              </div>
              <div className="space-y-1">
                <p className="text-sm font-medium leading-none line-clamp-2">{film.title}</p>
                <p className="text-xs text-muted-foreground">{film.log_count} interactions</p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
