import { MutualAffinityUser } from "@/types/cine-sync";
import { MutualAffinityRow } from "./MutualAffinityRow";

interface SocialContextSectionProps {
  mutualAffinityUsers: MutualAffinityUser[];
}

export function SocialContextSection({ mutualAffinityUsers }: SocialContextSectionProps) {
  // The row component handles its own empty state, but to avoid an empty container
  // we check here as well since this section currently only contains the row.
  if (!mutualAffinityUsers || mutualAffinityUsers.length === 0) {
    return null;
  }

  return (
    <div className="w-full">
       <MutualAffinityRow users={mutualAffinityUsers} />
    </div>
  );
}
