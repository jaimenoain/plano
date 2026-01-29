import * as React from "react"
import { X, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Command, CommandGroup, CommandItem, CommandList } from "@/components/ui/command"
import { Command as CommandPrimitive } from "cmdk"
import { cn } from "@/lib/utils"
import { supabase } from "@/integrations/supabase/client"
import { useQuery } from "@tanstack/react-query"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export interface Architect {
  id: string
  name: string
  type: 'individual' | 'studio'
}

interface ArchitectSelectProps {
  selectedArchitects: Architect[]
  setSelectedArchitects: (architects: Architect[]) => void
  placeholder?: string
  className?: string
  filterType?: 'individual' | 'studio'
}

export function ArchitectSelect({
  selectedArchitects,
  setSelectedArchitects,
  placeholder,
  className,
  filterType
}: ArchitectSelectProps) {
  const [open, setOpen] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Creation State
  const [showCreateDialog, setShowCreateDialog] = React.useState(false)
  const [newArchitectName, setNewArchitectName] = React.useState("")
  const [newArchitectType, setNewArchitectType] = React.useState<'individual' | 'studio'>('individual')
  const [isCreating, setIsCreating] = React.useState(false)

  // Fetch architects
  const { data: suggestions = [], isLoading } = useQuery({
    queryKey: ['architects', inputValue, filterType],
    queryFn: async () => {
       // @ts-ignore - architects table created in migration
       let query = supabase.from('architects').select('*').limit(20);

       if (filterType) {
           query = query.eq('type', filterType);
       }

       if (inputValue.length > 0) {
           query = query.ilike('name', `%${inputValue}%`);
       }

       const { data, error } = await query;
       if (error) throw error;
       return data as Architect[];
    },
    // Keep previous data while fetching new to avoid flickering
    placeholderData: (previousData) => previousData,
  })

  const handleSelect = (architect: Architect) => {
    setInputValue("")
    if (!selectedArchitects.some(a => a.id === architect.id)) {
      setSelectedArchitects([...selectedArchitects, architect])
    }
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
      }
    }
  }

  const initiateCreate = () => {
      setNewArchitectName(inputValue.trim());
      setNewArchitectType(filterType || 'individual'); // default or match filter
      setShowCreateDialog(true);
      setOpen(false); // Close dropdown
  }

  const handleCreateConfirm = async () => {
      if (!newArchitectName) return;
      setIsCreating(true);
      try {
          // @ts-ignore - architects table created in migration
          const { data, error } = await supabase
            .from('architects')
            .insert({ name: newArchitectName, type: newArchitectType })
            .select()
            .single();

          if (error) throw error;

          // Add to selected
          handleSelect(data as Architect);
          setShowCreateDialog(false);
          toast.success(`Created ${newArchitectType} "${newArchitectName}"`);
      } catch (error) {
          console.error("Error creating architect:", error);
          toast.error("Failed to create architect. Name might already exist.");
      } finally {
          setIsCreating(false);
      }
  }

  const filteredSuggestions = suggestions.filter(s =>
      !selectedArchitects.some(sel => sel.id === s.id)
  );

  const showCreateOption = inputValue.trim() !== "" &&
                           !suggestions.some(s => s.name.toLowerCase() === inputValue.trim().toLowerCase());

  return (
    <>
    <Command
        onKeyDown={handleKeyDown}
        className={cn("overflow-visible bg-transparent", className)}
        shouldFilter={false}
    >
      <div
        className="group border border-input px-3 py-2 text-sm ring-offset-background rounded-md focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 bg-background"
      >
        <div className="flex flex-wrap gap-1">
          {selectedArchitects.map((architect) => (
            <Badge key={architect.id} variant="secondary">
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
                    <div className="flex items-center justify-between w-full">
                        <span>{suggestion.name}</span>
                        <Badge variant="outline" className="text-[10px] h-5 px-1">{suggestion.type}</Badge>
                    </div>
                  </CommandItem>
                ))}
                 {showCreateOption && !isLoading && (
                     <CommandItem
                        value={inputValue}
                        onSelect={initiateCreate}
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

    <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Add New Architect</DialogTitle>
                <DialogDescription>
                    Is <strong>{newArchitectName}</strong> an individual person or a studio/firm?
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <RadioGroup value={newArchitectType} onValueChange={(v: any) => setNewArchitectType(v)}>
                    <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => setNewArchitectType('individual')}>
                        <RadioGroupItem value="individual" id="r1" />
                        <Label htmlFor="r1" className="cursor-pointer">Individual Architect</Label>
                    </div>
                    <div className="flex items-center space-x-2 border p-3 rounded-md cursor-pointer hover:bg-muted/50" onClick={() => setNewArchitectType('studio')}>
                        <RadioGroupItem value="studio" id="r2" />
                        <Label htmlFor="r2" className="cursor-pointer">Architecture Studio/Firm</Label>
                    </div>
                </RadioGroup>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setShowCreateDialog(false)}>Cancel</Button>
                <Button onClick={handleCreateConfirm} disabled={isCreating}>
                    {isCreating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Create
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  )
}
