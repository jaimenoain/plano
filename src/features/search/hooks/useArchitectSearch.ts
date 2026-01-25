import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";

export interface ArchitectSearchResult {
  id: string;
  name: string;
  type: "individual" | "studio";
}

interface UseArchitectSearchProps {
  searchQuery: string;
  limit?: number;
  enabled?: boolean;
}

export function useArchitectSearch({ searchQuery, limit = 5, enabled = true }: UseArchitectSearchProps) {
  const [architects, setArchitects] = useState<ArchitectSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const debouncedQuery = useDebounce(searchQuery, 500);

  useEffect(() => {
    const fetchArchitects = async () => {
      if (!enabled || !debouncedQuery || debouncedQuery.length < 3) {
        setArchitects([]);
        return;
      }

      setIsLoading(true);
      try {
        // @ts-ignore - architects table exists but types might not be generated yet
        const { data, error } = await supabase
          .from("architects")
          .select("id, name, type")
          .ilike("name", `%${debouncedQuery}%`)
          .limit(limit);

        if (error) {
          console.error("Error searching architects:", error);
          setArchitects([]);
        } else {
          setArchitects(data as ArchitectSearchResult[] || []);
        }
      } catch (err) {
        console.error("Unexpected error searching architects:", err);
        setArchitects([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchArchitects();
  }, [debouncedQuery, limit, enabled]);

  return { architects, isLoading };
}
