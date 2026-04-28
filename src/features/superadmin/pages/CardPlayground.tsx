import { useEffect, useMemo, useState, type Dispatch, type SetStateAction } from "react";
import { ChevronDown, Copy } from "lucide-react";
import { FeedResolvedEntry } from "@/features/feed/components/FeedResolvedEntry";
import { FeedActivityRow } from "@/features/feed/components/FeedActivityRow";
import { FeedCardA } from "@/features/feed/components/FeedCardA";
import { FeedCardB } from "@/features/feed/components/FeedCardB";
import { FeedCardC } from "@/features/feed/components/FeedCardC";
import { DetailCardA } from "@/features/feed/components/detail/DetailCardA";
import { DetailCardB } from "@/features/feed/components/detail/DetailCardB";
import { DetailCardC } from "@/features/feed/components/detail/DetailCardC";
import {
  deriveLegacyFeedUi,
  type LegacyFeedCardUi,
} from "@/features/feed/utils/deriveLegacyFeedUi";
import { resolveCardType } from "@/features/feed/utils/resolveCardType";
import type { CardType } from "@/types/cards";
import type { FeedReview, ReviewImage } from "@/types/feed";
import { cardFixtures, type CardFixture } from "@/features/superadmin/fixtures/cardFixtures";
import { SuperadminGuard } from "@/features/superadmin/components/SuperadminGuard";
import { Button } from "@/components/ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type PlaygroundBackgroundId = "feed-light" | "feed-dark" | "building-panel" | "profile";

const PLAYGROUND_BACKGROUNDS: { id: PlaygroundBackgroundId; label: string; surfaceClass: string }[] = [
  { id: "feed-light", label: "Feed (light)", surfaceClass: "bg-surface-default" },
  { id: "feed-dark", label: "Feed (dark canvas)", surfaceClass: "bg-black" },
  { id: "building-panel", label: "Building detail panel", surfaceClass: "bg-surface-muted" },
  { id: "profile", label: "Profile", surfaceClass: "bg-surface-default" },
];

type PlaygroundViewportId = "mobile" | "tablet" | "desktop";

/** Single-fixture preview: feed card vs detail layout (per-fixture preference in playground state). */
type PlaygroundCardViewMode = "feed" | "detail";

const PLAYGROUND_VIEWPORTS: { id: PlaygroundViewportId; label: string; widthPx: number }[] = [
  { id: "mobile", label: "Mobile · 375", widthPx: 375 },
  { id: "tablet", label: "Tablet · 768", widthPx: 768 },
  { id: "desktop", label: "Desktop · 1280", widthPx: 1280 },
];

const GROUP_ORDER = [
  "Status & empty",
  "Text only",
  "Single image",
  "Gallery",
  "Video",
  "Prominence",
  "Edge cases",
] as const;

function groupFixtures(fixtures: readonly CardFixture[]): Map<string, CardFixture[]> {
  const map = new Map<string, CardFixture[]>();
  for (const f of fixtures) {
    const list = map.get(f.group);
    if (list) list.push(f);
    else map.set(f.group, [f]);
  }
  return map;
}

function orderedGroupEntries(map: Map<string, CardFixture[]>): [string, CardFixture[]][] {
  const seen = new Set<string>();
  const out: [string, CardFixture[]][] = [];
  for (const g of GROUP_ORDER) {
    const list = map.get(g);
    if (list?.length) {
      out.push([g, list]);
      seen.add(g);
    }
  }
  for (const [g, list] of map) {
    if (!seen.has(g)) out.push([g, list]);
  }
  return out;
}

