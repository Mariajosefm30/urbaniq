import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.74.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const body = await req.json();
    const { action, token, password } = body ?? {};
    if (!token) return json({ ok: false, error: 'Token requerido' }, 400);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const { data: invite, error: invErr } = await admin
      .from('invites')
      .select('id, email, role, building_id, unit_id, accepted_at, expires_at')
      .eq('token', token)
      .maybeSingle();

    if (invErr || !invite) return json({ ok: false, error: 'Invitación no encontrada' }, 404);
    if (invite.accepted_at) return json({ ok: false, error: 'Invitación ya usada' }, 400);
    if (new Date(invite.expires_at) < new Date()) return json({ ok: false, error: 'Invitación expirada' }, 400);

    let buildingName: string | null = null;
    if (invite.building_id) {
      const { data: b } = await admin.from('buildings').select('name').eq('id', invite.building_id).maybeSingle();
      buildingName = (b as { name: string } | null)?.name ?? null;
    }

    if (action === 'lookup') {
      return json({
        ok: true,
        invite: {
          email: invite.email,
          role: invite.role,
          building_id: invite.building_id,
          building_name: buildingName,
        },
      });
    }

    if (action === 'activate') {
      if (!password || password.length < 8) return json({ ok: false, error: 'Contraseña mínima 8 caracteres' }, 400);

      // Check if user already exists
      const { data: existing } = await admin.auth.admin.listUsers();
      const existingUser = existing.users.find((u) => u.email?.toLowerCase() === invite.email.toLowerCase());

      let userId: string;
      if (existingUser) {
        userId = existingUser.id;
        // Update password
        const { error: upErr } = await admin.auth.admin.updateUserById(userId, { password });
        if (upErr) return json({ ok: false, error: upErr.message }, 400);
        // Ensure membership exists (trigger only runs on insert)
        await admin.from('memberships').insert({
          user_id: userId,
          building_id: invite.building_id,
          role: invite.role,
          unit_id: invite.unit_id,
        });
        await admin.from('invites').update({ accepted_at: new Date().toISOString() }).eq('id', invite.id);
      } else {
        const { data: created, error: createErr } = await admin.auth.admin.createUser({
          email: invite.email,
          password,
          email_confirm: true,
        });
        if (createErr || !created.user) return json({ ok: false, error: createErr?.message || 'No se pudo crear usuario' }, 400);
        userId = created.user.id;
        // Trigger handle_new_user_v2 will consume the invite automatically
      }

      return json({ ok: true, user_id: userId });
    }

    return json({ ok: false, error: 'Acción inválida' }, 400);
  } catch (e) {
    console.error('[activate-invite]', e);
    return json({ ok: false, error: (e as Error).message }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
