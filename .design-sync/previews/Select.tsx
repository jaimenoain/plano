import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectGroup,
  SelectSeparator,
} from 'plano';

export const ArchitecturalStyle = () => (
  <Select defaultOpen defaultValue="brutalism">
    <SelectTrigger style={{ width: 260 }}>
      <SelectValue placeholder="Select a style" />
    </SelectTrigger>
    <SelectContent>
      <SelectGroup>
        <SelectLabel>Modern movements</SelectLabel>
        <SelectItem value="bauhaus">Bauhaus</SelectItem>
        <SelectItem value="brutalism">Brutalism</SelectItem>
        <SelectItem value="functionalism">Functionalism</SelectItem>
        <SelectItem value="metabolism">Metabolism</SelectItem>
      </SelectGroup>
      <SelectSeparator />
      <SelectGroup>
        <SelectLabel>Historic</SelectLabel>
        <SelectItem value="gothic">Gothic Revival</SelectItem>
        <SelectItem value="neoclassical">Neoclassical</SelectItem>
      </SelectGroup>
    </SelectContent>
  </Select>
);
