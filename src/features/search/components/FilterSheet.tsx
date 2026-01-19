import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Check, Bookmark, Trash2, Pin, Save,
  Users, Film, Tv, X,
  Globe, Calendar, Clock, User, Tags, Monitor
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { MultiSelectFilterContent } from "./MultiSelectFilterContent";
import { FriendSelectFilter } from "./FriendSelectFilter";
import { cn } from "@/lib/utils";
import { useMemo, useState, useEffect } from "react";
import { SavedView, Provider } from "../hooks/useSearchFilters";

interface UserProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  is_following: boolean;
  mutuals_count?: number;
}

interface FilterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: any; // Type this better based on useSearchFilters return
  profile: any;
  friends: UserProfile[];
  availableProviders: Provider[];
  loadingProviders: boolean;
  providerQuery: string;
  setProviderQuery: (q: string) => void;
  peopleResults: any[];
  setPeopleResults: (res: any[]) => void;
  availableTags: string[];
  genres: { id: number; name: string }[];
  countries: { code: string; name: string }[];
  decades: number[];
  runtimes: { label: string; value: string }[];
}

export function FilterSheet({
  open,
  onOpenChange,
  filters,
  profile,
  friends,
  availableProviders,
  loadingProviders,
  providerQuery,
  setProviderQuery,
  peopleResults,
  setPeopleResults,
  availableTags,
  genres,
  countries,
  decades,
  runtimes
}: FilterSheetProps) {

  const [newViewName, setNewViewName] = useState("");
  const [showRatedBySpecific, setShowRatedBySpecific] = useState(false);
  const [showNotSeenBySpecific, setShowNotSeenBySpecific] = useState(false);
  const [showSpecificPlatforms, setShowSpecificPlatforms] = useState(false);

  // Sync local visibility state with actual filters when sheet opens or filters change externally
  useEffect(() => {
    if (filters.ratedByUsernames.length > 0) setShowRatedBySpecific(true);
    if (filters.notSeenByUsernames.length > 0) setShowNotSeenBySpecific(true);
    if (filters.selectedProviders.length > 0) setShowSpecificPlatforms(true);
  }, [filters.ratedByUsernames.length, filters.notSeenByUsernames.length, filters.selectedProviders.length]);


  const filteredProviders = useMemo(() => {
     if (!providerQuery) return availableProviders;
     return availableProviders.filter(p => p.name.toLowerCase().includes(providerQuery.toLowerCase()));
  }, [availableProviders, providerQuery]);

  const hasFilters = filters.selectedGenres.length > 0 || filters.selectedCountries.length > 0 ||
                       filters.selectedDecades.length > 0 || filters.selectedRuntimes.length > 0 ||
                       filters.selectedPeople.length > 0 || !!filters.watchlistUser ||
                       filters.ratedByUsernames.length > 0 || filters.notSeenByUsernames.length > 0 ||
                       !!filters.notSeenByUser || filters.selectedTags.length > 0 || filters.onlyMyPlatforms || filters.availableRentBuy || filters.selectedProviders.length > 0;

  const activeView = filters.savedViews.find((v: SavedView) => v.id === filters.activeViewId);

  // Helpers for Type Selection
  // contentTypes: [] (empty) means both (default), ['movie'] means movies, ['tv'] means tv, ['movie', 'tv'] means both.
  // We'll normalize "Both" as either empty or length 2.
  const isMovieActive = filters.contentTypes.length === 0 || filters.contentTypes.includes('movie');
  const isTvActive = filters.contentTypes.length === 0 || filters.contentTypes.includes('tv');
  // Wait, user said: "My suggestion is that both of them appear inactive (if both are inactive, the results show both types). But the user can turn on of them on (effectively filtering out the other)."
  // So visual state:
  // Both Inactive (visually) -> Show Both.
  // Movie Active -> Show Movie.
  // TV Active -> Show TV.
  // If both are clicked?
  // If I click Movie (when Inactive) -> It becomes Active. Others become Inactive?
  // If I click Movie (when Active) -> It becomes Inactive? (Show Both)
  // If I click TV (when Movie Active) -> TV Active, Movie Inactive?

  // This behaves like a Radio that can be deselected.
  // However, the user also said "both ON/OFF buttons".
  // If I can turn both ON, it means I filter for Movies AND Series -> Show Both.
  // Let's implement independent toggles.
  // If contentTypes has 'movie', Movie is Active.
  // If contentTypes has 'tv', TV is Active.
  // If contentTypes has NEITHER or BOTH -> Both are Active? Or Both Inactive?
  // User: "if both are inactive, the results show both types".
  // This implies default state is [] -> Visual Inactive -> Logic Both.
  // Click Movie -> ['movie'] -> Visual Movie Active -> Logic Movie.
  // Click TV -> ['tv'] -> Visual TV Active -> Logic TV.

  // What if I have ['movie'] and I click TV?
  // Does it become ['movie', 'tv']? (Both Active) -> Logic Both.
  // Or does it become ['tv']? (Switch)
  // User: "turn one of them on (effectively filtering out the other)" implies switch.
  // But "I would like them to be both ON/OFF buttons" implies independent.
  // If I implement independent buttons:
  // Default: Both Inactive ([]).
  // Click Movie: ['movie'] (Movie Active).
  // Click TV (while Movie Active): ['movie', 'tv'] (Both Active).
  // Click Movie (while Both Active): ['tv'] (TV Active).
  // Click TV (while TV Active): [] (Both Inactive).

  // This cycle works perfectly and covers all cases.
  // Visuals:
  // Active = colored. Inactive = gray/outline.
  // If contentTypes is empty, treat as Inactive visually?
  // Or: "Both inactive... results show both types". This matches empty -> both.

  const toggleType = (type: "movie" | "tv") => {
      const current = [...filters.contentTypes];
      // If empty, it means both are implicitly selected, but strictly "types" filter is empty.
      // But if we treat empty as "All", then clicking one should selecting ONLY that one?
      // Or adding to selection?
      // If I click "Movie" and nothing is selected (showing all), I probably want to filter down to "Movie".
      // So [] -> click Movie -> ['movie'].

      // If I click "Movie" and ['movie'] is selected -> Deselect -> [] (Show All).

      // If I click "TV" and ['movie'] is selected ->
      // Option A: Add TV -> ['movie', 'tv'].
      // Option B: Switch to TV -> ['tv'].

      // If I use standard filter logic (checkboxes), it's additive.
      // But standard filter logic usually starts with All Selected (or None Selected = All).
      // If None=All, then clicking "Movie" restricts to Movie.
      // Clicking "TV" (while Movie active) restricts to Movie OR TV (which is All).
      // So ['movie', 'tv'].

      // If I have ['movie', 'tv'], and click "Movie" (deselect), I get ['tv'].

      if (current.includes(type)) {
          // Deselect
          const next = current.filter(t => t !== type);
          filters.setContentTypes(next);
      } else {
          // Select
          const next = [...current, type];
          filters.setContentTypes(next);
      }
  };

  const isMovieSelected = filters.contentTypes.includes("movie");
  const isTvSelected = filters.contentTypes.includes("tv");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:w-[400px] flex flex-col p-0 gap-0">
        <SheetHeader className="p-6 pb-2 flex-none">
          <SheetTitle>Filters</SheetTitle>
          <SheetDescription>
            Refine your search with detailed filters.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-6 pb-6">
          {/* Presets Section */}
          <div className="mb-6 space-y-4 rounded-lg border bg-card p-4 text-card-foreground shadow-sm">
             <div className="flex items-center justify-between">
                <h4 className="font-semibold flex items-center gap-2">
                   <Bookmark className="h-4 w-4" />
                   Saved Views
                </h4>
             </div>

             {filters.savedViews.length > 0 && (
                 <div className="space-y-1">
                     {filters.savedViews.map((view: SavedView) => (
                         <div key={view.id} className="flex items-center justify-between group">
                             <button
                                 className={cn(
                                     "text-sm flex-1 text-left truncate px-2 py-1.5 rounded-sm hover:bg-accent transition-colors",
                                     filters.activeViewId === view.id && "font-medium text-primary bg-accent/50"
                                 )}
                                 onClick={() => filters.applyView(view)}
                             >
                                 {view.name}
                             </button>
                             <div className={cn("flex items-center gap-1 transition-opacity", !view.is_pinned && "opacity-0 group-hover:opacity-100")}>
                                 <TooltipProvider>
                                   <Tooltip>
                                     <TooltipTrigger asChild>
                                       <button
                                           onClick={(e) => { e.stopPropagation(); filters.pinView(view.id); }}
                                           className="p-1 hover:bg-background rounded-sm text-muted-foreground hover:text-foreground transition-colors"
                                       >
                                           <Pin className={cn("h-3.5 w-3.5", view.is_pinned && "fill-current text-primary")} />
                                       </button>
                                     </TooltipTrigger>
                                     <TooltipContent>
                                       <p>{view.is_pinned ? "Pinned as default view" : "Pin this view to keep these filters active when you return."}</p>
                                     </TooltipContent>
                                   </Tooltip>
                                 </TooltipProvider>
                                 <button
                                     onClick={(e) => { e.stopPropagation(); filters.deleteView(view.id); }}
                                     className="p-1 hover:bg-background rounded-sm text-muted-foreground hover:text-destructive transition-colors"
                                     title="Delete view"
                                 >
                                     <Trash2 className="h-3.5 w-3.5" />
                                 </button>
                             </div>
                         </div>
                     ))}
                 </div>
             )}

             {filters.savedViews.length > 0 && hasFilters && <Separator />}

             {hasFilters ? (
                 <div className="space-y-2">
                     <div className="text-xs font-medium text-muted-foreground">Save current view</div>
                     <div className="flex gap-2">
                         <Input
                             placeholder="Name..."
                             value={newViewName}
                             onChange={(e) => setNewViewName(e.target.value)}
                             className="h-8 text-sm"
                             onKeyDown={(e) => {
                                 if (e.key === 'Enter' && newViewName.trim()) {
                                     filters.saveView(newViewName.trim());
                                     setNewViewName("");
                                 }
                             }}
                         />
                         <Button
                             size="sm"
                             className="h-8 px-2"
                             disabled={!newViewName.trim()}
                             onClick={() => {
                                 filters.saveView(newViewName.trim());
                                 setNewViewName("");
                             }}
                         >
                             <Save className="h-3.5 w-3.5" />
                         </Button>
                     </div>
                 </div>
             ) : (
                 filters.savedViews.length === 0 && (
                      <div className="text-sm text-muted-foreground text-center py-2">
                         Apply filters to save a view.
                     </div>
                 )
             )}
          </div>

          {/* Type Buttons */}
          <div className="mb-6 flex gap-3">
              <Button
                  variant={isMovieSelected ? "default" : "outline"}
                  className={cn("flex-1 gap-2 h-11", !isMovieSelected && "text-muted-foreground hover:text-foreground")}
                  onClick={() => toggleType("movie")}
              >
                  <Film className="h-4 w-4" />
                  Movies
              </Button>
              <Button
                  variant={isTvSelected ? "default" : "outline"}
                  className={cn("flex-1 gap-2 h-11", !isTvSelected && "text-muted-foreground hover:text-foreground")}
                  onClick={() => toggleType("tv")}
              >
                  <Tv className="h-4 w-4" />
                  TV Shows
              </Button>
          </div>

          <Accordion type="multiple" defaultValue={["social", "platforms"]} className="w-full">

            {/* Social & Personal */}
            <AccordionItem value="social">
              <AccordionTrigger>
                 <span className="flex items-center gap-2"><Users className="h-4 w-4" /> Social & Personal</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="watchlist-mode" className="cursor-pointer font-normal">
                        {filters.watchlistUser && filters.watchlistUser !== profile?.username ? `In ${filters.watchlistUser}'s watchlist` : "In my watchlist"}
                    </Label>
                    <Switch
                        id="watchlist-mode"
                        checked={!!filters.watchlistUser}
                        onCheckedChange={(checked) => filters.setWatchlistUser(checked ? profile?.username || null : null)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                    <Label htmlFor="notseenbyme-mode" className="cursor-pointer font-normal">
                        {filters.notSeenByUser && filters.notSeenByUser !== profile?.username ? `Not seen by ${filters.notSeenByUser}` : "Not seen by me"}
                    </Label>
                    <Switch
                        id="notseenbyme-mode"
                        checked={!!filters.notSeenByUser}
                        onCheckedChange={(checked) => {
                             filters.setNotSeenByUser(checked ? profile?.username || null : null);
                             if (checked) filters.setSeenByUser(null);
                        }}
                    />
                  </div>

                  {/* Not seen by specific friends - moved here */}
                  <div className="space-y-2">
                     <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="specific-not-seen-by-mode" className="text-xs text-muted-foreground cursor-pointer">Not seen by specific friends</Label>
                        <Switch
                           id="specific-not-seen-by-mode"
                           checked={showNotSeenBySpecific}
                           onCheckedChange={(checked) => {
                               setShowNotSeenBySpecific(checked);
                               if (!checked) filters.setNotSeenByUsernames([]);
                           }}
                        />
                     </div>
                     {showNotSeenBySpecific && (
                        <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                             <FriendSelectFilter
                               users={friends}
                               selectedIds={filters.notSeenByUsernames}
                               onSelect={(name) => filters.setNotSeenByUsernames((prev: string[]) => prev.includes(name) ? prev.filter(x => x!==name) : [...prev, name])}
                               mode={filters.notSeenByMode}
                               setMode={filters.setNotSeenByMode}
                             />
                        </div>
                     )}
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-4">
                        <Label htmlFor="seenbyme-mode" className="cursor-pointer font-normal">
                            {filters.seenByUser && filters.seenByUser !== profile?.username ? `Seen by ${filters.seenByUser}` : "Seen by me"}
                        </Label>
                        <Switch
                            id="seenbyme-mode"
                            checked={!!filters.seenByUser}
                            onCheckedChange={(checked) => {
                                filters.setSeenByUser(checked ? profile?.username || null : null);
                                if (checked) filters.setNotSeenByUser(null);
                            }}
                        />
                    </div>

                    {!!filters.seenByUser && (
                        <div className="pl-4 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                            <div className="flex justify-between text-xs text-muted-foreground">
                                <span>My Minimum Rating</span>
                                <span>{filters.minRating || 1}+</span>
                            </div>
                            <Slider
                                defaultValue={[filters.minRating || 1]}
                                max={10}
                                min={1}
                                step={1}
                                onValueChange={(vals) => filters.setMinRating(vals[0])}
                            />
                        </div>
                    )}
                  </div>

                  <div className="space-y-4">
                      <div className="flex items-center justify-between gap-4">
                          <Label htmlFor="ratedbyfriends-mode" className="cursor-pointer font-normal">
                              Rated by friends
                          </Label>
                          <Switch
                              id="ratedbyfriends-mode"
                              checked={filters.ratedByFriends}
                              onCheckedChange={filters.setRatedByFriends}
                          />
                      </div>

                      {filters.ratedByFriends && (
                          <div className="pl-4 space-y-3 animate-in slide-in-from-top-2 fade-in duration-200">
                              <div className="flex justify-between text-xs text-muted-foreground">
                                  <span>Their Minimum Rating</span>
                                  <span>{filters.friendsMinRating || 1}+</span>
                              </div>
                              <Slider
                                  defaultValue={[filters.friendsMinRating || 1]}
                                  max={10}
                                  min={1}
                                  step={1}
                                  onValueChange={(vals) => filters.setFriendsMinRating(vals[0])}
                              />
                          </div>
                      )}
                  </div>

                  {filters.ratedByFriends && (
                    <>
                    <Separator />
                    <div className="space-y-2">
                       <div className="flex items-center justify-between gap-4">
                          <Label htmlFor="specific-rated-by-mode" className="text-xs text-muted-foreground cursor-pointer">Rated by specific friends</Label>
                          <Switch
                             id="specific-rated-by-mode"
                             checked={showRatedBySpecific}
                             onCheckedChange={(checked) => {
                                 setShowRatedBySpecific(checked);
                                 if (!checked) filters.setRatedByUsernames([]);
                             }}
                          />
                       </div>
                       {showRatedBySpecific && (
                          <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                               <FriendSelectFilter
                                 users={friends}
                                 selectedIds={filters.ratedByUsernames}
                                 onSelect={(name) => filters.setRatedByUsernames((prev: string[]) => prev.includes(name) ? prev.filter(x => x!==name) : [...prev, name])}
                                 mode={filters.ratedByMode}
                                 setMode={filters.setRatedByMode}
                               />
                          </div>
                       )}
                    </div>
                    </>
                  )}
              </AccordionContent>
            </AccordionItem>

            {/* Platforms */}
            <AccordionItem value="platforms">
              <AccordionTrigger>
                 <span className="flex items-center gap-2"><Monitor className="h-4 w-4" /> Platforms</span>
              </AccordionTrigger>
              <AccordionContent className="space-y-4 pt-2">
                  <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="my-platforms-mode" className="cursor-pointer font-normal">Available in my platforms</Label>
                      <Switch id="my-platforms-mode" checked={filters.onlyMyPlatforms} onCheckedChange={filters.setOnlyMyPlatforms} />
                  </div>
                  <div className="flex items-center justify-between gap-4">
                      <Label htmlFor="rent-buy-mode" className="cursor-pointer font-normal">Available to rent/buy</Label>
                      <Switch id="rent-buy-mode" checked={filters.availableRentBuy} onCheckedChange={filters.setAvailableRentBuy} />
                  </div>

                  <Separator />

                   <div className="space-y-2">
                      <div className="flex items-center justify-between gap-4">
                          <Label htmlFor="specific-platforms-mode" className="text-xs text-muted-foreground cursor-pointer">Filter by specific platforms</Label>
                          <Switch
                              id="specific-platforms-mode"
                              checked={showSpecificPlatforms}
                              onCheckedChange={(checked) => {
                                  setShowSpecificPlatforms(checked);
                                  if (!checked) filters.setSelectedProviders([]);
                              }}
                          />
                      </div>
                      {showSpecificPlatforms && (
                        !profile?.country ? (
                          <p className="text-xs text-destructive animate-in slide-in-from-top-2 fade-in duration-200">
                              * Please set your country in settings to select platforms.
                          </p>
                        ) : (
                          <div className="animate-in slide-in-from-top-2 fade-in duration-200">
                          <Command shouldFilter={false} className="border rounded-md">
                              <CommandInput
                                  placeholder="Search platform..."
                                  autoFocus={false}
                                  value={providerQuery}
                                  onValueChange={setProviderQuery}
                              />
                              <CommandList className="max-h-[200px] overflow-y-auto">
                                  {loadingProviders && (
                                      <div className="py-6 text-center text-sm text-muted-foreground flex items-center justify-center gap-2">
                                          <Loader2 className="h-4 w-4 animate-spin" /> Loading providers...
                                      </div>
                                  )}
                                  {!loadingProviders && filteredProviders.length === 0 && (
                                      <div className="py-6 text-center text-sm text-muted-foreground">
                                          No platforms found.
                                      </div>
                                  )}
                                  {!loadingProviders && filteredProviders.map((provider) => {
                                      const isSelected = filters.selectedProviders.some((p: Provider) => p.id === provider.id);
                                      return (
                                          <CommandItem
                                              key={provider.id}
                                              value={provider.name}
                                              onSelect={() => {
                                                  if (isSelected) {
                                                      filters.setSelectedProviders((prev: Provider[]) => prev.filter(p => p.id !== provider.id));
                                                  } else {
                                                      filters.setSelectedProviders((prev: Provider[]) => [...prev, provider]);
                                                  }
                                                  setProviderQuery("");
                                              }}
                                              className="cursor-pointer"
                                          >
                                              <div className={cn(
                                                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                                                  isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                                              )}>
                                                  <Check className={cn("h-4 w-4")} />
                                              </div>
                                              {provider.logo ? (
                                                  <img
                                                    src={`https://image.tmdb.org/t/p/w45${provider.logo}`}
                                                    alt={provider.name}
                                                    className="w-5 h-5 rounded-sm mr-2 object-cover"
                                                  />
                                              ) : <div className="w-5 h-5 rounded-sm bg-muted mr-2" />}
                                              <span className="truncate">{provider.name}</span>
                                          </CommandItem>
                                      );
                                  })}
                              </CommandList>
                          </Command>
                          </div>
                      ))}
                   </div>
              </AccordionContent>
            </AccordionItem>

            {/* Genres */}
            <AccordionItem value="genres">
               <AccordionTrigger>
                  <span className="flex items-center gap-2"><Film className="h-4 w-4" /> Genres {filters.selectedGenres.length > 0 && `(${filters.selectedGenres.length})`}</span>
               </AccordionTrigger>
               <AccordionContent>
                  <MultiSelectFilterContent
                       options={genres.map(g => ({ value: g.id, label: g.name }))}
                       selectedValues={filters.selectedGenres}
                       onSelect={(v) => filters.setSelectedGenres((prev: number[]) => prev.includes(v as number) ? prev.filter(x => x!==v) : [...prev, v as number])}
                    />
               </AccordionContent>
            </AccordionItem>

            {/* Country */}
            <AccordionItem value="country">
                <AccordionTrigger>
                  <span className="flex items-center gap-2"><Globe className="h-4 w-4" /> Country {filters.selectedCountries.length > 0 && `(${filters.selectedCountries.length})`}</span>
                </AccordionTrigger>
                <AccordionContent>
                    <MultiSelectFilterContent
                       options={countries.map(c => ({ value: c.code, label: c.name }))}
                       selectedValues={filters.selectedCountries}
                       onSelect={(v) => filters.setSelectedCountries((prev: string[]) => prev.includes(v as string) ? prev.filter(x => x!==v) : [...prev, v as string])}
                    />
                </AccordionContent>
            </AccordionItem>

            {/* Decade */}
            <AccordionItem value="decade">
                <AccordionTrigger>
                  <span className="flex items-center gap-2"><Calendar className="h-4 w-4" /> Decade {filters.selectedDecades.length > 0 && `(${filters.selectedDecades.length})`}</span>
                </AccordionTrigger>
                <AccordionContent>
                    <MultiSelectFilterContent
                       options={decades.map(d => ({ value: d.toString(), label: `${d}s` }))}
                       selectedValues={filters.selectedDecades}
                       onSelect={(v) => filters.setSelectedDecades((prev: string[]) => prev.includes(v as string) ? prev.filter(x => x!==v) : [...prev, v as string])}
                    />
                </AccordionContent>
            </AccordionItem>

            {/* Runtime */}
            <AccordionItem value="runtime">
                <AccordionTrigger>
                   <span className="flex items-center gap-2"><Clock className="h-4 w-4" /> Runtime {filters.selectedRuntimes.length > 0 && `(${filters.selectedRuntimes.length})`}</span>
                </AccordionTrigger>
                <AccordionContent>
                    <MultiSelectFilterContent
                       options={runtimes.map(r => ({ value: r.value, label: r.label }))}
                       selectedValues={filters.selectedRuntimes}
                       onSelect={(v) => filters.setSelectedRuntimes((prev: string[]) => prev.includes(v as string) ? prev.filter(x => x!==v) : [...prev, v as string])}
                    />
                </AccordionContent>
            </AccordionItem>

            {/* Cast & Crew */}
            <AccordionItem value="cast">
                <AccordionTrigger>
                   <span className="flex items-center gap-2"><User className="h-4 w-4" /> Cast & Crew {filters.selectedPeople.length > 0 && `(${filters.selectedPeople.length})`}</span>
                </AccordionTrigger>
                <AccordionContent>
                    <div className="space-y-2">
                       <Input
                          className="h-9"
                          placeholder="Search actor or director..."
                          value={filters.peopleQuery}
                          onChange={(e) => filters.setPeopleQuery(e.target.value)}
                        />
                        {peopleResults.length > 0 ? (
                           <div className="space-y-1 border rounded-md p-1 max-h-[200px] overflow-y-auto">
                              {peopleResults.map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    if (!filters.selectedPeople.find((sp: any) => sp.id === p.id)) filters.setSelectedPeople((prev: any[]) => [...prev, { id: p.id, name: p.name || "" }]);
                                    filters.setPeopleQuery("");
                                    setPeopleResults([]);
                                  }}
                                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-accent hover:text-accent-foreground cursor-pointer text-sm rounded-sm"
                                >
                                   {p.profile_path ? (
                                     <img src={`https://image.tmdb.org/t/p/w45${p.profile_path}`} className="h-6 w-6 rounded-full object-cover" />
                                   ) : <div className="h-6 w-6 rounded-full bg-secondary" />}
                                   <span>{p.name}</span>
                                </div>
                             ))}
                           </div>
                        ) : (
                           filters.peopleQuery.length > 0 && (
                             <p className="p-2 text-center text-sm text-muted-foreground">No results found.</p>
                           )
                        )}
                        {/* Selected People Display */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {filters.selectedPeople.map((p: any) => (
                                <Badge key={p.id} variant="secondary" className="gap-1">
                                    {p.name}
                                    <X
                                      className="h-3 w-3 cursor-pointer"
                                      onClick={() => filters.setSelectedPeople((prev: any[]) => prev.filter(x => x.id !== p.id))}
                                    />
                                </Badge>
                            ))}
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>

            {/* Friends Tags */}
            <AccordionItem value="tags">
                <AccordionTrigger>
                   <span className="flex items-center gap-2"><Tags className="h-4 w-4" /> Friends' Tags {filters.selectedTags.length > 0 && `(${filters.selectedTags.length})`}</span>
                </AccordionTrigger>
                <AccordionContent>
                    <MultiSelectFilterContent
                       options={availableTags.map(t => ({ value: t, label: t }))}
                       selectedValues={filters.selectedTags}
                       onSelect={(v) => filters.setSelectedTags((prev: string[]) => prev.includes(v as string) ? prev.filter(x => x!==v) : [...prev, v as string])}
                       searchPlaceholder="Search tags..."
                    />
                </AccordionContent>
            </AccordionItem>

          </Accordion>

        </div>

        <div className="p-6 pt-4 border-t mt-auto flex-none bg-background flex flex-col gap-2 z-10">
          <Button
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Apply
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full text-muted-foreground h-auto py-2"
            onClick={filters.clearAllFilters}
            disabled={!hasFilters}
          >
            Reset
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
