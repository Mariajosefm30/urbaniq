import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    const { token } = await req.json();

    if (!token) {
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'No token provided' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up guest by token
    const { data: guest, error } = await supabase
      .from('guests')
      .select('*')
      .eq('qr_token_hash', token)
      .single();

    if (error || !guest) {
      console.log('Guest not found:', error);
      return new Response(
        JSON.stringify({ 
          valid: false, 
          message: 'Invalid or unknown pass' 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if pass is expired
    const now = new Date();
    const expiresAt = new Date(guest.qr_expires_at);
    const isExpired = now > expiresAt;

    // Check status
    if (guest.status === 'revoked') {
      return new Response(
        JSON.stringify({ 
          valid: false,
          guest_name: guest.name,
          message: 'This pass has been revoked',
          status: guest.status
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

      return new Response(
        JSON.stringify({ 
          valid: false,
          guest_name: guest.name,
          message: 'This pass has expired',
          expires_at: guest.qr_expires_at,
          status: 'expired'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Pass is valid
    return new Response(
      JSON.stringify({ 
        valid: true,
        guest_name: guest.name,
        arrival_at: guest.arrival_at,
        expires_at: guest.qr_expires_at,
        message: 'Access granted',
        status: guest.status
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in verify-guest-pass:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ 
        valid: false, 
        message: 'Verification failed: ' + message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
