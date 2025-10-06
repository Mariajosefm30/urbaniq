import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Uint8Array to base64url
function base64url(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper: Hash token with pepper using Web Crypto
async function hashToken(token: string, pepper: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(token + pepper);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      console.error('[create-guest-pass] Unauthorized access attempt');
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { name, arrival_at, unit } = await req.json();

    // Validate required fields
    if (!name || !arrival_at) {
      console.error('[create-guest-pass] Missing required fields', { name: !!name, arrival_at: !!arrival_at });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: name and arrival_at are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate arrival_at is a valid ISO date
    const arrivalDate = new Date(arrival_at);
    if (isNaN(arrivalDate.getTime())) {
      console.error('[create-guest-pass] Invalid arrival_at date', { arrival_at });
      return new Response(
        JSON.stringify({ error: 'Invalid arrival_at: must be a valid ISO 8601 date' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get configuration from environment
    const windowHours = Number(Deno.env.get('QR_WINDOW_HOURS') ?? '12');
    const tokenPepper = Deno.env.get('TOKEN_PEPPER') ?? '';

    if (!tokenPepper) {
      console.error('[create-guest-pass] TOKEN_PEPPER not configured');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Generate random 32-byte token using Web Crypto
    const tokenBytes = new Uint8Array(32);
    crypto.getRandomValues(tokenBytes);
    const token = base64url(tokenBytes);
    
    // Compute hash with pepper
    const qrTokenHash = await hashToken(token, tokenPepper);
    
    // Compute time window
    const validFrom = new Date(arrivalDate.getTime() - windowHours * 60 * 60 * 1000);
    const qrExpiresAt = new Date(arrivalDate.getTime() + windowHours * 60 * 60 * 1000);

    console.info(`[create-guest-pass] Creating guest pass`, {
      user_id: user.id,
      guest_name: name,
      token_prefix: token.substring(0, 8),
      hash_prefix: qrTokenHash.substring(0, 8),
      arrival_at: arrivalDate.toISOString(),
      valid_from: validFrom.toISOString(),
      expires_at: qrExpiresAt.toISOString(),
    });

    // Insert guest record
    const { data: guest, error } = await supabase
      .from('guests')
      .insert({
        name,
        unit: unit || null,
        arrival_at: arrivalDate.toISOString(),
        qr_token_hash: qrTokenHash,
        valid_from: validFrom.toISOString(),
        qr_expires_at: qrExpiresAt.toISOString(),
        host_id: user.id,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('[create-guest-pass] Database error', { error: error.message, code: error.code });
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const duration = Date.now() - startTime;
    console.info(`[create-guest-pass] Guest pass created successfully`, {
      guest_id: guest.id,
      token_prefix: token.substring(0, 8),
      duration_ms: duration,
    });

    // Return guest data with token and verify URL
    const appDomain = Deno.env.get('APP_DOMAIN') || req.headers.get('origin') || 'https://82552e21-c2ba-4cea-bdcf-68a062d9aa1d.lovableproject.com';
    const verifyUrl = `${appDomain}/verify?token=${token}`;

    return new Response(
      JSON.stringify({
        guest_id: guest.id,
        name: guest.name,
        unit: guest.unit,
        verify_url: verifyUrl,
        token: token,
        arrival_at: guest.arrival_at,
        valid_from: guest.valid_from,
        expires_at: guest.qr_expires_at,
        status: guest.status,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[create-guest-pass] Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
