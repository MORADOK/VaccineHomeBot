import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { normalizeStaffEmail, mayManageRoles, mayInviteStaff } from '../_shared/staff-role-policy.ts'

const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type', 'Content-Type': 'application/json' }
const respond = (status: number, body: Record<string, unknown>) => new Response(JSON.stringify(body), { status, headers })

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers })
  if (req.method !== 'POST') return respond(405, { error: 'Method not allowed' })
  try {
    const bearer = req.headers.get('Authorization')
    if (!bearer?.startsWith('Bearer ')) return respond(401, { error: 'Unauthorized' })
    const admin = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', {
      auth: { autoRefreshToken: false, persistSession: false }
    })
    const { data: caller, error: authError } = await admin.auth.getUser(bearer.slice(7))
    if (authError || !caller.user) return respond(401, { error: 'Unauthorized' })
    const { data: callerRole, error: roleError } = await admin.from('user_roles').select('role').eq('user_id', caller.user.id)
    if (roleError) {
      console.error('invite-staff role lookup failed', { callerId: caller.user.id, code: roleError.code, message: roleError.message })
      return respond(500, { error: 'Role lookup failed', details: 'Unable to verify permissions' })
    }
    if (!mayManageRoles((callerRole ?? []).map(r => r.role))) {
      console.warn('invite-staff rejected caller', { callerId: caller.user.id, rolesFound: (callerRole ?? []).map(r => r.role) })
      return respond(403, { error: 'Admin role required', details: 'Your signed-in account does not have an admin role in this Supabase project. Sign out and sign back in with the correct account.' })
    }

    const { email, role } = await req.json()
    const normalizedEmail = normalizeStaffEmail(email)
    if (!normalizedEmail) return respond(400, { error: 'Invalid email' })
    if (role !== 'admin' && role !== 'healthcare_staff') return respond(400, { error: 'Invalid staff role' })
    if (!mayInviteStaff(callerRole.map(r => r.role), role)) return respond(403, { error: 'Not permitted to invite this role' })
    const redirectTo = 'https://moradok.github.io/VaccineHomeBot/?type=invite'
    const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(normalizedEmail, { redirectTo })
    if (inviteError || !invited.user) return respond(400, { error: 'Unable to invite user', details: inviteError?.message })
    const { error: insertError } = await admin.from('user_roles').insert({
      user_id: invited.user.id, role, created_by: caller.user.id
    })
    if (insertError) {
      // Do not delete an invited user: the email invitation may already have been sent.
      console.error('Invitation role assignment failed:', insertError)
      return respond(500, { error: 'Invitation sent but role assignment failed', details: 'Administrator must reconcile this account before use' })
    }
    return respond(201, { success: true, message: 'Invitation sent', email: normalizedEmail })
  } catch (error) {
    console.error('invite-staff failed:', error)
    return respond(500, { error: 'Internal server error' })
  }
})
