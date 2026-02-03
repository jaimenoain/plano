import { useState, useEffect } from 'react';
import { MutualAffinityUser } from '@/types/cine-sync';
import { supabase } from '@/integrations/supabase/client';

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
            // Fetch target user's following (for mutual affinity)
            const { data: targetFollowing } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', targetUserId);

            const targetFollowingIds = new Set(targetFollowing?.map(f => f.following_id));

            // Fetch current user's following (for both)
            const { data: myFollowing } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUserId);

            const myFollowingIds = new Set(myFollowing?.map(f => f.following_id));

            // Mutual Affinity (We both follow them)
            const mutualIds = [...targetFollowingIds].filter(id => myFollowingIds.has(id));
            let mutualUsers: MutualAffinityUser[] = [];

            if (mutualIds.length > 0) {
                 const { data: mutualProfiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', mutualIds)
                    .limit(10);

                if (mutualProfiles) {
                    mutualUsers = mutualProfiles.map(p => ({
                        ...p,
                        combined_score: 0.7 + (Math.random() * 0.3) // Mock score for affinity
                    }));
                }
            }

            // Common Followers (I follow them, they follow target)
            // Need target's followers
            const { data: targetFollowers } = await supabase
                .from('follows')
                .select('follower_id')
                .eq('following_id', targetUserId);

            const targetFollowerIds = new Set(targetFollowers?.map(f => f.follower_id));

            // Intersection: I follow them (myFollowingIds) AND they follow target (targetFollowerIds)
            const commonFollowerIds = [...targetFollowerIds].filter(id => myFollowingIds.has(id));
            let commonFollowersUsers: SimpleProfile[] = [];

            if (commonFollowerIds.length > 0) {
                 const { data: cfProfiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', commonFollowerIds)
                    .limit(3); // Limit to 3 for facepile

                 if (cfProfiles) {
                    commonFollowersUsers = cfProfiles;
                 }
            }

            setProfileComparison({
                mutualAffinityUsers: mutualUsers,
                commonFollowers: {
                    users: commonFollowersUsers,
                    count: commonFollowerIds.length
                }
            });

        } catch (error) {
            console.error("Error fetching profile comparison:", error);
        } finally {
            setLoading(false);
        }
    }

    fetchComparison();
  }, [currentUserId, targetUserId]);

  return { profileComparison, loading };
}
