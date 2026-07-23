import { useEffect } from "react";
import { useNavigate } from "react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useUserProfile } from "@/features/profile/hooks/useUserProfile";
import { isSuperadminAccess } from "@/features/superadmin/lib/superadminAccess";

/**
 * UX gate for superadmin-only dev tools (e.g. card playground). Same security posture as
 * {@link AdminGuard}: RLS and server logic remain authoritative.
 */
export function SuperadminGuard({ children }: { children: React.ReactNode }) {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) {
      navigate("/login");
      return;
    }

    if (!authLoading && !profileLoading && session) {
      if (!isSuperadminAccess(profile, session.user.email)) {
        navigate("/admin/unauthorized");
      }
    }
  }, [session, profile, authLoading, profileLoading, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-brand-primary" />
      </div>
    );
  }

  if (!session || !isSuperadminAccess(profile, session.user.email)) {
    return null;
  }

  return <>{children}</>;
}
