import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Loader2, Search, X, Check, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/useDebounce";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "@/components/ui/alert-dialog";
// Defined architectural styles for the platform
const ARCHITECTURAL_STYLES = {
    1: "Modern", 2: "Contemporary", 3: "Brutalist", 4: "Art Deco", 5: "Gothic",
    6: "Classical", 7: "Baroque", 8: "Renaissance", 9: "Industrial", 10: "Minimalist",
    11: "Sustainable", 12: "Victorian", 13: "Bauhaus", 14: "Postmodern", 15: "Mid-Century"
};
export function ManageHighlightsDialog({ open, onOpenChange, favorites, onSave }) {
    const [styles, setStyles] = useState([]);
    const [architects, setArchitects] = useState([]);
    const [quotes, setQuotes] = useState([]);
    const [activeTab, setActiveTab] = useState("styles");
    const [architectQuery, setArchitectQuery] = useState("");
    const debouncedArchitectQuery = useDebounce(architectQuery, 500);
    const [architectResults, setArchitectResults] = useState([]);
    const [loading, _setLoading] = useState(false);
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
    const handleOpenChangeWrapper = (newOpen) => {
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
    const toggleStyle = (id, name) => {
        if (styles.find(g => g.id === id)) {
            setStyles(prev => prev.filter(g => g.id !== id));
        }
        else {
            if (styles.length >= 5)
                return;
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
        setArchitectResults([]);
    }, [debouncedArchitectQuery]);
    const toggleArchitect = (architect) => {
        if (architects.find(p => p.id === architect.id)) {
            setArchitects(prev => prev.filter(p => p.id !== architect.id));
        }
        else {
            if (architects.length >= 5)
                return;
            // Ensure type is set to 'architect'
            setArchitects(prev => [...prev, { ...architect, type: 'architect' }]);
        }
    };
    // --- Quotes ---
    const addQuote = () => {
        if (!quoteText.trim())
            return;
        const newQuote = {
            id: crypto.randomUUID(),
            title: quoteText, // storing text in title
            quote_source: quoteSource,
            type: 'quote'
        };
        setQuotes(prev => [...prev, newQuote]);
        setQuoteText("");
        setQuoteSource("");
    };
    const removeQuote = (id) => {
        setQuotes(prev => prev.filter(q => q.id !== id));
    };
    // --- Save ---
    const handleSave = async () => {
        // Combine all and ensure types are strictly the new values before saving
        const combined = [
            ...styles.map((s) => ({ ...s, type: 'style' })),
            ...architects.map((a) => ({ ...a, type: 'architect' })),
            ...quotes,
        ];
        await onSave(combined);
        onOpenChange(false);
    };
    return (_jsxs(_Fragment, { children: [_jsx(Dialog, { open: open, onOpenChange: handleOpenChangeWrapper, children: _jsxs(DialogContent, { className: "sm:max-w-lg h-[80vh] flex flex-col p-0 gap-0", children: [_jsxs(DialogHeader, { className: "p-4 border-b", children: [_jsx(DialogTitle, { children: "Edit Profile Highlights" }), _jsx(DialogDescription, { children: "Share your favorite styles, architects, and quotes." })] }), _jsxs("div", { className: "flex-1 overflow-hidden flex flex-col", children: [_jsx("div", { className: "px-4 py-2 border-b", children: _jsx(Tabs, { value: activeTab, onValueChange: setActiveTab, className: "w-full", children: _jsxs(TabsList, { className: "w-full grid grid-cols-3", children: [_jsx(TabsTrigger, { value: "styles", children: "Styles" }), _jsx(TabsTrigger, { value: "architects", children: "Architects" }), _jsx(TabsTrigger, { value: "quotes", children: "Quotes" })] }) }) }), _jsxs("div", { className: "flex-1 overflow-y-auto p-4", children: [activeTab === "styles" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h4", { className: "text-sm font-medium", children: "Select up to 5 styles" }), _jsxs("span", { className: "text-xs text-text-secondary", children: [styles.length, "/5"] })] }), _jsx("div", { className: "flex flex-wrap gap-2", children: Object.entries(ARCHITECTURAL_STYLES).map(([id, name]) => {
                                                        const isSelected = !!styles.find(g => g.id === Number(id));
                                                        return (_jsxs(Button, { variant: isSelected ? "default" : "outline", size: "sm", onClick: () => toggleStyle(Number(id), name), className: cn("h-8 rounded-full", isSelected ? "pl-2 pr-3" : "px-3"), disabled: !isSelected && styles.length >= 5, children: [isSelected && _jsx(Check, { className: "mr-1.5 h-3 w-3" }), name] }, id));
                                                    }) })] })), activeTab === "architects" && (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" }), _jsx(Input, { placeholder: "Search architects...", value: architectQuery, onChange: e => setArchitectQuery(e.target.value), className: "pl-9" })] }), _jsx("p", { className: "text-sm text-text-secondary text-center py-4", children: "Architect search is coming soon." }), architects.length > 0 && (_jsxs("div", { className: "space-y-2", children: [_jsxs("span", { className: "text-xs text-text-secondary font-bold uppercase", children: ["Selected (", architects.length, "/5)"] }), _jsx("div", { className: "space-y-1", children: architects.map(p => (_jsxs("div", { className: "flex items-center justify-between p-2 rounded-md bg-surface-muted/50", children: [_jsxs("div", { className: "flex items-center gap-3", children: [_jsx("div", { className: "h-10 w-10 rounded-full bg-surface-muted overflow-hidden", children: p.image_url && _jsx("img", { src: p.image_url, className: "w-full h-full object-cover", alt: p.title }) }), _jsx("span", { className: "text-sm font-medium", children: p.title })] }), _jsx(Button, { variant: "ghost", size: "icon", className: "h-8 w-8 text-text-secondary hover:text-feedback-destructive", onClick: () => toggleArchitect(p), children: _jsx(X, { className: "h-4 w-4" }) })] }, p.id))) })] })), architectResults.length > 0 && (_jsxs("div", { className: "space-y-2 mt-4", children: [_jsx("span", { className: "text-xs text-text-secondary font-bold uppercase", children: "Results" }), _jsx("div", { className: "space-y-1", children: architectResults.map(p => {
                                                                const isSelected = !!architects.find(sel => sel.id === p.id);
                                                                return (_jsxs("button", { onClick: () => !isSelected && toggleArchitect(p), disabled: !isSelected && architects.length >= 5, className: cn("flex items-center gap-3 p-2 rounded-md w-full text-left transition-colors", isSelected ? "bg-brand-primary/10 opacity-50 cursor-default" : "hover:bg-surface-muted"), children: [_jsx("div", { className: "h-10 w-10 rounded-full bg-surface-muted overflow-hidden shrink-0", children: p.image_url && _jsx("img", { src: p.image_url, className: "w-full h-full object-cover", alt: p.title }) }), _jsx("span", { className: "text-sm font-medium truncate", children: p.title }), isSelected && _jsx(Check, { className: "ml-auto h-4 w-4 text-brand-primary" })] }, p.id));
                                                            }) })] })), loading && _jsx("div", { className: "flex justify-center py-4", children: _jsx(Loader2, { className: "h-6 w-6 animate-spin text-text-secondary" }) })] })), activeTab === "quotes" && (_jsxs("div", { className: "space-y-6", children: [_jsxs("div", { className: "space-y-3 p-4 bg-surface-muted/30 rounded-lg border border-border-default/50", children: [_jsxs("div", { className: "space-y-1", children: [_jsx(Label, { className: "text-xs", children: "Quote" }), _jsx(Textarea, { placeholder: "Enter quote text...", value: quoteText, onChange: e => setQuoteText(e.target.value), className: "resize-none h-20" })] }), _jsxs("div", { className: "space-y-1", children: [_jsx(Label, { className: "text-xs", children: "Source (Architect/Building) - Optional" }), _jsx(Input, { placeholder: "e.g. Frank Lloyd Wright", value: quoteSource, onChange: e => setQuoteSource(e.target.value) })] }), _jsxs(Button, { onClick: addQuote, disabled: !quoteText.trim(), className: "w-full", size: "sm", children: [_jsx(Plus, { className: "mr-2 h-4 w-4" }), " Add Quote"] })] }), quotes.length > 0 && (_jsxs("div", { className: "space-y-3", children: [_jsxs("span", { className: "text-xs text-text-secondary font-bold uppercase", children: ["Your Quotes (", quotes.length, ")"] }), quotes.map((q, _i) => (_jsxs("div", { className: "relative group p-3 rounded-lg bg-surface-muted/20 border border-border-default/50", children: [_jsxs("p", { className: "text-sm italic pr-6", children: ["\"", q.title, "\""] }), q.quote_source && _jsxs("p", { className: "text-xs text-text-secondary mt-1", children: ["\u2014 ", q.quote_source] }), _jsx("button", { onClick: () => removeQuote(q.id), className: "absolute top-2 right-2 text-text-secondary/50 hover:text-feedback-destructive transition-colors", children: _jsx(Trash2, { className: "h-4 w-4" }) })] }, q.id)))] }))] }))] })] }), _jsx("div", { className: "p-4 border-t bg-surface-default", children: _jsx(Button, { onClick: handleSave, className: "w-full", children: "Save Changes" }) })] }) }), _jsx(AlertDialog, { open: showDiscardAlert, onOpenChange: setShowDiscardAlert, children: _jsxs(AlertDialogContent, { children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { children: "Unsaved Changes" }), _jsx(AlertDialogDescription, { children: hasUnsavedQuote
                                        ? "You have text in the quote field that hasn't been added. Please click 'Add Quote' to save it, or discard to lose it."
                                        : "You have unsaved changes. Are you sure you want to discard them?" })] }), _jsxs(AlertDialogFooter, { children: [_jsx(AlertDialogCancel, { onClick: () => setShowDiscardAlert(false), children: "Cancel" }), _jsx(AlertDialogAction, { onClick: handleConfirmDiscard, children: "Discard Changes" })] })] }) })] }));
}
