/**
 * exportCollectionCsv.ts — build a CSV export of a collection's buildings.
 *
 * Fetches the collection's items (with building + primary credits), flattens each
 * row, and returns CSV text plus a suggested filename. Returns null when the
 * collection has no items. The caller handles the browser download. Extracted from
 * CollectionSettingsDialog to keep the Supabase client in an api/ module and that
 * component under its size budget.
 */
import { supabase } from "@/integrations/supabase/client";
import { parseLocation } from "@/utils/location";
import type { Collection } from "@/features/collections/types";

type ExportBuildingCreditRow = {
  credit_tier: string | null;
  status: string | null;
  person: { name: string | null } | null;
  company: { name: string | null } | null;
};

type ExportBuilding = {
  name?: string | null;
  address?: string | null;
  city?: string | null;
  country?: string | null;
  year_completed?: number | null;
  location?: unknown;
  building_credits?: ExportBuildingCreditRow[] | null;
} | null;

type CollectionItemExportRow = {
  note: string | null;
  custom_category_id: string | null;
  buildings: ExportBuilding | ExportBuilding[];
};

export interface CollectionCsvExport {
  csv: string;
  filename: string;
}

/** Returns CSV text + filename, or null when the collection has no items. */
export async function buildCollectionCsvExport(
  collection: Pick<Collection, "id" | "name" | "custom_categories">,
): Promise<CollectionCsvExport | null> {
  const { data, error } = await supabase
    .from("collection_items")
    .select(`
      note,
      custom_category_id,
      buildings (
        name,
        address,
        city,
        country,
        year_completed,
        location,
        building_credits (
          credit_tier,
          status,
          person:people (name),
          company:companies (name)
        )
      )
    `)
    .eq("collection_id", collection.id);

  if (error) throw error;
  if (!data || data.length === 0) return null;

  const headers = [
    "Name",
    "Address",
    "City",
    "Country",
    "Year",
    "Latitude",
    "Longitude",
    "Credits",
    "Note",
    "Category",
  ];

  const escape = (val: unknown) => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const exportRows = data as unknown as CollectionItemExportRow[];
  const rows = exportRows.map((item) => {
    const bRaw = item.buildings;
    const building = Array.isArray(bRaw) ? bRaw[0] : bRaw;
    const location = parseLocation(building?.location);

    const credits =
      building?.building_credits
        ?.filter(
          (c) =>
            c.credit_tier === "primary" &&
            (c.status === "active" || c.status === "verified"),
        )
        .map((c) => {
          const pn = c.person?.name;
          const cn = c.company?.name;
          if (pn && cn) return `${pn} @ ${cn}`;
          return pn || cn || "";
        })
        .filter(Boolean)
        .join("; ") ?? "";

    const category =
      collection.custom_categories?.find((c) => c.id === item.custom_category_id)?.label || "";

    return [
      escape(building?.name),
      escape(building?.address),
      escape(building?.city),
      escape(building?.country),
      escape(building?.year_completed),
      escape(location?.lat),
      escape(location?.lng),
      escape(credits),
      escape(item.note),
      escape(category),
    ].join(",");
  });

  const csv = [headers.join(","), ...rows].join("\n");
  const filename = `${collection.name.toLowerCase().replace(/[^a-z0-9]/g, "-")}-export.csv`;
  return { csv, filename };
}
