import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { useMemo } from "react";

export const MultiSelectFilterContent = ({
  options,
  selectedValues,
  onSelect,
  searchPlaceholder = "Search..."
}: {
  options: { value: string | number; label: string }[];
  selectedValues: (string | number)[];
  onSelect: (value: string | number) => void;
  searchPlaceholder?: string;
}) => {
  const sortedOptions = useMemo(() => {
      return [...options].sort((a, b) => {
          const aSelected = selectedValues.includes(a.value);
          const bSelected = selectedValues.includes(b.value);
          if (aSelected === bSelected) return 0;
          return aSelected ? -1 : 1;
      });
  }, [options, selectedValues]);

  return (
    <Command className="border rounded-md">
      <CommandInput placeholder={searchPlaceholder} autoFocus={false} />
      <CommandList className="max-h-[200px] overflow-y-auto">
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup>
          {sortedOptions.map((option) => {
            const isSelected = selectedValues.includes(option.value);
            return (
              <CommandItem
                key={option.value}
                onSelect={() => onSelect(option.value)}
              >
                <div className={cn(
                  "mr-2 flex h-4 w-4 items-center justify-center rounded-sm border border-primary",
                  isSelected ? "bg-primary text-primary-foreground" : "opacity-50 [&_svg]:invisible"
                )}>
                  <Check className={cn("h-4 w-4")} />
                </div>
                <span>{option.label}</span>
              </CommandItem>
            );
          })}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};
