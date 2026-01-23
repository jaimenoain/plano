import * as React from "react"
import { X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"

interface AutocompleteTagInputProps {
  tags: string[]
  setTags: (tags: string[]) => void
  suggestions: string[]
  placeholder?: string
  className?: string
  normalize?: (value: string) => string
}

export function AutocompleteTagInput({
  tags,
  setTags,
  suggestions,
  placeholder,
  className,
  normalize,
}: AutocompleteTagInputProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const handleSelect = (value: string) => {
    setInputValue("")
    if (!tags.includes(value)) {
      setTags([...tags, value])
    }
    // Keep focus on input for continuous typing/adding
    setTimeout(() => {
        inputRef.current?.focus()
    }, 0)
  }

  const handleUnselect = (tag: string) => {
    setTags(tags.filter((t) => t !== tag))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && tags.length > 0) {
          handleUnselect(tags[tags.length - 1])
        }
      }
      if (e.key === "Escape") {
        input.blur()
      }
      // We rely on cmdk to handle "Enter" for selection (via onSelect).
      // We do not prevent default here to allow cmdk to capture it.
      // If cmdk does not capture it (e.g. no selection), standard form behavior applies.
    }
  }

  // Filter suggestions based on input and already selected tags
  const filteredSuggestions = suggestions.filter(s =>
    s.toLowerCase().includes(inputValue.toLowerCase()) && !tags.includes(s)
  );

  const transformedInput = normalize ? normalize(inputValue) : inputValue;
  const showCreateOption = inputValue.trim() !== "" &&
                           !filteredSuggestions.some(s => s.toLowerCase() === inputValue.trim().toLowerCase()) &&
                           !tags.includes(transformedInput.trim());

  return (
    <Command
        onKeyDown={handleKeyDown}
        className={cn("overflow-visible bg-transparent", className)}
        shouldFilter={false} // We handle filtering manually
    >
      <div
        className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background"
      >
        <div className="flex flex-wrap gap-1">
          {tags.map((tag) => (
            <Badge key={tag} variant="secondary">
              {tag}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleUnselect(tag)}
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
              <CommandGroup className="h-full overflow-auto max-h-[200px]">
                {filteredSuggestions.map((suggestion) => (
                  <CommandItem
                    key={suggestion}
                    value={suggestion}
                    onSelect={() => handleSelect(suggestion)}
                  >
                    {suggestion}
                  </CommandItem>
                ))}
                 {showCreateOption && (
                     <CommandItem
                        value={transformedInput}
                        onSelect={() => handleSelect(transformedInput)}
                     >
                        Create "{transformedInput}"
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
