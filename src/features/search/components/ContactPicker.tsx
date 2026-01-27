import * as React from "react"
import { X, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { useUserSearch, UserSearchResult } from "../hooks/useUserSearch"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

interface ContactPickerProps {
  selectedContacts: UserSearchResult[]
  setSelectedContacts: (contacts: UserSearchResult[]) => void
  placeholder?: string
  className?: string
}

export function ContactPicker({
  selectedContacts,
  setSelectedContacts,
  placeholder,
  className,
}: ContactPickerProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  const { users, isLoading } = useUserSearch({
      searchQuery: inputValue,
      limit: 5,
      enabled: open
  });

  const handleSelect = (user: UserSearchResult) => {
    setInputValue("")
    if (!selectedContacts.some(c => c.id === user.id)) {
      setSelectedContacts([...selectedContacts, user])
    }
    setTimeout(() => {
        inputRef.current?.focus()
    }, 0)
  }

  const handleUnselect = (id: string) => {
    setSelectedContacts(selectedContacts.filter((c) => c.id !== id))
    inputRef.current?.focus()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const input = inputRef.current
    if (input) {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (input.value === "" && selectedContacts.length > 0) {
          handleUnselect(selectedContacts[selectedContacts.length - 1].id)
        }
      }
      if (e.key === "Escape") {
        input.blur()
      }
    }
  }

  const filteredSuggestions = users.filter(s =>
      !selectedContacts.some(sel => sel.id === s.id)
  );

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
          {selectedContacts.map((contact) => (
            <Badge key={contact.id} variant="secondary" className="pl-1">
              <Avatar className="h-4 w-4 mr-1">
                 <AvatarImage src={contact.avatar_url || undefined} />
                 <AvatarFallback className="text-[8px]">{contact.username?.[0]?.toUpperCase()}</AvatarFallback>
              </Avatar>
              {contact.username}
              <button
                type="button"
                className="ml-1 ring-offset-background rounded-full outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                onClick={() => handleUnselect(contact.id)}
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
                    value={suggestion.username || ""}
                    onSelect={() => handleSelect(suggestion)}
                  >
                     <div className="flex items-center gap-2">
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={suggestion.avatar_url || undefined} />
                            <AvatarFallback className="text-xs">{suggestion.username?.[0]?.toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <span>{suggestion.username}</span>
                     </div>
                  </CommandItem>
                ))}
                {!isLoading && inputValue.length > 0 && filteredSuggestions.length === 0 && (
                     <CommandItem disabled>No users found</CommandItem>
                )}
              </CommandGroup>
            </CommandList>
          </div>
        )}
      </div>
    </Command>
  )
}
