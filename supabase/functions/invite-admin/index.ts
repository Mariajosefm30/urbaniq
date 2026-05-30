import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { createClient } from 'npm:@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || Deno.env.get('RESEND_API');
const FROM_EMAIL = Deno.env.get('FROM_EMAIL') || 'onboarding@resend.dev';
const APP_URL = Deno.env.get('APP_URL') || '';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const token = authHeader.replace('Bearer ', '');
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);
    const { data: userRes, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userRes.user) {
      return new Response(JSON.stringify({ error: 'Invalid session' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify caller is superadmin
    const { data: isSuper } = await admin.rpc('is_superadmin', { _user_id: userRes.user.id });
    if (!isSuper) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const email = String(body.email || '').trim().toLowerCase();
    const orgId = String(body.org_id || '').trim();
    if (!email || !orgId) {
      return new Response(JSON.stringify({ error: 'email y org_id requeridos' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Fetch org name
    const { data: org } = await admin.from('organizations').select('name').eq('id', orgId).maybeSingle();
    const orgName = org?.name || 'tu organización';

    // Check if user already exists
    const { data: existingProfile } = await admin
      .from('profiles').select('id').eq('email', email).maybeSingle();

    if (existingProfile) {
      // Promote immediately
      await admin.from('profiles').update({ org_id: orgId, role: 'admin' }).eq('id', existingProfile.id);
      await admin.from('user_roles').insert({ user_id: existingProfile.id, role: 'admin' }).then(() => {}).catch(() => {});
    } else {
      // Record pending invitation
      const { error: pendErr } = await admin
        .from('pending_admins')
        .upsert({ email, org_id: orgId, invited_by: userRes.user.id }, { onConflict: 'email,org_id' });
      if (pendErr) {
        return new Response(JSON.stringify({ error: pendErr.message }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Build signup URL
    const origin = APP_URL || req.headers.get('origin') || '';
    const signupUrl = `${origin}/auth?mode=signup&email=${encodeURIComponent(email)}`;

    // Send invitation email
    let emailSent = false;
    let emailError: string | null = null;
    if (RESEND_API_KEY) {
      const html = `
        <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#1a1a1a">
          <h1 style="font-size:22px;margin:0 0 16px">Has sido invitado como administrador</h1>
          <p style="font-size:15px;line-height:1.5;color:#444">
            Te han invitado a administrar <strong>${orgName}</strong> en la plataforma.
            Como administrador podrás registrar tus edificios, asignar managers y cargar a tus residentes.
          </p>
          <p style="margin:24px 0">
            <a href="${signupUrl}" style="background:#0d0d0d;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
              Crear mi cuenta
            </a>
          </p>
          <p style="font-size:13px;color:#888">
            Si el botón no funciona, copia este enlace en tu navegador:<br/>
            <span style="word-break:break-all">${signupUrl}</span>
          </p>
          <p style="font-size:13px;color:#888;margin-top:32px">
            Usa este correo (${email}) al registrarte; tu cuenta quedará vinculada automáticamente a ${orgName}.
          </p>
        </div>`;

      const resp = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: FROM_EMAIL,
          to: [email],
          subject: `Invitación para administrar ${orgName}`,
          html,
        }),
      });
      emailSent = resp.ok;
      if (!resp.ok) emailError = await resp.text();
    } else {
      emailError = 'RESEND_API_KEY no configurado';
    }

    return new Response(JSON.stringify({ ok: true, emailSent, emailError, signupUrl }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e?.message || e) }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
