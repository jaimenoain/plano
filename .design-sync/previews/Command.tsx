import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator, CommandShortcut } from 'plano';
import { Building2, Map, Bookmark, Users } from 'lucide-react';

export const Palette = () => (
  <div
    style={{
      width: 440,
      border: '1px solid var(--border-default)',
      borderRadius: 2,
      background: 'var(--surface-card)',
      boxShadow: '0 12px 32px rgba(0,0,0,0.10)',
      overflow: 'hidden',
    }}
  >
    <Command>
      <CommandInput placeholder="Search buildings, architects, cities…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Buildings">
          <CommandItem>
            <Building2 />Villa Saarinen<CommandShortcut>⏎</CommandShortcut>
          </CommandItem>
          <CommandItem>
            <Building2 />Barbican Estate
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem><Map />Open the map</CommandItem>
          <CommandItem><Bookmark />Collections</CommandItem>
          <CommandItem><Users />Curators</CommandItem>
        </CommandGroup>
      </CommandList>
    </Command>
  </div>
);
