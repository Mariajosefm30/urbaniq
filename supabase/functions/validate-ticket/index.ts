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

    // Check if user is a manager
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (!profile || profile.role !== 'manager') {
      return new Response(
        JSON.stringify({ error: 'Only managers can verify tickets' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { ticketId, code } = await req.json();

    if (!ticketId || !code) {
      return new Response(
        JSON.stringify({ error: 'Missing ticketId or code' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Look up ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('maintenance_tickets')
      .select('id, title, unit, status, access_code, access_code_status, access_code_verified_at, access_code_attempts')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      console.log('Ticket not found:', ticketId);
      return new Response(
        JSON.stringify({ 
          state: 'NOT_FOUND',
          message: 'Ticket not found'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already verified
    if (ticket.access_code_status === 'verified') {
      return new Response(
        JSON.stringify({ 
          state: 'ALREADY_VERIFIED',
          message: `Code already verified on ${new Date(ticket.access_code_verified_at).toLocaleString()}`,
          ticket: {
            id: ticket.id,
            title: ticket.title,
            unit: ticket.unit,
            status: ticket.status
          },
          verifiedAt: ticket.access_code_verified_at
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Compare codes
    if (ticket.access_code !== code) {
      // Increment attempts
      await supabase
        .from('maintenance_tickets')
        .update({ access_code_attempts: (ticket.access_code_attempts || 0) + 1 })
        .eq('id', ticketId);

      return new Response(
        JSON.stringify({ 
          state: 'MISMATCH',
          message: 'Code does not match',
          attempts: (ticket.access_code_attempts || 0) + 1
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Valid code - mark as verified
    const { error: updateError } = await supabase
      .from('maintenance_tickets')
      .update({ 
        access_code_status: 'verified',
        access_code_verified_at: new Date().toISOString()
      })
      .eq('id', ticketId);

    if (updateError) {
      console.error('Error updating ticket:', updateError);
      throw updateError;
    }

    return new Response(
      JSON.stringify({ 
        state: 'VALID',
        message: 'Code accepted',
        ticket: {
          id: ticket.id,
          title: ticket.title,
          unit: ticket.unit,
          status: ticket.status
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error: any) {
    console.error('Error validating ticket:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
