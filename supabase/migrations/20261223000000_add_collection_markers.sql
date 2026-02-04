-- Create collection_markers table
-- Verified schema for Other Markers feature
CREATE TABLE public.collection_markers (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    collection_id uuid NOT NULL,
    google_place_id text,
    name text NOT NULL,
    category text NOT NULL CHECK (category IN ('accommodation', 'dining', 'transport', 'attraction', 'other')),
    lat double precision NOT NULL,
    lng double precision NOT NULL,
    address text,
    notes text,
    website text,
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    created_by uuid NOT NULL,
    CONSTRAINT collection_markers_pkey PRIMARY KEY (id),
    CONSTRAINT collection_markers_collection_id_fkey FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE,
    CONSTRAINT collection_markers_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id)
);

-- Create index
CREATE INDEX collection_markers_collection_id_idx ON public.collection_markers(collection_id);

-- Enable RLS
ALTER TABLE public.collection_markers ENABLE ROW LEVEL SECURITY;

-- Policies

CREATE POLICY "Collection markers are viewable if collection is viewable"
ON public.collection_markers FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.collections
        WHERE id = collection_markers.collection_id
    )
);

CREATE POLICY "Owners and editors can insert markers"
ON public.collection_markers FOR INSERT
TO authenticated
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_markers.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role = 'editor')
        )
    )
);

CREATE POLICY "Owners and editors can update markers"
ON public.collection_markers FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_markers.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role = 'editor')
        )
    )
);

CREATE POLICY "Owners and editors can delete markers"
ON public.collection_markers FOR DELETE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.collections c
        LEFT JOIN public.collection_contributors cc ON c.id = cc.collection_id AND cc.user_id = auth.uid()
        WHERE c.id = collection_markers.collection_id
        AND (
            c.owner_id = auth.uid()
            OR (cc.user_id IS NOT NULL AND cc.role = 'editor')
        )
    )
);
