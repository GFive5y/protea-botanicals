// supabase/functions/invite-user/index.ts
// Fix D — LL-212: creates a real Supabase auth account via service_role key.
// Called by HQTenants.js before the send-email EF.
// NEVER call auth.admin from the React client — it requires service_role key.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { verifyTenantAuth } from '../_shared/verifyTenantAuth.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { email, tenant_id, full_name, role } = await req.json()

    if (!email || !tenant_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'email and tenant_id are required' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    // SAFETY-076: Verify caller is authorized for this tenant
    const auth = await verifyTenantAuth(req, { mode: 'tenant', tenantId: tenant_id })
    if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

    // Service role client — never use anon key for auth.admin calls
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const siteUrl = Deno.env.get('SITE_URL') || 'https://nuai-gfive5ys-projects.vercel.app'

    // Create auth account + send magic link invite email
    const { data: inviteData, error: inviteError } = await supabaseAdmin.auth.admin.inviteUserByEmail(
      email,
      {
        data: {
          tenant_id,
          role: role || 'manager',
          full_name: full_name || '',
        },
        redirectTo: `${siteUrl}/tenant-portal`,
      }
    )

    if (inviteError) {
      return new Response(
        JSON.stringify({ success: false, error: inviteError.message }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      )
    }

    const userId = inviteData.user?.id
    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Invite succeeded but no user ID returned' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
      )
    }

    // Upsert user_profiles so the portal resolves their tenant on first login
    const { error: profileError } = await supabaseAdmin
      .from('user_profiles')
      .upsert(
        {
          id: userId,
          tenant_id,
          email,
          full_name: full_name || '',
          role: role || 'manager',
        },
        { onConflict: 'id' }
      )

    if (profileError) {
      // Non-fatal — auth user exists, profile can be corrected manually
      console.error('[invite-user] user_profiles upsert failed:', profileError.message)
    }

    return new Response(
      JSON.stringify({ success: true, user_id: userId }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    )
  }
})
