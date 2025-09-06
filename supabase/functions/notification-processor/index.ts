import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.54.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// LINE Messaging API configuration
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')
const LINE_API_URL = 'https://api.line.me/v2/bot/message/push'

const sendLineMessage = async (userId: string, message: string) => {
  if (!LINE_CHANNEL_ACCESS_TOKEN) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not configured')
  }

  const response = await fetch(LINE_API_URL, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: userId,
      messages: [{
        type: 'text',
        text: message
      }]
    })
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`LINE API error: ${error}`)
  }

  return await response.json()
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    // Security check for CRON secret
    const cronSecret = req.headers.get('cron-secret')
    const authHeader = req.headers.get('Authorization')
    
    if (!cronSecret && !authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Verify CRON secret if provided
    if (cronSecret && cronSecret !== Deno.env.get('CRON_SECRET')) {
      return new Response(
        JSON.stringify({ error: 'Invalid CRON secret' }),
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    console.log('Notification processor started')

    // Create Supabase client with service role for full access
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Get pending notification jobs that are due to be sent
    const { data: pendingJobs, error: jobsError } = await supabase
      .from('notification_jobs')
      .select('*')
      .eq('status', 'pending')
      .lte('schedule_at', new Date().toISOString())
      .limit(50)

    if (jobsError) {
      console.error('Error fetching pending jobs:', jobsError)
      throw jobsError
    }

    console.log(`Found ${pendingJobs?.length || 0} pending notification jobs`)

    let processedCount = 0
    let errorCount = 0
    const results = []

    // Process each pending job
    for (const job of pendingJobs || []) {
      try {
        console.log(`Processing job ${job.id}: ${job.kind}`)
        
        // Mark job as processing
        await supabase
          .from('notification_jobs')
          .update({ 
            status: 'processing',
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        // Send notification based on channel
        if (job.channel === 'line' && job.line_user_id && job.payload?.message) {
          await sendLineMessage(job.line_user_id, job.payload.message)
          
          // Log successful notification
          await supabase
            .from('appointment_notifications')
            .insert({
              appointment_id: job.appointment_id,
              line_user_id: job.line_user_id,
              notification_type: job.payload.reminderType || 'reminder',
              sent_to: job.line_user_id,
              message_content: job.payload.message,
              status: 'sent',
              sent_at: new Date().toISOString()
            })

          // Mark job as completed
          await supabase
            .from('notification_jobs')
            .update({ 
              status: 'completed',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          processedCount++
          results.push({
            jobId: job.id,
            status: 'success',
            type: job.kind,
            recipient: job.line_user_id
          })

        } else if (job.channel === 'sms') {
          // SMS not implemented yet, mark as failed
          await supabase
            .from('notification_jobs')
            .update({ 
              status: 'failed',
              last_error: 'SMS channel not implemented',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          errorCount++
          results.push({
            jobId: job.id,
            status: 'failed',
            error: 'SMS channel not implemented'
          })

        } else {
          // Invalid job configuration
          await supabase
            .from('notification_jobs')
            .update({ 
              status: 'failed',
              last_error: 'Invalid job configuration',
              updated_at: new Date().toISOString()
            })
            .eq('id', job.id)

          errorCount++
          results.push({
            jobId: job.id,
            status: 'failed',
            error: 'Invalid job configuration'
          })
        }

      } catch (error) {
        console.error(`Error processing job ${job.id}:`, error)
        
        // Mark job as failed and increment attempts
        await supabase
          .from('notification_jobs')
          .update({ 
            status: 'failed',
            attempts: (job.attempts || 0) + 1,
            last_error: error.message,
            updated_at: new Date().toISOString()
          })
          .eq('id', job.id)

        errorCount++
        results.push({
          jobId: job.id,
          status: 'failed',
          error: error.message
        })
      }
    }

    console.log(`Notification processing completed: ${processedCount} sent, ${errorCount} failed`)

    return new Response(JSON.stringify({
      success: true,
      message: 'Notification processing completed',
      statistics: {
        jobsProcessed: pendingJobs?.length || 0,
        notificationsSent: processedCount,
        errors: errorCount
      },
      results,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Notification processor error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})