import { useEffect, useState } from "react";
import { useParams, useNavigate, type MetaFunction } from "react-router";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import {
  BuildingFormSection,
  BuildingPageHeader,
} from "@/features/buildings/components/building-form-ui";
import { BuildingForm, BuildingFormData } from "../components/BuildingForm";
import { BuildingLocationPicker } from "../components/BuildingLocationPicker";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import type { CreditedEntityTag } from "@/features/credits/components/CreditedEntitiesSelect";
import { replacePrimaryDesignCredits } from "@/features/credits/api/credits";
import { parseLocation } from "@/utils/location";
import { getBuildingUrl } from "@/utils/url";
import { classifyBuildingPathIdSegment } from "@/utils/buildingPathId";
import type { Database } from "@/integrations/supabase/types";

type BuildingEnums = Database["public"]["Enums"];

interface LocationData {
    lat: number | null;
    lng: number | null;
    address: string;
    city: string | null;
    country: string | null;
    countryCode: string | null;
    precision: 'exact' | 'approximate';
}

interface NearbyBuilding {
  id: string;
  name: string;
  address: string | null;
  location_lat: number;
  location_lng: number;
  dist_meters: number;
}

export const meta: MetaFunction = () => [
  { title: "Edit Building | Plano" },
  { name: "robots", content: "noindex, nofollow" },
];

