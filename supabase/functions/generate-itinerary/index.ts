import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { kMeans, BuildingLocation } from "../_shared/clustering.ts";

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
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase configuration');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    const { collection_id, days } = await req.json();

    if (!collection_id || !days) {
      return new Response(
        JSON.stringify({ error: 'Missing collection_id or days' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 1. Fetch buildings in the collection
    const { data: items, error: fetchError } = await supabase
      .from('collection_items')
      .select(`
        building_id,
        buildings (
          id,
          name,
          location
        )
      `)
      .eq('collection_id', collection_id);

    if (fetchError) {
      console.error('Error fetching items:', fetchError);
      throw fetchError;
    }

    if (!items || items.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No items found in collection' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 404 }
      );
    }

    // 2. Extract locations
    const buildings: BuildingLocation[] = [];

    for (const item of items) {
      const b = item.buildings;

      if (!b || Array.isArray(b)) continue;

      let lat: number | undefined;
      let lng: number | undefined;
      const loc = (b as any).location;

      if (loc) {
        // Try to parse GeoJSON or {lat, lng} object
        if (typeof loc === 'object') {
          if (loc.type === 'Point' && Array.isArray(loc.coordinates)) {
             lng = loc.coordinates[0];
             lat = loc.coordinates[1];
          } else if ('lat' in loc && 'lng' in loc) {
             lat = loc.lat;
             lng = loc.lng;
          }
        } else if (typeof loc === 'string') {
          // Try parsing JSON string
          try {
             const parsed = JSON.parse(loc);
             if (parsed.type === 'Point' && Array.isArray(parsed.coordinates)) {
               lng = parsed.coordinates[0];
               lat = parsed.coordinates[1];
             } else if (parsed.lat && parsed.lng) {
               lat = parsed.lat;
               lng = parsed.lng;
             }
          } catch (e) {
             // Try WKT "POINT(lng lat)"
             const match = loc.match(/POINT\s*\(([-\d.]+)\s+([-\d.]+)\)/i);
             if (match) {
               lng = parseFloat(match[1]);
               lat = parseFloat(match[2]);
             }
          }
        }
      }

      if (lat !== undefined && lng !== undefined) {
        buildings.push({
          id: (b as any).id,
          lat,
          lng,
          name: (b as any).name
        });
      }
    }

    if (buildings.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No buildings with valid location found to cluster' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // 3. Cluster
    const clusters = kMeans(buildings, days);

    // 4. Construct Itinerary
    const itinerary = {
      days: days,
      transportMode: 'walking',
      routes: clusters.map((cluster, index) => ({
        dayNumber: index + 1,
        buildingIds: cluster.map(b => b.id),
      }))
    };

    // 5. Update Collection
    const { error: updateError } = await supabase
      .from('collections')
      .update({ itinerary })
      .eq('id', collection_id);

    if (updateError) {
      console.error('Error updating collection:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify(itinerary),
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
