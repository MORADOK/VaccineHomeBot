import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Security: Authenticate user and check healthcare staff role
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authorization header required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create Supabase client with anon key for RLS enforcement
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: authHeader }
        }
      }
    )

    // Verify user authentication and healthcare staff role
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      console.error('Authentication failed:', authError)
      return new Response(
        JSON.stringify({ error: 'Authentication required' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if user has healthcare staff role
    const { data: hasStaffRole, error: roleError } = await supabase
      .rpc('is_healthcare_staff', { _user_id: user.id })
    
    if (roleError || !hasStaffRole) {
      console.error('Role check failed:', roleError)
      return new Response(
        JSON.stringify({ error: 'Access denied: Healthcare staff role required' }), 
        { 
          status: 403, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Manual notification trigger started by user:', user.id)

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    // Call the auto notification function with authentication
    const notificationResponse = await fetch(`${SUPABASE_URL}/functions/v1/auto-vaccine-notifications`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader, // Pass through the user's auth token
        'Content-Type': 'application/json'
      }
    })

    const result = await notificationResponse.json()

    console.log('Manual trigger completed:', result)

    return new Response(JSON.stringify({
      success: true,
      message: 'Manual notification trigger completed',
      result: result,
      triggeredBy: user.id
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Manual trigger error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})