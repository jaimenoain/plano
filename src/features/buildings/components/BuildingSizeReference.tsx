import { Info } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

// ─── Size helpers ─────────────────────────────────────────────────────────────

const SIZE_CATEGORIES = [
  { value: "xs", label: "XS", gfa: "< 50 m²" },
  { value: "s",  label: "S",  gfa: "50 – 500 m²" },
  { value: "m",  label: "M",  gfa: "500 – 2,000 m²" },
  { value: "l",  label: "L",  gfa: "2,000 – 10,000 m²" },
  { value: "xl", label: "XL", gfa: "10,000 – 50,000 m²" },
  { value: "xxl", label: "XXL", gfa: "50,000+ m²" },
] as const;

export function sizeCategoryLabel(value: string): string {
  return SIZE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function formatSqm(sqm: number): string {
  return sqm.toLocaleString("en-US") + " m²";
}

export function SizeReferencePopover() {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex items-center justify-center h-4 w-4 text-text-secondary hover:text-text-primary transition-colors"
          aria-label="Size reference guide"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent side="top" className="w-[420px] max-w-[90vw] p-0 overflow-hidden">
        <div className="px-4 pt-4 pb-2">
          <p className="text-xs font-bold uppercase tracking-widest text-text-secondary mb-1">Size Reference</p>
          <p className="text-xs text-text-secondary">Categorization based on Gross Floor Area (GFA).</p>
        </div>
        <table className="w-full text-xs border-t border-border-default">
          <thead>
            <tr className="border-b border-border-default bg-surface-muted/40">
              <th className="text-left px-4 py-2 font-semibold text-text-secondary">Category</th>
              <th className="text-left px-4 py-2 font-semibold text-text-secondary">GFA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-default">
            {SIZE_CATEGORIES.map((cat) => (
              <tr key={cat.value}>
                <td className="px-4 py-2 font-medium text-text-primary">{cat.label}</td>
                <td className="px-4 py-2 text-text-secondary">{cat.gfa}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </PopoverContent>
    </Popover>
  );
}
