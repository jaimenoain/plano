import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { EntityType, MergeEntity } from "../types/merge";

export function useEntitySearch(type: EntityType, query: string) {
  const [results, setResults] = useState<MergeEntity[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!query || query.length < 2) {
      setResults([]);
      return;
    }

    const search = async () => {
      setLoading(true);
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let data: any[] | null = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let error: any = null;

        if (type === "building") {
          const res = await supabase
            .from("buildings")
            .select(`
              *,
              building_credits(
                credit_tier,
                status,
                person:people(id, name),
                company:companies(id, name)
              )
            `)
            .ilike("name", `%${query}%`)
            .eq("is_deleted", false)
            .limit(10);
          data = res.data;
          error = res.error;
        } else if (type === "person") {
          const res = await supabase
            .from("people")
            .select("*")
            .ilike("name", `%${query}%`)
            .limit(10);
          data = res.data;
          error = res.error;
        } else if (type === "company") {
          const res = await supabase
            .from("companies")
            .select("*")
            .ilike("name", `%${query}%`)
            .limit(10);
          data = res.data;
          error = res.error;
        } else if (type === "locality") {
          const res = await supabase
            .from("localities")
            .select("*")
            .ilike("city", `%${query}%`)
            .limit(10);
          data = res.data;
          error = res.error;
        }

        if (error) throw error;

        const transformed: MergeEntity[] = (data ?? []).map((row) => {
          if (type === "building") {
            return {
              id: row.id,
              name: row.name,
              type: "building",
              subtitle: `${row.year_completed || "Unknown Year"} • ${row.city || "Unknown City"}`,
              image_url: row.hero_image_url || row.community_preview_url,
              is_verified: row.is_verified,
              raw: row,
            };
          } else if (type === "person") {
            return {
              id: row.id,
              name: row.name,
              type: "person",
              subtitle: row.nationality || "Architect",
              image_url: row.avatar_url,
              is_verified: row.claim_status === "verified",
              raw: row,
            };
          } else if (type === "company") {
            return {
              id: row.id,
              name: row.name,
              type: "company",
              subtitle: row.country || "Architecture Firm",
              image_url: row.logo_url,
              is_verified: row.claim_status === "verified",
              raw: row,
            };
          } else if (type === "locality") {
            return {
              id: row.id,
              name: row.city,
              type: "locality",
              subtitle: row.country,
              image_url: row.hero_image_url,
              is_verified: false,
              raw: row,
            };
          }
          return row;
        });

        setResults(transformed);
      } catch {
        // search failed silently
      } finally {
        setLoading(false);
      }
    };

    const timer = setTimeout(search, 500);
    return () => clearTimeout(timer);
  }, [type, query]);

  return { results, loading };
}
