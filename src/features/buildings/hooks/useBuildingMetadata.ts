import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunctionalCategory, FunctionalTypology, AttributeGroup, Attribute } from "@/types/classification";

export function useBuildingMetadata() {
  const { data: categories, isLoading: isLoadingCategories } = useQuery({
    queryKey: ["functional_categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("functional_categories")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as FunctionalCategory[];
    },
    staleTime: 1000 * 60 * 60, // 1 hour
  });

  const { data: typologies, isLoading: isLoadingTypologies } = useQuery({
    queryKey: ["functional_typologies"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("functional_typologies")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as FunctionalTypology[];
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: attributeGroups, isLoading: isLoadingGroups } = useQuery({
    queryKey: ["attribute_groups"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attribute_groups")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as AttributeGroup[];
    },
    staleTime: 1000 * 60 * 60,
  });

  const { data: attributes, isLoading: isLoadingAttributes } = useQuery({
    queryKey: ["attributes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attributes")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Attribute[];
    },
    staleTime: 1000 * 60 * 60,
  });

  return {
    categories: categories || [],
    typologies: typologies || [],
    attributeGroups: attributeGroups || [],
    attributes: attributes || [],
    isLoading: isLoadingCategories || isLoadingTypologies || isLoadingGroups || isLoadingAttributes,
  };
}
