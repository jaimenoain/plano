-- Create collections table
CREATE TABLE public.collections (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    owner_id uuid NOT NULL,
    name text NOT NULL,
    description text,
    is_public boolean NOT NULL DEFAULT false,
    slug text NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT collections_pkey PRIMARY KEY (id),
    CONSTRAINT collections_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT collections_slug_unique UNIQUE (slug)
);

-- Create collection_items table
CREATE TABLE public.collection_items (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    collection_id uuid NOT NULL,
    building_id uuid NOT NULL,
    order_index integer NOT NULL DEFAULT 0,
    note text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT collection_items_pkey PRIMARY KEY (id),
    CONSTRAINT collection_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
    CONSTRAINT collection_items_building_id_fkey FOREIGN KEY (building_id) REFERENCES public.buildings(id) ON DELETE CASCADE
);

-- Create collection_contributors table
CREATE TABLE public.collection_contributors (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    collection_id uuid NOT NULL,
    user_id uuid NOT NULL,
    role text NOT NULL CHECK (role IN ('editor', 'viewer')),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT collection_contributors_pkey PRIMARY KEY (id),
    CONSTRAINT collection_contributors_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
    CONSTRAINT collection_contributors_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE,
    CONSTRAINT collection_contributors_unique_user_collection UNIQUE (collection_id, user_id)
);

-- Create indexes
CREATE INDEX collections_owner_id_idx ON public.collections(owner_id);
CREATE INDEX collections_slug_idx ON public.collections(slug);
CREATE INDEX collection_items_collection_id_idx ON public.collection_items(collection_id);
CREATE INDEX collection_items_building_id_idx ON public.collection_items(building_id);
CREATE INDEX collection_contributors_collection_id_idx ON public.collection_contributors(collection_id);
CREATE INDEX collection_contributors_user_id_idx ON public.collection_contributors(user_id);

-- Enable RLS
ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_contributors ENABLE ROW LEVEL SECURITY;

-- Policies for collections

CREATE POLICY "Collections are viewable by everyone if public"
ON public.collections FOR SELECT
USING (is_public = true);

CREATE POLICY "Collections are viewable by owner"
ON public.collections FOR SELECT
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Collections are viewable by contributors"
ON public.collections FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collection_contributors
        WHERE collection_id = id
        AND user_id = auth.uid()
    )
);

CREATE POLICY "Users can create collections"
ON public.collections FOR INSERT
TO authenticated
WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Owners can update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (owner_id = auth.uid());

CREATE POLICY "Editors can update collections"
ON public.collections FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collection_contributors
        WHERE collection_id = id
        AND user_id = auth.uid()
        AND role = 'editor'
    )
);

CREATE POLICY "Owners can delete collections"
ON public.collections FOR DELETE
TO authenticated
USING (owner_id = auth.uid());

-- Policies for collection_items

CREATE POLICY "Collection items are viewable if collection is viewable"
ON public.collection_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.collections
        WHERE id = collection_items.collection_id
    )
);

CREATE POLICY "Owners and editors can insert collection items"
ON public.collection_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_items.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role = 'editor')
        )
    )
);

CREATE POLICY "Owners and editors can update collection items"
ON public.collection_items FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_items.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role = 'editor')
        )
    )
);

CREATE POLICY "Owners and editors can delete collection items"
ON public.collection_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_items.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role = 'editor')
        )
    )
);

-- Policies for collection_contributors

CREATE POLICY "Contributors are viewable if collection is viewable"
ON public.collection_contributors FOR SELECT
USING (
    user_id = auth.uid() OR
    EXISTS (
        SELECT 1 FROM public.collections
        WHERE id = collection_contributors.collection_id
    )
);

CREATE POLICY "Owners can insert contributors"
ON public.collection_contributors FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.collections
        WHERE id = collection_contributors.collection_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Owners can update contributors"
ON public.collection_contributors FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections
        WHERE id = collection_contributors.collection_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Owners can delete contributors"
ON public.collection_contributors FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections
        WHERE id = collection_contributors.collection_id
        AND owner_id = auth.uid()
    )
);
