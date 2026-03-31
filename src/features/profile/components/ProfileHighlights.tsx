import { FavoriteItem } from "./types";
import { Card } from "@/components/ui/card";
import { Quote, User, Building2, Plus, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProfileHighlightsProps {
  favorites: FavoriteItem[];
  isOwnProfile: boolean;
  onManage: () => void;
}

export function ProfileHighlights({ favorites, isOwnProfile, onManage }: ProfileHighlightsProps) {
  const genres = favorites.filter(f => f.type === 'genre' || f.type === 'style');
  const people = favorites.filter(f => f.type === 'person' || f.type === 'architect');
  const quotes = favorites.filter(f => f.type === 'quote');

  if (!isOwnProfile && genres.length === 0 && people.length === 0 && quotes.length === 0) {
    return null;
  }

  const showGenres = genres.length > 0 || (isOwnProfile && people.length === 0 && quotes.length === 0);
  const showPeople = people.length > 0;

  return (
    <div className="space-y-6 px-4 mb-8">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold uppercase tracking-wide text-text-secondary flex items-center gap-2">
          <span className="h-6 w-1 bg-brand-primary rounded-sm" />
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

          {showGenres && (
             <div className="space-y-2">
                 <h4 className="text-xs font-semibold text-text-secondary/80 pl-1">Favorite Styles</h4>
                 {genres.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                        {genres.map(g => (
                            <div
                              key={g.id}
                              className="bg-surface-muted border border-border-default px-3 py-1 rounded-sm text-sm font-medium flex items-center gap-2"
                            >
                                <Building2 className="h-3 w-3 text-text-secondary" />
                                {g.title}
                            </div>
                        ))}
                     </div>
                 ) : (
                     <div className="text-sm text-text-secondary italic pl-1">No styles selected</div>
                 )}
             </div>
          )}

          {(quotes.length > 0) && (
             <div className="space-y-2">
                 <h4 className="text-xs font-semibold text-text-secondary/80 pl-1">Favorite Quotes</h4>
                 <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
                    {quotes.map((q, i) => (
                        <Card
                          key={i}
                          className="min-w-[260px] max-w-[300px] p-4 bg-surface-card border border-border-default rounded-sm shadow-none snap-start"
                        >
                             <Quote className="h-4 w-4 text-brand-primary/50 mb-2" />
                             <p className="text-sm font-medium italic mb-3 line-clamp-4">"{q.title}"</p>
                             {q.quote_source && (
                                 <p className="text-xs text-text-secondary text-right">— {q.quote_source}</p>
                             )}
                        </Card>
                    ))}
                 </div>
             </div>
          )}

          {showPeople && (
             <div className="space-y-2">
                 <h4 className="text-xs font-semibold text-text-secondary/80 pl-1">Favorite Architects</h4>
                 <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-none snap-x">
                    {people.map(p => (
                        <div key={p.id} className="flex flex-col items-center gap-2 w-20 shrink-0 snap-start">
                             <div className="h-20 w-20 rounded-full overflow-hidden border-2 border-border-default/50 shadow-sm bg-surface-muted">
                                 {p.image_url ? (
                                     <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-surface-muted"><User className="h-8 w-8 text-text-secondary/50" /></div>
                                 )}
                             </div>
                             <span className="text-xs text-center font-medium leading-tight line-clamp-2">{p.title}</span>
                        </div>
                    ))}
                 </div>
             </div>
          )}
      </div>
    </div>
  );
}
