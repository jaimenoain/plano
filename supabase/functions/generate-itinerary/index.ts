import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kMeans, BuildingLocation } from "../_shared/clustering.ts";
import { generateRouteForCluster } from "../_shared/routing.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const mapboxAccessToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');

    if (!supabaseUrl || !supabaseServiceKey) {
      throw new Error('Missing Supabase configuration');
    }

    // Initialize Supabase Admin Client
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Authorization: Get User
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing Authorization header' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // Initialize Supabase Client for User Validation
    const supabaseClient = createClient(
      supabaseUrl,
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    );

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();

    if (userError || !user) {
      console.error('User validation failed:', userError);
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 401 }
      );
    }

    // 2. Validate Payload
    const { collection_id, days, transportMode } = await req.json();

    if (!collection_id) {
       return new Response(
        JSON.stringify({ error: 'Missing collection_id' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    if (!days || typeof days !== 'number' || days < 1 || !Number.isInteger(days)) {
      return new Response(
        JSON.stringify({ error: 'Invalid days. Must be an integer >= 1.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const validModes = ['walking', 'driving', 'cycling'];
    if (!transportMode || !validModes.includes(transportMode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid transportMode. Must be walking, driving, or cycling.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Check Permissions
    const { data: collection, error: collectionError } = await supabaseAdmin
      .from('collections')
      .select('owner_id')
      .eq('id', collection_id)
      .single();

    if (collectionError || !collection) {
       return new Response(
        JSON.stringify({ error: 'Collection not found' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    let isAuthorized = collection.owner_id === user.id;

    if (!isAuthorized) {
      // Check if editor
      const { data: contributor } = await supabaseAdmin
        .from('collection_contributors')
        .select('role')
        .eq('collection_id', collection_id)
        .eq('user_id', user.id)
        .eq('role', 'editor')
        .single();

      if (contributor) {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
       return new Response(
        JSON.stringify({ error: 'Forbidden: You do not have permission to modify this collection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 403 }
      );
    }

    // 4. Fetch Collection Buildings with Locations
    // Use RPC to get clean coordinates from PostGIS geography column
    const { data: rawBuildings, error: fetchError } = await supabaseAdmin
      .rpc('get_collection_buildings', { p_collection_id: collection_id });

    if (fetchError) {
      console.error('Error fetching buildings via RPC:', fetchError);
      throw fetchError;
    }

    // Log raw data for debugging
    console.log(`Fetched ${rawBuildings?.length || 0} buildings for collection ${collection_id}`, rawBuildings);

    if (!rawBuildings || rawBuildings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No items found in collection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 5. Filter Valid Locations
    const buildings: BuildingLocation[] = rawBuildings
      .filter((b: any) => b.lat !== null && b.lng !== null)
      .map((b: any) => ({
        id: b.id,
        lat: b.lat,
        lng: b.lng,
        name: b.name
      }));

    if (buildings.length === 0) {
        return new Response(
            JSON.stringify({ error: 'No buildings with valid locations found.' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
        );
    }

    // 6. Cluster Buildings
    // Use kMeans to group buildings into 'days' clusters
    // Note: If buildings.length < days, kMeans handles it gracefully (returns fewer clusters)
    const clusters = kMeans(buildings, days);

    // 7. Generate Routes per Day (Cluster)
    const routes = await Promise.all(clusters.map((cluster, index) => {
        return generateRouteForCluster(cluster, index + 1, transportMode, mapboxAccessToken);
    }));

    // 8. Update Collection with Itinerary
    const itinerary = {
        days,
        transportMode,
        routes
    };

    const { error: updateError } = await supabaseAdmin
        .from('collections')
        .update({ itinerary })
        .eq('id', collection_id);

    if (updateError) {
        throw updateError;
    }

    return new Response(
      JSON.stringify({
        message: 'Itinerary generated successfully',
        itinerary
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal Server Error' }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
