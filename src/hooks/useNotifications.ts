import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export function useNotifications() {
  const { user } = useAuth();
  const [count, setCount] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const fetchCount = async () => {
    if (!user) {
      setCount(0);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('is_read', false);

      if (error) {
        console.error("Supabase error fetching notifications:", error);
        throw error;
      }

      console.log("Fetched notification count:", count);
      setCount(count || 0);
    } catch (error) {
      console.error("Error fetching notification count:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();

    // Subscribe to realtime changes if needed, but for now simple polling or event based refresh might be enough.
    // Given the user wants "red circle ... exactly on the right place", positioning is key.
    // Realtime updates are a nice to have but not explicitly requested,
    // and `Header.tsx` didn't seem to have realtime subscription for count either.

  }, [user]);

  return { count, loading, refresh: fetchCount };
}
