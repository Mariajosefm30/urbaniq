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
    const autoPrioritize = Deno.env.get('AUTO_PRIORITIZE') === 'true';
    
    if (!autoPrioritize) {
      return new Response(
        JSON.stringify({ message: 'Auto-prioritization is disabled' }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { title, description } = await req.json();
    
    if (!title || !description) {
      return new Response(
        JSON.stringify({ error: 'Missing title or description' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rule-based prioritization
    const text = `${title} ${description}`.toLowerCase();
    
    // High priority keywords
    const highPriorityKeywords = [
      'water leak', 'gas', 'elevator stuck', 'electrical short', 
      'no power', 'flood', 'burst', 'smoke', 'fire', 'emergency',
      'danger', 'broken glass', 'carbon monoxide'
    ];
    
    // Normal priority keywords
    const normalPriorityKeywords = [
      'door lock', 'elevator noise', 'dripping', 'slow drain',
      'light out', 'paint', 'minor crack'
    ];

    let priority = 'low';
    let reason = 'No urgent keywords detected';

    for (const keyword of highPriorityKeywords) {
      if (text.includes(keyword)) {
        priority = 'high';
        reason = `Contains high-priority keyword: "${keyword}"`;
        break;
      }
    }

    if (priority === 'low') {
      for (const keyword of normalPriorityKeywords) {
        if (text.includes(keyword)) {
          priority = 'normal';
          reason = `Contains normal-priority keyword: "${keyword}"`;
          break;
        }
      }
    }

    console.log(`[auto-prioritize] Ticket prioritized as ${priority}: ${reason}`);

    return new Response(
      JSON.stringify({ priority, reason }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('[auto-prioritize] Error:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
