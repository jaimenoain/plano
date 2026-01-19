import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";

export const GoogleAnalytics = () => {
  const { user, loading } = useAuth();

  useEffect(() => {
    // Wait until auth loading is complete
    if (loading) return;

    // Ensure gtag is available
    if (typeof window.gtag === 'function') {
      if (user) {
        // Logged-in user: send user_id
        window.gtag('config', 'G-V8H7C4CD0G', {
          'user_id': user.id
        });
      } else {
        // Anonymous user
        window.gtag('config', 'G-V8H7C4CD0G');
      }
    }
  }, [user, loading]);

  return null;
};
