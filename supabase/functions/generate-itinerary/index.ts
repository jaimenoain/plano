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

    const { data: { user }, error: userError } = await supabaseAdmin.auth.getUser(authHeader.replace('Bearer ', ''));

    if (userError || !user) {
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

    // 4. Fetch Collection Items
    const { data: items, error: fetchError } = await supabaseAdmin
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

    // 5. Extract Locations
    const buildings: BuildingLocation[] = items
      .map((item: any) => {
        const b = item.buildings;
        let lat, lng;

        if (b.location && typeof b.location === 'object') {
          // Handle both simple {lat, lng} object and GeoJSON Point
          if ('lat' in b.location && 'lng' in b.location) {
            lat = b.location.lat;
            lng = b.location.lng;
          } else if ('coordinates' in b.location && Array.isArray(b.location.coordinates)) {
             // GeoJSON is [lng, lat]
            lng = b.location.coordinates[0];
            lat = b.location.coordinates[1];
          }
        }

        if (lat !== undefined && lng !== undefined) {
          return { id: b.id, lat, lng, name: b.name };
        }
        return null;
      })
      .filter((b: any): b is BuildingLocation => b !== null);

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
    const routes = await Promise.all(clusters.map(async (cluster, index) => {
        const dayNumber = index + 1;
        const buildingIds = cluster.map(b => b.id);

        if (cluster.length < 2) {
            // Only one building, no route needed really, but we can return a point or null route
            return {
                dayNumber,
                buildingIds,
                routeGeometry: null,
                isFallback: false
            };
        }

        // Try to get route from external API
        try {
            if (!mapboxAccessToken) {
                throw new Error('Mapbox token missing');
            }

            // Map transportMode to Mapbox profile
            const mapboxProfile = transportMode === 'cycling' ? 'cycling' :
                                  transportMode === 'walking' ? 'walking' : 'driving';

            // Construct coordinates string: "lng,lat;lng,lat"
            // Use Optimization API which handles sorting (TSP)
            const coordinates = cluster
                .map(b => `${b.lng},${b.lat}`)
                .join(';');

            // roundtrip=false: open-ended path
            // source=any, destination=any: find best start/end
            const url = `https://api.mapbox.com/optimized-trips/v1/mapbox/${mapboxProfile}/${coordinates}?roundtrip=false&source=any&destination=any&geometries=geojson&access_token=${mapboxAccessToken}`;

            const response = await fetch(url);

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`Mapbox API error: ${response.status} ${errText}`);
            }

            const data = await response.json();

            if (!data.trips || data.trips.length === 0) {
                throw new Error('No optimized route found');
            }

            // Reorder cluster based on optimization result
            // data.waypoints has { waypoint_index, trips_index }
            // waypoint_index refers to the index in our 'coordinates' string (which matches 'cluster' array)
            // trips_index is the order in the output route
            const sortedWaypoints = data.waypoints.sort((a: any, b: any) => a.trips_index - b.trips_index);
            const sortedCluster = sortedWaypoints.map((wp: any) => cluster[wp.waypoint_index]);

            return {
                dayNumber,
                buildingIds: sortedCluster.map((b: any) => b.id), // Return IDs in visited order
                routeGeometry: data.trips[0].geometry,
                isFallback: false
            };

        } catch (error) {
            console.warn(`Routing failed for day ${dayNumber}:`, error);

            // Fallback Logic: Create a simple LineString
            const sortedCluster = sortClusterByNearestNeighbor(cluster);

            const fallbackGeometry = {
                type: "LineString",
                coordinates: sortedCluster.map(b => [b.lng, b.lat])
            };

            return {
                dayNumber,
                buildingIds: sortedCluster.map(b => b.id),
                routeGeometry: fallbackGeometry,
                isFallback: true
            };
        }
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

// Helper: Simple nearest neighbor sort to make the path less chaotic
function sortClusterByNearestNeighbor(buildings: BuildingLocation[]): BuildingLocation[] {
    if (buildings.length <= 2) return buildings;

    const sorted: BuildingLocation[] = [buildings[0]];
    const remaining = new Set(buildings.slice(1));

    while (remaining.size > 0) {
        const current = sorted[sorted.length - 1];
        let nearest: BuildingLocation | null = null;
        let minDist = Infinity;

        for (const candidate of remaining) {
            const d = Math.sqrt(Math.pow(candidate.lat - current.lat, 2) + Math.pow(candidate.lng - current.lng, 2));
            if (d < minDist) {
                minDist = d;
                nearest = candidate;
            }
        }

        if (nearest) {
            sorted.push(nearest);
            remaining.delete(nearest);
        } else {
            break; // Should not happen
        }
    }
    return sorted;
}
