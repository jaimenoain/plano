/**
 * MarkerStyleEditor.tsx
 *
 * Colour + size controls for the active Categorization Method in the Collection
 * Settings "Markers" tab (Task 5.8, ADR 0033). Extracted from
 * CollectionSettingsDialog.tsx to keep that file inside its frozen size budget —
 * pure controlled component, no data fetching.
 *
 * One row per bucket: the method's fixed buckets (`MARKER_STYLE_BUCKETS`) for
 * every method except `custom`, which gets one row per existing custom category
 * (there is nothing to style until at least one category exists).
 */
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  MARKER_STYLE_BUCKETS,
  MARKER_SIZE_TOKENS,
  getBucketLabel,
  resolveMarkerStyle,
  type CategorizationMethod,
  type MarkerSizeToken,
  type MarkerStyleMap,
} from "../markerStyles";

const SIZE_LABEL: Record<MarkerSizeToken, string> = { sm: "S", md: "M", lg: "L" };

interface MarkerStyleRowProps {
  bucketKey: string;
  label: string;
  method: CategorizationMethod;
  value: MarkerStyleMap;
  onChange: (next: MarkerStyleMap) => void;
}

function MarkerStyleRow({ bucketKey, label, method, value, onChange }: MarkerStyleRowProps) {
  const style = resolveMarkerStyle(value, method, bucketKey);

  const update = (patch: Partial<{ color: string; size: MarkerSizeToken }>) => {
    onChange({
      ...value,
      [method]: {
        ...value[method],
        [bucketKey]: { ...style, ...patch },
      },
    });
  };

  return (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="text-sm font-normal flex-1 truncate">{label}</span>
      <Input
        type="color"
        value={style.color}
        onChange={(e) => update({ color: e.target.value })}
        className="h-8 w-10 p-1 cursor-pointer shrink-0"
        aria-label={`${label} marker colour`}
      />
      <ToggleGroup
        type="single"
        value={style.size}
        onValueChange={(v) => v && update({ size: v as MarkerSizeToken })}
        className="shrink-0"
      >
        {MARKER_SIZE_TOKENS.map((token) => (
          <ToggleGroupItem key={token} value={token} size="sm" aria-label={`${label} marker size ${token}`}>
            {SIZE_LABEL[token]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

interface MarkerStyleEditorProps {
  method: CategorizationMethod;
  customCategories: { id: string; label: string; color: string }[];
  value: MarkerStyleMap;
  onChange: (next: MarkerStyleMap) => void;
}

export function MarkerStyleEditor({ method, customCategories, value, onChange }: MarkerStyleEditorProps) {
  const buckets =
    method === "custom"
      ? customCategories.map((c) => ({ key: c.id, label: c.label }))
      : MARKER_STYLE_BUCKETS[method].map((key) => ({ key, label: getBucketLabel(key) }));

  if (buckets.length === 0) {
    return (
      <p className="text-xs text-text-secondary py-1">
        Add a category above to set its marker colour and size.
      </p>
    );
  }

  return (
    <div className="space-y-1 pt-1">
      <Label className="text-xs">Marker colour &amp; size</Label>
      <div className="divide-y">
        {buckets.map((bucket) => (
          <MarkerStyleRow
            key={bucket.key}
            bucketKey={bucket.key}
            label={bucket.label}
            method={method}
            value={value}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
