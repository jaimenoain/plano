/**
 * BuildingDrawerBody.tsx
 *
 * The rich "mini profile" body for the building detail drawer (standard
 * buildings). Paints instantly from the ClusterResponse the map/SERP already
 * has, then progressively fills in architect/year, a swipeable photo gallery,
 * the user's notes, collection membership and a composed summary via
 * useBuildingDrawerData. Custom markers and candidates keep the legacy card in
 * BuildingDetailDrawer — this component is standard-building only.
 *
 * Layout: a scrollable column with a sticky "Open full profile" footer. The
 * parent sizes it: `panel` (desktop right rail, fills height) or `sheet`
 * (mobile bottom sheet, capped at 85vh).
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  X,
  ArrowRight,
  Check,
  Bookmark,
  EyeOff,
  Pencil,
  FolderPlus,
  Users,
  Image as ImageIcon,
  MessageSquare,
  MapPin,
  Loader2,
  Trash2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from '@/components/ui/carousel';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { CollectionSelector } from '@/features/collections/components/CollectionSelector';
import { ArchitectStatement } from '@/features/buildings/components/ArchitectStatement';
import { ClusterResponse } from '../hooks/useMapData';
import {
  shouldFlagConstructionStatus,
  formatBuildingStatusForDisplay,
} from '@/lib/buildingStatus';
import { getBuildingImageUrl } from '@/utils/image';
import { getBuildingUrl } from '@/utils/url';
import { useBuildingStatusActions } from '../hooks/useBuildingStatusActions';
import { useBuildingDrawerData } from '../hooks/useBuildingDrawerData';
import { useBuildingDrawerNotesAndCollections } from '../hooks/useBuildingDrawerNotesAndCollections';

interface BuildingDrawerBodyProps {
  cluster: ClusterResponse;
  onClose: () => void;
  layout: 'panel' | 'sheet';
  /**
   * Collection context only: remove this building from the current collection.
   * When provided (owner/contributor), a dedicated destructive action renders.
   * The caller owns the confirm dialog + refetch + closing the drawer.
   */
  onRemoveFromCollection?: (buildingId: string) => void;
}

const SECTION_LABEL = 'eyebrow tracking-widest';

