import { createClient } from "@supabase/supabase-js";
import { config } from "dotenv";

// Load environment variables from .env file
config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE_URL or SUPABASE_KEY in environment variables.");
  console.error("Please ensure .env file exists and contains these variables.");
  process.exit(1);
}

console.log("Using Supabase URL:", supabaseUrl);
// console.log("Using Key:", supabaseKey); // Don't log keys

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("Starting Merge Verification Test...");

  let b1Id: string | undefined;
  let b2Id: string | undefined;

  try {
    // 1. Create two test buildings
    const b1Name = "Test Master Building " + Date.now();
    const b2Name = "Test Duplicate Building " + Date.now();

    console.log(`Creating building 1: ${b1Name}`);
    const { data: b1, error: e1 } = await supabase
      .from("buildings")
      .insert({ name: b1Name })
      .select()
      .single();

    if (e1) {
      console.error("Failed to create building 1. Ensure you have permissions or use SERVICE_ROLE_KEY.", e1);
      throw e1;
    }
    b1Id = b1.id;

    console.log(`Creating building 2: ${b2Name}`);
    const { data: b2, error: e2 } = await supabase
      .from("buildings")
      .insert({ name: b2Name })
      .select()
      .single();

    if (e2) {
      console.error("Failed to create building 2:", e2);
      throw e2;
    }
    b2Id = b2.id;

    // 2. Call Merge RPC
    console.log("Calling merge_buildings RPC...");
    const { error: mergeError } = await supabase.rpc("merge_buildings", {
      master_id: b1Id,
      duplicate_id: b2Id,
    });

    if (mergeError) {
      console.error("RPC failed. Has the migration been applied?", mergeError);
      throw mergeError;
    }

    // 3. Verify Result
    console.log("Verifying results...");

    // Check Master exists and not deleted
    const { data: mCheck } = await supabase.from("buildings").select("*").eq("id", b1Id).single();
    if (mCheck.is_deleted) {
        console.error("FAIL: Master building was deleted!");
    } else {
        console.log("PASS: Master building is active.");
    }

    // Check Duplicate is deleted
    const { data: dCheck } = await supabase.from("buildings").select("*").eq("id", b2Id).single();
    if (!dCheck.is_deleted) {
        console.error("FAIL: Duplicate building was NOT deleted!");
    } else {
        console.log("PASS: Duplicate building is soft-deleted.");
    }

  } catch (err) {
    console.error("Test failed with error:", err);
  } finally {
    // Cleanup
    if (b1Id && b2Id) {
        console.log("Cleaning up test data (attempting hard delete)...");
        // Hard delete only works if RLS allows or service role used.
        // If soft deleted, we might need to update is_deleted=false before deleting or just leave it.
        await supabase.from("buildings").delete().eq("id", b1Id);
        await supabase.from("buildings").delete().eq("id", b2Id);
    }
  }
}

main();
