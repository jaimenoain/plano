export interface FunctionalCategory {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface FunctionalTypology {
  id: string;
  name: string;
  parent_category_id: string;
  slug: string;
  created_at: string;
}

export interface AttributeGroup {
  id: string;
  name: string;
  slug: string;
  created_at: string;
}

export interface Attribute {
  id: string;
  name: string;
  group_id: string;
  slug: string;
  created_at: string;
}
