import type { LegacyFeedCardUi } from "@/features/posts/utils/deriveLegacyFeedUi";
import type { FeedReview, ReviewBuilding, ReviewImage, ReviewUser } from "@/types/feed";

export type CardFixture = {
  id: string;
  /** Sidebar grouping label (playground Task 3.2). */
  group: string;
  label: string;
  description: string;
  entry: FeedReview;
  /** Frozen expectation for `deriveLegacyFeedUi(entry)` — playground regression scan. */
  expectedLayout: LegacyFeedCardUi;
};

const FIXTURE_CREATED_AT = "2026-01-15T12:00:00.000Z";

const SNIPPET_TEXT =
  "Quiet courtyard facades and honest material palette make this place feel grounded without trying too hard.";

const ESSAY_TEXT = Array.from({ length: 160 }, (_, i) => `word${i + 1}`).join(" ");

function mkUser(overrides: Partial<ReviewUser> = {}): ReviewUser {
  return {
    username: "fixture_author",
    avatar_url: null,
    is_verified_architect: false,
    is_architect_of_building: false,
    followers_count: 12,
    ...overrides,
  };
}

function mkBuilding(overrides: Partial<ReviewBuilding> = {}): ReviewBuilding {
  return {
    id: "00000000-0000-4000-8000-000000000001",
    short_id: 1001,
    slug: "sample-building",
    name: "Sample Building",
    address: "221 Baker Street, London, UK",
    main_image_url: null,
    community_preview_url: null,
    creditedEntities: [{ id: "00000000-0000-4000-8000-0000000000a1", name: "Jane Architect" }],
    year_completed: 2010,
    city: "London",
    country: "UK",
    ...overrides,
  };
}

function mkImage(id: string, url: string): ReviewImage {
  return { id, url, likes_count: 0, is_liked: false };
}

function mkEntry(partial: Partial<FeedReview> & Pick<FeedReview, "id">): FeedReview {
  return {
    content: null,
    rating: null,
    tags: null,
    created_at: FIXTURE_CREATED_AT,
    edited_at: null,
    status: "visited",
    user_id: "00000000-0000-4000-8000-0000000000b1",
    likes_count: 3,
    comments_count: 0,
    is_liked: false,
    images: undefined,
    video_url: null,
    watch_with_users: undefined,
    is_suggested: false,
    suggestion_reason: undefined,
    user: mkUser(),
    building: mkBuilding(),
    ...partial,
  };
}

const IMG_A = "https://picsum.photos/seed/plano-card-a/800/600";
const IMG_B = "https://picsum.photos/seed/plano-card-b/800/600";
const IMG_C = "https://picsum.photos/seed/plano-card-c/800/600";

/**
 * Fixed {@link FeedReview} mocks for the superadmin card playground. Exactly sixteen cases
 * covering the archetypes listed in `docs/ROADMAP.md` Task 3.1.
 */
