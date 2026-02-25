-- Create user_folders table
CREATE TABLE public.user_folders (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    owner_id uuid NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    description text,
    is_public boolean NOT NULL DEFAULT true,
    CONSTRAINT user_folders_pkey PRIMARY KEY (id),
    CONSTRAINT user_folders_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE,
    CONSTRAINT user_folders_slug_unique_per_owner UNIQUE (owner_id, slug)
);

-- Create user_folder_items table
CREATE TABLE public.user_folder_items (
    folder_id uuid NOT NULL,
    collection_id uuid NOT NULL,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    CONSTRAINT user_folder_items_pkey PRIMARY KEY (folder_id, collection_id),
    CONSTRAINT user_folder_items_folder_id_fkey FOREIGN KEY (folder_id) REFERENCES public.user_folders(id) ON DELETE CASCADE,
    CONSTRAINT user_folder_items_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE
);

-- Enable RLS
ALTER TABLE public.user_folders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_folder_items ENABLE ROW LEVEL SECURITY;

-- Policies for user_folders

CREATE POLICY "Folders are viewable by owner or public"
ON public.user_folders FOR SELECT
USING (
    owner_id = auth.uid() OR is_public = true
);

CREATE POLICY "Users can create their own folders"
ON public.user_folders FOR INSERT
TO authenticated
WITH CHECK (
    owner_id = auth.uid()
);

CREATE POLICY "Users can update their own folders"
ON public.user_folders FOR UPDATE
TO authenticated
USING (
    owner_id = auth.uid()
);

CREATE POLICY "Users can delete their own folders"
ON public.user_folders FOR DELETE
TO authenticated
USING (
    owner_id = auth.uid()
);

-- Policies for user_folder_items

CREATE POLICY "Items are viewable if folder is viewable"
ON public.user_folder_items FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.user_folders
        WHERE id = user_folder_items.folder_id
        AND (owner_id = auth.uid() OR is_public = true)
    )
);

CREATE POLICY "Users can add items to their own folders"
ON public.user_folder_items FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_folders
        WHERE id = user_folder_items.folder_id
        AND owner_id = auth.uid()
    )
);

CREATE POLICY "Users can remove items from their own folders"
ON public.user_folder_items FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_folders
        WHERE id = user_folder_items.folder_id
        AND owner_id = auth.uid()
    )
);

-- Create indexes
CREATE INDEX user_folders_owner_id_idx ON public.user_folders(owner_id);
CREATE INDEX user_folders_slug_idx ON public.user_folders(slug);
CREATE INDEX user_folder_items_folder_id_idx ON public.user_folder_items(folder_id);
CREATE INDEX user_folder_items_collection_id_idx ON public.user_folder_items(collection_id);
