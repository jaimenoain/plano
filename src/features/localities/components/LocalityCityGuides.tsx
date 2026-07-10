import { Link } from "react-router";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { getBuildingImageUrl } from "@/utils/image";
import { SectionLabel } from "./SectionLabel";

export interface LocalityCollection {
  id: string;
  slug: string;
  name: string;
  ownerUsername: string;
  buildingCount: number;
  previewImageUrls: (string | null)[];
  contributorAvatarUrls: (string | null)[];
}

// ---------------------------------------------------------------------------
// LocalityCityGuides — curated collections with majority of pins in this city
// ---------------------------------------------------------------------------
function CollectionPreviewMosaic({
  urls,
  name,
}: {
  urls: (string | null)[];
  name: string;
}) {
  const [main, second, third] = urls;

  if (!main) {
    return <div className="photo-placeholder aspect-4/3 w-full" data-label={name} />;
  }

  const mainSrc = getBuildingImageUrl(main) ?? "";

  return (
    <>
      {/* Mobile: single hero — avoids ~50px thumbnail strip beside a 2fr/1fr grid */}
      <div className="aspect-4/3 w-full overflow-hidden bg-surface-muted md:hidden">
        <img src={mainSrc} alt={name} className="h-full w-full rounded-none object-cover" />
      </div>

      <div className="hidden aspect-4/3 w-full grid-cols-[2fr_1fr] gap-mosaic-gap overflow-hidden bg-border-default md:grid">
        <div className="overflow-hidden bg-surface-muted">
          <img src={mainSrc} alt={name} className="h-full w-full rounded-none object-cover" />
        </div>
        <div className="grid grid-rows-2 gap-mosaic-gap">
          {second ? (
            <div className="overflow-hidden bg-surface-muted">
              <img
                src={getBuildingImageUrl(second) ?? ""}
                alt=""
                className="h-full w-full rounded-none object-cover"
              />
            </div>
          ) : (
            <div className="photo-placeholder" />
          )}
          {third ? (
            <div className="overflow-hidden bg-surface-muted">
              <img
                src={getBuildingImageUrl(third) ?? ""}
                alt=""
                className="h-full w-full rounded-none object-cover"
              />
            </div>
          ) : (
            <div className="photo-placeholder" />
          )}
        </div>
      </div>
    </>
  );
}

export function LocalityCityGuides({
  collections,
}: {
  collections: LocalityCollection[];
}) {
  if (collections.length === 0) return null;

  return (
    <section className="mt-16 border-t border-border-default pt-12">
      <div className="mb-6 flex items-center justify-between gap-2">
        <SectionLabel>City guides</SectionLabel>
        <Link to={`/explore`} className="cta-link">
          Browse collections
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3">
        {collections.map((col) => (
          <Link
            key={col.id}
            to={`/${col.ownerUsername}/collections/${col.slug}`}
            className="group block"
          >
            <div className="overflow-hidden">
              <CollectionPreviewMosaic
                urls={col.previewImageUrls}
                name={col.name}
              />
            </div>
            <div className="mt-3 space-y-1">
              <p className="text-sm font-medium leading-snug text-text-primary transition-colors group-hover:text-text-secondary">
                {col.name}
              </p>
              <p className="text-[11px] text-text-disabled">
                {col.buildingCount} buildings
                {col.ownerUsername ? ` · ${col.ownerUsername}` : ""}
              </p>
              {/* Contributor facepile */}
              {col.contributorAvatarUrls.length > 0 ? (
                <div className="flex -space-x-1 pt-1">
                  {col.contributorAvatarUrls.slice(0, 4).map((url, i) => (
                    <Avatar
                      key={i}
                      className="h-5 w-5 border border-surface-card bg-surface-muted"
                    >
                      <AvatarImage src={getBuildingImageUrl(url) ?? undefined} alt="" />
                      <AvatarFallback className="text-[8px]">·</AvatarFallback>
                    </Avatar>
                  ))}
                </div>
              ) : null}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