function LegacyLayoutDebugPanel({ layout, title }: { layout: LegacyFeedCardUi; title: string }) {
  return (
    <div className="rounded-md border border-border-default bg-surface-muted/50 px-3 py-2">
      <p className="text-2xs-plus font-mono font-semibold text-text-primary mb-1.5">{title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 font-mono text-2xs text-text-secondary">
        <dt className="text-text-secondary">layout</dt>
        <dd className="text-text-primary">{layout.layout}</dd>
        <dt className="text-text-secondary">imageWeight</dt>
        <dd className="text-text-primary">{layout.imageWeight}</dd>
        <dt className="text-text-secondary">textWeight</dt>
        <dd className="text-text-primary">{layout.textWeight}</dd>
        <dt className="text-text-secondary">prominence</dt>
        <dd className="text-text-primary">{layout.prominence}</dd>
      </dl>
    </div>
  );
}

function ResolvedCardTypePanel({ entry, title }: { entry: FeedReview; title: string }) {
  return (
    <div className="rounded-md border border-border-default bg-surface-muted/50 px-3 py-2">
      <p className="text-2xs-plus font-mono font-semibold text-text-primary mb-1.5">{title}</p>
      <p className="font-mono text-2xs text-text-primary">{resolveCardType(entry)}</p>
    </div>
  );
}

const BROKEN_IMAGE_URL = "https://plano-fixture.invalid/broken-image.png";

const PLAYGROUND_IMAGE_POOL = [
  "https://picsum.photos/seed/plano-card-a/800/600",
  "https://picsum.photos/seed/plano-card-b/800/600",
  "https://picsum.photos/seed/plano-card-c/800/600",
] as const;

const PLAYGROUND_VIDEO_URL = "https://example.com/plano-fixture-video/sample.mp4";

function countWords(content: string | null | undefined): number {
  if (content == null) return 0;
  const trimmed = content.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).filter(Boolean).length;
}

function contentForWordCount(n: number): string | null {
  if (n <= 0) return null;
  return Array.from({ length: n }, (_, i) => `w${i + 1}`).join(" ");
}

function buildPlaygroundImages(count: number, broken: boolean): ReviewImage[] | undefined {
  if (count <= 0) return undefined;
  return Array.from({ length: count }, (_, i) => ({
    id: `playground-img-${i + 1}`,
    url: broken ? BROKEN_IMAGE_URL : PLAYGROUND_IMAGE_POOL[i % PLAYGROUND_IMAGE_POOL.length]!,
    likes_count: 0,
    is_liked: false,
  }));
}

function isBrokenImageMode(images: ReviewImage[] | undefined): boolean {
  if (!images?.length) return false;
  return images.every((img) => img.url === BROKEN_IMAGE_URL);
}

function noop() {}

function renderPlaygroundDetailCard(entry: FeedReview) {
  const t = resolveCardType(entry);
  if (t === "activity") {
    return <FeedActivityRow entry={entry} />;
  }
  switch (t) {
    case "A":
      return <DetailCardA entry={entry} onLike={noop} onComment={noop} showFollow />;
    case "B":
      return <DetailCardB entry={entry} onLike={noop} onComment={noop} onImageLike={noop} showFollow />;
    case "C":
      return <DetailCardC entry={entry} onLike={noop} onComment={noop} onImageLike={noop} />;
    default: {
      const _n: never = t;
      return _n;
    }
  }
}

/** Single-line label derived from legacy layout fields (playground “Show all” badges). */
function legacyLayoutArchetypeLabel(layout: LegacyFeedCardUi): string {
  return `${layout.layout} · ${layout.imageWeight} · ${layout.textWeight} · ${layout.prominence}`;
}

function legacyLayoutMismatchLines(expected: LegacyFeedCardUi, actual: LegacyFeedCardUi): string[] {
  const keys = ["layout", "imageWeight", "textWeight", "prominence"] as const;
  return keys
    .filter((k) => expected[k] !== actual[k])
    .map((k) => `${k}: expected ${expected[k]} · resolved ${actual[k]}`);
}

function renderFeedCardForPlayground(entry: FeedReview, override: CardType | null, cardBIndex: number) {
  if (override == null) {
    return (
      <FeedResolvedEntry
        entry={entry}
        index={cardBIndex}
        onLike={noop}
        onImageLike={noop}
        onComment={noop}
      />
    );
  }
  switch (override) {
    case "A":
      return <FeedCardA entry={entry} onLike={noop} onComment={noop} />;
    case "B":
      return (
        <FeedCardB entry={entry} index={cardBIndex} onLike={noop} onImageLike={noop} onComment={noop} />
      );
    case "C":
      return <FeedCardC entry={entry} onLike={noop} onImageLike={noop} onComment={noop} />;
    case "activity":
      return <FeedActivityRow entry={entry} />;
    default: {
      const _x: never = override;
      return _x;
    }
  }
}

