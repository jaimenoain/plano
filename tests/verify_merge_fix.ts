
import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Starting Merge Verification (Full: Architects & Images)...");

  let masterId: string | undefined;
  let duplicateId: string | undefined;
  let arch1Id: string | undefined;
  let arch2Id: string | undefined;

  try {
    // 1. Create Architects
    const arch1Name = "Test Arch Master " + Date.now();
    const arch2Name = "Test Arch Duplicate " + Date.now();

    const { data: a1, error: ae1 } = await supabase.from("architects").insert({ name: arch1Name }).select().single();
    if (ae1) throw new Error("Failed to create arch1: " + ae1.message);
    arch1Id = a1.id;

    const { data: a2, error: ae2 } = await supabase.from("architects").insert({ name: arch2Name }).select().single();
    if (ae2) throw new Error("Failed to create arch2: " + ae2.message);
    arch2Id = a2.id;

    // 2. Create Buildings
    // Master: No image
    const masterName = "Test Master " + Date.now();
    const { data: m, error: me } = await supabase.from("buildings").insert({
        name: masterName,
        main_image_url: null
    }).select().single();
    if (me) throw new Error("Failed to create master: " + me.message);
    masterId = m.id;

    // Duplicate: Has image
    const dupName = "Test Duplicate " + Date.now();
    const dupImage = "https://example.com/duplicate.jpg";
    const { data: d, error: de } = await supabase.from("buildings").insert({
        name: dupName,
        main_image_url: dupImage
    }).select().single();
    if (de) throw new Error("Failed to create duplicate: " + de.message);
    duplicateId = d.id;

    // 3. Link Architects
    const { error: le1 } = await supabase.from("building_architects").insert({ building_id: masterId, architect_id: arch1Id });
    if (le1) throw new Error("Failed to link arch1: " + le1.message);

    const { error: le2 } = await supabase.from("building_architects").insert({ building_id: duplicateId, architect_id: arch2Id });
    if (le2) throw new Error("Failed to link arch2: " + le2.message);

    console.log("Setup complete. Calling merge_buildings...");

    // 4. Call Merge
    const { error: mergeError } = await supabase.rpc("merge_buildings", {
      master_id: masterId,
      duplicate_id: duplicateId,
    });

    if (mergeError) throw new Error("RPC failed: " + mergeError.message);

    // 5. Verify Results
    console.log("Verifying...");

    // Check Image
    const { data: mCheck } = await supabase.from("buildings").select("*").eq("id", masterId).single();
    if (mCheck.main_image_url !== dupImage) {
        console.error(`FAIL: Master image not updated. Expected ${dupImage}, got ${mCheck.main_image_url}`);
    } else {
        console.log("PASS: Master image updated.");
    }

    // Check Architects
    // Master should have BOTH arch1 and arch2
    const { data: links } = await supabase.from("building_architects").select("architect_id").eq("building_id", masterId);
    const linkedIds = links?.map(l => l.architect_id) || [];

    const hasArch1 = linkedIds.includes(arch1Id);
    const hasArch2 = linkedIds.includes(arch2Id);

    if (hasArch1 && hasArch2) {
        console.log("PASS: Master has both architects.");
    } else {
        console.error(`FAIL: Architects missing. Has Arch1: ${hasArch1}, Has Arch2: ${hasArch2}`);
        console.log("Linked Ids:", linkedIds);
    }

    // Check Duplicate Deleted
    const { data: dCheck } = await supabase.from("buildings").select("is_deleted").eq("id", duplicateId).single();
    if (!dCheck.is_deleted) {
        console.error("FAIL: Duplicate not soft-deleted.");
    } else {
        console.log("PASS: Duplicate soft-deleted.");
    }

  } catch (err) {
    console.error("Test Error:", err);
  } finally {
    console.log("Cleanup...");
    if (masterId) await supabase.from("buildings").delete().eq("id", masterId);
    if (duplicateId) await supabase.from("buildings").delete().eq("id", duplicateId);
    if (arch1Id) await supabase.from("architects").delete().eq("id", arch1Id);
    if (arch2Id) await supabase.from("architects").delete().eq("id", arch2Id);
  }
}

main();
