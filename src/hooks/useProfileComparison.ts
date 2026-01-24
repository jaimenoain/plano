import { useState, useEffect } from 'react';
import { MutualAffinityUser } from '@/types/cine-sync';
import { supabase } from '@/integrations/supabase/client';

interface ProfileComparison {
  mutualAffinityUsers: MutualAffinityUser[];
}

export function useProfileComparison(currentUserId: string | undefined, targetUserId: string | null) {
  const [profileComparison, setProfileComparison] = useState<ProfileComparison>({
    mutualAffinityUsers: []
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchComparison() {
        if (!currentUserId || !targetUserId || currentUserId === targetUserId) {
            setProfileComparison({ mutualAffinityUsers: [] });
            return;
        }

        setLoading(true);
        try {
            // Fetch target user's following
            const { data: targetFollowing } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', targetUserId);

            const targetFollowingIds = new Set(targetFollowing?.map(f => f.following_id));

            // Fetch current user's following
            const { data: myFollowing } = await supabase
                .from('follows')
                .select('following_id')
                .eq('follower_id', currentUserId);

            const myFollowingIds = new Set(myFollowing?.map(f => f.following_id));

            // Find mutuals
            const mutualIds = [...targetFollowingIds].filter(id => myFollowingIds.has(id));

            if (mutualIds.length > 0) {
                 const { data: mutualProfiles } = await supabase
                    .from('profiles')
                    .select('id, username, avatar_url')
                    .in('id', mutualIds)
                    .limit(10);

                if (mutualProfiles) {
                    const users: MutualAffinityUser[] = mutualProfiles.map(p => ({
                        ...p,
                        combined_score: 0.7 + (Math.random() * 0.3) // Mock score for affinity
                    }));
                     setProfileComparison({ mutualAffinityUsers: users });
                } else {
                    setProfileComparison({ mutualAffinityUsers: [] });
                }
            } else {
                setProfileComparison({ mutualAffinityUsers: [] });
            }

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
