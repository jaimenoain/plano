import { useState } from "react";
import { Plus } from "lucide-react";
import { MetaHead } from "@/components/common/MetaHead";
import { AppLayout } from "@/components/layout/AppLayout";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/features/auth";
import { useUserProfile } from "@/features/profile";
import { usePopularCollections, CollectionGuideCard } from "@/features/guides";
import { CollectionsGrid } from "../components/CollectionsGrid";
import { CreateCollectionDialog } from "../components/CreateCollectionDialog";

// ─── Local editorial helpers (mirrors GuidesPage) ─────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow tracking-widest">{children}</p>;
}

function CollectionSkeleton() {
  return (
    <div className="border-b border-border-default pb-6 last:border-0 space-y-3">
      <div className="rounded-none bg-surface-muted animate-pulse" style={{ aspectRatio: "16/7" }} />
      <div className="space-y-1.5">
        <div className="h-4 bg-surface-muted rounded-none animate-pulse w-3/4" />
        <div className="h-3 bg-surface-muted rounded-none animate-pulse w-1/2" />
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function CollectionsIndexPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const [showCreate, setShowCreate] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const { data: collections = [], isLoading: collectionsLoading } = usePopularCollections(24);

  return (
    <>
      <MetaHead
        title="Collections"
        description="Discover community-curated architecture collections — shareable maps of the world's best buildings, with itineraries."
        canonicalUrl="/collections"
      />

      <AppLayout>
        <div className="mx-auto min-h-screen w-full max-w-[1120px] bg-surface-default">
          {/* ── Hero ────────────────────────────────────────────── */}
          <section className="border-b border-border-default px-4 sm:px-8 py-16 sm:py-20">
            <div className="flex items-end justify-between gap-6">
              <div className="max-w-2xl">
                <SectionLabel>Collections</SectionLabel>
                <h1 className="headline mt-3">
                  Architecture maps,<br />curated by the community.
                </h1>
                <p className="text-text-secondary text-sm mt-4">
                  Shareable lists of buildings — with itineraries — from people who know their cities.
                </p>
              </div>
              {user && (
                <Button onClick={() => setShowCreate(true)} className="shrink-0 gap-2">
                  <Plus size={16} />
                  New collection
                </Button>
              )}
            </div>
          </section>

          {/* ── Your collections (signed-in) ────────────────────── */}
          {user && (
            <section className="border-b border-border-default px-4 sm:px-8 py-14">
              <div className="mb-8">
                <SectionLabel>Yours</SectionLabel>
                <h2 className="text-2xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
                  Your collections
                </h2>
              </div>
              <CollectionsGrid
                userId={user.id}
                username={profile?.username ?? null}
                isOwnProfile
                onCreate={() => setShowCreate(true)}
                refreshKey={refreshKey}
              />
            </section>
          )}

          {/* ── Popular collections (everyone) ──────────────────── */}
          <section className="px-4 sm:px-8 py-14">
            <div className="mb-8">
              <SectionLabel>Curated by the community</SectionLabel>
              <h2 className="text-2xl font-semibold tracking-tight leading-tight text-text-primary mt-1">
                Popular collections
              </h2>
            </div>

            {collectionsLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-0">
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <CollectionSkeleton key={i} />
                ))}
              </div>
            ) : collections.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-10 gap-y-0">
                {collections.map((col) => (
                  <CollectionGuideCard key={col.id} collection={col} />
                ))}
              </div>
            ) : (
              <EmptyState
                eyebrow="No collections yet"
                message="Community-curated collections will appear here."
                action={
                  user ? (
                    <button onClick={() => setShowCreate(true)} className="cta-link">
                      Create the first one
                    </button>
                  ) : undefined
                }
              />
            )}
          </section>
        </div>
      </AppLayout>

      {user && (
        <CreateCollectionDialog
          open={showCreate}
          onOpenChange={setShowCreate}
          userId={user.id}
          onSuccess={() => {
            setRefreshKey((prev) => prev + 1);
            setShowCreate(false);
          }}
        />
      )}
    </>
  );
}
