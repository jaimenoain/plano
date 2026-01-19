import { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './useAuth';

const PRESENCE_INTERVAL = 5 * 60 * 1000; // 5 minutes

export function usePresenceTracker() {
  const { session } = useAuth();

  useEffect(() => {
    if (!session?.user) return;

    const updatePresence = async () => {
      try {
        await supabase.rpc('update_presence');
      } catch (err) {
        console.error('Failed to update presence:', err);
      }
    };

    // Initial update
    updatePresence();

    // Periodic update
    const interval = setInterval(updatePresence, PRESENCE_INTERVAL);

    // Update on visibility change (when user comes back to tab)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        updatePresence();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [session]);
}
