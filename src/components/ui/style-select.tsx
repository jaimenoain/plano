import * as React from "react"
import { X, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"
import { toast } from "sonner"

export interface StyleSummary {
  id: string
  name: string
  slug: string
}

interface StyleSelectProps {
  selectedStyles: StyleSummary[]
  setSelectedStyles: (styles: StyleSummary[]) => void
  placeholder?: string
  className?: string
}

export function StyleSelect({
  selectedStyles,
  setSelectedStyles,
  placeholder,
  className,
}: StyleSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [isCreating, setIsCreating] = React.useState(false)

  // Fetch styles
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['architectural_styles', inputValue],
    queryFn: async () => {
       // @ts-ignore - architectural_styles table created in migration
       let query = supabase.from('architectural_styles').select('*').limit(20);

       if (inputValue.length > 0) {
           query = query.ilike('name', `%${inputValue}%`);
       }

       const { data, error } = await query;
       if (error) throw error;
       return data as StyleSummary[];
    },
    placeholderData: (previousData) => previousData,
  })

  const handleSelect = (style: StyleSummary) => {
    setInputValue("")
    if (!selectedStyles.some(s => s.id === style.id)) {
      setSelectedStyles([...selectedStyles, style])
    }
    setTimeout(() => {
        inputRef.current?.focus()
    }, 0)
  }

  const handleUnselect = (id: string) => {
    setSelectedStyles(selectedStyles.filter((s) => s.id !== id))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selectedStyles.length > 0) {
          handleUnselect(selectedStyles[selectedStyles.length - 1].id)
        }
      }
      if (e.key === "Escape") {
        input.blur()
      }
    }
  }

  const handleCreate = async () => {
      if (!inputValue.trim()) return;
      setIsCreating(true);
      try {
          const name = inputValue.trim();
          // Simple slug generation
          const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

          // @ts-ignore
          const { data, error } = await supabase
            .from('architectural_styles')
            .insert({ name, slug })
            .select()
            .single();

          if (error) throw error;

          handleSelect(data as StyleSummary);
          toast.success(`Created style "${name}"`);
      } catch (error) {
          console.error("Error creating style:", error);
          toast.error("Failed to create style. It might already exist.");
      } finally {
          setIsCreating(false);
      }
  }

  const filteredSuggestions = suggestions.filter(s =>
      !selectedStyles.some(sel => sel.id === s.id)
  );

  const showCreateOption = inputValue.trim() !== "" &&
                           !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase());

  return (
    <Command
        onKeyDown={handleKeyDown}
        className={cn("overflow-visible bg-transparent", className)}
        shouldFilter={false}
    >
      <div
        className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background"
      >
        <div className="flex flex-wrap gap-1">
          {selectedStyles.map((style) => (
            <Badge key={style.id} variant="secondary">
              {style.name}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleUnselect(style.id)}
              >
                <X className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              </button>
            </Badge>
          ))}
          <CommandPrimitive.Input
            ref={inputRef}
            value={inputValue}
            onValueChange={setInputValue}
            onBlur={() => setTimeout(() => setOpen(false), 200)}
            onFocus={() => setOpen(true)}
            placeholder={placeholder}
            autoComplete="off"
            className="ml-2 flex-1 bg-transparent outline-none placeholder:text-muted-foreground min-w-[50px]"
          />
        </div>
      </div>
      <div className="relative mt-2">
        {open && (filteredSuggestions.length > 0 || inputValue.length > 0) && (
          <div className="absolute top-0 z-10 w-full rounded-md border bg-popover text-popover-foreground shadow-md outline-none animate-in fade-in-0 zoom-in-95">
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
                    {suggestion.name}
                  </CommandItem>
                ))}
                 {showCreateOption && !isLoading && (
                     <CommandItem
                        value={inputValue}
                        onSelect={handleCreate}
                        className="text-blue-500 font-medium"
                     >
                        + Create "{inputValue}"
                     </CommandItem>
                 )}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </div>
    </Command>
  )
}
