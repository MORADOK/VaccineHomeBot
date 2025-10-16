// @ts-ignore - Deno imports work in runtime
import { serve } from "https://deno.land/std@0.208.0/http/server.ts"
// @ts-ignore - Deno imports work in runtime  
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.7'

// Declare Deno global for TypeScript
declare const Deno: any

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AppointmentData {
  id: string;
  appointment_id: string;
  patient_name: string;
  patient_phone?: string;
  appointment_date: string;
  appointment_time?: string;
  vaccine_type: string;
  line_user_id?: string;
  status: string;
}

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('Auto notification system started')

    // Security: Check for CRON secret or require authentication
    const cronSecret = req.headers.get('x-cron-secret')
    const authHeader = req.headers.get('Authorization')

    if (cronSecret === Deno.env.get('CRON_SECRET')) {
      console.log('Authenticated via CRON secret')
    } else if (authHeader) {
      // Verify JWT and healthcare staff role
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL') ?? '',
        Deno.env.get('SUPABASE_ANON_KEY') ?? '',
        {
          global: {
            headers: { Authorization: authHeader }
          }
        }
      )

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
      console.log('Authenticated via JWT for user:', user.id)
    } else {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Get environment variables
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')

    if (!LINE_CHANNEL_ACCESS_TOKEN) {
      console.log('LINE_CHANNEL_ACCESS_TOKEN not configured, skipping LINE notifications')
    }

    // Calculate tomorrow's date (for appointments reminder)
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Calculate today's date (for overdue appointments)
    const today = new Date().toISOString().split('T')[0]

    console.log(`Checking appointments for tomorrow: ${tomorrowStr}`)
    console.log(`Checking overdue appointments before: ${today}`)

    // Get appointments for tomorrow
    const appointmentsResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?appointment_date=eq.${tomorrowStr}&status=eq.scheduled&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    const appointments: AppointmentData[] = await appointmentsResponse.json()
    console.log(`Found ${appointments.length} appointments for tomorrow`)

    // Get overdue appointments (past due date and still scheduled)
    const overdueResponse = await fetch(
      `${SUPABASE_URL}/rest/v1/appointments?appointment_date=lt.${today}&status=eq.scheduled&select=*`,
      {
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'apikey': SUPABASE_SERVICE_ROLE_KEY,
          'Content-Type': 'application/json'
        }
      }
    )

    const overdueAppointments: AppointmentData[] = await overdueResponse.json()
    console.log(`Found ${overdueAppointments.length} overdue appointments`)

    let notificationsSent = 0
    let errorsCount = 0

    // Send tomorrow reminders
    for (const appointment of appointments) {
      try {
        // Check if notification was already sent today
        const existingNotificationResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/appointment_notifications?appointment_id=eq.${appointment.id}&notification_type=eq.reminder&sent_at=gte.${today}T00:00:00&select=id`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          }
        )

        const existingNotifications = await existingNotificationResponse.json()

        if (existingNotifications.length > 0) {
          console.log(`Notification already sent for appointment ${appointment.appointment_id}`)
          continue
        }

        // Create simple text message for LINE (temporary fix for Invalid action URI)
        const richMessage = {
          type: 'text',
          text: `🏥 โรงพยาบาลโฮม - แจ้งเตือนการนัดฉีดวัคซีน

สวัสดีคุณ ${appointment.patient_name}

📅 วันที่นัด: ${appointment.appointment_date}
⏰ เวลา: ${appointment.appointment_time || 'ไม่ระบุ'}
💉 วัคซีน: ${appointment.vaccine_type}
🏥 สถานที่: โรงพยาบาลโฮม

⚠️ กรุณามาตามเวลานัดหมาย
📞 ติดต่อ: 038-511-123`
        }

        // Fallback text message for older LINE versions (based on test-final-hospital-notification.html)
        const fallbackMessage = `🏥 แจ้งเตือนการนัดหมายฉีดวัคซีน
โรงพยาบาลโฮม

สวัสดีคุณ ${appointment.patient_name}

📋 รายละเอียดการนัด:
📅 วันที่นัด: ${appointment.appointment_date}
⏰ เวลา: ${appointment.appointment_time || 'ไม่ระบุ'}
💉 วัคซีน: ${appointment.vaccine_type}
🏥 สถานที่: โรงพยาบาลโฮม

⚠️ กรุณามาตามเวลานัดหมาย หากมีข้อสงสัยสามารถติดต่อ 038-511-123`

        console.log(`Processing appointment: ${appointment.appointment_id} for patient: ${appointment.patient_name}`)

        // Send LINE message if LINE User ID exists
        let lineMessageSent = false
        if (appointment.line_user_id && LINE_CHANNEL_ACCESS_TOKEN) {
          try {
            const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: appointment.line_user_id,
                messages: [richMessage]
              })
            })

            if (lineResponse.ok) {
              console.log(`LINE message sent successfully to ${appointment.patient_name}`)
              lineMessageSent = true
            } else {
              const errorText = await lineResponse.text()
              console.error(`Failed to send LINE message to ${appointment.patient_name}:`, errorText)
            }
          } catch (lineError) {
            console.error(`LINE API error for ${appointment.patient_name}:`, lineError)
          }
        }

        // Log notification record
        const notificationData = {
          appointment_id: appointment.id,
          notification_type: 'reminder',
          sent_to: appointment.patient_phone || appointment.line_user_id || 'unknown',
          line_user_id: appointment.line_user_id,
          message_content: fallbackMessage,
          status: lineMessageSent ? 'sent' : 'failed'
        }

        const logResponse = await fetch(`${SUPABASE_URL}/rest/v1/appointment_notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(notificationData)
        })

        if (logResponse.ok) {
          console.log(`Notification record created for appointment ${appointment.appointment_id}`)
          notificationsSent++
        } else {
          console.error(`Failed to create notification record for appointment ${appointment.appointment_id}`)
          errorsCount++
        }

      } catch (error) {
        console.error(`Error processing appointment ${appointment.appointment_id}:`, error)
        errorsCount++
      }
    }

    // Send overdue notifications
    for (const appointment of overdueAppointments) {
      try {
        // Check if overdue notification was already sent
        const existingOverdueResponse = await fetch(
          `${SUPABASE_URL}/rest/v1/appointment_notifications?appointment_id=eq.${appointment.id}&notification_type=eq.overdue&select=id`,
          {
            headers: {
              'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
              'apikey': SUPABASE_SERVICE_ROLE_KEY,
              'Content-Type': 'application/json'
            }
          }
        )

        const existingOverdue = await existingOverdueResponse.json()

        if (existingOverdue.length > 0) {
          console.log(`Overdue notification already sent for appointment ${appointment.appointment_id}`)
          continue
        }

        // Create simple text message for overdue appointment (temporary fix for Invalid action URI)
        const overdueRichMessage = {
          type: 'text',
          text: `⚠️ การนัดหมายฉีดวัคซีนเกินกำหนด - โรงพยาบาลโฮม

คุณ ${appointment.patient_name}

📅 วันที่นัดเดิม: ${appointment.appointment_date}
💉 วัคซีน: ${appointment.vaccine_type}
🏥 สถานที่: โรงพยาบาลโฮม

⚠️ การนัดหมายของคุณเกินกำหนดแล้ว
กรุณาติดต่อโรงพยาบาลเพื่อนัดหมายใหม่
📞 ติดต่อ: 038-511-123`
        }

        // Fallback text message for overdue (based on test-final-hospital-notification.html)
        const overdueFallbackMessage = `⚠️ การนัดหมายฉีดวัคซีนเกินกำหนด
โรงพยาบาลโฮม

คุณ ${appointment.patient_name}

📅 วันที่นัดเดิม: ${appointment.appointment_date}
💉 วัคซีน: ${appointment.vaccine_type}
🏥 สถานที่: โรงพยาบาลโฮม

⚠️ การนัดหมายของคุณเกินกำหนดแล้ว
กรุณาติดต่อโรงพยาบาลเพื่อนัดหมายใหม่
📞 ติดต่อ: 038-511-123 เพื่อนัดหมายใหม่`

        console.log(`Processing overdue appointment: ${appointment.appointment_id}`)

        // Send LINE message if LINE User ID exists
        let lineMessageSent = false
        if (appointment.line_user_id && LINE_CHANNEL_ACCESS_TOKEN) {
          try {
            const lineResponse = await fetch('https://api.line.me/v2/bot/message/push', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                to: appointment.line_user_id,
                messages: [overdueRichMessage]
              })
            })

            if (lineResponse.ok) {
              console.log(`Overdue LINE message sent to ${appointment.patient_name}`)
              lineMessageSent = true
            } else {
              console.error(`Failed to send overdue LINE message to ${appointment.patient_name}`)
            }
          } catch (lineError) {
            console.error(`LINE API error for overdue notification:`, lineError)
          }
        }

        // Log overdue notification record
        const overdueNotificationData = {
          appointment_id: appointment.id,
          notification_type: 'overdue',
          sent_to: appointment.patient_phone || appointment.line_user_id || 'unknown',
          line_user_id: appointment.line_user_id,
          message_content: overdueFallbackMessage,
          status: lineMessageSent ? 'sent' : 'failed'
        }

        const overdueLogResponse = await fetch(`${SUPABASE_URL}/rest/v1/appointment_notifications`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
            'apikey': SUPABASE_SERVICE_ROLE_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(overdueNotificationData)
        })

        if (overdueLogResponse.ok) {
          console.log(`Overdue notification record created for appointment ${appointment.appointment_id}`)
          notificationsSent++
        } else {
          console.error(`Failed to create overdue notification record`)
          errorsCount++
        }

      } catch (error) {
        console.error(`Error processing overdue appointment ${appointment.appointment_id}:`, error)
        errorsCount++
      }
    }

    const result = {
      success: true,
      message: 'Auto notification system completed',
      statistics: {
        appointmentsChecked: appointments.length,
        overdueAppointmentsChecked: overdueAppointments.length,
        notificationsSent: notificationsSent,
        errors: errorsCount
      },
      timestamp: new Date().toISOString()
    }

    console.log('Auto notification system completed:', result.statistics)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Auto notification system error:', error)
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
