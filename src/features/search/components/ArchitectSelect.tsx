import * as React from "react"
import { X, Loader2, PencilRuler } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { useArchitectSearch, ArchitectSearchResult } from "../hooks/useArchitectSearch"
import { Popover, PopoverContent, PopoverAnchor } from "@/components/ui/popover"

interface ArchitectSelectProps {
  selectedArchitects: { id: string; name: string }[]
  setSelectedArchitects: (architects: { id: string; name: string }[]) => void
  placeholder?: string
  className?: string
}

export function ArchitectSelect({
  selectedArchitects,
  setSelectedArchitects,
  placeholder,
  className,
}: ArchitectSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const containerRef = React.useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = React.useState(0)

  const { architects, isLoading } = useArchitectSearch({
      searchQuery: inputValue,
      limit: 5,
      enabled: open
  });

  React.useLayoutEffect(() => {
    if (containerRef.current) {
      setContainerWidth(containerRef.current.offsetWidth)
      const observer = new ResizeObserver((entries) => {
          for (const entry of entries) {
             if (entry.target instanceof HTMLElement) {
                 setContainerWidth(entry.target.offsetWidth)
             }
          }
      })
      observer.observe(containerRef.current)
      return () => observer.disconnect()
    }
  }, [])

  const handleSelect = (architect: ArchitectSearchResult) => {
    setInputValue("")
    if (!selectedArchitects.some(a => a.id === architect.id)) {
      setSelectedArchitects([...selectedArchitects, { id: architect.id, name: architect.name }])
    }
    // Keep focus on input
    setTimeout(() => {
        inputRef.current?.focus()
    }, 0)
  }

  const handleUnselect = (id: string) => {
    setSelectedArchitects(selectedArchitects.filter((a) => a.id !== id))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selectedArchitects.length > 0) {
          handleUnselect(selectedArchitects[selectedArchitects.length - 1].id)
        }
      }
      if (e.key === "Escape") {
        input.blur()
        setOpen(false)
      }
    }
  }

  const filteredSuggestions = architects.filter(a =>
      !selectedArchitects.some(sel => sel.id === a.id)
  );

  const showPopover = open && (filteredSuggestions.length > 0 || inputValue.length > 0);

  return (
    <Popover open={showPopover} onOpenChange={setOpen}>
        <Command
            onKeyDown={handleKeyDown}
            className={cn("overflow-visible bg-transparent", className)}
            shouldFilter={false}
        >
          <PopoverAnchor asChild>
              <div
                ref={containerRef}
                className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background relative"
              >
                <div className="flex flex-wrap gap-1">
                  {selectedArchitects.map((architect) => (
                    <Badge key={architect.id} variant="secondary" className="pl-1">
                      <PencilRuler className="h-3 w-3 mr-1" />
                      {architect.name}
                      <button
                        type="button"
                        className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        onClick={() => handleUnselect(architect.id)}
                      >
                        <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                      </button>
                    </Badge>
                  ))}
                  <CommandPrimitive.Input
                    ref={inputRef}
                    value={inputValue}
                    onValueChange={setInputValue}
                    onFocus={() => setOpen(true)}
                    onBlur={() => {
                        if (!showPopover) {
                            setOpen(false)
                        }
                    }}
                    placeholder={placeholder}
                    autoComplete="off"
                    className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[50px]"
                  />
                </div>
              </div>
          </PopoverAnchor>

          <PopoverContent
             className="p-0"
             align="start"
             onOpenAutoFocus={(e) => e.preventDefault()}
             style={{ width: containerWidth > 0 ? containerWidth : "auto" }}
          >
            <CommandList>
              {isLoading && (
                  <CommandItem disabled>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Loading...
                  </CommandItem>
              )}

              <CommandGroup className="h-full overflow-auto max-h-[200px]">
                {filteredSuggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion.id}
                    value={suggestion.name}
                    onSelect={() => handleSelect(suggestion)}
                  >
                     <div className="flex items-center gap-2">
                        <PencilRuler className="h-4 w-4 text-muted-foreground" />
                        <div className="flex flex-col">
                            <span>{suggestion.name}</span>
                            <span className="text-[10px] text-muted-foreground capitalize">{suggestion.type}</span>
                        </div>
                     </div>
                  </CommandItem>
                ))}
                {!isLoading && inputValue.length >= 3 && filteredSuggestions.length === 0 && (
                     <CommandItem disabled>No architects found</CommandItem>
                )}
                {!isLoading && inputValue.length > 0 && inputValue.length < 3 && filteredSuggestions.length === 0 && (
                     <CommandItem disabled>Type at least 3 characters to search</CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </PopoverContent>
        </Command>
    </Popover>
  )
}
