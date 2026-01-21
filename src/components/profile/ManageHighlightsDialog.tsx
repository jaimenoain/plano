import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { FavoriteItem } from "./types";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Search, X, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Sample genres for architecture/design context, or keep generic if needed
const GENRE_MAP: Record<number, string> = {
  1: "Modern", 2: "Contemporary", 3: "Brutalist", 4: "Art Deco", 5: "Gothic",
  6: "Classical", 7: "Baroque", 8: "Renaissance", 9: "Industrial", 10: "Minimalist",
  11: "Sustainable", 12: "Victorian", 13: "Bauhaus", 14: "Postmodern", 15: "Mid-Century"
};

interface ManageHighlightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorites: FavoriteItem[]; // Contains genres, people, quotes
  onSave: (highlights: FavoriteItem[]) => Promise<void>;
}

export function ManageHighlightsDialog({ open, onOpenChange, favorites, onSave }: ManageHighlightsDialogProps) {
  const [genres, setGenres] = useState<FavoriteItem[]>([]);
  const [people, setPeople] = useState<FavoriteItem[]>([]);
  const [quotes, setQuotes] = useState<FavoriteItem[]>([]);

  const [activeTab, setActiveTab] = useState("genres");
  const [personQuery, setPersonQuery] = useState("");
  const debouncedPersonQuery = useDebounce(personQuery, 500);
  const [personResults, setPersonResults] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Quote input state
  const [quoteText, setQuoteText] = useState("");
  const [quoteSource, setQuoteSource] = useState("");

  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  useEffect(() => {
    if (open) {
      setGenres(favorites.filter(f => f.type === 'genre'));
      setPeople(favorites.filter(f => f.type === 'person'));
      setQuotes(favorites.filter(f => f.type === 'quote'));
      setPersonQuery("");
      setPersonResults([]);
      // Reset quote input state
      setQuoteText("");
      setQuoteSource("");
    }
  }, [open, favorites]);

  const hasChanges = () => {
    const initialGenres = favorites.filter(f => f.type === 'genre').map(f => f.id).sort().join(',');
    const currentGenres = genres.map(f => f.id).sort().join(',');

    const initialPeople = favorites.filter(f => f.type === 'person').map(f => f.id).sort().join(',');
    const currentPeople = people.map(f => f.id).sort().join(',');

    const initialQuotes = favorites.filter(f => f.type === 'quote').map(f => f.id).sort().join(',');
    const currentQuotes = quotes.map(f => f.id).sort().join(',');

    return initialGenres !== currentGenres || initialPeople !== currentPeople || initialQuotes !== currentQuotes;
  };

  const hasUnsavedQuote = quoteText.trim().length > 0;

  const handleOpenChangeWrapper = (newOpen: boolean) => {
    if (!newOpen) {
        if (hasUnsavedQuote || hasChanges()) {
            setShowDiscardAlert(true);
            return;
        }
    }
    onOpenChange(newOpen);
  };

  const handleConfirmDiscard = () => {
    setShowDiscardAlert(false);
    onOpenChange(false);
  };

  // --- Genres ---
  const toggleGenre = (id: number, name: string) => {
    if (genres.find(g => g.id === id)) {
      setGenres(prev => prev.filter(g => g.id !== id));
    } else {
      if (genres.length >= 5) return;
      setGenres(prev => [...prev, { id, title: name, type: 'genre' }]);
    }
  };

  // --- People Search ---
  useEffect(() => {
    if (debouncedPersonQuery.length < 2) {
      setPersonResults([]);
      return;
    }

    // Using search_buildings for now but technically we want search_people or similar if we have an architects table
    // Since we don't have an architects table with images, we might have to mock this or use buildings as "people"
    // or just search for architects in buildings metadata.
    // Given the constraints, I will disable "People" search or adapt it to search buildings but that doesn't make sense for "People".
    // I will comment out the TMDB call and leave it empty or mock it for now to avoid crashes.
    // Ideally, we'd search a 'profiles' table or a dedicated 'architects' table.

    // For now, let's search buildings and pretend they are people? No.
    // Let's just return empty or maybe search profiles if user wants to highlight users?
    // The previous code searched TMDB for people.
    // I'll skip this implementation to avoid TMDB calls, and just log.
    console.log("People search disabled as no architect database exists yet.");
    setPersonResults([]);

  }, [debouncedPersonQuery]);

  const togglePerson = (person: FavoriteItem) => {
    if (people.find(p => p.id === person.id)) {
      setPeople(prev => prev.filter(p => p.id !== person.id));
    } else {
      if (people.length >= 5) return;
      setPeople(prev => [...prev, person]);
    }
  };

  // --- Quotes ---
  const addQuote = () => {
    if (!quoteText.trim()) return;
    const newQuote: FavoriteItem = {
      id: crypto.randomUUID(),
      title: quoteText, // storing text in title
      quote_source: quoteSource,
      type: 'quote'
    };
    setQuotes(prev => [...prev, newQuote]);
    setQuoteText("");
    setQuoteSource("");
  };

  const removeQuote = (id: string | number) => {
    setQuotes(prev => prev.filter(q => q.id !== id));
  };

  // --- Save ---
  const handleSave = async () => {
    const combined = [...genres, ...people, ...quotes];
    await onSave(combined);
    onOpenChange(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleOpenChangeWrapper}>
        <DialogContent className="sm:max-w-lg h-[80vh] flex flex-col p-0 gap-0">
          <DialogHeader className="p-4 border-b">
            <DialogTitle>Edit Profile Highlights</DialogTitle>
            <DialogDescription>Share your favorite styles, architects, and quotes.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-hidden flex flex-col">
              <div className="px-4 py-2 border-b">
                  <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                      <TabsList className="w-full grid grid-cols-3">
                          <TabsTrigger value="genres">Styles</TabsTrigger>
                          <TabsTrigger value="people">Architects</TabsTrigger>
                          <TabsTrigger value="quotes">Quotes</TabsTrigger>
                      </TabsList>
                  </Tabs>
              </div>

              <div className="flex-1 overflow-y-auto p-4">

                  {/* GENRES (STYLES) TAB */}
                  {activeTab === "genres" && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">Select up to 5 styles</h4>
                              <span className="text-xs text-muted-foreground">{genres.length}/5</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {Object.entries(GENRE_MAP).map(([id, name]) => {
                                  const isSelected = !!genres.find(g => g.id === Number(id));
                                  return (
                                      <Button
                                          key={id}
                                          variant={isSelected ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => toggleGenre(Number(id), name)}
                                          className={cn("h-8 rounded-full", isSelected ? "pl-2 pr-3" : "px-3")}
                                          disabled={!isSelected && genres.length >= 5}
                                      >
                                          {isSelected && <Check className="mr-1.5 h-3 w-3" />}
                                          {name}
                                      </Button>
                                  )
                              })}
                          </div>
                      </div>
                  )}

                  {/* PEOPLE (ARCHITECTS) TAB */}
                  {activeTab === "people" && (
                      <div className="space-y-4">
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                  placeholder="Search architects..."
                                  value={personQuery}
                                  onChange={e => setPersonQuery(e.target.value)}
                                  className="pl-9"
                              />
                          </div>

                          <p className="text-sm text-muted-foreground text-center py-4">
                              Architect search is coming soon.
                          </p>

                          {/* Selected People */}
                          {people.length > 0 && (
                              <div className="space-y-2">
                                  <span className="text-xs text-muted-foreground font-bold uppercase">Selected ({people.length}/5)</span>
                                  <div className="space-y-1">
                                      {people.map(p => (
                                          <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                                              <div className="flex items-center gap-3">
                                                  <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                                                      {p.poster_path && <img src={p.poster_path} className="w-full h-full object-cover"/>}
                                                  </div>
                                                  <span className="text-sm font-medium">{p.title}</span>
                                              </div>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => togglePerson(p)}>
                                                  <X className="h-4 w-4" />
                                              </Button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* Search Results */}
                          {personResults.length > 0 && (
                               <div className="space-y-2 mt-4">
                                  <span className="text-xs text-muted-foreground font-bold uppercase">Results</span>
                                  <div className="space-y-1">
                                      {personResults.map(p => {
                                          const isSelected = !!people.find(sel => sel.id === p.id);
                                          return (
                                              <button
                                                  key={p.id}
                                                  onClick={() => !isSelected && togglePerson(p)}
                                                  disabled={!isSelected && people.length >= 5}
                                                  className={cn(
                                                      "flex items-center gap-3 p-2 rounded-md w-full text-left transition-colors",
                                                      isSelected ? "bg-primary/10 opacity-50 cursor-default" : "hover:bg-secondary"
                                                  )}
                                              >
                                                  <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
                                                      {p.poster_path && <img src={p.poster_path} className="w-full h-full object-cover"/>}
                                                  </div>
                                                  <span className="text-sm font-medium truncate">{p.title}</span>
                                                  {isSelected && <Check className="ml-auto h-4 w-4 text-primary" />}
                                              </button>
                                          )
                                      })}
                                  </div>
                               </div>
                          )}
                          {loading && <div className="flex justify-center py-4"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>}
                      </div>
                  )}

                  {/* QUOTES TAB */}
                  {activeTab === "quotes" && (
                      <div className="space-y-6">
                          <div className="space-y-3 p-4 bg-secondary/30 rounded-lg border border-border/50">
                               <div className="space-y-1">
                                   <Label className="text-xs">Quote</Label>
                                   <Textarea
                                      placeholder="Enter quote text..."
                                      value={quoteText}
                                      onChange={e => setQuoteText(e.target.value)}
                                      className="resize-none h-20"
                                  />
                               </div>
                               <div className="space-y-1">
                                   <Label className="text-xs">Source (Architect/Building) - Optional</Label>
                                   <Input
                                      placeholder="e.g. Frank Lloyd Wright"
                                      value={quoteSource}
                                      onChange={e => setQuoteSource(e.target.value)}
                                   />
                               </div>
                               <Button onClick={addQuote} disabled={!quoteText.trim()} className="w-full" size="sm">
                                   <Plus className="mr-2 h-4 w-4" /> Add Quote
                               </Button>
                          </div>

                          {quotes.length > 0 && (
                              <div className="space-y-3">
                                  <span className="text-xs text-muted-foreground font-bold uppercase">Your Quotes ({quotes.length})</span>
                                  {quotes.map((q, i) => (
                                      <div key={q.id} className="relative group p-3 rounded-lg bg-secondary/20 border border-border/50">
                                          <p className="text-sm italic pr-6">"{q.title}"</p>
                                          {q.quote_source && <p className="text-xs text-muted-foreground mt-1">— {q.quote_source}</p>}
                                          <button
                                              onClick={() => removeQuote(q.id)}
                                              className="absolute top-2 right-2 text-muted-foreground/50 hover:text-destructive transition-colors"
                                          >
                                              <Trash2 className="h-4 w-4" />
                                          </button>
                                      </div>
                                  ))}
                              </div>
                          )}
                      </div>
                  )}
              </div>
          </div>

          <div className="p-4 border-t bg-background">
              <Button onClick={handleSave} className="w-full">Save Changes</Button>
          </div>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDiscardAlert} onOpenChange={setShowDiscardAlert}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              {hasUnsavedQuote
                ? "You have text in the quote field that hasn't been added. Please click 'Add Quote' to save it, or discard to lose it."
                : "You have unsaved changes. Are you sure you want to discard them?"}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setShowDiscardAlert(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDiscard}>Discard Changes</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
