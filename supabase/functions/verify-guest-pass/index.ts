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
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    // Support both POST body and GET query params
    let token: string | null = null;
    
    if (req.method === 'GET') {
      const url = new URL(req.url);
      token = url.searchParams.get('token');
    } else {
      try {
        const body = await req.json();
        token = body.token;
      } catch {
        // Invalid JSON, token will be null
      }
    }

    if (!token) {
      console.error('[verify-guest-pass] No token provided');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          state: 'INVALID',
          message: 'No token provided' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get configuration
    const tokenPepper = Deno.env.get('TOKEN_PEPPER') ?? '';
    const singleUse = Deno.env.get('SINGLE_USE') === 'true';

    if (!tokenPepper) {
      console.error('[verify-guest-pass] TOKEN_PEPPER not configured');
      return new Response(
        JSON.stringify({ 
          valid: false, 
          state: 'INVALID',
          message: 'Server configuration error' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Recompute hash with pepper
    const qrTokenHash = await hashToken(token, tokenPepper);
    
    console.info(`[verify-guest-pass] Verifying token`, {
      token_prefix: token.substring(0, 8),
      hash_prefix: qrTokenHash.substring(0, 8),
    });

    // Look up guest by token hash
    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('qr_token_hash', qrTokenHash)
      .maybeSingle();

    if (error) {
      console.error('[verify-guest-pass] Database error', { error: error.message });
      return new Response(
        JSON.stringify({ 
          valid: false, 
          state: 'INVALID',
          message: 'Verification failed' 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!guest) {
      console.warn('[verify-guest-pass] Guest not found', { hash_prefix: qrTokenHash.substring(0, 8) });
      return new Response(
        JSON.stringify({ 
          valid: false, 
          state: 'INVALID',
          message: 'Invalid or unknown pass' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if pass is revoked
    if (guest.status === 'revoked') {
      console.warn('[verify-guest-pass] Pass revoked', { guest_id: guest.id, guest_name: guest.name });
      return new Response(
        JSON.stringify({ 
          valid: false,
          state: 'REVOKED',
          guest_name: guest.name,
          message: 'This pass has been revoked',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check time window
    const now = new Date();
    const validFrom = new Date(guest.valid_from);
    const expiresAt = new Date(guest.qr_expires_at);
    
    const isTooEarly = now < validFrom;
    const isExpired = now > expiresAt;

    if (isTooEarly) {
      console.warn('[verify-guest-pass] Pass not yet valid', {
        guest_id: guest.id,
        guest_name: guest.name,
        valid_from: guest.valid_from,
        current_time: now.toISOString(),
      });
      return new Response(
        JSON.stringify({ 
          valid: false,
          state: 'EXPIRED',
          guest_name: guest.name,
          message: `This pass is not yet valid. Valid from: ${validFrom.toLocaleString()}`,
          valid_from: guest.valid_from,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (isExpired || guest.status === 'expired') {
      // Update status to expired if not already
      if (guest.status !== 'expired') {
        await supabase
          .from('guests')
          .update({ status: 'expired' })
          .eq('id', guest.id);
      }

      console.warn('[verify-guest-pass] Pass expired', {
        guest_id: guest.id,
        guest_name: guest.name,
        expires_at: guest.qr_expires_at,
        current_time: now.toISOString(),
      });

      return new Response(
        JSON.stringify({ 
          valid: false,
          state: 'EXPIRED',
          guest_name: guest.name,
          message: 'This pass has expired',
          expires_at: guest.qr_expires_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already redeemed (single-use mode)
    if (singleUse && guest.redeemed_at) {
      console.warn('[verify-guest-pass] Pass already redeemed', {
        guest_id: guest.id,
        guest_name: guest.name,
        redeemed_at: guest.redeemed_at,
      });
      return new Response(
        JSON.stringify({ 
          valid: false,
          state: 'EXPIRED',
          guest_name: guest.name,
          message: 'This pass has already been used',
          redeemed_at: guest.redeemed_at,
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Mark as redeemed if single-use mode
    if (singleUse && !guest.redeemed_at) {
      await supabase
        .from('guests')
        .update({ redeemed_at: now.toISOString() })
        .eq('id', guest.id);
    }

    const duration = Date.now() - startTime;
    console.info('[verify-guest-pass] Pass verified successfully', {
      guest_id: guest.id,
      guest_name: guest.name,
      single_use: singleUse,
      duration_ms: duration,
    });

    // Pass is valid
    return new Response(
      JSON.stringify({ 
        valid: true,
        state: 'VALID',
        guest: {
          name: guest.name,
          unit: guest.unit,
          arrival_at: guest.arrival_at,
          valid_from: guest.valid_from,
          expires_at: guest.qr_expires_at,
        },
        message: 'Access granted',
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[verify-guest-pass] Unexpected error', { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        valid: false, 
        state: 'INVALID',
        message: 'Verification failed: ' + message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
