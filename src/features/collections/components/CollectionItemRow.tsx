/**
 * CollectionItemRow.tsx
 *
 * A collection "All Items" list row, composed from the shared editorial
 * BuildingListRow (same look/behaviour as the /search SERP) with the
 * collection-specific affordances layered on via slots:
 *   - actionSlot  → remove-from-collection (owner/contributor, on hover)
 *   - footerSlot  → inline note editor + custom-category select
 *
 * Plain click opens the detail drawer (via `onSelect`); modified clicks fall
 * through to the building URL for "open in new tab". The itinerary tab keeps
 * its own draggable CollectionBuildingCard — this row is for the flat list.
 */
import { useEffect, useRef, useState } from 'react';
import { Trash2, Save, MessageSquarePlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import { getBuildingUrl } from '@/utils/url';
import { primaryBuildingCreditsToSummaries } from '@/features/credits/api/credits';
import { BuildingListRow } from '@/features/maps';
import type { CollectionItemWithBuilding } from '../types';

interface CollectionItemRowProps {
  item: CollectionItemWithBuilding;
  isHighlighted: boolean;
  setHighlightedId: (id: string | null) => void;
  canEdit: boolean;
  onUpdateNote: (newNote: string) => void;
  /** Plain-click → open the detail drawer. */
  onSelect: () => void;
  categorizationMethod?: 'default' | 'custom' | 'status' | 'rating_member' | 'uniform';
  customCategories?: { id: string; label: string; color: string }[] | null;
  onUpdateCategory?: (categoryId: string) => void;
  showImages?: boolean;
  /** When true, surface an "Added by @username" attribution line (collaborator collections). */
  showAddedBy?: boolean;
  onRemove?: () => void;
}

export function CollectionItemRow({
  item,
  isHighlighted,
  setHighlightedId,
  canEdit,
  onUpdateNote,
  onSelect,
  categorizationMethod,
  customCategories,
  onUpdateCategory,
  showImages = true,
  showAddedBy = false,
  onRemove,
}: CollectionItemRowProps) {
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [noteValue, setNoteValue] = useState(item.note || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setNoteValue(item.note || '');
  }, [item.note]);

  useEffect(() => {
    if (isEditingNote && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isEditingNote]);

  const handleNoteBlur = (e: React.FocusEvent<HTMLTextAreaElement>) => {
    onUpdateNote(e.target.value);
    setIsEditingNote(false);
  };

  const currentCategory = customCategories?.find((c) => c.id === item.custom_category_id);
  const creditNames = primaryBuildingCreditsToSummaries(item.building.building_credits ?? []).map(
    (c) => c.name,
  );
  const href = getBuildingUrl(item.building.id, item.building.slug, item.building.short_id);
  const imageUrl = showImages
    ? item.building.hero_image_url || item.building.community_preview_url
    : null;

  // Interactive slot content must stop propagation so it never triggers the
  // row's plain-click (open drawer) or the <Link> navigation.
  const stop = (e: React.MouseEvent) => e.stopPropagation();

  return (
    <BuildingListRow
      href={href}
      name={item.building.name}
      creditNames={creditNames}
      city={item.building.city}
      imageUrl={imageUrl}
      isHighlighted={isHighlighted}
      onSelect={onSelect}
      onHoverEnter={() => setHighlightedId(item.building.id)}
      onHoverLeave={() => setHighlightedId(null)}
      actionSlot={
        canEdit && onRemove ? (
          <div
            className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
            onClick={stop}
          >
            <Button
              variant="destructive"
              size="icon-sm"
              onClick={onRemove}
              title="Remove from collection"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : null
      }
      footerSlot={
        <>
          {/* Custom-category select (only for the custom categorisation method) */}
          {categorizationMethod === 'custom' && (
            <div className="mt-2" onClick={stop}>
              {canEdit ? (
                <Select
                  value={item.custom_category_id || 'unassigned'}
                  onValueChange={(val) => onUpdateCategory?.(val === 'unassigned' ? '' : val)}
                >
                  <SelectTrigger className="h-auto p-0 border-none bg-transparent hover:bg-transparent shadow-none w-auto ring-0 focus:ring-0">
                    <div className="flex items-center gap-2 px-1 py-0.5 rounded-sm hover:bg-surface-muted/50 transition-colors cursor-pointer">
                      {/* Sidebar legend, not a map marker: this is the one surface
                          where a member's chosen category colour is still shown.
                          Uncategorised falls back to a token. */}
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: currentCategory?.color || 'var(--border-strong)' }}
                      />
                      <span className="truncate max-w-[120px] text-sm text-text-primary">
                        {currentCategory?.label || 'Uncategorized'}
                      </span>
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="unassigned" className="text-text-secondary italic">
                      Uncategorized
                    </SelectItem>
                    {customCategories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        <div className="flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: cat.color }} />
                          <span>{cat.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                currentCategory && (
                  <div className="flex items-center gap-2 px-1 py-0.5">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: currentCategory.color }} />
                    <span className="text-sm text-text-primary">{currentCategory.label}</span>
                  </div>
                )
              )}
            </div>
          )}

          {/* Inline note */}
          <div className="mt-2" onClick={stop}>
            {canEdit ? (
              isEditingNote ? (
                <div className="relative">
                  <Textarea
                    ref={textareaRef}
                    placeholder="Add a note..."
                    value={noteValue}
                    onChange={(e) => setNoteValue(e.target.value)}
                    onBlur={handleNoteBlur}
                    className="resize-none text-xs min-h-[40px] bg-surface-muted/30 border-transparent focus:border-border-default focus:bg-surface-default transition-colors p-2"
                    rows={3}
                  />
                  <div className="absolute bottom-1 right-1 opacity-50 pointer-events-none">
                    <Save className="h-3 w-3" />
                  </div>
                </div>
              ) : noteValue ? (
                <div
                  className="text-xs text-text-secondary italic bg-surface-muted/30 p-2 rounded-sm line-clamp-3 cursor-text hover:bg-surface-muted/50 transition-colors"
                  onClick={() => setIsEditingNote(true)}
                >
                  "{noteValue}"
                </div>
              ) : (
                <button
                  onClick={() => setIsEditingNote(true)}
                  className="text-xs text-text-secondary hover:text-text-primary flex items-center gap-1 px-1 py-0.5 rounded-sm hover:bg-surface-muted/50 transition-colors opacity-0 group-hover:opacity-100 duration-150"
                >
                  <MessageSquarePlus className="h-3 w-3" />
                  Add note
                </button>
              )
            ) : item.note ? (
              <div className="text-xs text-text-secondary italic bg-surface-muted/30 p-2 rounded-sm line-clamp-3">
                "{item.note}"
              </div>
            ) : null}
          </div>

          {/* Collaborator attribution — only when the collection has enabled it and
              the adder is known (pre-attribution rows leave added_by_user null). */}
          {showAddedBy && item.added_by_user && (
            <div className="mt-2 text-xs text-text-secondary">
              Added by @{item.added_by_user.username}
            </div>
          )}
        </>
      }
    />
  );
}
