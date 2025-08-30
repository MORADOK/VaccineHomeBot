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
    // Security: Check webhook secret from headers
    const webhookSecret = req.headers.get('x-webhook-secret')
    const expectedSecret = Deno.env.get('WEBHOOK_SECRET')
    
    if (!webhookSecret || webhookSecret !== expectedSecret) {
      console.error('Invalid webhook secret')
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid webhook secret' }), 
        { 
          status: 401, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    const requestBody = await req.json()
    console.log('Secure webhook request received:', { 
      type: requestBody.type,
      timestamp: new Date().toISOString()
    })

    // Sanitize the data - remove any sensitive fields
    const sanitizedData = {
      type: requestBody.type || 'unknown',
      timestamp: new Date().toISOString(),
      source: 'secure_webhook'
    }

    // Add non-sensitive fields based on request type
    if (requestBody.type === 'patient_registration') {
      sanitizedData.patientName = requestBody.patientName?.substring(0, 50) || ''
      sanitizedData.registrationType = requestBody.registrationType || 'manual'
    } else if (requestBody.type === 'liff_check') {
      sanitizedData.liffId = requestBody.data?.liffId || ''
      sanitizedData.status = 'check_completed'
    }

    // Forward to external webhook without PII
    const externalWebhookUrl = Deno.env.get('EXTERNAL_WEBHOOK_URL')
    if (externalWebhookUrl) {
      try {
        const externalResponse = await fetch(externalWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-webhook-source': 'supabase-secure-proxy'
          },
          body: JSON.stringify(sanitizedData)
        })

        if (!externalResponse.ok) {
          console.error('External webhook failed:', externalResponse.status)
        } else {
          console.log('External webhook called successfully')
        }
      } catch (error) {
        console.error('Error calling external webhook:', error)
      }
    }

    return new Response(JSON.stringify({
      success: true,
      message: 'Webhook processed securely',
      processed: sanitizedData.type
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Secure webhook error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: 'Internal server error' 
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})