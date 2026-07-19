import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Row {
  unit: string;
  role: string;
  name?: string;
  email: string;
  phone?: string;
}

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

    const { building_id, rows } = await req.json() as { building_id: string; rows: Row[] };
    if (!building_id || !Array.isArray(rows)) return json({ ok: false, error: 'building_id y rows requeridos' }, 400);

    const { data: myMems } = await admin.from('memberships').select('building_id, role').eq('user_id', user.id);
    const isPlatformAdmin = (myMems ?? []).some((m) => m.role === 'platform_admin');
    const isBoardHere = (myMems ?? []).some((m) => m.building_id === building_id && m.role === 'admin_board');
    if (!isPlatformAdmin && !isBoardHere) return json({ ok: false, error: 'Sin permiso' }, 403);

    const appUrl = (Deno.env.get('APP_URL') || '').replace(/\/+$/, '');
    const results: Array<{ row: number; ok: boolean; error?: string; activation_url?: string; email: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      try {
        if (!r.unit || !r.email || !r.role) {
          results.push({ row: i, ok: false, error: 'unit, role y email requeridos', email: r.email ?? '' });
          continue;
        }
        if (!['owner', 'tenant'].includes(r.role)) {
          results.push({ row: i, ok: false, error: 'role debe ser owner|tenant', email: r.email });
          continue;
        }

        // upsert unit
        const { data: existingUnit } = await admin.from('units')
          .select('id').eq('building_id', building_id).eq('code', r.unit).maybeSingle();
        let unitId = existingUnit?.id as string | undefined;
        if (!unitId) {
          const { data: created, error: cuErr } = await admin.from('units')
            .insert({ building_id, code: r.unit }).select('id').single();
          if (cuErr || !created) { results.push({ row: i, ok: false, error: cuErr?.message ?? 'no se creó unidad', email: r.email }); continue; }
          unitId = created.id;
        }

        // slot already filled?
        const { data: activeSlot } = await admin.from('memberships')
          .select('id').eq('building_id', building_id).eq('unit_id', unitId).eq('resident_type', r.role).maybeSingle();
        if (activeSlot) { results.push({ row: i, ok: false, error: `ya hay un ${r.role} activo en ${r.unit}`, email: r.email }); continue; }
        const { data: pendingSlot } = await admin.from('invites')
          .select('id').eq('building_id', building_id).eq('unit_id', unitId).eq('resident_type', r.role).is('accepted_at', null).maybeSingle();
        if (pendingSlot) { results.push({ row: i, ok: false, error: `ya hay una invitación pendiente de ${r.role} para ${r.unit}`, email: r.email }); continue; }

        const { data: invite, error: insErr } = await admin.from('invites').insert({
          email: r.email,
          role: 'resident',
          building_id,
          unit_id: unitId,
          resident_name: r.name ?? null,
          phone: r.phone ?? null,
          resident_type: r.role,
          invited_by: user.id,
        }).select('token').single();
        if (insErr || !invite) { results.push({ row: i, ok: false, error: insErr?.message ?? 'no se creó invitación', email: r.email }); continue; }

        results.push({ row: i, ok: true, email: r.email, activation_url: `${appUrl}/activate?token=${invite.token}` });
      } catch (e) {
        results.push({ row: i, ok: false, error: (e as Error).message, email: r.email ?? '' });
      }
    }

    const created = results.filter((r) => r.ok).length;
    const failed = results.length - created;
    return json({ ok: true, created, failed, results });
  } catch (e) {
    console.error('[roster-bulk-import]', e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
