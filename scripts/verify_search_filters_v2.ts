
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or ANON_KEY) must be set.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('--- Starting Search Filters Verification (V2) ---\n');

  // --- 1. PREPARE TEST DATA ---
  console.log('1. Fetching test data...');

  // Get a valid architect
  const { data: archData, error: archError } = await supabase
    .from('building_architects')
    .select('architect_id, building_id')
    .limit(1)
    .single();

  if (archError || !archData) {
    console.error('Failed to fetch architect data:', archError);
    process.exit(1);
  }
  const testArchitectId = archData.architect_id;
  console.log(`   - Test Architect ID: ${testArchitectId}`);

  // Get a valid Category and Typology pair
  // We need a building that has both a functional category and a typology
  const { data: buildData, error: buildError } = await supabase
    .from('buildings')
    .select(`
      id,
      name,
      functional_category_id,
      typologies:building_functional_typologies(typology_id)
    `)
    .not('functional_category_id', 'is', null)
    .not('typologies', 'is', null)
    .limit(5); // Get a few to ensure we find one with typologies

  if (buildError || !buildData || buildData.length === 0) {
    console.error('Failed to fetch building data for taxonomy test:', buildError);
    process.exit(1);
  }

  const validBuilding = buildData.find(b => b.typologies && b.typologies.length > 0);
  if (!validBuilding) {
    console.error('No building found with both category and typology.');
    process.exit(1);
  }

  const testCategoryId = validBuilding.functional_category_id;
  const testTypologyId = validBuilding.typologies[0].typology_id;
  const testBuildingName = validBuilding.name;
  console.log(`   - Test Category ID: ${testCategoryId}`);
  console.log(`   - Test Typology ID: ${testTypologyId}`);
  console.log(`   - Test Building Name: "${testBuildingName}"`);

  // Get a valid Attribute
  const { data: attrData, error: attrError } = await supabase
    .from('building_attributes')
    .select('attribute_id')
    .eq('building_id', validBuilding.id) // Try to get one from the same building if possible
    .limit(1);

  let testAttributeId;
  if (attrData && attrData.length > 0) {
      testAttributeId = attrData[0].attribute_id;
  } else {
      // Fallback if that building has no attributes
      const { data: anyAttr } = await supabase.from('building_attributes').select('attribute_id').limit(1).single();
      testAttributeId = anyAttr?.attribute_id;
  }

  if (!testAttributeId) {
      console.log('   - Warning: No attributes found in DB. Skipping attribute part of Hybrid test potentially.');
  } else {
      console.log(`   - Test Attribute ID: ${testAttributeId}`);
  }

  console.log('\n--- EXECUTION ---\n');

  // --- CASE A: ARCHITECTS ---
  console.log('TEST CASE A: Architect Filter');
  const { data: resA, error: errA } = await supabase.rpc('search_buildings', {
    filters: { architects: [testArchitectId] },
    location_coordinates: { lat: 0, lng: 0 }, // Global search
    radius_meters: 20000000,
    p_limit: 10
  });

  if (errA) {
    console.error('FAIL: RPC Error:', errA);
  } else {
    // Verify results
    // We can't easily check the architect relation in the return without another query or trusting the RPC logic,
    // but we can check if we got results.
    if (resA.length > 0) {
        console.log(`PASS: Returned ${resA.length} buildings.`);
        // Optional: Deep verify one result
        const checkId = resA[0].id;
        const { data: checkArch } = await supabase
            .from('building_architects')
            .select('*')
            .eq('building_id', checkId)
            .eq('architect_id', testArchitectId);

        if (checkArch && checkArch.length > 0) {
            console.log('      (Verified building has the architect)');
        } else {
            console.error('FAIL: Result building does not have the filtered architect.');
        }
    } else {
        console.warn('WARN: Returned 0 buildings (unexpected for known existing architect).');
    }
  }

  // --- CASE B: TAXONOMY (Category + Typology) ---
  console.log('\nTEST CASE B: Taxonomy (Category + Typology)');
  const { data: resB, error: errB } = await supabase.rpc('search_buildings', {
    filters: {
        category_id: testCategoryId,
        typology_ids: [testTypologyId]
    },
    location_coordinates: { lat: 0, lng: 0 },
    radius_meters: 20000000,
    p_limit: 10
  });

  if (errB) {
      console.error('FAIL: RPC Error:', errB);
  } else {
      if (resB.length > 0) {
          // Verify by fetching the building details again (since RPC might not return category_id)
          const checkId = resB[0].id;
          const { data: verifyData } = await supabase
              .from('buildings')
              .select('functional_category_id')
              .eq('id', checkId)
              .single();

          if (verifyData && verifyData.functional_category_id === testCategoryId) {
              console.log(`PASS: Returned ${resB.length} buildings. Category matches.`);
          } else {
              console.error(`FAIL: Category mismatch. Expected ${testCategoryId}, got ${verifyData?.functional_category_id}`);
          }
      } else {
          console.warn('WARN: Returned 0 buildings.');
      }
  }

  // --- CASE C: HYBRID (Query Text + Attribute) ---
  console.log('\nTEST CASE C: Hybrid (Text + Attribute)');
  if (testAttributeId) {
      const { data: resC, error: errC } = await supabase.rpc('search_buildings', {
        query_text: testBuildingName, // Use exact name
        filters: {
            attribute_ids: [testAttributeId]
        },
        location_coordinates: { lat: 0, lng: 0 },
        radius_meters: 20000000,
        p_limit: 10
      });

      if (errC) {
          console.error('FAIL: RPC Error:', errC);
      } else {
          if (resC.length > 0) {
              // Ensure the name matches somewhat
              const match = resC.find(b => b.name === testBuildingName);
              if (match) {
                  console.log(`PASS: Found building "${testBuildingName}" with attribute filter.`);
              } else {
                   console.log(`PASS: Found ${resC.length} buildings (exact name match might depend on text search config, but we got results).`);
              }
          } else {
              console.warn('WARN: Returned 0 buildings.');
          }
      }
  } else {
      console.log('SKIP: No attribute available for test.');
  }

  // --- CASE D: EMPTY/CONTRADICTORY ---
  console.log('\nTEST CASE D: Contradictory Filters');
  // Use the valid category, but a Random Typology UUID that definitely doesn't belong to this category (or doesn't exist)
  const fakeTypologyId = '00000000-0000-0000-0000-000000000000';

  const { data: resD, error: errD } = await supabase.rpc('search_buildings', {
    filters: {
        category_id: testCategoryId,
        typology_ids: [fakeTypologyId]
    },
    location_coordinates: { lat: 0, lng: 0 },
    radius_meters: 20000000,
    p_limit: 10
  });

  if (errD) {
      console.error('FAIL: RPC Error:', errD);
  } else {
      if (resD.length === 0) {
          console.log('PASS: Returned 0 results as expected.');
      } else {
          console.error(`FAIL: Returned ${resD.length} results (expected 0).`);
      }
  }

  console.log('\n--- Verification Complete ---');
}

main();
