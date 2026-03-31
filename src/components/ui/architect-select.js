import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import * as React from "react";
import { X, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
export function ArchitectSelect({ selectedArchitects, setSelectedArchitects, placeholder, className, filterType }) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef(null);
    // Creation State
    const [showCreateDialog, setShowCreateDialog] = React.useState(false);
    const [newArchitectName, setNewArchitectName] = React.useState("");
    const [newArchitectType, setNewArchitectType] = React.useState('individual');
    const [isCreating, setIsCreating] = React.useState(false);
    // Fetch architects
    const { data: suggestions = [], isLoading } = useQuery({
        queryKey: ['architects', inputValue, filterType],
        queryFn: async () => {
            let query = supabase.from('architects').select('*').limit(20);
            if (filterType) {
                query = query.eq('type', filterType);
            }
            if (inputValue.length > 0) {
                query = query.ilike('name', `%${inputValue}%`);
            }
            const { data, error } = await query;
            if (error)
                throw error;
            return data;
        },
        // Keep previous data while fetching new to avoid flickering
        placeholderData: (previousData) => previousData,
    });
    const handleSelect = (architect) => {
        setInputValue("");
        if (!selectedArchitects.some(a => a.id === architect.id)) {
            setSelectedArchitects([...selectedArchitects, architect]);
        }
        setTimeout(() => {
            inputRef.current?.focus();
        }, 0);
    };
    const handleUnselect = (id) => {
        setSelectedArchitects(selectedArchitects.filter((a) => a.id !== id));
        inputRef.current?.focus();
    };
    const handleKeyDown = (e) => {
        const input = inputRef.current;
        if (input) {
            if (e.key === "Delete" || e.key === "Backspace") {
                if (input.value === "" && selectedArchitects.length > 0) {
                    handleUnselect(selectedArchitects[selectedArchitects.length - 1].id);
                }
            }
            if (e.key === "Escape") {
                input.blur();
            }
        }
    };
    const initiateCreate = () => {
        setNewArchitectName(inputValue.trim());
        setNewArchitectType(filterType || 'individual'); // default or match filter
        setShowCreateDialog(true);
        setOpen(false); // Close dropdown
    };
    const handleCreateConfirm = async () => {
        if (!newArchitectName)
            return;
        setIsCreating(true);
        try {
            const { data, error } = await supabase
                .from('architects')
                .insert({ name: newArchitectName, type: newArchitectType })
                .select()
                .single();
            if (error)
                throw error;
            // Add to selected
            handleSelect(data);
            setShowCreateDialog(false);
            toast.success(`Created ${newArchitectType} "${newArchitectName}"`);
        }
        catch (_error) {
            toast.error("Failed to create architect. Name might already exist.");
        }
        finally {
            setIsCreating(false);
        }
    };
    const filteredSuggestions = suggestions.filter(s => !selectedArchitects.some(sel => sel.id === s.id));
    const showCreateOption = inputValue.trim() !== "" &&
        !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase());
    return (_jsxs(_Fragment, { children: [_jsxs(Command, { onKeyDown: handleKeyDown, className: cn("overflow-visible bg-transparent", className), shouldFilter: false, children: [_jsx("div", { className: "group border border-border-default bg-surface-muted px-3 py-2 text-sm rounded-sm focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2", children: _jsxs("div", { className: "flex flex-wrap gap-1", children: [selectedArchitects.map((architect) => (_jsxs(Badge, { variant: "secondary", children: [architect.name, _jsx("button", { type: "button", className: "ml-1 rounded-sm outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2", onClick: () => handleUnselect(architect.id), children: _jsx(X, { className: "h-3 w-3 text-text-secondary hover:text-text-primary" }) })] }, architect.id))), _jsx(CommandPrimitive.Input, { ref: inputRef, value: inputValue, onValueChange: setInputValue, onBlur: () => setTimeout(() => setOpen(false), 200), onFocus: () => setOpen(true), placeholder: placeholder, autoComplete: "off", className: "ml-2 flex-1 bg-transparent outline-none placeholder:text-text-disabled min-w-[50px]" })] }) }), _jsx("div", { className: "relative mt-2", children: open && (filteredSuggestions.length > 0 || inputValue.length > 0) && (_jsx("div", { className: "absolute top-0 z-10 w-full rounded-sm border border-border-default bg-surface-overlay text-text-primary shadow-lg outline-none animate-in fade-in-0 zoom-in-95", children: _jsxs(CommandList, { children: [isLoading && (_jsxs(CommandItem, { disabled: true, children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Loading..."] })), _jsxs(CommandGroup, { className: "h-full overflow-auto max-h-[200px]", children: [filteredSuggestions.map((suggestion) => (_jsx(CommandItem, { value: suggestion.name, onSelect: () => handleSelect(suggestion), children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsx("span", { children: suggestion.name }), _jsx(Badge, { variant: "outline", className: "text-[10px] h-5 px-1", children: suggestion.type })] }) }, suggestion.id))), showCreateOption && !isLoading && (_jsxs(CommandItem, { value: inputValue, onSelect: initiateCreate, className: "text-blue-500 font-medium", children: ["+ Create \"", inputValue, "\""] }))] })] }) })) })] }), _jsx(Dialog, { open: showCreateDialog, onOpenChange: setShowCreateDialog, children: _jsxs(DialogContent, { children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { children: "Add New Architect" }), _jsxs(DialogDescription, { children: ["Is ", _jsx("strong", { children: newArchitectName }), " an individual person or a studio/firm?"] })] }), _jsx("div", { className: "grid gap-4 py-4", children: _jsxs(RadioGroup, { value: newArchitectType, onValueChange: (v) => setNewArchitectType(v), children: [_jsxs("div", { className: "flex items-center space-x-2 border border-border-default p-3 rounded-sm cursor-pointer hover:bg-surface-muted/50", onClick: () => setNewArchitectType('individual'), children: [_jsx(RadioGroupItem, { value: "individual", id: "r1" }), _jsx(Label, { htmlFor: "r1", className: "cursor-pointer", children: "Individual Architect" })] }), _jsxs("div", { className: "flex items-center space-x-2 border border-border-default p-3 rounded-sm cursor-pointer hover:bg-surface-muted/50", onClick: () => setNewArchitectType('studio'), children: [_jsx(RadioGroupItem, { value: "studio", id: "r2" }), _jsx(Label, { htmlFor: "r2", className: "cursor-pointer", children: "Architecture Studio/Firm" })] })] }) }), _jsxs(DialogFooter, { children: [_jsx(Button, { variant: "outline", onClick: () => setShowCreateDialog(false), children: "Cancel" }), _jsxs(Button, { onClick: handleCreateConfirm, disabled: isCreating, children: [isCreating && _jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Create"] })] })] }) })] }));
}
