// supabase/functions/_shared/verifyTenantAuth.ts
// Shared JWT auth helper for Edge Functions — S306
// Single source of truth for EF authorization.
//
// Two modes:
//   'tenant'       — caller must belong to the requested tenant OR be HQ operator
//   'operator-only' — caller must be HQ operator (admin role on operator tenant)
//
// Usage:
//   import { verifyTenantAuth } from '../_shared/verifyTenantAuth.ts'
//   const auth = await verifyTenantAuth(req, { mode: 'tenant', tenantId: body.tenant_id })
//   if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status })

import { createClient } from 'jsr:@supabase/supabase-js@2';

const HQ_OPERATOR_TENANT_ID = '43b34c33-6864-4f02-98dd-df1d340475c3';

type AuthOpts =
  | { mode: 'tenant'; tenantId: string }
  | { mode: 'operator-only' };

type AuthSuccess = { ok: true; userId: string; userTenantId: string; role: string };
type AuthFailure = { ok: false; status: number; error: string };
type AuthResult = AuthSuccess | AuthFailure;

export async function verifyTenantAuth(req: Request, opts: AuthOpts): Promise<AuthResult> {
  // 1. Extract JWT from Authorization header
  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return { ok: false, status: 401, error: 'Missing authorization header' };
  }
  const jwt = authHeader.replace('Bearer ', '');

  // 2. Verify JWT using Supabase auth
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const db = createClient(supabaseUrl, serviceRoleKey);

  const { data: { user }, error: authError } = await db.auth.getUser(jwt);
  if (authError || !user) {
    return { ok: false, status: 401, error: 'Invalid or expired token' };
  }

  // 3. Fetch user profile for tenant + role
  const { data: profile, error: profileError } = await db
    .from('user_profiles')
    .select('tenant_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    return { ok: false, status: 403, error: 'No user profile found' };
  }

  const userTenantId = profile.tenant_id as string;
  const role = profile.role as string;
  const isHQOperator = userTenantId === HQ_OPERATOR_TENANT_ID && role === 'admin';

  // 4. Apply authorization check based on mode
  if (opts.mode === 'operator-only') {
    if (!isHQOperator) {
      return { ok: false, status: 403, error: 'Operator access required' };
    }
  } else {
    // mode === 'tenant'
    const tenantMatch = userTenantId === opts.tenantId;
    if (!tenantMatch && !isHQOperator) {
      return { ok: false, status: 403, error: 'Not authorized for this tenant' };
    }
  }

  return { ok: true, userId: user.id, userTenantId, role };
}

export { HQ_OPERATOR_TENANT_ID };
