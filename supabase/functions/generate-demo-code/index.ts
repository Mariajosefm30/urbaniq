import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function genCode() {
  const b = crypto.getRandomValues(new Uint8Array(4));
  const n = (b[0] << 24 | b[1] << 16 | b[2] << 8 | b[3]) >>> 0;
  return String(n % 1_000_000).padStart(6, '0');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

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

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { guest_id } = await req.json();

    if (!guest_id) {
      return new Response(
        JSON.stringify({ error: 'Missing guest_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get guest and check if demo_code already exists
    const { data: guest, error: guestError } = await supabase
      .from('guests')
      .select('id, demo_code, created_by')
      .eq('id', guest_id)
      .single();

    if (guestError || !guest) {
      return new Response(
        JSON.stringify({ error: 'Guest not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user owns this guest
    if (guest.created_by !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - not your guest' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let demo_code = guest.demo_code;

    // Generate code if not exists
    if (!demo_code) {
      demo_code = genCode();
      
      const { error: updateError } = await supabase
        .from('guests')
        .update({ demo_code })
        .eq('id', guest_id);

      if (updateError) {
        console.error('Error updating guest with demo code:', updateError);
        throw updateError;
      }
    }

    // Build verify URL
    const origin = req.headers.get('origin') || Deno.env.get('SUPABASE_URL') || '';
    const verify_url = `${origin}/verify-static?g=${guest_id}&c=${demo_code}`;

    console.log('Generated demo code for guest:', guest_id);

    return new Response(
      JSON.stringify({ 
        verify_url,
        demo_code
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error generating demo code:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
