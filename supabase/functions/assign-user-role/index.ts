import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { normalizeStaffEmail, mayManageRoles, mayAssignExistingRole } from '../_shared/staff-role-policy.ts'

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }
const reply = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return reply(405, { error: 'Method not allowed' })
  try {
    const authorization = req.headers.get('Authorization')
    if (!authorization?.startsWith('Bearer ')) return reply(401, { error: 'Unauthorized' })
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: caller, error: authError } = await admin.auth.getUser(authorization.slice(7))
    if (authError || !caller.user) return reply(401, { error: 'Unauthorized' })
    const { data: callerRoles, error: callerRoleError } = await admin.from('user_roles').select('role').eq('user_id', caller.user.id)
    if (callerRoleError || !mayManageRoles((callerRoles ?? []).map(r => r.role))) return reply(403, { error: 'Admin role required' })
    const { email, role } = await req.json()
    const normalizedEmail = normalizeStaffEmail(email)
    if (!normalizedEmail) return reply(400, { error: 'Invalid email' })
    if (!['admin', 'healthcare_staff', 'patient'].includes(role)) return reply(400, { error: 'Invalid role' })
    let targetId: string | undefined
    // Supabase admin API has no direct lookup by email; paginate to avoid silently missing accounts.
    for (let page = 1; page <= 100; page++) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 100 })
      if (error) return reply(500, { error: 'Unable to find user' })
      targetId = data.users.find(u => u.email?.toLowerCase() === normalizedEmail)?.id
      if (targetId || data.users.length < 100) break
    }
    if (!targetId) return reply(404, { error: 'User not found; invite them first' })
    const { data: existing, error: existingError } = await admin.from('user_roles').select('role').eq('user_id', targetId)
    if (existingError) return reply(500, { error: 'Unable to inspect roles' })
    const policy = mayAssignExistingRole(callerRoles.map(r => r.role), caller.user.id, targetId, (existing ?? []).map(r => r.role), role)
    if (policy === 'forbidden') return reply(403, { error: 'Not permitted to assign this role' })
    if (policy === 'already-assigned') return reply(200, { success: true, alreadyAssigned: true })
    if (policy === 'conflict') return reply(409, { error: 'User already has a different role; contact superadmin for role changes' })
    const { error: insertError } = await admin.from('user_roles').insert({ user_id: targetId, role, created_by: caller.user.id })
    if (insertError) return reply(500, { error: 'Unable to assign role' })
    return reply(200, { success: true })
  } catch (error) {
    console.error('assign-user-role failed', error)
    return reply(500, { error: 'Internal server error' })
  }
})
