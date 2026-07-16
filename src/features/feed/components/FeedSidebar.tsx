import { PeopleYouMayKnow } from "@/features/connect/components/PeopleYouMayKnow";

import { FeedPassportCard } from "./FeedPassportCard";
import { BucketListModule } from "./sidebar/BucketListModule";
import { BuildingOfTheDay } from "./sidebar/BuildingOfTheDay";
import { RailColophon } from "./sidebar/RailColophon";
import { TrendingArchitectsModule } from "./sidebar/TrendingArchitectsModule";

/**
 * The feed's 320px sticky rail. Personal on top (passport, bucket list),
 * editorial below (today's building, most credited), then people to follow
 * and the colophon. Modules own their `border-t pt-9` sections so each one
 * vanishes cleanly — divider and all — when it has nothing to show.
 */
export function FeedSidebar({ userId }: { userId?: string }) {
  return (
    <div>
      <FeedPassportCard />
      <BucketListModule userId={userId} />
      <BuildingOfTheDay />
      <TrendingArchitectsModule />
      <PeopleYouMayKnow layout="stacked" limit={2} heading="People to follow" />
      <RailColophon />
    </div>
  );
}
