import { FavoriteItem } from "./types";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Card } from "@/components/ui/card";
import { Quote, User, Building2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileHighlightsProps {
  favorites: FavoriteItem[];
  isOwnProfile: boolean;
  onManage: () => void;
}

export function ProfileHighlights({ favorites, isOwnProfile, onManage }: ProfileHighlightsProps) {
  const genres = favorites.filter(f => f.type === 'genre');
  const people = favorites.filter(f => f.type === 'person');
  const quotes = favorites.filter(f => f.type === 'quote');

  if (!isOwnProfile && genres.length === 0 && people.length === 0 && quotes.length === 0) {
    return null;
  }

  const showGenres = genres.length > 0 || (isOwnProfile && people.length === 0 && quotes.length === 0);
  const showPeople = people.length > 0;

  return (
    <div className="space-y-6 px-4 mb-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
            <span className="w-1.5 h-4 bg-purple-500 rounded-sm" />
            Highlights
        </h3>
        {isOwnProfile && (
            <Button variant="ghost" size="sm" onClick={onManage} className="h-6 text-xs gap-1.5">
                {genres.length + people.length + quotes.length === 0 ? <Plus className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                {genres.length + people.length + quotes.length === 0 ? "Add Highlights" : "Edit"}
            </Button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* 1. Genres (Styles) */}
              {showGenres && (
                 <div className="space-y-2">
                     <h4 className="text-xs font-semibold text-muted-foreground/80 pl-1">Favorite Styles</h4>
                     {genres.length > 0 ? (
                         <div className="flex flex-wrap gap-2">
                            {genres.map(g => (
                                <div key={g.id} className="bg-secondary/50 border border-border/50 px-3 py-1.5 rounded-full text-sm font-medium flex items-center gap-2">
                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                    {g.title}
                                </div>
                            ))}
                         </div>
                     ) : (
                         <div className="text-sm text-muted-foreground italic pl-1">No styles selected</div>
                     )}
                 </div>
              )}

              {/* 2. People (Architects) */}
              {showPeople && (
                 <div className="space-y-2">
                     <h4 className="text-xs font-semibold text-muted-foreground/80 pl-1">Favorite Architects</h4>
                     <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
                        {people.map(p => (
                            <div key={p.id} className="flex flex-col items-center gap-2 w-20 shrink-0 snap-start">
                                 <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border/50 shadow-sm bg-muted">
                                     {p.poster_path ? (
                                         <img src={p.poster_path} alt={p.title} className="w-full h-full object-cover" />
                                     ) : (
                                         <div className="w-full h-full flex items-center justify-center bg-secondary"><User className="h-8 w-8 text-muted-foreground/50" /></div>
                                     )}
                                 </div>
                                 <span className="text-xs text-center font-medium leading-tight line-clamp-2">{p.title}</span>
                            </div>
                        ))}
                     </div>
                 </div>
              )}
          </div>

          {/* 3. Quotes */}
          {(quotes.length > 0) && (
             <div className="space-y-2">
                 <h4 className="text-xs font-semibold text-muted-foreground/80 pl-1">Favorite Quotes</h4>
                 <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
                    {quotes.map((q, i) => (
                        <Card key={i} className="min-w-[260px] max-w-[300px] p-4 bg-gradient-to-br from-secondary/50 to-background border-border/50 snap-start">
                             <Quote className="h-4 w-4 text-primary/50 mb-2" />
                             <p className="text-sm font-medium italic mb-3 line-clamp-4">"{q.title}"</p>
                             {q.quote_source && (
                                 <p className="text-xs text-muted-foreground text-right">— {q.quote_source}</p>
                             )}
                        </Card>
                    ))}
                 </div>
             </div>
          )}
      </div>
    </div>
  );
}
