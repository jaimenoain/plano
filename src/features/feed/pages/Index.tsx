import { useEffect } from "react";
import { Link, useNavigate, type MetaFunction } from "react-router";
import { useQuery } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { Loader2 } from "lucide-react";

import { AppLayout } from "@/components/layout/AppLayout";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useExploreShell } from "@/components/layout/ExploreShellContext";
import { supabase } from "@/integrations/supabase/client";
import { SITE_URL } from "@/features/buildings/utils/structuredData";
import { getBuildingImageUrl, getStorageAssetUrl } from "@/utils/image";

import { LandingHero } from "../components/landing/LandingHero";
import { LandingMarquee } from "../components/landing/LandingMarquee";
import { LandingFeatureGrid } from "../components/landing/LandingFeatureGrid";
import { LandingNav } from "../components/landing/LandingNav";
import { LandingFooter } from "../components/landing/LandingFooter";

const INDEX_TITLE = "Plano — The world's architecture, cataloged.";
const INDEX_DESCRIPTION =
  "Track your architecture visits, rate buildings, and discover what friends are exploring.";
const INDEX_CANONICAL = `${SITE_URL}/`;
const INDEX_OG_IMAGE = `${SITE_URL}/cover.jpg`;

export const meta: MetaFunction = () => [
  { title: INDEX_TITLE },
  { name: "description", content: INDEX_DESCRIPTION },
  { property: "og:title", content: INDEX_TITLE },
  { property: "og:description", content: INDEX_DESCRIPTION },
  { property: "og:image", content: INDEX_OG_IMAGE },
  { property: "og:type", content: "website" },
  { property: "og:url", content: INDEX_CANONICAL },
  { name: "twitter:card", content: "summary_large_image" },
  { name: "twitter:title", content: INDEX_TITLE },
  { name: "twitter:description", content: INDEX_DESCRIPTION },
  { name: "twitter:image", content: INDEX_OG_IMAGE },
  { tagName: "link", rel: "canonical", href: INDEX_CANONICAL },
];

type FeedNote = {
  id: string;
  title: string | null;
  body: string | null;
  created_at: string;
  user: {
    username: string | null;
    avatar_url: string | null;
  } | null;
  building: {
    id: string;
    slug: string | null;
    name: string;
    city: string | null;
    country: string | null;
  } | null;
  images: { id: string; storage_path: string }[];
};

async function fetchFeed(): Promise<FeedNote[]> {
  const { data, error } = await supabase
    .from("building_posts")
    .select(
      `
      id,
      title,
      body,
      created_at,
      user:profiles!building_posts_user_id_fkey(username, avatar_url),
      building:buildings!building_posts_building_id_fkey(id, slug, name, city, country),
      images:review_images(id, storage_path)
    `,
    )
    .eq("visibility", "public")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) throw error;
  return (data ?? []) as unknown as FeedNote[];
}

function Landing() {
  const { setLandingHideTopChrome } = useExploreShell();
  useEffect(() => {
    setLandingHideTopChrome(true);
    return () => setLandingHideTopChrome(false);
  }, [setLandingHideTopChrome]);

  return (
    <AppLayout showNav={false} showFooter={false}>
      <LandingNav />
      <main className="flex-1 w-full min-w-0 overflow-x-hidden">
        <LandingHero />
        <LandingMarquee />
        <section className="max-w-5xl mx-auto py-24 px-5 md:px-8">
          <div className="mb-16 space-y-3">
            <p className="text-[11px] font-medium tracking-[0.2em] uppercase text-text-disabled">
              What we're building
            </p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-text-primary max-w-xl">
              A permanent record of the built world.
            </h2>
          </div>
          <LandingFeatureGrid />
        </section>
      </main>
      <LandingFooter />
    </AppLayout>
  );
}

