import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";

export function AmbassadorGuard({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate(`/auth?redirect=${encodeURIComponent(location.pathname)}`, { replace: true });
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase.rpc("has_embassy_portal_access");
      if (cancelled) return;
      if (error || data !== true) {
        navigate("/become-ambassador", { replace: true, state: { fromEmbassy: true } });
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, authLoading, navigate]);

  if (authLoading || !user || !ready) {
    return (
      <div className="flex min-h-[50vh] w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-text-disabled" aria-hidden />
      </div>
    );
  }

  return <>{children}</>;
}
