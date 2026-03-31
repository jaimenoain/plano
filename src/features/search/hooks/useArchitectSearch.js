import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
export function useArchitectSearch({ searchQuery, limit = 5, enabled = true }) {
    const [architects, setArchitects] = useState([]);
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
                const { data, error } = await supabase
                    .from("architects")
                    .select("id, name, type")
                    .ilike("name", `%${debouncedQuery}%`)
                    .limit(limit);
                if (error) {
                    setArchitects([]);
                }
                else {
                    setArchitects(data || []);
                }
            }
            catch {
                setArchitects([]);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchArchitects();
    }, [debouncedQuery, limit, enabled]);
    return { architects, isLoading };
}