function NoteImages({
  images,
  noteHref,
}: {
  images: FeedNote["images"];
  noteHref: string;
}) {
  if (images.length === 0) return null;

  if (images.length === 1) {
    return (
      <Link to={noteHref} className="block mt-4 overflow-hidden rounded-md">
        <img
          src={getBuildingImageUrl(images[0].storage_path)}
          alt=""
          loading="lazy"
          className="w-full max-h-[680px] object-cover bg-surface-muted"
        />
      </Link>
    );
  }

  const visible = images.slice(0, 4);
  const overflow = images.length - visible.length;

  return (
    <Link to={noteHref} className="mt-4 grid grid-cols-2 gap-1">
      {visible.map((img, i) => (
        <div key={img.id} className="relative aspect-square overflow-hidden rounded-md bg-surface-muted">
          <img
            src={getBuildingImageUrl(img.storage_path)}
            alt=""
            loading="lazy"
            className="w-full h-full object-cover"
          />
          {i === visible.length - 1 && overflow > 0 && (
            <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-lg font-medium">
              +{overflow}
            </div>
          )}
        </div>
      ))}
    </Link>
  );
}

function NoteCard({ note }: { note: FeedNote }) {
  const author = note.user;
  const building = note.building;
  const images = note.images ?? [];

  const time = formatDistanceToNow(new Date(note.created_at), {
    addSuffix: true,
  });

  const profileHref = author?.username ? `/profile/${author.username}` : null;
  const buildingHref = building
    ? `/building/${building.id}${building.slug ? `/${building.slug}` : ""}`
    : null;
  const noteHref = `/review/${note.id}`;

  const authorAvatar = author?.avatar_url
    ? getStorageAssetUrl(author.avatar_url)
    : undefined;
  const authorName = author?.username ?? "Someone";

  const hasText = Boolean(note.title || note.body);
  const hasImages = images.length > 0;
  if (!hasText && !hasImages) return null;

  return (
    <article className="border-b border-border-default py-8 first:pt-2">
      <header className="flex items-center gap-3 mb-4">
        {authorAvatar ? (
          <img
            src={authorAvatar}
            alt=""
            className="w-9 h-9 rounded-full object-cover bg-surface-muted"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-surface-muted" />
        )}
        <div className="flex-1 min-w-0 text-sm leading-tight">
          <div className="text-text-primary truncate">
            {profileHref ? (
              <Link to={profileHref} className="font-medium hover:underline">
                {authorName}
              </Link>
            ) : (
              <span className="font-medium">{authorName}</span>
            )}
            {building && buildingHref && (
              <>
                <span className="text-text-disabled"> · </span>
                <Link
                  to={buildingHref}
                  className="text-text-secondary hover:underline"
                >
                  {building.name}
                </Link>
              </>
            )}
          </div>
          <div className="text-xs text-text-disabled mt-0.5">{time}</div>
        </div>
      </header>

      {hasText && (
        <Link to={noteHref} className="block group">
          {note.title && (
            <h2 className="text-lg font-semibold text-text-primary mb-1 group-hover:underline">
              {note.title}
            </h2>
          )}
          {note.body && (
            <p className="text-text-secondary whitespace-pre-wrap leading-relaxed line-clamp-6">
              {note.body}
            </p>
          )}
        </Link>
      )}

      <NoteImages images={images} noteHref={noteHref} />
    </article>
  );
}

function Feed() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["feed-v3"],
    queryFn: fetchFeed,
    staleTime: 60_000,
  });

  return (
    <AppLayout>
      <div className="mx-auto w-full max-w-[640px] px-4 md:px-6 pt-10 pb-32">
        <h1 className="text-2xl font-semibold text-text-primary mb-8 tracking-tight">
          Latest
        </h1>

        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-text-secondary" />
          </div>
        ) : error ? (
          <div className="text-text-secondary text-sm py-12">
            Couldn't load the feed. Please refresh.
          </div>
        ) : (data?.length ?? 0) === 0 ? (
          <div className="text-text-secondary text-sm py-12">
            No posts yet. Be the first to share.
          </div>
        ) : (
          <div>
            {data!.map((note) => (
              <NoteCard key={note.id} note={note} />
            ))}
          </div>
        )}
      </div>
    </AppLayout>
  );
}

export default function Index() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user && !authLoading && !user.user_metadata?.onboarding_completed) {
      navigate("/onboarding");
    }
  }, [user, authLoading, navigate]);

  if (authLoading) {
    return (
      <div className="min-h-screen bg-surface-default flex flex-col items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-text-secondary" />
      </div>
    );
  }

  if (!user) return <Landing />;
  return <Feed />;
}
