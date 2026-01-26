-- Create Audit Logs Table
CREATE TABLE IF NOT EXISTS building_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id UUID NOT NULL REFERENCES buildings(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id), -- Changed to profiles to allow easy joins
    table_name TEXT NOT NULL,
    operation TEXT NOT NULL, -- UPDATE, INSERT, DELETE
    old_data JSONB,
    new_data JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE building_audit_logs ENABLE ROW LEVEL SECURITY;

-- Only Admins can read logs
CREATE POLICY "Admins can read audit logs" ON building_audit_logs
    FOR SELECT TO authenticated
    USING (public.is_admin());

-- Trigger Function
CREATE OR REPLACE FUNCTION log_building_changes()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
    v_old_data JSONB;
    v_new_data JSONB;
BEGIN
    v_user_id := auth.uid();

    -- For BUILDINGS table (UPDATE only)
    IF TG_TABLE_NAME = 'buildings' AND TG_OP = 'UPDATE' THEN
        -- Exclude updates that didn't change meaningful data (e.g. just updated_at)
        -- We can just check if the ROW changed.
        IF NEW IS DISTINCT FROM OLD THEN
            INSERT INTO building_audit_logs (building_id, user_id, table_name, operation, old_data, new_data)
            VALUES (NEW.id, v_user_id, 'buildings', 'UPDATE', to_jsonb(OLD), to_jsonb(NEW));
        END IF;
        RETURN NEW;

    -- For BUILDING_STYLES table
    ELSIF TG_TABLE_NAME = 'building_styles' THEN
        IF TG_OP = 'INSERT' THEN
            INSERT INTO building_audit_logs (building_id, user_id, table_name, operation, new_data)
            VALUES (NEW.building_id, v_user_id, 'building_styles', 'INSERT', to_jsonb(NEW));
            RETURN NEW;
        ELSIF TG_OP = 'DELETE' THEN
            INSERT INTO building_audit_logs (building_id, user_id, table_name, operation, old_data)
            VALUES (OLD.building_id, v_user_id, 'building_styles', 'DELETE', to_jsonb(OLD));
            RETURN OLD;
        END IF;
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create Triggers
DROP TRIGGER IF EXISTS audit_buildings_update ON buildings;
CREATE TRIGGER audit_buildings_update
    AFTER UPDATE ON buildings
    FOR EACH ROW
    EXECUTE FUNCTION log_building_changes();

DROP TRIGGER IF EXISTS audit_building_styles_change ON building_styles;
CREATE TRIGGER audit_building_styles_change
    AFTER INSERT OR DELETE ON building_styles
    FOR EACH ROW
    EXECUTE FUNCTION log_building_changes();


-- Revert RPC
CREATE OR REPLACE FUNCTION revert_building_change(log_id UUID)
RETURNS VOID AS $$
DECLARE
    r building_audit_logs%ROWTYPE;
BEGIN
    -- Check Admin
    IF NOT public.is_admin() THEN
        RAISE EXCEPTION 'Only admins can revert changes';
    END IF;

    SELECT * INTO r FROM building_audit_logs WHERE id = log_id;

    IF r.id IS NULL THEN
        RAISE EXCEPTION 'Log entry not found';
    END IF;

    -- Handle BUILDINGS Update Revert
    IF r.table_name = 'buildings' AND r.operation = 'UPDATE' THEN
        UPDATE buildings
        SET
            name = (r.old_data->>'name'),
            address = (r.old_data->>'address'),
            city = (r.old_data->>'city'),
            country = (r.old_data->>'country'),
            year_completed = (r.old_data->>'year_completed')::int,
            architects = (SELECT array_agg(x) FROM jsonb_array_elements_text(r.old_data->'architects') t(x)),
            location = (r.old_data->>'location')::geography, -- Implicit cast if format matches, otherwise might need ST_GeomFromGeoJSON if to_jsonb converts it
            location_precision = (r.old_data->>'location_precision')::location_precision
            -- Add other columns as needed, but these are the main ones editable
        WHERE id = r.building_id;

    -- Handle BUILDING_STYLES Revert
    ELSIF r.table_name = 'building_styles' THEN
        IF r.operation = 'INSERT' THEN
            -- Revert Insert = Delete
            DELETE FROM building_styles
            WHERE building_id = (r.new_data->>'building_id')::uuid
            AND style_id = (r.new_data->>'style_id')::uuid;
        ELSIF r.operation = 'DELETE' THEN
            -- Revert Delete = Insert
            INSERT INTO building_styles (building_id, style_id)
            VALUES (
                (r.old_data->>'building_id')::uuid,
                (r.old_data->>'style_id')::uuid
            )
            ON CONFLICT DO NOTHING;
        END IF;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
