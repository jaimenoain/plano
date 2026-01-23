import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useUserProfile } from "@/hooks/useUserProfile";
import { Loader2 } from "lucide-react";

export const AdminGuard = ({ children }: { children: React.ReactNode }) => {
  const { session, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const navigate = useNavigate();

  useEffect(() => {
    if (!authLoading && !session) {
      navigate("/auth");
      return;
    }

    if (!authLoading && !profileLoading && profile) {
      const isAdmin = profile.role === "admin" || profile.role === "app_admin";
      if (!isAdmin) {
        navigate("/admin/unauthorized");
      }
    }
  }, [session, profile, authLoading, profileLoading, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isAdmin = profile?.role === "admin" || profile?.role === "app_admin";

  if (!session || !isAdmin) {
    return null;
  }

  return <>{children}</>;
};
