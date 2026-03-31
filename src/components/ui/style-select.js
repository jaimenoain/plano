import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { slugify } from "@/utils/url";
export function StyleSelect({ selectedStyles, setSelectedStyles, placeholder, className, }) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef(null);
    const [isCreating, setIsCreating] = React.useState(false);
    // Fetch styles
    const { data: suggestions = [], isLoading } = useQuery({
        queryKey: ['architectural_styles', inputValue],
        queryFn: async () => {
            let query = supabase.from('architectural_styles').select('*').limit(20);
            if (inputValue.length > 0) {
                query = query.ilike('name', `%${inputValue}%`);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data;
        },
        placeholderData: (previousData) => previousData,
    });
    const handleSelect = (style) => {
        setInputValue("");
        if (!selectedStyles.some(s => s.id === style.id)) {
            setSelectedStyles([...selectedStyles, style]);
        }
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };
    const handleUnselect = (id) => {
        setSelectedStyles(selectedStyles.filter((s) => s.id !== id));
        inputRef.current?.focus();
    };
    const handleKeyDown = (e) => {
        const input = inputRef.current;
        if (input) {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (input.value === "" && selectedStyles.length > 0) {
                    handleUnselect(selectedStyles[selectedStyles.length - 1].id);
                }
            }
            if (e.key === "Escape") {
                input.blur();
            }
        }
    };
    const handleCreate = async () => {
        if (!inputValue.trim())
            return;
        setIsCreating(true);
        try {
            const name = inputValue.trim();
            // Simple slug generation
            const slug = slugify(name);
            const { data, error } = await supabase
                .from('architectural_styles')
                .insert({ name, slug })
                .select()
                .single();
            if (error)
                throw error;
            handleSelect(data);
            toast.success(`Created style "${name}"`);
        }
        catch (_error) {
            toast.error("Failed to create style. It might already exist.");
        }
        finally {
            setIsCreating(false);
        }
    };
    const filteredSuggestions = suggestions.filter(s => !selectedStyles.some(sel => sel.id === s.id));
    const showCreateOption = inputValue.trim() !== "" &&
        !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase());
    return (_jsxs(Command, { onKeyDown: handleKeyDown, className: cn("overflow-visible bg-transparent", className), shouldFilter: false, children: [_jsx("div", { className: "group border border-border-default bg-surface-muted px-3 py-2 text-sm rounded-sm focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2", children: _jsxs("div", { className: "flex flex-wrap gap-1", children: [selectedStyles.map((style) => (_jsxs(Badge, { variant: "secondary", children: [style.name, _jsx("button", { type: "button", className: "ml-1 rounded-sm outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2", onClick: () => handleUnselect(style.id), children: _jsx(X, { className: "h-3 w-3 text-text-secondary hover:text-text-primary" }) })] }, style.id))), _jsx(CommandPrimitive.Input, { ref: inputRef, value: inputValue, onValueChange: setInputValue, onBlur: () => setTimeout(() => setOpen(false), 200), onFocus: () => setOpen(true), placeholder: placeholder, autoComplete: "off", className: "ml-2 flex-1 bg-transparent outline-none placeholder:text-text-disabled min-w-[50px]" })] }) }), _jsx("div", { className: "relative mt-2", children: open && (filteredSuggestions.length > 0 || inputValue.length > 0) && (_jsx("div", { className: "absolute top-0 z-10 w-full rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-none animate-in fade-in-0 zoom-in-95", children: _jsxs(CommandList, { children: [isLoading && (_jsxs(CommandItem, { disabled: true, children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Loading..."] })), _jsxs(CommandGroup, { className: "h-full overflow-auto max-h-[200px]", children: [filteredSuggestions.map((suggestion) => (_jsx(CommandItem, { value: suggestion.name, onSelect: () => handleSelect(suggestion), children: suggestion.name }, suggestion.id))), showCreateOption && !isLoading && (_jsxs(CommandItem, { value: inputValue, onSelect: handleCreate, disabled: isCreating, className: "text-blue-500 font-medium", children: ["+ Create \"", inputValue, "\""] }))] })] }) })) })] }));
}
