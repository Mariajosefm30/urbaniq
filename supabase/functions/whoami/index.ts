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
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No valid session found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const token = authHeader.replace('Bearer ', '');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);

    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No valid session found' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch ALL roles for this user (superadmin can co-exist with admin etc.)
    const { data: userRolesData } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);

    const roles: string[] = (userRolesData || []).map((r: any) => r.role);
    const isSuperadmin = roles.includes('superadmin');

    // Effective role precedence: superadmin > admin > manager > resident
    const precedence = ['superadmin', 'admin', 'manager', 'resident'];
    const role = precedence.find((p) => roles.includes(p)) || null;

    const { data: profileData } = await supabase
      .from('profiles')
      .select('org_id, last_building_id')
      .eq('id', user.id)
      .single();

    let orgOnboardingCompleted = null;
    if (profileData?.org_id) {
      const { data: orgData } = await supabase
        .from('organizations')
        .select('org_onboarding_completed')
        .eq('id', profileData.org_id)
        .single();
      orgOnboardingCompleted = orgData?.org_onboarding_completed ?? false;
    }

    const response = {
      user_id: user.id,
      email: user.email,
      role,
      is_superadmin: isSuperadmin,
      org_id: profileData?.org_id || null,
      last_building_id: profileData?.last_building_id || null,
      org_onboarding_completed: orgOnboardingCompleted,
    };

    console.log('[whoami] User info:', response);

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[whoami] Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