function ShowAllGridArchetypeFooter({ fixture }: { fixture: CardFixture }) {
  const resolved = deriveLegacyFeedUi(fixture.entry);
  const mismatches = legacyLayoutMismatchLines(fixture.expectedLayout, resolved);
  return (
    <div className="space-y-2 border-t border-border-default pt-3">
      {mismatches.length > 0 ? (
        <div
          role="alert"
          className="rounded-md border border-feedback-warning bg-feedback-warning/10 px-3 py-2 text-2xs text-feedback-warning"
        >
          <p className="font-semibold text-text-primary">Legacy layout mismatch</p>
          <ul className="mt-1 list-disc space-y-0.5 pl-4 font-mono leading-snug">
            {mismatches.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-2xs font-semibold uppercase tracking-wide text-text-secondary">Resolved legacy layout</span>
        <span className="inline-flex max-w-full items-center rounded-md border border-border-default bg-surface-muted px-2 py-1 font-mono text-2xs text-text-primary break-all">
          {legacyLayoutArchetypeLabel(resolved)}
        </span>
        <span className="text-2xs font-mono text-text-secondary">·</span>
        <span className="text-2xs font-mono text-text-primary">cardType {resolveCardType(fixture.entry)}</span>
      </div>
    </div>
  );
}

function CopyFixtureJsonButton({ entry }: { entry: FeedReview }) {
  const { toast } = useToast();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-2xs gap-1.5"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(JSON.stringify(entry, null, 2));
          toast({ title: "Fixture JSON copied" });
        } catch {
          toast({ variant: "destructive", title: "Could not copy" });
        }
      }}
    >
      <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
      Copy fixture JSON
    </Button>
  );
}

function PlaygroundViewportFrame({
  backgroundId,
  viewportId,
  children,
}: {
  backgroundId: PlaygroundBackgroundId;
  viewportId: PlaygroundViewportId;
  children: React.ReactNode;
}) {
  const bg = PLAYGROUND_BACKGROUNDS.find((b) => b.id === backgroundId)!;
  const vp = PLAYGROUND_VIEWPORTS.find((v) => v.id === viewportId)!;
  return (
    <div className="w-full overflow-x-auto">
      <div
        className={cn("mx-auto rounded-lg border border-border-default", bg.surfaceClass)}
        style={{ width: vp.widthPx, maxWidth: "100%" }}
      >
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </div>
  );
}

const CARD_TYPE_OVERRIDE_OPTIONS: { id: CardType | "auto"; label: string }[] = [
  { id: "auto", label: "Auto (resolveCardType)" },
  { id: "A", label: "Type A" },
  { id: "B", label: "Type B" },
  { id: "C", label: "Type C" },
  { id: "activity", label: "Activity" },
];

