const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function getPaymentsConfig() {
  const mode = Deno.env.get('PAYMENTS_MODE') || 'disabled';
  const appUrl = Deno.env.get('APP_URL') || '';
  const mpToken = Deno.env.get('MP_ACCESS_TOKEN') || '';
  const mpWebhookSecret = Deno.env.get('MP_WEBHOOK_SECRET') || '';
  const enabled = mode === 'mercadopago' && !!mpToken;
  return { mode, enabled, appUrl, mpToken, mpWebhookSecret };
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { mode, enabled } = getPaymentsConfig();
    
    console.log('[create-checkout-session] Payments mode:', mode, 'enabled:', enabled);
    
    if (!enabled) {
      return new Response(
        JSON.stringify({ error: 'payments_disabled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400,
        }
      );
    }

    // TODO: Implement Mercado Pago checkout session creation
    return new Response(
      JSON.stringify({ error: 'not_implemented' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 501,
      }
    );
  } catch (error) {
    console.error('[create-checkout-session] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