export default function EditBuilding() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [initialValues, setInitialValues] = useState<BuildingFormData | null>(null);
  const [locationData, setLocationData] = useState<LocationData | null>(null);
  const [duplicates, setDuplicates] = useState<NearbyBuilding[]>([]);
  const [_checkingDuplicates, setCheckingDuplicates] = useState(false);
  const [buildingId, setBuildingId] = useState<string | null>(null);
  const [buildingSlug, setBuildingSlug] = useState<string | null>(null);
  const [buildingShortId, setBuildingShortId] = useState<number | null>(null);
  const [primaryDesignCreditRowIds, setPrimaryDesignCreditRowIds] = useState<string[]>([]);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      void navigate(`/login?redirect=${encodeURIComponent(window.location.pathname)}`);
      return;
    }
    if (id) {
      fetchBuilding();
    }
  }, [id, user, authLoading]);

  const fetchBuilding = async () => {
    if (!id) return;
    try {
      setLoading(true);
      setInitialValues(null);
      setLocationData(null);
      setBuildingId(null);
      setBuildingSlug(null);
      setBuildingShortId(null);
      setPrimaryDesignCreditRowIds([]);
      setDuplicates([]);

      let query = supabase.from('buildings').select('*');

      const segment = classifyBuildingPathIdSegment(id);
      if (segment.kind === "uuid") {
        query = query.eq("id", segment.value);
      } else if (segment.kind === "shortId") {
        query = query.eq("short_id", segment.value);
      } else {
        query = query.eq("slug", segment.value);
      }

      const { data, error } = await query.single();

      if (error) {
        toast.error("Building not found");
        navigate('/');
        return;
      }

      if (!data) {
          navigate('/');
          return;
      }

      setBuildingId(data.id);
      setBuildingSlug(data.slug);
      setBuildingShortId(data.short_id);

      const { data: creditRows, error: creditErr } = await supabase
        .from("building_credits")
        .select(
          `
          id,
          person_id,
          company_id,
          person:people(id, name),
          company:companies(id, name)
        `,
        )
        .eq("building_id", data.id)
        .eq("role", "design_architecture")
        .eq("credit_tier", "primary")
        .in("status", ["active", "verified"])
        .order("display_order", { ascending: true });

      const designTags: CreditedEntityTag[] = [];
      const rowIds: string[] = [];
      if (!creditErr && creditRows) {
        for (const row of creditRows) {
          rowIds.push(row.id as string);
          const p = row.person as { id: string; name: string } | null;
          const c = row.company as { id: string; name: string } | null;
          if (p && c) {
            designTags.push({ id: p.id, name: `${p.name} @ ${c.name}`, kind: "person" });
          } else if (p) {
            designTags.push({ id: p.id, name: p.name, kind: "person" });
          } else if (c) {
            designTags.push({ id: c.id, name: c.name, kind: "company" });
          }
        }
      }
      setPrimaryDesignCreditRowIds(rowIds);

      // Fetch Typologies
      const { data: typologies } = await supabase
        .from('building_functional_typologies')
        .select('typology_id')
        .eq('building_id', data.id);

      const typologyIds = typologies?.map((t: { typology_id: string }) => t.typology_id) || [];

      // Fetch Attributes
      const { data: attributes } = await supabase
        .from('building_attributes')
        .select('attribute_id')
        .eq('building_id', data.id);

      const attributeIds = attributes?.map((a: { attribute_id: string }) => a.attribute_id) || [];


      const row = data as Record<string, unknown> & typeof data;
      setInitialValues({
        name: data.name,
        alt_name: (typeof row.alt_name === "string" ? row.alt_name : "") || "",
        aliases: Array.isArray(row.aliases) ? (row.aliases as string[]) : [],
        century: typeof row.century === "number" ? row.century : null,
        year_completed: data.year_completed,
        status: (typeof row.status === "string" ? row.status : "") || "",
        access_level: (typeof row.access_level === "string" ? row.access_level : "") || "",
        access_logistics: (typeof row.access_logistics === "string" ? row.access_logistics : "") || "",
        access_cost: (typeof row.access_cost === "string" ? row.access_cost : "") || "",
        access_notes: (typeof row.access_notes === "string" ? row.access_notes : "") || "",
        size_category: (typeof row.size_category === "string" ? row.size_category : "") || "",
        size_sqm: typeof row.size_sqm === "number" ? row.size_sqm : null,
        height_m: typeof row.height_m === "number" ? row.height_m : null,
        storeys: typeof row.storeys === "number" ? row.storeys : null,
        designCreditEntities: designTags,
        functional_category_id:
          (typeof row.functional_category_id === "string" ? row.functional_category_id : "") || "",
        functional_typology_ids: typologyIds,
        selected_attribute_ids: attributeIds,
      });

      // Parse location
      const coords = parseLocation(data.location);
      const lat = coords ? coords.lat : null;
      const lng = coords ? coords.lng : null;

      const precRaw = data.location_precision;
      const precision: LocationData["precision"] =
        precRaw === "approximate" || precRaw === "exact" ? precRaw : "exact";

      setLocationData({
          lat,
          lng,
          address: data.address || "",
          city: data.city,
          country: data.country,
          countryCode: data.country_code,
          precision,
      });

    } catch (_error) {
toast.error("Error loading building");
    } finally {
      setLoading(false);
    }
  };

  // Duplicate Check Effect
  useEffect(() => {
    if (!locationData || !buildingId) return undefined;
    if (locationData.lat === null || locationData.lng === null) return undefined;

    const checkDuplicates = async (): Promise<void> => {
      setCheckingDuplicates(true);
      try {
        const lat = locationData.lat;
        const lng = locationData.lng;
        if (lat == null || lng == null) return;

        const { data, error } = await supabase.rpc('find_nearby_buildings', {
          lat,
          long: lng,
          radius_meters: 50,
          name_query: initialValues?.name || ""
        });

        if (error) throw error;

        const nearby = (data as unknown as NearbyBuilding[]) || [];
        const others = nearby.filter((b) => b.id !== buildingId);
        setDuplicates(others);

      } catch (_error) {
} finally {
        setCheckingDuplicates(false);
      }
    };

    const timer = setTimeout(checkDuplicates, 800);
    return () => clearTimeout(timer);
  }, [locationData?.lat, locationData?.lng, buildingId]);

  const handleSubmit = async (formData: BuildingFormData): Promise<void> => {
    if (!locationData || !buildingId) return undefined;

    if (locationData.lat === null || locationData.lng === null) {
        toast.error("Please ensure the location is set on the map");
        return;
    }

    setIsSubmitting(true);

    try {
      const { error } = await supabase
        .from('buildings')
        .update({
          name: formData.name,
          alt_name: formData.alt_name || null,
          aliases: formData.aliases || [],
          century: formData.century ?? null,
          year_completed: formData.year_completed,
          status: (formData.status || null) as BuildingEnums["building_status"] | null,
          access_level: (formData.access_level || null) as BuildingEnums["building_access_level"] | null,
          access_logistics: (formData.access_logistics || null) as BuildingEnums["building_access_logistics"] | null,
          access_cost: (formData.access_cost || null) as BuildingEnums["building_access_cost"] | null,
          access_notes: formData.access_notes || null,
          size_category: formData.size_category || null,
          size_sqm: formData.size_sqm ?? null,
          height_m: formData.height_m ?? null,
          storeys: formData.storeys ?? null,
          functional_category_id: formData.functional_category_id,
          // Removed legacy column updates for typologies/attributes

          address: locationData.address,
          city: locationData.city,
          country: locationData.country,
          country_code: locationData.countryCode,
          location: `POINT(${locationData.lng} ${locationData.lat})` as unknown,
          location_precision: locationData.precision
        })
        .eq('id', buildingId);

      if (error) {
toast.error("Failed to update building");
        setIsSubmitting(false);
        return;
      }

      await replacePrimaryDesignCredits(
        buildingId,
        primaryDesignCreditRowIds,
        formData.designCreditEntities.map((e) => ({ kind: e.kind, id: e.id })),
      );

      // Handle Typologies Junction Table
      await supabase.from('building_functional_typologies').delete().eq('building_id', buildingId);
      if (formData.functional_typology_ids.length > 0) {
          const tLinks = formData.functional_typology_ids.map(tid => ({ building_id: buildingId, typology_id: tid }));
          const { error: _tError } = await supabase.from('building_functional_typologies').insert(tLinks);
          }

      // Handle Attributes Junction Table
      await supabase.from('building_attributes').delete().eq('building_id', buildingId);
      if (formData.selected_attribute_ids.length > 0) {
          const aLinks = formData.selected_attribute_ids.map(aid => ({ building_id: buildingId, attribute_id: aid }));
          const { error: _aError } = await supabase.from('building_attributes').insert(aLinks);
          }

      toast.success("Building updated successfully");
      // Locality URL not available: buildingSlug/buildingShortId state does not include locality_country_code/city_slug — requires initial building fetch to also load locality fields
      navigate(getBuildingUrl(buildingId, buildingSlug, buildingShortId));

    } catch (_error) {
toast.error("Unexpected error");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <AppLayout title="Edit Building" showBack>
        <div className="flex items-center justify-center h-[50vh] text-text-secondary">
          <Loader2 className="h-8 w-8 animate-spin" aria-label="Loading building" />
        </div>
      </AppLayout>
    );
  }

  if (!initialValues || !locationData) return null;

  return (
    <AppLayout title="Edit Building" showBack>
      <div className="w-full min-w-0 max-w-2xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
        <BuildingPageHeader
          title="Edit Building"
          description="Update location and catalogue details for this building."
        />

        <BuildingFormSection title="Location">
                <BuildingLocationPicker
                    initialLocation={{
                        lat: locationData.lat,
                        lng: locationData.lng,
                        address: locationData.address,
                        city: locationData.city,
                        country: locationData.country
                    }}
                    initialPrecision={locationData.precision}
                    onLocationChange={(newLoc) => setLocationData({
                        ...newLoc,
                        countryCode: newLoc.countryCode
                    })}
                />

                {duplicates.length > 0 && (
                    <div className="rounded-sm border border-feedback-destructive/50 bg-feedback-destructive/10 p-4 text-feedback-destructive mt-4">
                        <div className="flex items-center gap-2 font-medium mb-1">
                            <AlertTriangle className="h-4 w-4" />
                            Potential Duplicates Found
                        </div>
                        <div className="text-sm opacity-90">
                            Changing the location here puts it very close to these existing buildings:
                            <ul className="mt-2 space-y-2">
                                {duplicates.slice(0, 3).map(d => (
                                    <li key={d.id} className="flex items-center justify-between gap-2 bg-surface-default/80 p-2 rounded-sm text-sm">
                                        <span>{d.name} ({d.dist_meters.toFixed(0)}m away)</span>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            className="h-7 text-xs border-feedback-destructive/50 text-feedback-destructive hover:bg-feedback-destructive hover:text-white"
                                            onClick={() => navigate(`/admin/merge/building/${buildingId}/${d.id}`)}
                                            type="button"
                                        >
                                            Review Duplicate
                                        </Button>
                                    </li>
                                ))}
                            </ul>
                            <div className="mt-2">Please verify you aren't creating a duplicate.</div>
                        </div>
                    </div>
                )}
        </BuildingFormSection>

        <BuildingFormSection title="Building details">
            <BuildingForm
              initialValues={initialValues}
              onSubmit={handleSubmit}
              isSubmitting={isSubmitting}
              submitLabel="Update Building"
              mode="edit"
              buildingId={buildingId ?? undefined}
              shortId={buildingShortId}
            />
        </BuildingFormSection>
      </div>
    </AppLayout>
  );
}
