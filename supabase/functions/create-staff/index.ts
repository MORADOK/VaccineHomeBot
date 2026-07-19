// supabase/functions/create-staff/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface CreateStaffRequest {
  email: string
  password: string
  role: 'admin' | 'healthcare_staff' | 'superadmin'
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get request body
    const { email, password, role }: CreateStaffRequest = await req.json()

    // Validate input
    if (!email || !password || !role) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields',
          details: 'email, password, and role are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(email)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid email format',
          details: 'Please provide a valid email address'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate password length
    if (password.length < 6) {
      return new Response(
        JSON.stringify({
          error: 'Password too short',
          details: 'Password must be at least 6 characters'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Validate role
    const validRoles = ['admin', 'healthcare_staff', 'superadmin']
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({
          error: 'Invalid role',
          details: `Role must be one of: ${validRoles.join(', ')}`
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Create Supabase Admin client (has full access)
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

    // Step 1: Create user in Supabase Auth
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Auto-confirm email for staff created by admin
      user_metadata: {
        role: role,
        created_by: 'admin',
        created_via: 'staff_management'
      }
    })

    if (authError) {
      console.error('Auth error:', authError)

      // Handle specific error cases
      if (authError.message.includes('already registered')) {
        return new Response(
          JSON.stringify({
            error: 'Email already registered',
            details: 'This email address is already in use'
          }),
          {
            status: 409, // Conflict
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        )
      }

      return new Response(
        JSON.stringify({
          error: 'Failed to create user',
          details: authError.message
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    if (!authData.user) {
      return new Response(
        JSON.stringify({
          error: 'Failed to create user',
          details: 'No user data returned from auth service'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Step 2: Insert role into user_roles table
    const { error: roleError } = await supabaseAdmin
      .from('user_roles')
      .insert({
        user_id: authData.user.id,
        role: role,
      })

    if (roleError) {
      console.error('Role error:', roleError)

      // Rollback: Delete the user if role assignment fails
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id)

      return new Response(
        JSON.stringify({
          error: 'Failed to assign role',
          details: roleError.message,
          rollback: 'User creation rolled back'
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      )
    }

    // Success!
    return new Response(
      JSON.stringify({
        success: true,
        message: 'Staff member created successfully',
        data: {
          id: authData.user.id,
          email: authData.user.email,
          role: role,
          email_confirmed: true,
          created_at: authData.user.created_at,
        }
      }),
      {
        status: 201,
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
