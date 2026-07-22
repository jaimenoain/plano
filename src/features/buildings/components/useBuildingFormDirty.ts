import { useEffect, useRef } from "react";
import type { BuildingFormData } from "./BuildingForm";

/** Minimal shape needed from a credited entity for dirty comparison. */
type CreditSignatureEntity = { kind: string; id: string };

/** The subset of live form state used to decide whether the form differs from its initial values. */
export interface BuildingFormDirtyFields {
  name: string;
  alt_name: string;
  aliases: string[];
  year_completed: string;
  century_manual: string;
  status: string;
  access_level: string;
  access_logistics: string;
  access_cost: string;
  access_notes: string;
  architect_statement: string;
  size_category: string;
  size_sqm: string;
  height_m: string;
  storeys: string;
  designCreditEntities: CreditSignatureEntity[];
  functional_category_id: string;
  functional_typology_ids: string[];
  selected_attribute_ids: string[];
}

/** Order-insensitive, stable signature of the tracked form fields for dirty detection. */
function buildFormSignature(fields: BuildingFormDirtyFields): string {
  return JSON.stringify({
    name: fields.name.trim(),
    alt_name: fields.alt_name.trim(),
    aliases: [...fields.aliases].sort(),
    year_completed: fields.year_completed,
    century_manual: fields.century_manual,
    status: fields.status,
    access_level: fields.access_level,
    access_logistics: fields.access_logistics,
    access_cost: fields.access_cost,
    access_notes: fields.access_notes.trim(),
    architect_statement: fields.architect_statement.trim(),
    size_category: fields.size_category,
    size_sqm: fields.size_sqm,
    height_m: fields.height_m,
    storeys: fields.storeys,
    designCredits: fields.designCreditEntities.map((e) => `${e.kind}:${e.id}`).sort(),
    functional_category_id: fields.functional_category_id,
    functional_typology_ids: [...fields.functional_typology_ids].sort(),
    selected_attribute_ids: [...fields.selected_attribute_ids].sort(),
  });
}

/** Normalize the form's `initialValues` into the comparable field shape. */
function fieldsFromInitialValues(initialValues: BuildingFormData): BuildingFormDirtyFields {
  return {
    name: initialValues.name || "",
    alt_name: initialValues.alt_name || "",
    aliases: initialValues.aliases || [],
    year_completed: initialValues.year_completed?.toString() || "",
    century_manual: initialValues.century?.toString() || "",
    status: initialValues.status || "",
    access_level: initialValues.access_level || "",
    access_logistics: initialValues.access_logistics || "",
    access_cost: initialValues.access_cost || "",
    access_notes: initialValues.access_notes || "",
    architect_statement: initialValues.architect_statement || "",
    size_category: initialValues.size_category || "",
    size_sqm: initialValues.size_sqm?.toString() || "",
    height_m: initialValues.height_m?.toString() || "",
    storeys: initialValues.storeys?.toString() || "",
    designCreditEntities: initialValues.designCreditEntities,
    functional_category_id: initialValues.functional_category_id || "",
    functional_typology_ids: initialValues.functional_typology_ids,
    selected_attribute_ids: initialValues.selected_attribute_ids,
  };
}

/**
 * Returns whether `currentFields` differ from `initialValues`. The initial signature is
 * snapshotted once on mount. When `onDirtyChange` is provided, the latest value is emitted.
 */
export function useBuildingFormDirty(
  initialValues: BuildingFormData,
  currentFields: BuildingFormDirtyFields,
  onDirtyChange?: (dirty: boolean) => void,
): boolean {
  const initialSignatureRef = useRef<string | null>(null);
  if (initialSignatureRef.current === null) {
    initialSignatureRef.current = buildFormSignature(fieldsFromInitialValues(initialValues));
  }

  const isDirty = buildFormSignature(currentFields) !== initialSignatureRef.current;

  useEffect(() => {
    onDirtyChange?.(isDirty);
  }, [isDirty, onDirtyChange]);

  return isDirty;
}
