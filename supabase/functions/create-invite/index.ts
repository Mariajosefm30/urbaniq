import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ ok: false, error: 'No autenticado' }, 401);
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey);
    const { data: { user }, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !user) return json({ ok: false, error: 'No autenticado' }, 401);

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: myMems } = await admin.from('memberships')
      .select('building_id, role, unit_id, resident_type').eq('user_id', user.id);
    const isPlatformAdmin = (myMems ?? []).some((m) => m.role === 'platform_admin');

    const {
      email, role, building_id, unit_id,
      resident_name, phone, resident_type,
      reassign,
    } = await req.json();

    if (!email || !role) return json({ ok: false, error: 'email y role requeridos' }, 400);

    const validRoles = ['admin_board', 'manager', 'resident', 'platform_admin', 'security'];
    if (!validRoles.includes(role)) return json({ ok: false, error: 'Rol inválido' }, 400);

    if (role === 'platform_admin' && !isPlatformAdmin) return json({ ok: false, error: 'Solo platform_admin' }, 403);
    if (role === 'admin_board' && !isPlatformAdmin) return json({ ok: false, error: 'Solo platform_admin puede invitar admin_board' }, 403);
    if (role !== 'platform_admin' && !building_id) return json({ ok: false, error: 'building_id requerido' }, 400);
    if (role === 'resident' && !unit_id) return json({ ok: false, error: 'unit_id requerido' }, 400);
    if (role === 'resident' && !resident_type) return json({ ok: false, error: 'resident_type requerido' }, 400);
    if (resident_type && !['owner','tenant'].includes(resident_type)) return json({ ok: false, error: 'resident_type inválido' }, 400);

    if (role === 'resident' || role === 'manager' || role === 'security') {
      const isBoardHere = (myMems ?? []).some((m) => m.building_id === building_id && m.role === 'admin_board');
      const isOwnerHere = (myMems ?? []).some((m) =>
        m.building_id === building_id && m.role === 'resident' && m.unit_id === unit_id && m.resident_type === 'owner'
      );
      // Owner can only invite a tenant for their own unit
      const ownerInvitingTenant = role === 'resident' && resident_type === 'tenant' && isOwnerHere;
      if (!isBoardHere && !isPlatformAdmin && !ownerInvitingTenant) {
        return json({ ok: false, error: 'Sin permiso para este edificio' }, 403);
      }
    }

    // Slot uniqueness for residents (active or pending)
    if (role === 'resident') {
      const { data: activeSlot } = await admin.from('memberships')
        .select('id').eq('building_id', building_id).eq('unit_id', unit_id)
        .eq('resident_type', resident_type).maybeSingle();
      if (activeSlot) return json({ ok: false, error: `Ya hay un ${resident_type} activo en esta unidad` }, 400);
      const { data: pendingSlot } = await admin.from('invites')
        .select('id').eq('building_id', building_id).eq('unit_id', unit_id)
        .eq('resident_type', resident_type).is('accepted_at', null).maybeSingle();
      if (pendingSlot) return json({ ok: false, error: `Ya hay una invitación pendiente de ${resident_type} para esta unidad` }, 400);
    }

    if (role === 'admin_board' && reassign) {
      await admin.from('invites').delete()
        .eq('building_id', building_id).eq('role', 'admin_board').is('accepted_at', null);
    }

    if (role === 'admin_board') {
      const { data: bldg } = await admin.from('buildings').select('tier').eq('id', building_id).maybeSingle();
      const tier = (bldg as { tier: string } | null)?.tier ?? 'starter';
      const caps: Record<string, number | null> = { starter: 1, growth: 3, pro: 10, developer: null };
      const cap = caps[tier];
      if (cap !== null) {
        const { count: activeCount } = await admin
          .from('memberships').select('id', { count: 'exact', head: true })
          .eq('building_id', building_id).eq('role', 'admin_board');
        const { count: pendingCount } = await admin
          .from('invites').select('id', { count: 'exact', head: true })
          .eq('building_id', building_id).eq('role', 'admin_board').is('accepted_at', null);
        if ((activeCount ?? 0) + (pendingCount ?? 0) >= cap) {
          return json({ ok: false, error: `Límite de ${cap} admin_board para plan ${tier}` }, 400);
        }
      }
    }

    const { data: invite, error: insErr } = await admin
      .from('invites')
      .insert({
        email,
        role,
        building_id: role === 'platform_admin' ? null : building_id,
        unit_id: unit_id ?? null,
        resident_name: resident_name ?? null,
        phone: phone ?? null,
        resident_type: resident_type ?? null,
        invited_by: user.id,
      })
      .select('token')
      .single();

    if (insErr || !invite) return json({ ok: false, error: insErr?.message || 'No se creó' }, 400);

    const appUrl = Deno.env.get('APP_URL') || '';
    const origin = appUrl.replace(/\/+$/, '');
    const activation_url = `${origin}/activate?token=${invite.token}`;

    return json({ ok: true, activation_url, token: invite.token });
  } catch (e) {
    console.error('[create-invite]', e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
