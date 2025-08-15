import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'
import { corsHeaders } from '../_shared/cors.ts'

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
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

    // Create Supabase client with service role key for secure access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    let appointmentsQuery;
    let logsQuery;
    let trackingQuery;

    // Build queries based on search type
    if (searchType === 'phone') {
      appointmentsQuery = supabase
        .from('appointments')
        .select('*')
        .eq('patient_phone', searchValue)
        .order('appointment_date', { ascending: false })

      logsQuery = supabase
        .from('vaccine_logs')
        .select('*')
        .eq('patient_name', searchValue) // Note: This is not ideal, we should match by phone but the schema doesn't have phone in vaccine_logs

      // For tracking, we need to join with appointments to match by phone
      trackingQuery = supabase
        .from('patient_vaccine_tracking')
        .select(`
          *,
          vaccine_schedules (
            vaccine_name,
            vaccine_type,
            total_doses,
            dose_intervals
          )
        `)
        .eq('patient_id', searchValue) // This will need to be improved to properly match by phone
    } else {
      // Search by patient_id
      appointmentsQuery = supabase
        .from('appointments')
        .select('*')
        .eq('patient_id_number', searchValue)
        .order('appointment_date', { ascending: false })

      // Find patient name from appointments first to search logs
      const { data: appointments } = await appointmentsQuery
      const patientName = appointments?.[0]?.patient_name

      logsQuery = supabase
        .from('vaccine_logs')
        .select('*')
        .eq('patient_name', patientName || '')

      trackingQuery = supabase
        .from('patient_vaccine_tracking')
        .select(`
          *,
          vaccine_schedules (
            vaccine_name,
            vaccine_type,
            total_doses,
            dose_intervals
          )
        `)
        .eq('patient_id', searchValue)
    }

    // Execute queries
    const [appointmentsResult, logsResult, trackingResult] = await Promise.all([
      appointmentsQuery,
      logsQuery,
      trackingQuery
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

    // Return filtered results
    return new Response(
      JSON.stringify({
        appointments: appointmentsResult.data || [],
        vaccineLogs: logsResult.data || [],
        tracking: trackingResult.data || []
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