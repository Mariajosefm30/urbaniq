import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_MAPS_API_KEY = Deno.env.get('GOOGLE_MAPS_API_KEY');

// Map ticket categories to Google Places types
const CATEGORY_MAP: Record<string, string> = {
  plumbing: 'plumber',
  electrical: 'electrician',
  hvac: 'air_conditioning_contractor',
  appliance: 'general_contractor',
  other: 'general_contractor',
};

interface GeocodeResult {
  lat: number;
  lng: number;
}

async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(address)}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      return { lat: location.lat, lng: location.lng };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

async function findNearbyTechnicians(
  lat: number,
  lng: number,
  type: string,
  radius: number = 5000
) {
  try {
    const url = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=${radius}&type=${type}&key=${GOOGLE_MAPS_API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status === 'OK' && data.results) {
      return data.results.slice(0, 5).map((place: any) => ({
        name: place.name,
        rating: place.rating || 0,
        phone: place.formatted_phone_number || null,
        maps_url: `https://www.google.com/maps/place/?q=place_id:${place.place_id}`,
        place_id: place.place_id,
      }));
    }
    return [];
  } catch (error) {
    console.error('Places search error:', error);
    return [];
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!GOOGLE_MAPS_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { building_address, category } = await req.json();

    if (!building_address || !category) {
      return new Response(
        JSON.stringify({ error: 'Missing building_address or category' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Geocode the building address
    const coords = await geocodeAddress(building_address);
    if (!coords) {
      return new Response(
        JSON.stringify({ error: 'Could not geocode address', technicians: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Find nearby technicians
    const placeType = CATEGORY_MAP[category] || 'general_contractor';
    const technicians = await findNearbyTechnicians(coords.lat, coords.lng, placeType);

    return new Response(
      JSON.stringify({ 
        coords, 
        technicians,
        cached: false 
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('suggest-technicians error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
