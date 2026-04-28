import { FavoriteItem } from "./types";
import { User, Building2 } from "lucide-react";

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
      <div className="flex items-center justify-between border-t border-border-default pt-4">
        <h3 className="text-xs font-medium tracking-widest uppercase text-text-secondary">
          Highlights
        </h3>
        {isOwnProfile && (
            <button onClick={onManage} className="text-xs font-medium uppercase tracking-widest text-text-secondary hover:text-text-primary transition-colors">
                {genres.length + people.length + quotes.length === 0 ? "Add →" : "Edit →"}
            </button>
        )}
      </div>

      {/* Content */}
      <div className="flex flex-col gap-6">

          {showGenres && (
             <div className="space-y-2">
                 <h4 className="text-2xs font-medium tracking-widest uppercase text-text-disabled">Favorite Styles</h4>
                 {genres.length > 0 ? (
                     <div className="flex flex-wrap gap-2">
                        {genres.map(g => (
                            <div
                              key={g.id}
                              className="px-3 py-1 text-sm font-medium flex items-center gap-2 text-text-secondary"
                            >
                                <Building2 className="h-3 w-3 text-text-disabled" />
                                {g.title}
                            </div>
                        ))}
                     </div>
                 ) : (
                     <div className="text-sm text-text-disabled">No styles selected</div>
                 )}
             </div>
          )}

          {(quotes.length > 0) && (
             <div className="space-y-2">
                 <h4 className="text-2xs font-medium tracking-widest uppercase text-text-disabled">Favorite Quotes</h4>
                 <div className="flex gap-4 overflow-x-scroll-touch pb-2 snap-x">
                    {quotes.map((q, i) => (
                        <div
                          key={i}
                          className="min-w-[260px] max-w-[300px] border-l-[3px] border-text-primary pl-4 py-2 snap-start"
                        >
                             <p className="text-sm font-medium mb-3 line-clamp-4 text-text-secondary">"{q.title}"</p>
                             {q.quote_source && (
                                 <p className="text-2xs font-medium tracking-widest uppercase text-text-disabled">— {q.quote_source}</p>
                             )}
                        </div>
                    ))}
                 </div>
             </div>
          )}

          {showPeople && (
             <div className="space-y-2">
                 <h4 className="text-2xs font-medium tracking-widest uppercase text-text-disabled">Favorite Architects</h4>
                 <div className="flex gap-4 overflow-x-scroll-touch pb-2 snap-x">
                    {people.map(p => (
                        <div key={p.id} className="flex flex-col items-center gap-2 w-20 shrink-0 snap-start">
                             <div className="h-20 w-20 overflow-hidden bg-surface-muted">
                                 {p.image_url ? (
                                     <img src={p.image_url} alt={p.title} className="w-full h-full object-cover" loading="lazy" />
                                 ) : (
                                     <div className="w-full h-full flex items-center justify-center bg-surface-muted"><User className="h-8 w-8 text-text-disabled" /></div>
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
