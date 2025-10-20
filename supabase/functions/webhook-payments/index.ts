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
    const { enabled } = getPaymentsConfig();
    
    console.log('[webhook-payments] Payments enabled:', enabled);
    
    if (!enabled) {
      return new Response(
        JSON.stringify({ skipped: 'payments_disabled' }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // TODO: Implement Mercado Pago webhook handling
    return new Response(
      JSON.stringify({ received: true }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('[webhook-payments] Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
