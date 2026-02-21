import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const mapboxAccessToken = Deno.env.get('MAPBOX_ACCESS_TOKEN');

    if (!mapboxAccessToken) {
      throw new Error('Missing Mapbox configuration');
    }

    const { coordinates, transportMode } = await req.json();

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length < 2) {
      // If less than 2 points, just return null geometry/distance, not an error,
      // because the UI might call this when a day becomes empty or has 1 item.
      // Actually, logic in store should prevent calling this if < 2.
      // But if called, let's be graceful or strict. Strict is better for API.
      // But wait, "Invalid coordinates" is a 400.
      return new Response(
        JSON.stringify({ error: 'Invalid coordinates. Must be an array of at least 2 points.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    const validModes = ['walking', 'driving', 'cycling'];
    if (!transportMode || !validModes.includes(transportMode)) {
      return new Response(
        JSON.stringify({ error: 'Invalid transportMode.' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // Mapbox Directions API limit to 25 coordinates
    const slicedCoordinates = coordinates.slice(0, 25);
    const coordsString = slicedCoordinates.map((c: any) => `${c.lng},${c.lat}`).join(';');
    const profile = transportMode === 'cycling' ? 'cycling' : transportMode === 'walking' ? 'walking' : 'driving';

    const url = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${coordsString}?geometries=geojson&steps=false&access_token=${mapboxAccessToken}`;

    const response = await fetch(url);
    if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Mapbox API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
        throw new Error('No route found');
    }

    const route = data.routes[0];

    return new Response(
      JSON.stringify({
        geometry: route.geometry,
        distance: route.distance, // meters
        duration: route.duration // seconds
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error: any) {
    console.error('Function error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
