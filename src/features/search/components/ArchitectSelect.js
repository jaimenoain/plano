import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import * as React from "react";
import { X, Loader2, PencilRuler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command";
import { Command as CommandPrimitive } from "cmdk";
import { cn } from "@/lib/utils";
import { useArchitectSearch } from "../hooks/useArchitectSearch";
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover";
export function ArchitectSelect({ selectedArchitects, setSelectedArchitects, placeholder, className, }) {
    const [open, setOpen] = React.useState(false);
    const [inputValue, setInputValue] = React.useState("");
    const inputRef = React.useRef(null);
    const containerRef = React.useRef(null);
    const [containerWidth, setContainerWidth] = React.useState(0);
    const { architects, isLoading } = useArchitectSearch({
        searchQuery: inputValue,
        limit: 5,
        enabled: open
    });
    React.useLayoutEffect(() => {
        if (containerRef.current) {
            setContainerWidth(containerRef.current.offsetWidth);
            const observer = new ResizeObserver((entries) => {
                for (const entry of entries) {
                    if (entry.target instanceof HTMLElement) {
                        setContainerWidth(entry.target.offsetWidth);
                    }
                }
            });
            observer.observe(containerRef.current);
            return () => observer.disconnect();
        }
        return undefined;
    }, []);
    const handleSelect = (architect) => {
        setInputValue("");
        if (!selectedArchitects.some(a => a.id === architect.id)) {
            setSelectedArchitects([...selectedArchitects, { id: architect.id, name: architect.name }]);
        }
        // Keep focus on input
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
                setOpen(false);
            }
        }
    };
    const filteredSuggestions = architects.filter(a => !selectedArchitects.some(sel => sel.id === a.id));
    const showPopover = open && (filteredSuggestions.length > 0 || inputValue.length > 0);
    return (_jsx(Popover, { open: showPopover, onOpenChange: setOpen, children: _jsxs(Command, { onKeyDown: handleKeyDown, className: cn("overflow-visible bg-transparent", className), shouldFilter: false, children: [_jsx(PopoverAnchor, { asChild: true, children: _jsx("div", { ref: containerRef, className: "group border border-border-default px-3 py-2 text-sm rounded-md focus-within:ring-2 focus-within:ring-brand-primary focus-within:ring-offset-2 bg-surface-default relative", children: _jsxs("div", { className: "flex flex-wrap gap-1", children: [selectedArchitects.map((architect) => (_jsxs(Badge, { variant: "secondary", className: "pl-1", children: [_jsx(PencilRuler, { className: "h-3 w-3 mr-1" }), architect.name, _jsx("button", { type: "button", className: "ml-1 rounded-full outline-none focus:ring-2 focus:ring-brand-primary focus:ring-offset-2", onClick: () => handleUnselect(architect.id), children: _jsx(X, { className: "h-3 w-3 text-text-secondary hover:text-text-primary" }) })] }, architect.id))), _jsx(CommandPrimitive.Input, { ref: inputRef, value: inputValue, onValueChange: setInputValue, onFocus: () => setOpen(true), onBlur: () => {
                                        if (!showPopover) {
                                            setOpen(false);
                                        }
                                    }, placeholder: placeholder, autoComplete: "off", className: "ml-2 flex-1 bg-transparent outline-none placeholder:text-text-secondary min-w-[50px]" })] }) }) }), _jsx(PopoverContent, { className: "p-0", align: "start", onOpenAutoFocus: (e) => e.preventDefault(), style: { width: containerWidth > 0 ? containerWidth : "auto" }, children: _jsxs(CommandList, { children: [isLoading && (_jsxs(CommandItem, { disabled: true, children: [_jsx(Loader2, { className: "mr-2 h-4 w-4 animate-spin" }), "Loading..."] })), _jsxs(CommandGroup, { className: "h-full overflow-auto max-h-[200px]", children: [filteredSuggestions.map((suggestion) => (_jsx(CommandItem, { value: suggestion.name, onSelect: () => handleSelect(suggestion), children: _jsxs("div", { className: "flex items-center gap-2", children: [_jsx(PencilRuler, { className: "h-4 w-4 text-text-secondary" }), _jsxs("div", { className: "flex flex-col", children: [_jsx("span", { children: suggestion.name }), _jsx("span", { className: "text-[10px] text-text-secondary capitalize", children: suggestion.type })] })] }) }, suggestion.id))), !isLoading && inputValue.length >= 3 && filteredSuggestions.length === 0 && (_jsx(CommandItem, { disabled: true, children: "No architects found" })), !isLoading && inputValue.length > 0 && inputValue.length < 3 && filteredSuggestions.length === 0 && (_jsx(CommandItem, { disabled: true, children: "Type at least 3 characters to search" }))] })] }) })] }) }));
}
