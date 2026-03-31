import { MutualAffinityRow } from "./MutualAffinityRow";
import { CommonFollowersFacepile } from "./CommonFollowersFacepile";
import type { MutualAffinityUser, SimpleProfile } from "@/features/profile/hooks/useProfileComparison";

interface SocialContextSectionProps {
  mutualAffinityUsers: MutualAffinityUser[];
  commonFollowers?: {
    users: SimpleProfile[];
    count: number;
  };
}

export function SocialContextSection({ mutualAffinityUsers, commonFollowers }: SocialContextSectionProps) {
  const hasAffinity = mutualAffinityUsers && mutualAffinityUsers.length > 0;
  const hasCommonFollowers = commonFollowers && commonFollowers.count > 0;

  if (!hasAffinity && !hasCommonFollowers) {
    return null;
  }

  return (
    <div className="w-full text-sm text-text-secondary">
       {hasCommonFollowers && (
           <CommonFollowersFacepile users={commonFollowers.users} count={commonFollowers.count} />
       )}
       {hasAffinity && <MutualAffinityRow users={mutualAffinityUsers} />}
    </div>
  );
}