function PlaygroundToolbar({
  backgroundId,
  setBackgroundId,
  viewportId,
  setViewportId,
  cardTypeOverride,
  setCardTypeOverride,
}: {
  backgroundId: PlaygroundBackgroundId;
  setBackgroundId: (id: PlaygroundBackgroundId) => void;
  viewportId: PlaygroundViewportId;
  setViewportId: (id: PlaygroundViewportId) => void;
  cardTypeOverride: CardType | null;
  setCardTypeOverride: (v: CardType | null) => void;
}) {
  return (
    <div className="space-y-4 rounded-lg border border-border-default bg-surface-muted/20 p-3">
      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-text-secondary">Page background</p>
          <div className="flex flex-wrap gap-1.5">
            {PLAYGROUND_BACKGROUNDS.map((b) => (
              <Button
                key={b.id}
                type="button"
                size="sm"
                variant={backgroundId === b.id ? "default" : "outline"}
                className="text-2xs h-8"
                onClick={() => setBackgroundId(b.id)}
              >
                {b.label}
              </Button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <p className="text-2xs font-semibold uppercase tracking-wide text-text-secondary">Viewport width</p>
          <div className="flex flex-wrap gap-1.5">
            {PLAYGROUND_VIEWPORTS.map((v) => (
              <Button
                key={v.id}
                type="button"
                size="sm"
                variant={viewportId === v.id ? "default" : "outline"}
                className="text-2xs h-8"
                onClick={() => setViewportId(v.id)}
              >
                {v.label}
              </Button>
            ))}
          </div>
        </div>
      </div>
      <div className="space-y-2 border-t border-border-default pt-3">
        <p className="text-2xs font-semibold uppercase tracking-wide text-text-secondary">Feed card override</p>
        <p className="text-2xs text-text-secondary">
          Auto uses FeedResolvedEntry (resolveCardType + FeedCard A/B/C or FeedActivityRow). Other options force a card type for the edited fixture.
        </p>
        <div className="flex flex-wrap gap-1.5">
          {CARD_TYPE_OVERRIDE_OPTIONS.map((opt) => {
            const active =
              opt.id === "auto" ? cardTypeOverride === null : cardTypeOverride === opt.id;
            return (
              <Button
                key={opt.id}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className="text-2xs h-8"
                onClick={() => setCardTypeOverride(opt.id === "auto" ? null : opt.id)}
              >
                {opt.label}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** Show-all grid: side-by-side feed + detail per fixture. */
function FixtureShowAllPreview({ entry }: { entry: FeedReview }) {
  const legacy = deriveLegacyFeedUi(entry);
  return (
    <div className="flex flex-col gap-8 xl:flex-row xl:items-start xl:gap-10">
      <div className="w-full min-w-0 max-w-md shrink-0 space-y-2 xl:max-w-none xl:flex-1">
        <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">FeedResolvedEntry</p>
        <div className="hairline overflow-hidden rounded-none border border-border-default">
          <FeedResolvedEntry entry={entry} onLike={noop} onImageLike={noop} onComment={noop} />
        </div>
        <LegacyLayoutDebugPanel layout={legacy} title="deriveLegacyFeedUi (fixture)" />
        <ResolvedCardTypePanel entry={entry} title="resolveCardType" />
      </div>
      <div className="w-full min-w-0 max-w-md shrink-0 space-y-2 xl:max-w-none xl:flex-1">
        <p className="text-2xs font-medium uppercase tracking-wide text-text-secondary">DetailCard (A / B / C)</p>
        <div className="hairline overflow-hidden rounded-none border border-border-default">
          {renderPlaygroundDetailCard(entry)}
        </div>
        <LegacyLayoutDebugPanel layout={legacy} title="Legacy layout (same entry)" />
      </div>
    </div>
  );
}

function FixtureSinglePreview({
  entry,
  viewMode,
  cardTypeOverride,
}: {
  entry: FeedReview;
  viewMode: PlaygroundCardViewMode;
  cardTypeOverride: CardType | null;
}) {
  const legacy = deriveLegacyFeedUi(entry);
  return (
    <div className="min-w-0 space-y-2">
      <div className="hairline overflow-hidden rounded-none border border-border-default">
        {viewMode === "feed" ? (
          renderFeedCardForPlayground(entry, cardTypeOverride, 0)
        ) : (
          renderPlaygroundDetailCard(entry)
        )}
      </div>
      <LegacyLayoutDebugPanel layout={legacy} title="Legacy layout (edited entry)" />
      <ResolvedCardTypePanel entry={entry} title="resolveCardType" />
    </div>
  );
}

function PlaygroundFixtureControls({
  entry,
  defaultEntry,
  onReset,
  setEntry,
}: {
  entry: FeedReview;
  defaultEntry: FeedReview;
  onReset: () => void;
  setEntry: Dispatch<SetStateAction<FeedReview>>;
}) {
  const [controlsOpen, setControlsOpen] = useState(true);

  const imageCount = entry.images?.length ?? 0;
  const wordCount = countWords(entry.content);
  const likesCount = entry.likes_count;
  const followersCount = entry.user.followers_count ?? 0;

  return (
    <Collapsible open={controlsOpen} onOpenChange={setControlsOpen} className="rounded-lg border border-border-default bg-surface-muted/20">
      <CollapsibleTrigger
        type="button"
        className="flex w-full items-center justify-between px-3 py-2.5 text-left text-2xs-plus font-medium uppercase tracking-wide text-text-secondary hover:text-text-primary"
      >
        <span>Fixture controls</span>
        <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", controlsOpen && "rotate-180")} aria-hidden />
      </CollapsibleTrigger>
      <CollapsibleContent>
        <div className="space-y-5 border-t border-border-default px-3 pb-4 pt-3">
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-2xs text-text-secondary">Image count ({imageCount})</Label>
                <span className="font-mono text-2xs text-text-primary">0–8</span>
              </div>
              <Slider
                min={0}
                max={8}
                step={1}
                value={[imageCount]}
                onValueChange={([v]) => {
                  const n = v ?? 0;
                  setEntry((prev) => ({
                    ...prev,
                    images: buildPlaygroundImages(n, isBrokenImageMode(prev.images)),
                  }));
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-2xs text-text-secondary">Word count ({wordCount})</Label>
                <span className="font-mono text-2xs text-text-primary">0–500</span>
              </div>
              <Slider
                min={0}
                max={500}
                step={1}
                value={[wordCount]}
                onValueChange={([v]) => {
                  const n = v ?? 0;
                  setEntry((prev) => ({ ...prev, content: contentForWordCount(n) }));
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-2xs text-text-secondary">Likes ({likesCount})</Label>
                <span className="font-mono text-2xs text-text-primary">0–200</span>
              </div>
              <Slider
                min={0}
                max={200}
                step={1}
                value={[likesCount]}
                onValueChange={([v]) => {
                  const n = v ?? 0;
                  setEntry((prev) => ({ ...prev, likes_count: n }));
                }}
              />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between gap-2">
                <Label className="text-2xs text-text-secondary">Followers ({followersCount})</Label>
                <span className="font-mono text-2xs text-text-primary">0–2000</span>
              </div>
              <Slider
                min={0}
                max={2000}
                step={1}
                value={[followersCount]}
                onValueChange={([v]) => {
                  const n = v ?? 0;
                  setEntry((prev) => ({
                    ...prev,
                    user: { ...prev.user, followers_count: n },
                  }));
                }}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-background px-3 py-2">
              <Label htmlFor="playground-verified" className="text-2xs text-text-primary cursor-pointer">
                Verified architect
              </Label>
              <Switch
                id="playground-verified"
                checked={Boolean(entry.user.is_verified_architect)}
                onCheckedChange={(checked) =>
                  setEntry((prev) => ({
                    ...prev,
                    user: { ...prev.user, is_verified_architect: checked },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-background px-3 py-2">
              <Label htmlFor="playground-aob" className="text-2xs text-text-primary cursor-pointer">
                Architect of building
              </Label>
              <Switch
                id="playground-aob"
                checked={Boolean(entry.user.is_architect_of_building)}
                onCheckedChange={(checked) =>
                  setEntry((prev) => ({
                    ...prev,
                    user: { ...prev.user, is_architect_of_building: checked },
                  }))
                }
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-background px-3 py-2">
              <Label
                htmlFor="playground-broken"
                className={cn("text-2xs cursor-pointer", imageCount === 0 ? "text-text-secondary" : "text-text-primary")}
              >
                Broken image URLs
              </Label>
              <Switch
                id="playground-broken"
                disabled={imageCount === 0}
                checked={isBrokenImageMode(entry.images)}
                onCheckedChange={(checked) => {
                  setEntry((prev) => {
                    const n = prev.images?.length ?? 0;
                    if (n === 0) return prev;
                    return {
                      ...prev,
                      images: buildPlaygroundImages(n, checked),
                    };
                  });
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 rounded-md border border-border-default bg-background px-3 py-2">
              <Label htmlFor="playground-video" className="text-2xs text-text-primary cursor-pointer">
                Video attachment
              </Label>
              <Switch
                id="playground-video"
                checked={Boolean(entry.video_url)}
                onCheckedChange={(checked) =>
                  setEntry((prev) => ({
                    ...prev,
                    video_url: checked ? PLAYGROUND_VIDEO_URL : null,
                  }))
                }
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" size="sm" className="text-2xs" onClick={onReset}>
              Reset to fixture defaults
            </Button>
            <p className="text-2xs text-text-secondary">
              Baseline: <span className="font-mono text-text-primary">{defaultEntry.id}</span>
            </p>
          </div>
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

function CardPlaygroundInner() {
  const grouped = useMemo(() => orderedGroupEntries(groupFixtures(cardFixtures)), []);
  const [selectedId, setSelectedId] = useState<string>(cardFixtures[0]?.id ?? "");
  const [showAll, setShowAll] = useState(false);
  const [backgroundId, setBackgroundId] = useState<PlaygroundBackgroundId>("feed-light");
  const [viewportId, setViewportId] = useState<PlaygroundViewportId>("mobile");
  const [cardTypeOverride, setCardTypeOverride] = useState<CardType | null>(null);
  const [viewModeByFixtureId, setViewModeByFixtureId] = useState<Map<string, PlaygroundCardViewMode>>(() => new Map());

  const setFixtureViewMode = (fixtureId: string, mode: PlaygroundCardViewMode) => {
    setViewModeByFixtureId((prev) => {
      const next = new Map(prev);
      next.set(fixtureId, mode);
      return next;
    });
  };

  const selected = useMemo(
    () => cardFixtures.find((f) => f.id === selectedId) ?? cardFixtures[0],
    [selectedId],
  );

  const activeViewMode: PlaygroundCardViewMode = selected ? (viewModeByFixtureId.get(selected.id) ?? "feed") : "feed";

  const [editedEntry, setEditedEntry] = useState<FeedReview>(() =>
    structuredClone(cardFixtures[0]!.entry),
  );

  useEffect(() => {
    const fixture = cardFixtures.find((f) => f.id === selectedId) ?? cardFixtures[0];
    if (fixture) setEditedEntry(structuredClone(fixture.entry));
  }, [selectedId]);

  return (
    <div className="flex min-h-screen w-full flex-col bg-background md:min-h-0 md:flex-row">
      <aside className="flex w-full shrink-0 flex-col border-b border-border-default md:h-full md:w-72 md:border-b-0 md:border-r">
        <div className="border-b border-border-default px-4 py-3">
          <h1 className="text-sm font-semibold text-text-primary">Card playground</h1>
          <p className="text-2xs text-text-secondary mt-0.5">Superadmin · fixtures + card types</p>
        </div>
        <div className="flex gap-2 border-b border-border-default px-3 py-2">
          <Button
            type="button"
            variant={showAll ? "secondary" : "default"}
            size="sm"
            className="flex-1 text-2xs"
            onClick={() => setShowAll(false)}
          >
            One fixture
          </Button>
          <Button
            type="button"
            variant={showAll ? "default" : "secondary"}
            size="sm"
            className="flex-1 text-2xs"
            onClick={() => {
              setShowAll(true);
            }}
          >
            Show all
          </Button>
        </div>
        {!showAll && (
          <ScrollArea className="flex-1 min-h-0 md:h-0">
            <nav className="px-2 py-2 pb-6">
              {grouped.map(([groupName, fixtures]) => (
                <div key={groupName} className="mb-4">
                  <p className="px-2 py-1 text-2xs font-semibold uppercase tracking-wide text-text-secondary">
                    {groupName}
                  </p>
                  <ul className="space-y-0.5">
                    {fixtures.map((f) => (
                      <li key={f.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(f.id)}
                          className={cn(
                            "w-full rounded-md px-2 py-1.5 text-left text-2xs-plus leading-snug transition-colors",
                            f.id === selectedId
                              ? "bg-brand-primary/15 text-text-primary"
                              : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                          )}
                        >
                          {f.label}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </nav>
          </ScrollArea>
        )}
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-4 py-6 md:px-6">
          <PlaygroundToolbar
            backgroundId={backgroundId}
            setBackgroundId={setBackgroundId}
            viewportId={viewportId}
            setViewportId={setViewportId}
            cardTypeOverride={cardTypeOverride}
            setCardTypeOverride={setCardTypeOverride}
          />
          {showAll ? (
            <div className="grid grid-cols-1 gap-10 xl:grid-cols-2">
              {cardFixtures.map((f) => (
                <section
                  key={f.id}
                  className="space-y-4 rounded-lg border border-border-default bg-surface-muted/20 p-4"
                >
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-sm font-semibold text-text-primary">{f.label}</h2>
                      <p className="text-2xs text-text-secondary mt-0.5">{f.description}</p>
                    </div>
                    <CopyFixtureJsonButton entry={f.entry} />
                  </div>
                  <PlaygroundViewportFrame backgroundId={backgroundId} viewportId={viewportId}>
                    <FixtureShowAllPreview entry={f.entry} />
                  </PlaygroundViewportFrame>
                  <ShowAllGridArchetypeFooter fixture={f} />
                </section>
              ))}
            </div>
          ) : selected ? (
            <div className="space-y-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-base font-semibold text-text-primary">{selected.label}</h2>
                  <p className="text-2xs text-text-secondary mt-1 max-w-prose">{selected.description}</p>
                </div>
                <CopyFixtureJsonButton entry={editedEntry} />
              </div>
              <PlaygroundFixtureControls
                entry={editedEntry}
                defaultEntry={selected.entry}
                setEntry={setEditedEntry}
                onReset={() => setEditedEntry(structuredClone(selected.entry))}
              />
              <div className="flex flex-wrap gap-1.5">
                <Button
                  type="button"
                  size="sm"
                  variant={activeViewMode === "feed" ? "default" : "outline"}
                  className="text-2xs h-8"
                  onClick={() => setFixtureViewMode(selected.id, "feed")}
                >
                  Feed
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={activeViewMode === "detail" ? "default" : "outline"}
                  className="text-2xs h-8"
                  onClick={() => setFixtureViewMode(selected.id, "detail")}
                >
                  Detail
                </Button>
              </div>
              <PlaygroundViewportFrame backgroundId={backgroundId} viewportId={viewportId}>
                <FixtureSinglePreview
                  entry={editedEntry}
                  viewMode={activeViewMode}
                  cardTypeOverride={cardTypeOverride}
                />
              </PlaygroundViewportFrame>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export default function CardPlayground() {
  return (
    <SuperadminGuard>
      <CardPlaygroundInner />
    </SuperadminGuard>
  );
}
