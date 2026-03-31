import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDebounce } from "@/hooks/useDebounce";
export function useUserSearch({ searchQuery, limit = 5, enabled = true }) {
    const [users, setUsers] = useState([]);
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
                    setUsers([]);
                }
                else {
                    setUsers(data || []);
                }
            }
            catch {
                setUsers([]);
            }
            finally {
                setIsLoading(false);
            }
        };
        fetchUsers();
    }, [debouncedQuery, limit, enabled]);
    return { users, isLoading };
}
