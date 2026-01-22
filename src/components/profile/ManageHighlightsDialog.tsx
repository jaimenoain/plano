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

// Defined architectural styles for the platform
const ARCHITECTURAL_STYLES: Record<number, string> = {
  1: "Modern", 2: "Contemporary", 3: "Brutalist", 4: "Art Deco", 5: "Gothic",
  6: "Classical", 7: "Baroque", 8: "Renaissance", 9: "Industrial", 10: "Minimalist",
  11: "Sustainable", 12: "Victorian", 13: "Bauhaus", 14: "Postmodern", 15: "Mid-Century"
};

interface ManageHighlightsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  favorites: FavoriteItem[]; // Contains styles, architects, quotes
  onSave: (highlights: FavoriteItem[]) => Promise<void>;
}

export function ManageHighlightsDialog({ open, onOpenChange, favorites, onSave }: ManageHighlightsDialogProps) {
  const [styles, setStyles] = useState<FavoriteItem[]>([]);
  const [architects, setArchitects] = useState<FavoriteItem[]>([]);
  const [quotes, setQuotes] = useState<FavoriteItem[]>([]);

  const [activeTab, setActiveTab] = useState("styles");
  const [architectQuery, setArchitectQuery] = useState("");
  const debouncedArchitectQuery = useDebounce(architectQuery, 500);
  const [architectResults, setArchitectResults] = useState<FavoriteItem[]>([]);
  const [loading, setLoading] = useState(false);

  // Quote input state
  const [quoteText, setQuoteText] = useState("");
  const [quoteSource, setQuoteSource] = useState("");

  const [showDiscardAlert, setShowDiscardAlert] = useState(false);

  useEffect(() => {
    if (open) {
      // Filter by the new types: 'style' (formerly genre) and 'architect' (formerly person)
      setStyles(favorites.filter(f => f.type === 'style' || f.type === 'genre'));
      setArchitects(favorites.filter(f => f.type === 'architect' || f.type === 'person'));
      setQuotes(favorites.filter(f => f.type === 'quote'));
      
      setArchitectQuery("");
      setArchitectResults([]);
      // Reset quote input state
      setQuoteText("");
      setQuoteSource("");
    }
  }, [open, favorites]);

  const hasChanges = () => {
    const initialStyles = favorites.filter(f => f.type === 'style' || f.type === 'genre').map(f => f.id).sort().join(',');
    const currentStyles = styles.map(f => f.id).sort().join(',');

    const initialArchitects = favorites.filter(f => f.type === 'architect' || f.type === 'person').map(f => f.id).sort().join(',');
    const currentArchitects = architects.map(f => f.id).sort().join(',');

    const initialQuotes = favorites.filter(f => f.type === 'quote').map(f => f.id).sort().join(',');
    const currentQuotes = quotes.map(f => f.id).sort().join(',');

    return initialStyles !== currentStyles || initialArchitects !== currentArchitects || initialQuotes !== currentQuotes;
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

  // --- Styles ---
  const toggleStyle = (id: number, name: string) => {
    if (styles.find(g => g.id === id)) {
      setStyles(prev => prev.filter(g => g.id !== id));
    } else {
      if (styles.length >= 5) return;
      // Saving as new type 'style'
      setStyles(prev => [...prev, { id, title: name, type: 'style' }]);
    }
  };

  // --- Architects Search ---
  useEffect(() => {
    if (debouncedArchitectQuery.length < 2) {
      setArchitectResults([]);
      return;
    }

    // TODO: Implement actual architect search against a profiles table or external API
    // For now, we are disabling this to prevent errors as no dedicated architect database exists yet.
    console.log("Architect search currently disabled.");
    setArchitectResults([]);

  }, [debouncedArchitectQuery]);

  const toggleArchitect = (architect: FavoriteItem) => {
    if (architects.find(p => p.id === architect.id)) {
      setArchitects(prev => prev.filter(p => p.id !== architect.id));
    } else {
      if (architects.length >= 5) return;
      // Ensure type is set to 'architect'
      setArchitects(prev => [...prev, { ...architect, type: 'architect' }]);
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
    // Combine all and ensure types are strictly the new values before saving
    const combined = [
      ...styles.map(s => ({ ...s, type: 'style' })), 
      ...architects.map(a => ({ ...a, type: 'architect' })), 
      ...quotes
    ];
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
                          <TabsTrigger value="styles">Styles</TabsTrigger>
                          <TabsTrigger value="architects">Architects</TabsTrigger>
                          <TabsTrigger value="quotes">Quotes</TabsTrigger>
                      </TabsList>
                  </Tabs>
              </div>

              <div className="flex-1 overflow-y-auto p-4">

                  {/* STYLES TAB */}
                  {activeTab === "styles" && (
                      <div className="space-y-4">
                          <div className="flex items-center justify-between">
                              <h4 className="text-sm font-medium">Select up to 5 styles</h4>
                              <span className="text-xs text-muted-foreground">{styles.length}/5</span>
                          </div>
                          <div className="flex flex-wrap gap-2">
                              {Object.entries(ARCHITECTURAL_STYLES).map(([id, name]) => {
                                  const isSelected = !!styles.find(g => g.id === Number(id));
                                  return (
                                      <Button
                                          key={id}
                                          variant={isSelected ? "default" : "outline"}
                                          size="sm"
                                          onClick={() => toggleStyle(Number(id), name)}
                                          className={cn("h-8 rounded-full", isSelected ? "pl-2 pr-3" : "px-3")}
                                          disabled={!isSelected && styles.length >= 5}
                                      >
                                          {isSelected && <Check className="mr-1.5 h-3 w-3" />}
                                          {name}
                                      </Button>
                                  )
                              })}
                          </div>
                      </div>
                  )}

                  {/* ARCHITECTS TAB */}
                  {activeTab === "architects" && (
                      <div className="space-y-4">
                          <div className="relative">
                              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                              <Input
                                  placeholder="Search architects..."
                                  value={architectQuery}
                                  onChange={e => setArchitectQuery(e.target.value)}
                                  className="pl-9"
                              />
                          </div>

                          <p className="text-sm text-muted-foreground text-center py-4">
                              Architect search is coming soon.
                          </p>

                          {/* Selected Architects */}
                          {architects.length > 0 && (
                              <div className="space-y-2">
                                  <span className="text-xs text-muted-foreground font-bold uppercase">Selected ({architects.length}/5)</span>
                                  <div className="space-y-1">
                                      {architects.map(p => (
                                          <div key={p.id} className="flex items-center justify-between p-2 rounded-md bg-secondary/50">
                                              <div className="flex items-center gap-3">
                                                  <div className="h-10 w-10 rounded-full bg-muted overflow-hidden">
                                                      {p.poster_path && <img src={p.poster_path} className="w-full h-full object-cover" alt={p.title}/>}
                                                  </div>
                                                  <span className="text-sm font-medium">{p.title}</span>
                                              </div>
                                              <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => toggleArchitect(p)}>
                                                  <X className="h-4 w-4" />
                                              </Button>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                          )}

                          {/* Search Results */}
                          {architectResults.length > 0 && (
                               <div className="space-y-2 mt-4">
                                  <span className="text-xs text-muted-foreground font-bold uppercase">Results</span>
                                  <div className="space-y-1">
                                      {architectResults.map(p => {
                                          const isSelected = !!architects.find(sel => sel.id === p.id);
                                          return (
                                              <button
                                                  key={p.id}
                                                  onClick={() => !isSelected && toggleArchitect(p)}
                                                  disabled={!isSelected && architects.length >= 5}
                                                  className={cn(
                                                      "flex items-center gap-3 p-2 rounded-md w-full text-left transition-colors",
                                                      isSelected ? "bg-primary/10 opacity-50 cursor-default" : "hover:bg-secondary"
                                                  )}
                                              >
                                                  <div className="h-10 w-10 rounded-full bg-muted overflow-hidden shrink-0">
                                                      {p.poster_path && <img src={p.poster_path} className="w-full h-full object-cover" alt={p.title}/>}
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
