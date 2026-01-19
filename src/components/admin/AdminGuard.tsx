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
    } else if (!authLoading && !profileLoading && profile && profile.role !== "admin") {
      navigate("/");
    }
  }, [session, profile, authLoading, profileLoading, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session || (profile && profile.role !== "admin")) {
    return null;
  }

  return <>{children}</>;
};
