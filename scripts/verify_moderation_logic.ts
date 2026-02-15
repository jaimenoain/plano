import 'dotenv/config';
import { createClient, User } from '@supabase/supabase-js';

// Configuration
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseServiceKey || !supabaseAnonKey) {
  console.error('Error: Missing required environment variables for verification.');
  console.error('Required: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
  console.error('Optional (but recommended): VITE_SUPABASE_PUBLISHABLE_KEY');
  console.error('Current env state:');
  console.error(`- SUPABASE_URL: ${!!supabaseUrl}`);
  console.error(`- SUPABASE_SERVICE_ROLE_KEY: ${!!supabaseServiceKey}`);
  process.exit(1);
}

// Admin client for setup/teardown
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Helper to generate unique emails
const uniqueId = () => Math.random().toString(36).substring(2, 15);
const testEmail = (role: string) => `test_user_${role}_${uniqueId()}@example.com`;
const testPassword = 'password123';

async function runTest() {
  console.log('Starting Moderation Logic Verification...');

  let userA: User | null = null;
  let userB: User | null = null;
  let userNeutral: User | null = null;
  let buildingId: string | null = null;

  try {
    // --- SETUP ---
    console.log('\n--- SETUP ---');

    // Create Users
    console.log('Creating test users...');
    const { data: userAData, error: userAError } = await supabaseAdmin.auth.admin.createUser({ email: testEmail('A'), password: testPassword, email_confirm: true });
    if (userAError) throw userAError;
    userA = userAData.user;
    console.log(`User A created: ${userA.id}`);

    const { data: userBData, error: userBError } = await supabaseAdmin.auth.admin.createUser({ email: testEmail('B'), password: testPassword, email_confirm: true });
    if (userBError) throw userBError;
    userB = userBData.user;
    console.log(`User B created: ${userB.id}`);

    const { data: userCData, error: userCError } = await supabaseAdmin.auth.admin.createUser({ email: testEmail('Neutral'), password: testPassword, email_confirm: true });
    if (userCError) throw userCError;
    userNeutral = userCData.user;
    console.log(`User Neutral created: ${userNeutral.id}`);

    // Create Building
    console.log('Creating test building...');
    const { data: buildingData, error: buildingError } = await supabaseAdmin
      .from('buildings')
      .insert({
        name: `Test Building ${uniqueId()}`,
        location: 'POINT(0 0)',
        city: 'Test City',
        country: 'Test Country',
        popularity_score: 0
      })
      .select()
      .single();

    if (buildingError) throw buildingError;
    buildingId = buildingData.id;
    console.log(`Test Building created: ${buildingId}`);


    // --- TEST CASE 1: Positive Scoring Regression ---
    console.log('\n--- Test Case 1: Positive Scoring Regression ---');
    // User A rates 3
    const { error: rateError1 } = await supabaseAdmin
      .from('user_buildings')
      .insert({
        user_id: userA.id,
        building_id: buildingId,
        rating: 3,
        status: 'visited'
      });
    if (rateError1) throw rateError1;

    // Recalculate Score
    await supabaseAdmin.rpc('calculate_building_score', { building_uuid: buildingId });

    // Verify
    const { data: b1 } = await supabaseAdmin.from('buildings').select('popularity_score').eq('id', buildingId).single();
    if (b1?.popularity_score === 20) {
      console.log('PASS: Score is 20 (Rating 3)');
    } else {
      console.error(`FAIL: Score is ${b1?.popularity_score}, expected 20`);
    }


    // --- TEST CASE 2: Negative Scoring Logic ---
    console.log('\n--- Test Case 2: Negative Scoring Logic ---');
    // User B marks 'ignored'
    const { error: rateError2 } = await supabaseAdmin
      .from('user_buildings')
      .insert({
        user_id: userB.id,
        building_id: buildingId,
        status: 'ignored'
      });
    if (rateError2) throw rateError2;

    // Recalculate Score
    await supabaseAdmin.rpc('calculate_building_score', { building_uuid: buildingId });

    // Verify (20 - 10 = 10)
    const { data: b2 } = await supabaseAdmin.from('buildings').select('popularity_score').eq('id', buildingId).single();
    if (b2?.popularity_score === 10) {
      console.log("PASS: Score dropped to 10 (User B 'ignored')");
    } else {
      console.error(`FAIL: Score is ${b2?.popularity_score}, expected 10`);
    }

    // User A changes to 'ignored'
    const { error: rateError3 } = await supabaseAdmin
      .from('user_buildings')
      .update({ rating: null, status: 'ignored' })
      .eq('user_id', userA.id)
      .eq('building_id', buildingId);
    if (rateError3) throw rateError3;

    // Recalculate Score
    await supabaseAdmin.rpc('calculate_building_score', { building_uuid: buildingId });

    // Verify (-10 - 10 = -20)
    const { data: b3 } = await supabaseAdmin.from('buildings').select('popularity_score').eq('id', buildingId).single();
    if (b3?.popularity_score === -20) {
      console.log("PASS: Score dropped to -20 (User A changed to 'ignored')");
    } else {
      console.error(`FAIL: Score is ${b3?.popularity_score}, expected -20`);
    }


    // --- TEST CASE 3: Global Shadow Ban Threshold ---
    console.log('\n--- Test Case 3: Global Shadow Ban Threshold ---');

    // Helper for calling get_map_clusters_v2
    const checkMapVisibility = async (user: User, expectedVisible: boolean, label: string) => {
        // Authenticate as the user using the Anon key + their credentials
        const authClient = createClient(supabaseUrl, supabaseAnonKey);
        const { data: sessionData, error: sessionError } = await authClient.auth.signInWithPassword({
            email: user.email!,
            password: testPassword
        });
        if (sessionError) throw sessionError;

        const userClient = createClient(supabaseUrl, supabaseAnonKey, {
            global: { headers: { Authorization: `Bearer ${sessionData.session.access_token}` } }
        });

        const { data: clusters, error: mapError } = await userClient.rpc('get_map_clusters_v2', {
            min_lat: -10,
            min_lng: -10,
            max_lat: 10,
            max_lng: 10,
            zoom_level: 10,
            filter_criteria: {}
        });

        if (mapError) {
             console.error(`Error calling map RPC for ${label}:`, mapError);
             return;
        }

        const found = clusters.find((c: any) => c.id === buildingId);

        if (expectedVisible) {
            if (found) console.log(`PASS: Building visible for ${label}`);
            else console.error(`FAIL: Building NOT visible for ${label}`);
        } else {
            if (!found) console.log(`PASS: Building hidden for ${label}`);
            else console.error(`FAIL: Building IS visible for ${label} (Should be hidden)`);
        }
    };

    // Sub-case 3a: Score -49 (Should be visible)
    await supabaseAdmin.from('buildings').update({ popularity_score: -49 }).eq('id', buildingId);
    if (userNeutral) await checkMapVisibility(userNeutral, true, 'Neutral User (Score -49)');

    // Sub-case 3b: Score -51 (Should be hidden)
    await supabaseAdmin.from('buildings').update({ popularity_score: -51 }).eq('id', buildingId);
    // Note: This test is expected to FAIL if the SQL logic is missing.
    if (userNeutral) await checkMapVisibility(userNeutral, false, 'Neutral User (Score -51)');


    // --- TEST CASE 4: Personal Hide Logic ---
    console.log('\n--- Test Case 4: Personal Hide Logic ---');
    // Reset Score to 100
    await supabaseAdmin.from('buildings').update({ popularity_score: 100 }).eq('id', buildingId);

    // User A already has 'ignored' status from previous steps.
    // User B has 'ignored' too. Reset User B to 'none' (delete interaction) to verify they see it.
    await supabaseAdmin.from('user_buildings').delete().eq('user_id', userB.id).eq('building_id', buildingId);

    // Check User A (Should be hidden because 'ignored')
    if (userA) await checkMapVisibility(userA, false, "User A (Status: 'ignored')");

    // Check User B (Should be visible because status is none/cleared)
    if (userB) await checkMapVisibility(userB, true, "User B (Status: 'none')");


  } catch (err) {
    console.error('An error occurred during verification:', err);
  } finally {
    // --- TEARDOWN ---
    console.log('\n--- TEARDOWN ---');
    if (buildingId) {
        await supabaseAdmin.from('buildings').delete().eq('id', buildingId);
        console.log('Building deleted.');
    }
    if (userA) await supabaseAdmin.auth.admin.deleteUser(userA.id);
    if (userB) await supabaseAdmin.auth.admin.deleteUser(userB.id);
    if (userNeutral) await supabaseAdmin.auth.admin.deleteUser(userNeutral.id);
    console.log('Users deleted.');
  }
}

runTest();
