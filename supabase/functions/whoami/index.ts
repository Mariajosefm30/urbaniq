import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Lovable Cloud - whoami (auth required)
Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Create Supabase client with user's auth token
    const authHeader = req.headers.get('Authorization');
    const supabase = createClient(supabaseUrl, supabaseKey, {
      global: {
        headers: authHeader ? { Authorization: authHeader } : {},
      },
    });

    // Get the current user from the session
    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user) {
      console.error('[whoami] No authenticated user:', userError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized - No valid session found' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Fetch role from user_roles table (primary source)
    const { data: userRoleData, error: userRoleError } = await supabase
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (userRoleError && userRoleError.code !== 'PGRST116') {
      console.error('[whoami] Error fetching user_roles:', userRoleError);
    }

    // Fetch the user's profile data
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('role, org_id, last_building_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('[whoami] Error fetching profile:', profileError);
    }

    // Use user_roles as primary, fall back to profile role
    const role = userRoleData?.role || profileData?.role || null;

    // Fetch organization onboarding status if user has org_id
    let orgOnboardingCompleted = null;
    if (profileData?.org_id) {
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('org_onboarding_completed')
        .eq('id', profileData.org_id)
        .single();
      
      if (orgError) {
        console.error('[whoami] Error fetching org data:', orgError);
      } else {
        orgOnboardingCompleted = orgData?.org_onboarding_completed ?? false;
      }
    }

    const response = {
      user_id: user.id,
      email: user.email,
      role: role,
      org_id: profileData?.org_id || null,
      last_building_id: profileData?.last_building_id || null,
      org_onboarding_completed: orgOnboardingCompleted,
    };

    console.log('[whoami] User info:', response);

    return new Response(
      JSON.stringify(response),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('[whoami] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});