export function BuildingDrawerBody({
  cluster,
  onClose,
  layout,
  onRemoveFromCollection,
}: BuildingDrawerBodyProps) {
  const buildingId = String(cluster.id);

  const {
    user,
    isSaved,
    isVisited,
    isIgnored,
    currentRating,
    isSaving,
    handleSave,
    handleVisit,
    handleHide,
    handleRate,
    confirmOpen,
    setConfirmOpen,
    confirmTitle,
    confirmMessage,
    confirmDelete,
  } = useBuildingStatusActions(buildingId);

  const { data, isLoading } = useBuildingDrawerData(buildingId, {
    heroImageUrl: cluster.image_url,
  });

  const fullUrl = getBuildingUrl(buildingId, cluster.slug);

  // ── Gallery ──
  const heroUrl = getBuildingImageUrl(cluster.image_url);
  const slides = useMemo(() => {
    if (data?.gallery && data.gallery.length > 0) return data.gallery;
    return heroUrl ? [{ id: 'hero', url: heroUrl }] : [];
  }, [data?.gallery, heroUrl]);

  const [api, setApi] = useState<CarouselApi>();
  const [slideIndex, setSlideIndex] = useState(0);
  useEffect(() => {
    if (!api) return;
    setSlideIndex(api.selectedScrollSnap());
    const onSelect = () => setSlideIndex(api.selectedScrollSnap());
    api.on('select', onSelect);
    return () => {
      api.off('select', onSelect);
    };
  }, [api]);

  // ── Meta line ──
  const architect = data?.architect ?? null;
  const year = data?.year ?? null;
  const metaParts = [architect, year ? String(year) : null].filter(Boolean);
  const locality = [cluster.city, (data as { country?: string } | undefined)?.country]
    .filter(Boolean)
    .join(', ');

  // ── Rating (hover) ──
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const hasStatus = isSaved || isVisited;

  // ── Notes & collections (state + Supabase mutations) ──
  const existingPost = data?.userPosts?.[0] ?? null;
  const {
    noteOpen,
    setNoteOpen,
    noteDraft,
    setNoteDraft,
    savingNote,
    openNoteEditor,
    saveNote,
    collectionIds,
    collectionsOpen,
    setCollectionsOpen,
    onCollectionsChange,
  } = useBuildingDrawerNotesAndCollections({
    buildingId,
    user,
    isVisited,
    isSaved,
    isIgnored,
    existingPost,
    initialCollectionIds: data?.collectionIds,
  });

  // ── Summary facts ──
  const facts = [
    data?.category,
    ...(data?.styles ?? []),
    ...(data?.typologies ?? []),
    ...(data?.materials ?? []),
  ].filter(Boolean) as string[];

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-col bg-surface-card',
        layout === 'sheet' ? 'max-h-[85vh]' : 'h-full',
      )}
    >
      {/* Always-visible close */}
      <button
        type="button"
        onClick={onClose}
        aria-label="Close details"
        className="absolute right-2 top-2 z-30 flex h-8 w-8 items-center justify-center rounded-full border border-border-default bg-surface-card/80 text-text-secondary backdrop-blur-sm transition-colors hover:bg-surface-muted hover:text-text-primary"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {/* ── 1. Photo gallery ── */}
        <div className="relative w-full bg-surface-muted">
          {slides.length > 0 ? (
            <Carousel opts={{ align: 'start' }} setApi={setApi} className="w-full">
              <CarouselContent className="ml-0!">
                {slides.map((img) => (
                  <CarouselItem key={img.id} className="pl-0!">
                    <div className="h-64 w-full bg-surface-muted sm:h-72">
                      <img
                        src={img.url}
                        alt={cluster.name || 'Building'}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              {slides.length > 1 && (
                <>
                  <CarouselPrevious className="left-2 h-8 w-8 border border-border-default bg-surface-card/80 text-text-primary backdrop-blur-sm hover:bg-surface-card" />
                  <CarouselNext className="right-2 h-8 w-8 border border-border-default bg-surface-card/80 text-text-primary backdrop-blur-sm hover:bg-surface-card" />
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full border border-border-default bg-surface-card/80 px-2.5 py-0.5 text-2xs text-text-secondary backdrop-blur-sm">
                    {slideIndex + 1} / {slides.length}
                  </div>
                </>
              )}
            </Carousel>
          ) : (
            <div className="flex h-64 w-full items-center justify-center text-xs text-text-secondary sm:h-72">
              No image
            </div>
          )}
        </div>

        <div className="p-4">
          {/* ── 2. Identity ── */}
          {(cluster.tier_rank_label || shouldFlagConstructionStatus(cluster.construction_status)) && (
            <div className="mb-2 flex flex-wrap items-center gap-2">
              {cluster.tier_rank_label && (
                <span className="eyebrow tracking-widest text-text-disabled">
                  {cluster.tier_rank_label}
                </span>
              )}
              {shouldFlagConstructionStatus(cluster.construction_status) && (
                <span className="border border-border-default px-1.5 py-0.5 text-2xs font-medium uppercase tracking-wide text-text-secondary">
                  {formatBuildingStatusForDisplay(cluster.construction_status!)}
                </span>
              )}
            </div>
          )}
          <h2 className="text-xl font-semibold leading-tight text-text-primary">
            {cluster.name || 'Building'}
          </h2>

          <div className="mt-1.5 space-y-0.5">
            {isLoading && metaParts.length === 0 ? (
              <Skeleton className="h-4 w-40" />
            ) : metaParts.length > 0 ? (
              <p className="text-sm text-text-secondary">{metaParts.join(' · ')}</p>
            ) : null}
            {locality && (
              <p className="flex items-center gap-1 text-xs text-text-disabled">
                <MapPin className="h-3 w-3" strokeWidth={1.5} />
                {locality}
              </p>
            )}
          </div>

          {/* ── 3. Primary actions ── */}
          {user ? (
            <>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <ActionButton
                  active={isVisited}
                  disabled={isSaving}
                  onClick={handleVisit}
                  icon={<Check className={cn('h-5 w-5', isVisited && 'stroke-[3px]')} />}
                  label="Visited"
                  activeClass="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
                />
                <ActionButton
                  active={isSaved}
                  disabled={isSaving}
                  onClick={handleSave}
                  icon={<Bookmark className={cn('h-5 w-5', isSaved && 'fill-current')} />}
                  label={isSaved ? 'Saved' : 'Save'}
                  activeClass="bg-brand-primary text-brand-primary-foreground hover:bg-brand-primary-hover"
                />
                <ActionButton
                  active={isIgnored}
                  disabled={isSaving}
                  onClick={handleHide}
                  icon={<EyeOff className="h-5 w-5" />}
                  label="Hide"
                  activeClass="bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90"
                />
              </div>

              {/* Rating — visible whenever there is a positive status */}
              {hasStatus && (
                <div className="mt-3 flex items-center gap-3">
                  <span className={SECTION_LABEL}>Your rating</span>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3].map((r) => {
                      const active = (hoverRating ?? currentRating) >= r;
                      return (
                        <button
                          key={r}
                          type="button"
                          onClick={() => handleRate(r)}
                          onMouseEnter={() => setHoverRating(r)}
                          onMouseLeave={() => setHoverRating(null)}
                          aria-label={`Rate ${r}`}
                          className={cn(
                            'h-4 w-4 rounded-full border transition-colors',
                            active
                              ? 'border-text-primary bg-text-primary'
                              : 'border-border-strong bg-transparent hover:border-text-secondary',
                          )}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── 4. Secondary actions ── */}
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 justify-center gap-1.5 text-xs"
                  onClick={() => {
                    openNoteEditor();
                  }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {existingPost ? 'Edit note' : 'Add note'}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className={cn(
                    'h-9 justify-center gap-1.5 text-xs',
                    collectionIds.length > 0 && 'border-brand-primary text-text-primary',
                  )}
                  onClick={() => {
                    setCollectionsOpen((o) => !o);
                    setNoteOpen(false);
                  }}
                >
                  <FolderPlus className="h-3.5 w-3.5" />
                  {collectionIds.length > 0
                    ? `In ${collectionIds.length} collection${collectionIds.length > 1 ? 's' : ''}`
                    : 'Add to collection'}
                </Button>
              </div>

              {/* Inline note editor */}
              {noteOpen && (
                <div className="mt-3 space-y-2 border-t border-border-default pt-3">
                  <Textarea
                    autoFocus
                    value={noteDraft}
                    onChange={(e) => setNoteDraft(e.target.value)}
                    placeholder="Add a private note or a review…"
                    className="min-h-[90px] resize-none text-sm"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setNoteOpen(false)}
                      disabled={savingNote}
                    >
                      Cancel
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 text-xs"
                      onClick={saveNote}
                      disabled={savingNote || !noteDraft.trim()}
                    >
                      {savingNote ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Save note'}
                    </Button>
                  </div>
                </div>
              )}

              {/* Inline collections */}
              {collectionsOpen && (
                <div className="mt-3 border-t border-border-default pt-3">
                  <CollectionSelector
                    userId={user.id}
                    selectedCollectionIds={collectionIds}
                    onChange={onCollectionsChange}
                  />
                </div>
              )}

              {/* Collection context — remove this building from the open collection.
                  The caller owns the confirm dialog, refetch and closing the drawer. */}
              {onRemoveFromCollection && (
                <div className="mt-4 border-t border-border-default pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-9 w-full justify-center gap-1.5 border-feedback-destructive/40 text-xs text-feedback-destructive hover:bg-feedback-destructive hover:text-feedback-destructive-foreground"
                    onClick={() => onRemoveFromCollection(buildingId)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Remove from collection
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="mt-4 border-t border-border-default pt-4">
              <p className="text-sm text-text-secondary">
                <Link to="/login" className="font-medium text-text-primary hover:underline">
                  Sign in
                </Link>{' '}
                to save, rate, add notes and collections.
              </p>
            </div>
          )}

          {/* ── 5. Your notes ── */}
          {user && (data?.userPosts?.length ?? 0) > 0 && !noteOpen && (
            <div className="mt-5 border-t border-border-default pt-4">
              <div className="mb-2 flex items-center justify-between">
                <span className={SECTION_LABEL}>Your notes</span>
                <button
                  type="button"
                  onClick={openNoteEditor}
                  className="text-text-secondary transition-colors hover:text-text-primary"
                  aria-label="Edit note"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
              </div>
              <div className="space-y-3">
                {data!.userPosts.map((post) => (
                  <div key={post.id}>
                    {post.body && (
                      <p className="whitespace-pre-wrap text-sm leading-relaxed text-text-primary">
                        {post.body}
                      </p>
                    )}
                    {post.images.length > 0 && (
                      <div className="mt-2 flex gap-1.5 overflow-x-auto">
                        {post.images.map((img) => (
                          <img
                            key={img.id}
                            src={img.url}
                            alt=""
                            className="h-14 w-14 shrink-0 border border-border-default object-cover"
                            loading="lazy"
                          />
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── 6. About / summary ── */}
          <div className="mt-5 border-t border-border-default pt-4">
            <p className={cn(SECTION_LABEL, 'mb-3')}>About</p>

            {isLoading && facts.length === 0 ? (
              <div className="space-y-2">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : (
              <>
                {facts.length > 0 && (
                  <div className="mb-3 flex flex-wrap gap-1.5">
                    {facts.slice(0, 6).map((f, i) => (
                      <span
                        key={`${f}-${i}`}
                        className="border border-border-default px-2 py-0.5 text-xs text-text-secondary"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}

                {data?.architectStatement && (
                  <ArchitectStatement
                    statement={data.architectStatement}
                    isEditing={false}
                    onChange={() => {}}
                    architectName={architect ?? undefined}
                  />
                )}

                {data && (data.stats.visitors > 0 || data.stats.photos > 0 || data.stats.reviews > 0) && (
                  <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-secondary">
                    {data.stats.visitors > 0 && (
                      <span className="flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {data.stats.visitors} visitor{data.stats.visitors > 1 ? 's' : ''}
                      </span>
                    )}
                    {data.stats.photos > 0 && (
                      <span className="flex items-center gap-1">
                        <ImageIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {data.stats.photos} photo{data.stats.photos > 1 ? 's' : ''}
                      </span>
                    )}
                    {data.stats.reviews > 0 && (
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3.5 w-3.5" strokeWidth={1.5} />
                        {data.stats.reviews} review{data.stats.reviews > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                )}

                {facts.length === 0 && !data?.architectStatement && (
                  <p className="text-sm text-text-disabled">
                    Open the full profile for details on this building.
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 7. Sticky footer CTA ── */}
      <div className="shrink-0 border-t border-border-default bg-surface-card p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        <Link
          to={fullUrl}
          onClick={onClose}
          className="flex h-11 w-full items-center justify-center gap-2 bg-brand-primary text-sm font-medium text-brand-primary-foreground transition-colors hover:bg-brand-primary-hover"
        >
          Open full profile
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Delete-confirm (removing a status that has a review/photos) */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmTitle}</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setConfirmOpen(false)}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-feedback-destructive text-feedback-destructive-foreground hover:bg-feedback-destructive/90"
            >
              Confirm Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function ActionButton({
  active,
  disabled,
  onClick,
  icon,
  label,
  activeClass,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: (e: React.MouseEvent) => void;
  icon: React.ReactNode;
  label: string;
  activeClass: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-16 flex-col items-center justify-center gap-1.5 border transition-colors disabled:opacity-50',
        active
          ? cn('border-transparent', activeClass)
          : 'border-border-default text-text-secondary hover:bg-surface-muted hover:text-text-primary',
      )}
    >
      {icon}
      <span className="text-xs font-medium">{label}</span>
    </button>
  );
}
