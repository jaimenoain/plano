import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface MutualAffinityUser {
  id: string;
  username: string | null;
  avatar_url: string | null;
  combined_score: number;
}

export interface SimpleProfile {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface ProfileComparison {
  mutualAffinityUsers: MutualAffinityUser[];
  commonFollowers: {
    users: SimpleProfile[];
    count: number;
  };
}

export function useProfileComparison(currentUserId: string | undefined, targetUserId: string | null) {
  const [profileComparison, setProfileComparison] = useState<ProfileComparison>({
    mutualAffinityUsers: [],
    commonFollowers: { users: [], count: 0 }
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchComparison() {
        if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
            setProfileComparison({
                mutualAffinityUsers: [],
                commonFollowers: { users: [], count: 0 }
            });
            return;
        }

        setLoading(true);
        try {
            // These three `follows` reads are independent of one another — run
            // them concurrently instead of as a 3-deep waterfall (saves ~2 RTTs
            // on every profile-comparison render).
            const [
                { data: targetFollowing },
                { data: myFollowing },
                { data: targetFollowers },
            ] = await Promise.all([
                supabase.from('follows').select('following_id').eq('follower_id', targetUserId),
                supabase.from('follows').select('following_id').eq('follower_id', currentUserId),
                supabase.from('follows').select('follower_id').eq('following_id', targetUserId),
            ]);

            const targetFollowingIds = new Set(targetFollowing?.map(f => f.following_id));
            const myFollowingIds = new Set(myFollowing?.map(f => f.following_id));
            const targetFollowerIds = new Set(targetFollowers?.map(f => f.follower_id));

            // Mutual Affinity (we both follow them); Common Followers (I follow
            // them AND they follow the target).
            const mutualIds = [...targetFollowingIds].filter(id => myFollowingIds.has(id));
            const commonFollowerIds = [...targetFollowerIds].filter(id => myFollowingIds.has(id));

            // The two profile hydrations are independent — fetch in parallel.
            const [{ data: mutualProfiles }, { data: cfProfiles }] = await Promise.all([
                mutualIds.length > 0
                    ? supabase.from('profiles').select('id, username, avatar_url').in('id', mutualIds).limit(10)
                    : Promise.resolve({ data: null }),
                commonFollowerIds.length > 0
                    ? supabase.from('profiles').select('id, username, avatar_url').in('id', commonFollowerIds).limit(3)
                    : Promise.resolve({ data: null }),
            ]);

            const mutualUsers: MutualAffinityUser[] = (mutualProfiles ?? []).map(p => ({
                ...p,
                combined_score: 0.7 + (Math.random() * 0.3) // Mock score for affinity
            }));
            const commonFollowersUsers: SimpleProfile[] = cfProfiles ?? [];

            setProfileComparison({
                mutualAffinityUsers: mutualUsers,
                commonFollowers: {
                    users: commonFollowersUsers,
                    count: commonFollowerIds.length
                }
            });

        } catch {
        } finally {
            setLoading(false);
        }
    }

    fetchComparison();
  }, [currentUserId, targetUserId]);

  return { profileComparison, loading };
}
