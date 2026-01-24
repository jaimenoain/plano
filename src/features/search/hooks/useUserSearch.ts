import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface UserSearchResult {
  id: string;
  username: string | null;
  avatar_url: string | null;
}

interface UseUserSearchProps {
  searchQuery: string;
  limit?: number;
  enabled?: boolean;
}

export function useUserSearch({ searchQuery, limit = 5, enabled = true }: UseUserSearchProps) {
  const [users, setUsers] = useState<UserSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    const fetchUsers = async () => {
      if (!enabled || !debouncedQuery || debouncedQuery.length < 3) {
        setUsers([]);
        return;
      }

      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("id, username, avatar_url")
          .ilike("username", `%${debouncedQuery}%`)
          .limit(limit);

        if (error) {
          console.error("Error searching users:", error);
          setUsers([]);
        } else {
          setUsers(data || []);
        }
      } catch (err) {
        console.error("Unexpected error searching users:", err);
        setUsers([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUsers();
  }, [debouncedQuery, limit, enabled]);

  return { users, isLoading };
}
