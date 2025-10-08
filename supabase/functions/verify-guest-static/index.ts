import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    );

    let guest_id: string;
    let code: string;

    // Support both GET (query params) and POST (body)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      guest_id = url.searchParams.get('g') || '';
      code = url.searchParams.get('c') || '';
    } else {
      const body = await req.json();
      guest_id = body.guest_id || body.g || '';
      code = body.code || body.c || '';
    }

    if (!guest_id || !code) {
      return new Response(
        JSON.stringify({ 
          state: 'INVALID',
          message: 'Missing guest_id or code' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up guest
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, name, unit, arrival_at, demo_code, demo_code_status, demo_code_verified_at, demo_code_attempts')
      .eq('id', guest_id)
      .single();

    if (guestError || !guest) {
      console.log('Guest not found:', guest_id);
      return new Response(
        JSON.stringify({ 
          state: 'NOT_FOUND',
          message: 'Guest not found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (guest.demo_code_status === 'verified') {
      return new Response(
        JSON.stringify({ 
          state: 'ALREADY_VERIFIED',
          message: `Code already verified on ${new Date(guest.demo_code_verified_at).toLocaleString()}`,
          verified_at: guest.demo_code_verified_at,
          guest: {
            name: guest.name,
            unit: guest.unit,
            arrival_at: guest.arrival_at
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compare codes
    if (guest.demo_code !== code) {
      // Increment attempts
      const newAttempts = (guest.demo_code_attempts || 0) + 1;
      await supabase
        .from('guests')
        .update({ demo_code_attempts: newAttempts })
        .eq('id', guest_id);

      return new Response(
        JSON.stringify({ 
          state: 'MISMATCH',
          message: 'Code does not match',
          attempts: newAttempts
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid code - mark as verified
    const { error: updateError } = await supabase
      .from('guests')
      .update({ 
        demo_code_status: 'verified',
        demo_code_verified_at: new Date().toISOString()
      })
      .eq('id', guest_id);

    if (updateError) {
      console.error('Error updating guest:', updateError);
      throw updateError;
    }

    console.log('Guest demo code verified:', guest_id);

    return new Response(
      JSON.stringify({ 
        state: 'VALID',
        message: 'Code accepted',
        guest: {
          name: guest.name,
          unit: guest.unit,
          arrival_at: guest.arrival_at
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error verifying guest static code:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
