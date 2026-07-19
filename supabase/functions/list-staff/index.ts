// supabase/functions/list-staff/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface StaffMember {
  id: string
  email: string
  role: string
  created_at: string
  email_confirmed_at: string | null
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Create Supabase Admin client
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Get all staff from user_roles table
    const { data: roles, error: rolesError } = await supabaseAdmin
      .from('user_roles')
      .select('*')
      .order('created_at', { ascending: false })

    if (rolesError) {
      console.error('Roles query error:', rolesError)
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch staff roles',
          details: rolesError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // For each role, get user details from auth.users
    const staffMembers: StaffMember[] = []

    for (const role of roles || []) {
      try {
        const { data: userData, error: userError } = await supabaseAdmin.auth.admin.getUserById(role.user_id)

        if (userError) {
          console.error(`Error fetching user ${role.user_id}:`, userError)
          // Skip this user and continue
          continue
        }

        if (userData.user) {
          staffMembers.push({
            id: userData.user.id,
            email: userData.user.email || 'Unknown',
            role: role.role,
            created_at: role.created_at,
            email_confirmed_at: userData.user.email_confirmed_at || null,
          })
        }
      } catch (error) {
        console.error(`Unexpected error for user ${role.user_id}:`, error)
        // Skip this user and continue
        continue
      }
    }

    // Success!
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Staff list retrieved successfully',
        data: staffMembers,
        count: staffMembers.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})
