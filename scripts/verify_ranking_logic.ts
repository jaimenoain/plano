
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Error: Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  console.error('This script requires the Service Role Key to create dummy users and bypass RLS.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function main() {
  console.log('--- Starting Ranking Logic Verification ---\n');

  let testUserId: string | null = null;
  let testBuildingId: string | null = null;
  let testUserBuildingId: string | null = null;

  try {
    // --- 1. SETUP ---
    console.log('1. Setup: Creating dummy user and building...');

    // Create dummy user
    const email = `test_ranking_${Date.now()}@example.com`;
    const password = 'test_password_123'; // Dummy password
    const { data: userData, error: userError } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    });

    if (userError || !userData.user) {
      throw new Error(`Failed to create user: ${userError?.message}`);
    }
    testUserId = userData.user.id;
    console.log(`   - Created User ID: ${testUserId}`);

    // Create dummy building
    const buildingName = `Ranking Test Building ${Date.now()}`;
    // Using simple point for location. The DB expects a geometry/geography type, likely PostGIS.
    // Assuming standard WKT format works with Supabase client if configured correctly,
    // otherwise might need raw SQL or specific format.
    // Based on import-airtable.ts, it uses `POINT(lng lat)`.
    const { data: buildingData, error: buildingError } = await supabase
      .from('buildings')
      .insert({
        name: buildingName,
        location: 'POINT(0 0)',
        location_precision: 'approximate'
        // popularity_score default is likely 0 or null
      })
      .select()
      .single();

    if (buildingError || !buildingData) {
      throw new Error(`Failed to create building: ${buildingError?.message}`);
    }
    testBuildingId = buildingData.id;
    console.log(`   - Created Building ID: ${testBuildingId}`);
    console.log(`   - Initial Popularity Score: ${buildingData.popularity_score ?? 0}`);


    // --- 2. SCENARIO A: BASE SAVE ---
    console.log('\n2. Scenario A: Base Save (Rating 0/Null)');

    // Insert user_building interaction
    const { data: ubData, error: ubError } = await supabase
      .from('user_buildings')
      .insert({
        user_id: testUserId,
        building_id: testBuildingId,
        status: 'pending',
        rating: 0 // Using 0 as per requirement, assuming it maps to base weight
      })
      .select()
      .single();

    if (ubError || !ubData) {
      throw new Error(`Failed to insert user_building: ${ubError?.message}`);
    }
    testUserBuildingId = ubData.id;

    // Wait for trigger to update score (if async) - usually triggers are synchronous in Postgres
    // unless deferred, but checking immediately is fine.
    // Fetch updated building
    const { data: bDataA, error: bErrorA } = await supabase
      .from('buildings')
      .select('popularity_score')
      .eq('id', testBuildingId)
      .single();

    if (bErrorA) throw bErrorA;

    const scoreA = bDataA.popularity_score ?? 0;
    console.log(`   - Popularity Score after Save: ${scoreA}`);

    // Assertion: Score should be > 0 (1 point for base interest)
    // If rating 0 is treated as NULL rating -> 1 point.
    // If rating 0 is treated as a value? The check logic said: rating 3->20, 2->10, 1->5, ELSE 1.
    // So 0 falls into ELSE -> 1.
    if (scoreA >= 1) {
      console.log('   ✅ PASS: Score increased for base save.');
    } else {
      console.error('   ❌ FAIL: Score did not increase.');
    }


    // --- 3. SCENARIO B: HIGH RATING ---
    console.log('\n3. Scenario B: High Rating (Rating 3)');

    // Update user_building interaction
    const { error: updateError } = await supabase
      .from('user_buildings')
      .update({
        rating: 3,
        status: 'visited'
      })
      .eq('id', testUserBuildingId);

    if (updateError) throw updateError;

    // Fetch updated building
    const { data: bDataB, error: bErrorB } = await supabase
      .from('buildings')
      .select('popularity_score')
      .eq('id', testBuildingId)
      .single();

    if (bErrorB) throw bErrorB;

    const scoreB = bDataB.popularity_score ?? 0;
    console.log(`   - Popularity Score after Rating 3: ${scoreB}`);

    // Assertion: Score should be 20 (since we only have 1 interaction)
    if (scoreB === 20) {
      console.log('   ✅ PASS: Score updated correctly for high rating.');
    } else {
      console.error(`   ❌ FAIL: Expected score 20, got ${scoreB}`);
    }


    // --- 4. SCENARIO C: TIER CHANGE ---
    console.log('\n4. Scenario C: Tier Change (Top 1%)');

    // Get max popularity score to ensure we are top 1%
    const { data: maxScoreData, error: maxScoreError } = await supabase
        .from('buildings')
        .select('popularity_score')
        .order('popularity_score', { ascending: false })
        .limit(1)
        .single();

    let targetScore = 1000;
    if (maxScoreData && maxScoreData.popularity_score) {
        targetScore = maxScoreData.popularity_score + 1000;
    }
    console.log(`   - Setting score to ${targetScore} to ensure top rank.`);

    // Manually update score
    const { error: manualUpdateError } = await supabase
        .from('buildings')
        .update({ popularity_score: targetScore })
        .eq('id', testBuildingId);

    if (manualUpdateError) throw manualUpdateError;

    // Call update_building_tiers RPC
    console.log('   - Calling update_building_tiers()...');
    const { error: rpcError } = await supabase.rpc('update_building_tiers');

    if (rpcError) throw rpcError;

    // Fetch updated building tier
    const { data: bDataC, error: bErrorC } = await supabase
        .from('buildings')
        .select('tier_rank')
        .eq('id', testBuildingId)
        .single();

    if (bErrorC) throw bErrorC;

    const tierC = bDataC.tier_rank;
    console.log(`   - Tier Rank: ${tierC}`);

    if (tierC === 'Top 1%') {
        console.log('   ✅ PASS: Tier updated to Top 1%.');
    } else {
        console.error(`   ❌ FAIL: Expected 'Top 1%', got '${tierC}'`);
    }

  } catch (err: any) {
    console.error('\n❌ Error executing verification:', err.message || err);
    // Print stack trace if available
    if (err.stack) console.error(err.stack);
  } finally {
    // --- 5. CLEANUP ---
    console.log('\n5. Cleanup...');
    try {
        if (testUserBuildingId) {
            await supabase.from('user_buildings').delete().eq('id', testUserBuildingId);
            console.log('   - Deleted user_building record.');
        }
        if (testBuildingId) {
            await supabase.from('buildings').delete().eq('id', testBuildingId);
            console.log('   - Deleted building record.');
        }
        if (testUserId) {
            await supabase.auth.admin.deleteUser(testUserId);
            console.log('   - Deleted dummy user.');
        }
    } catch (cleanupErr: any) {
        console.error('Error during cleanup:', cleanupErr.message);
    }

    console.log('\n--- Verification Finished ---');
  }
}

main();
