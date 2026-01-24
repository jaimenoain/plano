export interface FunctionalCategory {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface FunctionalTypology {
  id: string;
  name: string;
  functional_category_id: string;
  created_at: string;
}

export interface AttributeGroup {
  id: string;
  name: string;
  functional_category_id: string | null;
  machine_name: string;
  created_at: string;
}

export interface Attribute {
  id: string;
  name: string;
  attribute_group_id: string;
  created_at: string;
}
