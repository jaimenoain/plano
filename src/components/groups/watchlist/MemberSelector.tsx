import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

interface Member {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface MemberSelectorProps {
  members: Member[];
  selectedMemberIds: string[];
  onSelectionChange: (ids: string[]) => void;
}

export function MemberSelector({ members, selectedMemberIds, onSelectionChange }: MemberSelectorProps) {
  const toggleMember = (id: string) => {
    if (selectedMemberIds.includes(id)) {
      onSelectionChange(selectedMemberIds.filter((mId) => mId !== id));
    } else {
      onSelectionChange([...selectedMemberIds, id]);
    }
  };

  const selectedCount = selectedMemberIds.length;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className="w-full justify-between md:max-w-xs h-auto py-2"
        >
          <div className="flex flex-col items-start gap-1">
             <span className="text-xs text-muted-foreground font-normal">Who's visiting?</span>
             <span className="font-medium truncate">
               {selectedCount === 0
                 ? "Select members..."
                 : selectedCount === members.length
                 ? "Everyone"
                 : `${selectedCount} member${selectedCount === 1 ? "" : "s"} selected`}
             </span>
          </div>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>No members found.</CommandEmpty>
            <CommandGroup>
                <CommandItem
                  onSelect={() => {
                     if (selectedCount === members.length) {
                         onSelectionChange([]);
                     } else {
                         onSelectionChange(members.map(m => m.id));
                     }
                  }}
                  className="cursor-pointer font-medium"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedCount === members.length
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  {selectedCount === members.length ? "Deselect All" : "Select All"}
                </CommandItem>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.username || "Unknown"}
                  onSelect={() => toggleMember(member.id)}
                  className="cursor-pointer"
                >
                  <div
                    className={cn(
                      "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                      selectedMemberIds.includes(member.id)
                        ? "bg-primary text-primary-foreground"
                        : "opacity-50 [&_svg]:invisible"
                    )}
                  >
                    <Check className={cn("h-4 w-4")} />
                  </div>
                  <Avatar className="h-6 w-6 mr-2">
                    <AvatarImage src={member.avatar_url || undefined} />
                    <AvatarFallback>{member.username?.substring(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="truncate">{member.username}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
