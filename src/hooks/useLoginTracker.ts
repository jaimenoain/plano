import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const LOGIN_TRACKING_KEY = 'user_login_tracked';

export function useLoginTracker() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    // We rely on localStorage timestamp to ensure we only track once per day per device/browser profile.
    // sessionStorage check is insufficient as it clears on tab close, causing redundant calls on new tabs.
    const lastTrackedTime = localStorage.getItem(`${LOGIN_TRACKING_KEY}_ts`);
    const now = new Date();
    const isNewDay = !lastTrackedTime ||
      new Date(lastTrackedTime).toDateString() !== now.toDateString();

    if (isNewDay) {
      const track = async () => {
        try {
          const { error } = await supabase.rpc('track_login');

          // Update storage if success or if it was a conflict (already tracked today).
          // Code '23505' is PostgreSQL unique violation.
          // We also check for generic conflict message just in case.
          if (!error || error.code === '23505' || error.message?.toLowerCase().includes('conflict')) {
            sessionStorage.setItem(LOGIN_TRACKING_KEY, 'true');
            localStorage.setItem(`${LOGIN_TRACKING_KEY}_ts`, now.toISOString());
          } else {
            console.error('Failed to track login:', error);
          }
        } catch (err) {
          console.error('Failed to track login exception:', err);
        }
      };

      track();
    }
  }, [session]);
}
