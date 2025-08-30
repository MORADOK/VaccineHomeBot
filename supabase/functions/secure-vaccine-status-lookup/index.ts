import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
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

    const { searchType, searchValue } = await req.json()
    
    // Validate input
    if (!searchType || !searchValue) {
      return new Response(
        JSON.stringify({ error: 'Missing searchType or searchValue' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (!['phone', 'patient_id'].includes(searchType)) {
      return new Response(
        JSON.stringify({ error: 'Invalid searchType. Must be phone or patient_id' }), 
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Authorized lookup request:', { searchType, user: user.id })

    let appointmentsQuery;
    let logsQuery;
    let trackingQuery;
    let registrationsQuery;

    // Build queries based on search type - limited columns for security
    if (searchType === 'phone') {
      appointmentsQuery = supabase
        .from('appointments')
        .select('appointment_id, patient_name, appointment_date, appointment_time, vaccine_type, status')
        .eq('patient_phone', searchValue)
        .order('appointment_date', { ascending: false })

      registrationsQuery = supabase
        .from('patient_registrations')
        .select('registration_id, full_name, phone, created_at, status')
        .eq('phone', searchValue)
        .order('created_at', { ascending: false })

      logsQuery = supabase
        .from('vaccine_logs')
        .select('vaccine_type, administered_date, dose_number, administered_by')
        .eq('patient_name', searchValue)

      trackingQuery = supabase
        .from('patient_vaccine_tracking')
        .select(`
          patient_name,
          current_dose,
          total_doses,
          last_dose_date,
          next_dose_due,
          completion_status,
          vaccine_schedules (
            vaccine_name,
            vaccine_type,
            total_doses
          )
        `)
        .eq('patient_id', searchValue)
    } else {
      // Search by patient_id
      registrationsQuery = supabase
        .from('patient_registrations')
        .select('registration_id, full_name, phone, created_at, status')
        .eq('registration_id', searchValue)
        .order('created_at', { ascending: false })

      appointmentsQuery = supabase
        .from('appointments')
        .select('appointment_id, patient_name, appointment_date, appointment_time, vaccine_type, status')
        .eq('patient_id_number', searchValue)
        .order('appointment_date', { ascending: false })

      // Find patient name from appointments first to search logs
      const { data: appointments } = await appointmentsQuery
      const patientName = appointments?.[0]?.patient_name

      logsQuery = supabase
        .from('vaccine_logs')
        .select('vaccine_type, administered_date, dose_number, administered_by')
        .eq('patient_name', patientName || '')

      trackingQuery = supabase
        .from('patient_vaccine_tracking')
        .select(`
          patient_name,
          current_dose,
          total_doses,
          last_dose_date,
          next_dose_due,
          completion_status,
          vaccine_schedules (
            vaccine_name,
            vaccine_type,
            total_doses
          )
        `)
        .eq('patient_id', searchValue)
    }

    // Execute queries with RLS enforcement
    const [appointmentsResult, logsResult, trackingResult, registrationsResult] = await Promise.all([
      appointmentsQuery,
      logsQuery,
      trackingQuery,
      registrationsQuery
    ])

    // Check for errors
    if (appointmentsResult.error) {
      console.error('Appointments query error:', appointmentsResult.error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch appointments' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (logsResult.error) {
      console.error('Logs query error:', logsResult.error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch vaccine logs' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (trackingResult.error) {
      console.error('Tracking query error:', trackingResult.error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch vaccine tracking' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    if (registrationsResult.error) {
      console.error('Registrations query error:', registrationsResult.error)
      return new Response(
        JSON.stringify({ error: 'Failed to fetch patient registrations' }), 
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Lookup completed successfully:', { 
      appointments: appointmentsResult.data?.length || 0,
      registrations: registrationsResult.data?.length || 0
    })

    // Return filtered results with minimal data
    return new Response(
      JSON.stringify({
        appointments: appointmentsResult.data || [],
        vaccineLogs: logsResult.data || [],
        tracking: trackingResult.data || [],
        registrations: registrationsResult.data || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Unexpected error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})