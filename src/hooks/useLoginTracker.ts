import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const LOGIN_TRACKING_KEY = 'user_login_tracked';

export function useLoginTracker() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    // Check if we've already tracked login for this browser session
    const hasTracked = sessionStorage.getItem(LOGIN_TRACKING_KEY);

    // We also check a local storage timestamp to ensure we track at least once per day
    // even if the browser session persists (re-opened tab).
    // Actually, "sessionStorage" is cleared on tab close, which is a good proxy for "session".
    // But let's add a daily check just in case.
    const lastTrackedTime = localStorage.getItem(`${LOGIN_TRACKING_KEY}_ts`);
    const now = new Date();
    const isNewDay = !lastTrackedTime ||
      new Date(lastTrackedTime).toDateString() !== now.toDateString();

    if (!hasTracked || isNewDay) {
      const track = async () => {
        try {
          const { error } = await supabase.rpc('track_login');
          if (!error) {
            sessionStorage.setItem(LOGIN_TRACKING_KEY, 'true');
            localStorage.setItem(`${LOGIN_TRACKING_KEY}_ts`, now.toISOString());
          }
        } catch (err) {
          console.error('Failed to track login:', err);
        }
      };

      track();
    }
  }, [session]);
}
