import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface UserProfile {
  id: string;
  username: string | null;
  bio: string | null;
  avatar_url: string | null;
  country: string | null;
  location: string | null;
  subscribed_platforms: string[] | null;
  role: string | null;
  profile_sections?: any;
}

export function useUserProfile() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, bio, avatar_url, country, location, subscribed_platforms, role, profile_sections")
          .eq("id", user.id)
          .single();

        if (error) throw error;
        // @ts-ignore
        setProfile(data);
      } catch (error) {
        console.error("Error fetching user profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user]);

  // Function to refetch profile manually (e.g., after update)
  const refetch = async () => {
    if (!user) return;
    const { data } = await supabase
      .from("profiles")
      .select("id, username, bio, avatar_url, country, location, subscribed_platforms, role, profile_sections")
      .eq("id", user.id)
      .single();
    if (data) {
      // @ts-ignore
      setProfile(data);
    }
  };

  return { profile, loading, refetch };
}
