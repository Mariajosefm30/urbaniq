import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: JSON response with CORS
function json(data: any, options: { status: number } = { status: 200 }) {
  return new Response(
    JSON.stringify(data),
    { 
      status: options.status, 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    }
  );
}

// Helper: Safe JSON parsing
async function safeJson(req: Request) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

// Helper: Convert ArrayBuffer to hex string
function bufferToHex(buffer: ArrayBuffer): string {
  return Array.from(new Uint8Array(buffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

// Helper: Convert Uint8Array to base64url
function base64urlFromBytes(buffer: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...buffer));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

// Helper: Hash token with pepper using Web Crypto
async function sha256Hex(input: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(input);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return bufferToHex(hashBuffer);
}

// Helper: Get current user from request
async function getCurrentUserFromRequest(req: Request) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? '',
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization') || '' },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();
  return user;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    // 1) Auth guard
    const user = await getCurrentUserFromRequest(req);
    if (!user) {
      console.error('[create-guest-pass] Unauthorized access attempt');
      return json({ error: 'signin_required' }, { status: 401 });
    }

    // 2) Env guard
    const pepper = Deno.env.get('TOKEN_PEPPER');
    if (!pepper) {
      console.error('[create-guest-pass] TOKEN_PEPPER not configured');
      return json({ error: 'config_missing:TOKEN_PEPPER' }, { status: 500 });
    }

    // 3) Payload validation
    const payload = await safeJson(req);
    const { name, unit, arrival_at } = payload;
    
    if (!name || !arrival_at) {
      console.error('[create-guest-pass] Missing fields', { 
        has_name: !!name, 
        has_arrival: !!arrival_at 
      });
      return json({ error: 'bad_request:missing_fields' }, { status: 400 });
    }

    const arrival = new Date(arrival_at);
    if (isNaN(+arrival)) {
      console.error('[create-guest-pass] Invalid date', { arrival_at });
      return json({ error: 'bad_request:invalid_date' }, { status: 400 });
    }

    // 4) Time window calculation
    const windowHours = Number(Deno.env.get('QR_WINDOW_HOURS') ?? 12);
    const validFrom = new Date(arrival.getTime() - windowHours * 3600 * 1000);
    const expiresAt = new Date(arrival.getTime() + windowHours * 3600 * 1000);

    // 5) Token generation + hash (Web Crypto)
    const tokenBytes = crypto.getRandomValues(new Uint8Array(32));
    const token = base64urlFromBytes(tokenBytes);
    const qr_token_hash = await sha256Hex(token + pepper);

    console.info('[create-guest-pass] Creating pass', {
      user_id: user.id,
      guest_name: name,
      hash_prefix: qr_token_hash.substring(0, 8),
      arrival_at: arrival.toISOString(),
    });

    // 6) Insert (RLS might reject)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization') || '' },
        },
      }
    );

    const { data: guest, error } = await supabase
      .from('guests')
      .insert({
        name,
        unit: unit || null,
        host_id: user.id,           // NEVER from client
        arrival_at: arrival.toISOString(),
        valid_from: validFrom.toISOString(),
        qr_expires_at: expiresAt.toISOString(),
        qr_token_hash,
        status: 'scheduled',
      })
      .select()
      .single();

    if (error) {
      console.error('[create-guest-pass] insert_failed', {
        code: error.code,
        message: error.message,
      });
      return json({ 
        error: 'insert_failed', 
        code: error.code || 'db_error' 
      }, { status: 403 });
    }

    // 7) Return success (client renders QR)
    const APP_URL = Deno.env.get('APP_DOMAIN') || req.headers.get('origin') || 'https://82552e21-c2ba-4cea-bdcf-68a062d9aa1d.lovableproject.com';
    const verify_url = `${APP_URL}/verify?token=${token}`;

    const duration = Date.now() - startTime;
    console.info('[create-guest-pass] Success', {
      guest_id: guest.id,
      user_id: user.id,
      hash_prefix: qr_token_hash.substring(0, 8),
      duration_ms: duration,
    });

    return json({
      guest_id: guest.id,
      name: guest.name,
      unit: guest.unit,
      verify_url,
      token,
      arrival_at: guest.arrival_at,
      valid_from: guest.valid_from,
      expires_at: guest.qr_expires_at,
      status: guest.status,
    });

  } catch (error) {
    console.error('[create-guest-pass] Unexpected error', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });
    return json({ 
      error: 'internal_error',
      message: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
});