export const cardFixtures: readonly CardFixture[] = [
  {
    id: "visited-empty",
    group: "Status & empty",
    label: "Visited — no text, no images",
    description: "No content, no images, visited (not bucket list).",
    entry: mkEntry({
      id: "fixture-visited-empty",
      content: null,
      images: undefined,
      status: "visited",
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "none",
      prominence: "standard",
    },
  },
  {
    id: "pending-empty",
    group: "Status & empty",
    label: "Bucket list — no text, no images",
    description: "No content, no images, pending (saved / bucket list).",
    entry: mkEntry({
      id: "fixture-pending-empty",
      content: null,
      images: undefined,
      status: "pending",
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "none",
      prominence: "standard",
    },
  },
  {
    id: "snippet-only",
    group: "Text only",
    label: "Snippet text only",
    description: "Under 20 words, no images.",
    entry: mkEntry({
      id: "fixture-snippet-only",
      content: SNIPPET_TEXT,
      images: undefined,
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "snippet",
      prominence: "standard",
    },
  },
  {
    id: "essay-only",
    group: "Text only",
    label: "Essay text only",
    description: "Over 150 words, no images.",
    entry: mkEntry({
      id: "fixture-essay-only",
      content: ESSAY_TEXT,
      images: undefined,
    }),
    expectedLayout: {
      layout: "text-forward",
      imageWeight: "none",
      textWeight: "essay",
      prominence: "standard",
    },
  },
  {
    id: "single-image-no-text",
    group: "Single image",
    label: "Single image, no text",
    description: "One user photo, empty content.",
    entry: mkEntry({
      id: "fixture-single-image-no-text",
      content: null,
      images: [mkImage("img-1", IMG_A)],
    }),
    expectedLayout: {
      layout: "media-forward",
      imageWeight: "single",
      textWeight: "none",
      prominence: "standard",
    },
  },
  {
    id: "single-image-snippet",
    group: "Single image",
    label: "Single image + snippet",
    description: "One photo and short review text.",
    entry: mkEntry({
      id: "fixture-single-image-snippet",
      content: SNIPPET_TEXT,
      images: [mkImage("img-1", IMG_A)],
    }),
    expectedLayout: {
      layout: "balanced",
      imageWeight: "single",
      textWeight: "snippet",
      prominence: "standard",
    },
  },
  {
    id: "single-image-essay",
    group: "Single image",
    label: "Single image + essay",
    description: "One photo and long text.",
    entry: mkEntry({
      id: "fixture-single-image-essay",
      content: ESSAY_TEXT,
      images: [mkImage("img-1", IMG_A)],
    }),
    expectedLayout: {
      layout: "text-forward",
      imageWeight: "single",
      textWeight: "essay",
      prominence: "standard",
    },
  },
  {
    id: "gallery-no-text",
    group: "Gallery",
    label: "Three images, no text",
    description: "Gallery / carousel, no content.",
    entry: mkEntry({
      id: "fixture-gallery-no-text",
      content: null,
      images: [mkImage("img-1", IMG_A), mkImage("img-2", IMG_B), mkImage("img-3", IMG_C)],
    }),
    expectedLayout: {
      layout: "media-forward",
      imageWeight: "gallery",
      textWeight: "none",
      prominence: "standard",
    },
  },
  {
    id: "gallery-essay",
    group: "Gallery",
    label: "Three images + essay",
    description: "Gallery with long review.",
    entry: mkEntry({
      id: "fixture-gallery-essay",
      content: ESSAY_TEXT,
      images: [mkImage("img-1", IMG_A), mkImage("img-2", IMG_B), mkImage("img-3", IMG_C)],
    }),
    expectedLayout: {
      layout: "balanced",
      imageWeight: "gallery",
      textWeight: "essay",
      prominence: "standard",
    },
  },
  {
    id: "video-no-text",
    group: "Video",
    label: "Video, no text",
    description: "Video URL, no written content.",
    entry: mkEntry({
      id: "fixture-video-no-text",
      content: null,
      video_url: "https://example.com/plano-fixture-video/sample.mp4",
      images: undefined,
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "none",
      prominence: "standard",
    },
  },
  {
    id: "verified-essay-gallery",
    group: "Prominence",
    label: "Verified architect — essay + gallery",
    description: "Elevated prominence via verification, essay, three images.",
    entry: mkEntry({
      id: "fixture-verified-essay-gallery",
      content: ESSAY_TEXT,
      images: [mkImage("img-1", IMG_A), mkImage("img-2", IMG_B), mkImage("img-3", IMG_C)],
      user: mkUser({ is_verified_architect: true }),
    }),
    expectedLayout: {
      layout: "balanced",
      imageWeight: "gallery",
      textWeight: "essay",
      prominence: "elevated",
    },
  },
  {
    id: "high-likes-snippet",
    group: "Prominence",
    label: "High likes + snippet",
    description: "likes_count > 50 with short text (elevated prominence).",
    entry: mkEntry({
      id: "fixture-high-likes-snippet",
      content: SNIPPET_TEXT,
      likes_count: 72,
      images: undefined,
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "snippet",
      prominence: "elevated",
    },
  },
  {
    id: "architect-of-building",
    group: "Prominence",
    label: "Architect of building",
    description: "No text, no images, author credited on building (elevated).",
    entry: mkEntry({
      id: "fixture-architect-of-building",
      content: null,
      images: undefined,
      user: mkUser({ is_architect_of_building: true }),
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "none",
      prominence: "elevated",
    },
  },
  {
    id: "broken-image-url",
    group: "Edge cases",
    label: "Broken image URL",
    description: "Non-empty URL that should fail to load in the browser.",
    entry: mkEntry({
      id: "fixture-broken-image",
      content: null,
      images: [mkImage("img-broken", "https://plano-fixture.invalid/broken-image.png")],
    }),
    expectedLayout: {
      layout: "media-forward",
      imageWeight: "single",
      textWeight: "none",
      prominence: "standard",
    },
  },
  {
    id: "long-building-name",
    group: "Edge cases",
    label: "Very long building name",
    description: "Building name over 60 characters.",
    entry: mkEntry({
      id: "fixture-long-name",
      content: SNIPPET_TEXT,
      building: mkBuilding({
        name: "National Centre for Experimental Timber Architecture and Long-Span Public Atria Research Wing",
      }),
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "snippet",
      prominence: "standard",
    },
  },
  {
    id: "no-address-city",
    group: "Edge cases",
    label: "No address / city",
    description: "Building without address line or city field.",
    entry: mkEntry({
      id: "fixture-no-address",
      content: SNIPPET_TEXT,
      building: mkBuilding({
        address: null,
        city: null,
      }),
    }),
    expectedLayout: {
      layout: "compact-stack",
      imageWeight: "none",
      textWeight: "snippet",
      prominence: "standard",
    },
  },
] as const;

/** Runtime guard: playground and tests expect exactly sixteen fixtures. */
export const CARD_FIXTURE_COUNT = 16 as const;

if (cardFixtures.length !== CARD_FIXTURE_COUNT) {
  throw new Error(`cardFixtures: expected ${CARD_FIXTURE_COUNT} items, got ${cardFixtures.length}`);
}
