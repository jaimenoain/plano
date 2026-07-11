import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ClientOnly } from "@/components/common/ClientOnly";
import { leadAttributionFromCredits } from "../../credits/buildingCreditDisplay";
import { formatBuildingStatusForDisplay, isLostStatus } from "@/lib/buildingStatus";
import { ArchitectStatement } from "./ArchitectStatement";
import { StreamBlockView } from "./BuildingStreamBlocks";
import { RelatedByArchitectSection, RelatedByCitySection } from "./RelatedBuildings";
import { OVERVIEW_STREAM_CHUNK_SIZE, type StreamBlock } from "../utils/streamBlocks";
import type { DisplayImage } from "../hooks/buildingCommunityData";
import type { BuildingDetails } from "../pages/BuildingDetails";
import type { BuildingCreditWithEntities } from "../../credits/types";

interface BuildingOverviewTabProps {
  building: BuildingDetails;
  buildingCredits: BuildingCreditWithEntities[];
  primaryCredit: BuildingCreditWithEntities | null;
  locality: { country_code: string; city_slug: string } | null;
  streamBlocks: StreamBlock[];
  isStatusBuilding: boolean;
  hasMoreCommunity: boolean;
  loadMoreCommunity: () => Promise<void> | void;
  onSelectImage: (img: DisplayImage) => void;
  onAddNote: () => void;
}

/**
 * Overview tab body: status alert, architect statement, the editorial stream
 * (client-chunked infinite scroll over pre-composed {@link StreamBlock}s), and
 * related-buildings sections. Extracted from the BuildingDetails page.
 */
export function BuildingOverviewTab({
  building,
  buildingCredits,
  primaryCredit,
  locality,
  streamBlocks,
  isStatusBuilding,
  hasMoreCommunity,
  loadMoreCommunity,
  onSelectImage,
  onAddNote,
}: BuildingOverviewTabProps) {
  const [visibleCount, setVisibleCount] = useState(OVERVIEW_STREAM_CHUNK_SIZE);
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(OVERVIEW_STREAM_CHUNK_SIZE);
  }, [building.id]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const len = streamBlocks.length;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) return;
        // Reveal more of the loaded set; once exhausted, pull the next DB page.
        if (visibleCount < len) {
          setVisibleCount((n) => Math.min(n + OVERVIEW_STREAM_CHUNK_SIZE, len));
        } else if (hasMoreCommunity) {
          void loadMoreCommunity();
        }
      },
      { root: null, rootMargin: "320px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [streamBlocks.length, visibleCount, hasMoreCommunity, loadMoreCommunity]);

  const visibleBlocks = useMemo(
    () => streamBlocks.slice(0, visibleCount),
    [streamBlocks, visibleCount],
  );

  return (
    <div className="space-y-12">

      {/* Status alert */}
      {isStatusBuilding && (
        <div className="flex items-start gap-4 p-5 rounded-none bg-feedback-destructive/5 border border-feedback-destructive/20">
          <AlertTriangle className="h-5 w-5 text-feedback-destructive shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-feedback-destructive uppercase tracking-wider mb-1">
              {formatBuildingStatusForDisplay(building.status!)}
            </p>
            <p className="text-sm text-text-secondary">
              {isLostStatus(building.status)
                ? "This building no longer stands at this location."
                : building.status === "Unbuilt"
                  ? "This project was never built and exists only in records."
                  : "This building is currently under construction."}
            </p>
          </div>
        </div>
      )}

      {/* Architect statement */}
      {building.architect_statement && (
        <section>
          <div className="mb-6 flex items-baseline gap-3 border-b border-text-primary pb-2">
            <span className="font-mono text-[11px] tracking-[0.06em] text-text-disabled">
              § 01
            </span>
            <span className="text-[11px] font-medium uppercase tracking-widest text-text-primary">
              Architect statement
            </span>
          </div>
          <ArchitectStatement
            statement={building.architect_statement}
            isEditing={false}
            onChange={() => {}}
            architectName={leadAttributionFromCredits(buildingCredits)}
          />
        </section>
      )}

      {/* Editorial stream — full list, infinite scroll (client-chunked) */}
      <section className="space-y-10">
        {streamBlocks.length > 0 ? (
          <>
            {visibleBlocks.map((block) => (
              <motion.div
                key={block.key}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4 }}
              >
                <StreamBlockView block={block} onSelectImage={onSelectImage} />
              </motion.div>
            ))}
            {visibleCount < streamBlocks.length || hasMoreCommunity ? (
              <div ref={sentinelRef} className="h-8 w-full shrink-0" aria-hidden />
            ) : null}
          </>
        ) : (
          <EmptyState
            eyebrow="No photos yet"
            message="Be the first to share this building with the community."
            action={
              <Button size="sm" onClick={onAddNote}>
                Add Note
              </Button>
            }
          />
        )}
      </section>

      {/* Related buildings */}
      <ClientOnly>
        <RelatedByArchitectSection building={building} primaryCredit={primaryCredit} />
        {building.city && (
          <RelatedByCitySection building={building} locality={locality} />
        )}
      </ClientOnly>
    </div>
  );
}
