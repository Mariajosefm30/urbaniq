import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper: JSON response with CORS and Content-Type
function json(data: any, options: { status: number } = { status: 200 }) {
  return new Response(
    JSON.stringify(data),
    { 
      status: options.status, 
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/json' 
      } 
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

// Helper: Generate simple guest code (e.g., "John Smith&101&A")
function generateGuestCode(name: string, unit: string): string {
  // Random letter A-Z
  const randomLetter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  
  return `${name}&${unit}&${randomLetter}`;
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

    // 2) Payload validation
    const payload = await safeJson(req);
    const { name, unit, arrival_at } = payload;
    
    if (!name || !arrival_at) {
      console.error('[create-guest-pass] Missing fields', { 
        has_name: !!name, 
        has_arrival: !!arrival_at 
      });
      return json({ error: 'bad_request:missing_or_invalid' }, { status: 400 });
    }

    const arrival = new Date(arrival_at);
    if (isNaN(+arrival)) {
      console.error('[create-guest-pass] Invalid date', { arrival_at });
      return json({ error: 'bad_request:missing_or_invalid' }, { status: 400 });
    }

    // 3) Time window calculation
    const windowHours = Number(Deno.env.get('QR_WINDOW_HOURS') ?? 12);
    const validFrom = new Date(arrival.getTime() - windowHours * 3600 * 1000);
    const expiresAt = new Date(arrival.getTime() + windowHours * 3600 * 1000);

    // 4) Generate simple guest code
    const guestCode = generateGuestCode(name, unit || '000');

    console.info('[create-guest-pass] Creating pass', {
      user_id: user.id,
      guest_name: name,
      guest_code: guestCode,
      arrival_at: arrival.toISOString(),
    });

    // 5) Insert guest
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
        host_id: user.id,
        arrival_at: arrival.toISOString(),
        valid_from: validFrom.toISOString(),
        qr_expires_at: expiresAt.toISOString(),
        demo_code: guestCode,
        demo_code_status: 'new',
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

    const duration = Date.now() - startTime;
    console.info('[create-guest-pass] Success', {
      guest_id: guest.id,
      user_id: user.id,
      guest_code: guestCode,
      duration_ms: duration,
    });

    return json({
      guest_id: guest.id,
      name: guest.name,
      unit: guest.unit,
      guest_code: guestCode,
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
