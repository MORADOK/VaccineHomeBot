import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface NotificationRequest {
  action: 'send_due_reminders' | 'send_single_reminder' | 'check_overdue' | 'schedule_next_dose';
  patient_id?: string;
  appointment_id?: string;
  tracking_id?: string;
}

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
const lineAccessToken = Deno.env.get('LINE_CHANNEL_ACCESS_TOKEN')!;

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Vaccine reminder system called');
    
    // Create anon client for authentication
    const anonSupabase = createClient(supabaseUrl, supabaseAnonKey);

    // Get JWT from Authorization header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Authorization header required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const jwt = authHeader.split(" ")[1];

    // Verify user authentication
    const { data: { user }, error: authError } = await anonSupabase.auth.getUser(jwt);
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is healthcare staff
    const { data: isStaff, error: roleError } = await anonSupabase.rpc("is_healthcare_staff", { _user_id: user.id });
    if (roleError || !isStaff) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Access denied: Healthcare staff role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create service client for administrative operations (after authentication)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const { action, patient_id, appointment_id, tracking_id }: NotificationRequest = await req.json();

    switch (action) {
      case 'send_due_reminders':
        return await sendDueReminders(supabase);
      
      case 'send_single_reminder':
        if (!patient_id) {
          throw new Error('patient_id is required for single reminder');
        }
        return await sendSingleReminder(patient_id, supabase);
      
      case 'check_overdue':
        return await checkOverdueAppointments(supabase);
      
      case 'schedule_next_dose':
        if (!tracking_id) {
          throw new Error('tracking_id is required for scheduling next dose');
        }
        return await scheduleNextDose(tracking_id, supabase);
      
      default:
        throw new Error('Invalid action');
    }

  } catch (error: any) {
    console.error('Error in vaccine reminder system:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { 'Content-Type': 'application/json', ...corsHeaders } 
      }
    );
  }
};

async function sendDueReminders(supabase: any) {
  console.log('Sending due reminders...');
  
  // Get notifications scheduled for today that haven't been sent
  const today = new Date().toISOString().split('T')[0];
  
  const { data: notifications, error } = await supabase
    .from('notification_schedules')
    .select(`
      *,
      patient_vaccine_tracking (
        patient_name,
        vaccine_schedules (vaccine_name)
      )
    `)
    .eq('scheduled_date', today)
    .eq('sent', false);

  if (error) {
    console.error('Error fetching notifications:', error);
    throw error;
  }

  console.log(`Found ${notifications?.length || 0} notifications to send`);

  let sentCount = 0;
  let errorCount = 0;

  for (const notification of notifications || []) {
    try {
      // Send LINE message
      await sendLineMessage(
        notification.line_user_id,
        notification.message_content || generateReminderMessage(notification)
      );

      // Mark as sent
      await supabase
        .from('notification_schedules')
        .update({ 
          sent: true, 
          sent_at: new Date().toISOString() 
        })
        .eq('id', notification.id);

      // Log to appointment_notifications
      await supabase
        .from('appointment_notifications')
        .insert({
          sent_to: notification.line_user_id,
          notification_type: notification.notification_type,
          message_content: notification.message_content,
          status: 'sent',
          line_user_id: notification.line_user_id
        });

      sentCount++;
      console.log(`Sent reminder to ${notification.line_user_id}`);

    } catch (error) {
      console.error(`Failed to send reminder to ${notification.line_user_id}:`, error);
      errorCount++;
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      sent: sentCount,
      errors: errorCount,
      total: notifications?.length || 0
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function sendSingleReminder(patientId: string, supabase: any) {
  console.log(`Sending single reminder to ${patientId}`);

  // Get patient tracking info
  const { data: tracking, error } = await supabase
    .from('patient_vaccine_tracking')
    .select(`
      *,
      vaccine_schedules (vaccine_name, vaccine_type)
    `)
    .eq('patient_id', patientId)
    .eq('completion_status', 'in_progress')
    .single();

  if (error) {
    console.error('Error fetching patient tracking:', error);
    throw error;
  }

  if (!tracking) {
    throw new Error('No active vaccine tracking found for patient');
  }

  const message = `🔔 แจ้งเตือนการฉีดวัคซีน

สวัสดีคุณ ${tracking.patient_name}

คุณมีนัดฉีดวัคซีน:
💉 วัคซีน: ${tracking.vaccine_schedules?.vaccine_name}
📊 โดสที่: ${tracking.current_dose}/${tracking.total_doses}
📅 วันนัด: ${tracking.next_dose_due ? new Date(tracking.next_dose_due).toLocaleDateString('th-TH') : 'ยังไม่กำหนด'}

กรุณามาตรงเวลา
หากมีข้อสงสัยสามารถติดต่อเจ้าหน้าที่ได้`;

  await sendLineMessage(patientId, message);

  // Log the notification
  await supabase
    .from('appointment_notifications')
    .insert({
      sent_to: patientId,
      notification_type: 'manual_reminder',
      message_content: message,
      status: 'sent',
      line_user_id: patientId
    });

  return new Response(
    JSON.stringify({ success: true, message: 'Reminder sent successfully' }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function checkOverdueAppointments(supabase: any) {
  console.log('Checking overdue appointments...');

  const today = new Date().toISOString().split('T')[0];

  // Find patients with overdue next doses
  const { data: overdueTracking, error } = await supabase
    .from('patient_vaccine_tracking')
    .select(`
      *,
      vaccine_schedules (vaccine_name)
    `)
    .lt('next_dose_due', today)
    .eq('completion_status', 'in_progress');

  if (error) {
    console.error('Error fetching overdue tracking:', error);
    throw error;
  }

  let updatedCount = 0;

  for (const tracking of overdueTracking || []) {
    // Update status to overdue
    await supabase
      .from('patient_vaccine_tracking')
      .update({ completion_status: 'overdue' })
      .eq('id', tracking.id);

    // Send overdue notification
    const overdueMessage = `⚠️ การฉีดวัคซีนเกินกำหนด

คุณ ${tracking.patient_name}

การนัดฉีดวัคซีนของคุณเกินกำหนดแล้ว:
💉 วัคซีน: ${tracking.vaccine_schedules?.vaccine_name}
📊 โดสที่: ${tracking.current_dose}/${tracking.total_doses}
📅 วันที่นัด: ${new Date(tracking.next_dose_due).toLocaleDateString('th-TH')}

กรุณาติดต่อเจ้าหน้าที่เพื่อนัดหมายใหม่`;

    try {
      await sendLineMessage(tracking.patient_id, overdueMessage);
      
      // Log overdue notification
      await supabase
        .from('appointment_notifications')
        .insert({
          sent_to: tracking.patient_id,
          notification_type: 'overdue',
          message_content: overdueMessage,
          status: 'sent',
          line_user_id: tracking.patient_id
        });

      updatedCount++;
    } catch (error) {
      console.error(`Failed to send overdue notification to ${tracking.patient_id}:`, error);
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      overdue_count: overdueTracking?.length || 0,
      notifications_sent: updatedCount
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function scheduleNextDose(trackingId: string, supabase: any) {
  console.log(`Scheduling next dose for tracking ${trackingId}`);

  // Get tracking record
  const { data: tracking, error: trackingError } = await supabase
    .from('patient_vaccine_tracking')
    .select(`
      *,
      vaccine_schedules (*)
    `)
    .eq('id', trackingId)
    .single();

  if (trackingError) {
    console.error('Error fetching tracking:', trackingError);
    throw trackingError;
  }

  if (!tracking) {
    throw new Error('Tracking record not found');
  }

  // Check if already completed
  if (tracking.current_dose >= tracking.total_doses) {
    await supabase
      .from('patient_vaccine_tracking')
      .update({ completion_status: 'completed' })
      .eq('id', trackingId);

    return new Response(
      JSON.stringify({ success: true, message: 'Vaccine series completed' }),
      { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
    );
  }

  // Calculate next dose date using the authoritative standard:
  // dose_intervals stores ABSOLUTE day offsets from the first dose.
  const schedule = tracking.vaccine_schedules;
  const intervals = Array.isArray(schedule.dose_intervals)
    ? schedule.dose_intervals
    : JSON.parse(schedule.dose_intervals ?? '[]');

  // current_dose is the number of completed doses. The next dose uses index current_dose - 1.
  const offsetIndex = tracking.current_dose - 1;
  const daysFromFirstDose = Number(intervals[offsetIndex]);

  if (!Number.isFinite(daysFromFirstDose) || daysFromFirstDose <= 0) {
    throw new Error(`Invalid dose_intervals offset for dose ${tracking.current_dose + 1}`);
  }

  // Always anchor follow-up dates to the earliest completed dose for this patient/vaccine.
  const { data: firstDose, error: firstDoseError } = await supabase
    .from('appointments')
    .select('appointment_date')
    .or(`patient_id_number.eq.${tracking.patient_id},line_user_id.eq.${tracking.line_user_id || tracking.patient_id}`)
    .eq('vaccine_type', schedule.vaccine_type)
    .eq('status', 'completed')
    .order('appointment_date', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (firstDoseError) {
    throw firstDoseError;
  }

  const firstDoseDate = firstDose?.appointment_date || tracking.last_dose_date;
  if (!firstDoseDate) {
    throw new Error('First dose date not found');
  }

  const nextDoseDate = new Date(firstDoseDate);
  nextDoseDate.setDate(nextDoseDate.getDate() + daysFromFirstDose);

  // Update tracking record
  await supabase
    .from('patient_vaccine_tracking')
    .update({
      current_dose: tracking.current_dose + 1,
      last_dose_date: new Date().toISOString().split('T')[0],
      next_dose_due: nextDoseDate.toISOString().split('T')[0],
      completion_status: tracking.current_dose + 1 >= tracking.total_doses ? 'completed' : 'in_progress'
    })
    .eq('id', trackingId);

  // Schedule reminder for next dose (if not completed)
  if (tracking.current_dose + 1 < tracking.total_doses) {
    const reminderDate = new Date(nextDoseDate);
    reminderDate.setDate(reminderDate.getDate() - tracking.reminder_days_before);

    const reminderMessage = `🔔 แจ้งเตือนการฉีดวัคซีน

คุณ ${tracking.patient_name}

พรุ่งนี้ (${nextDoseDate.toLocaleDateString('th-TH')}) คุณมีนัดฉีดวัคซีน:
💉 วัคซีน: ${schedule.vaccine_name}
📊 โดสที่: ${tracking.current_dose + 1}/${tracking.total_doses}

กรุณามาตรงเวลา`;

    await supabase
      .from('notification_schedules')
      .insert({
        patient_tracking_id: trackingId,
        notification_type: 'reminder',
        scheduled_date: reminderDate.toISOString().split('T')[0],
        message_content: reminderMessage,
        line_user_id: tracking.patient_id,
        sent: false
      });
  }

  // Send confirmation message
  const confirmationMessage = `✅ บันทึกการฉีดวัคซีนเรียบร้อย

คุณ ${tracking.patient_name}

ได้รับวัคซีน: ${schedule.vaccine_name}
โดสที่: ${tracking.current_dose}/${tracking.total_doses}

${tracking.current_dose + 1 < tracking.total_doses 
  ? `📅 นัดครั้งถัดไป: ${nextDoseDate.toLocaleDateString('th-TH')}`
  : '🎉 ฉีดวัคซีนครบตามโปรแกรมแล้ว'
}`;

  await sendLineMessage(tracking.patient_id, confirmationMessage);

  return new Response(
    JSON.stringify({
      success: true,
      message: 'Next dose scheduled successfully',
      next_dose_date: nextDoseDate.toISOString().split('T')[0],
      completed: tracking.current_dose + 1 >= tracking.total_doses
    }),
    { headers: { 'Content-Type': 'application/json', ...corsHeaders } }
  );
}

async function sendLineMessage(userId: string, message: string) {
  console.log(`Sending LINE message to ${userId}`);

  const response = await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${lineAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      to: userId,
      messages: [{
        type: "flex",
        altText: message,
        contents: {
          type: "bubble",
          body: {
            type: "box",
            layout: "vertical",
            contents: [
              {
                type: "box",
                layout: "horizontal",
                contents: [
                  {
                    type: "image",
                    url: "https://cdn-icons-png.flaticon.com/512/3063/3063822.png",
                    size: "40px",
                    aspectRatio: "1:1",
                    aspectMode: "cover",
                    flex: 0
                  },
                  {
                    type: "box",
                    layout: "vertical",
                    contents: [
                      {
                        type: "text",
                        text: "โรงพยาบาลโฮม",
                        weight: "bold",
                        size: "lg",
                        color: "#1E40AF"
                      },
                      {
                        type: "text",
                        text: "แจ้งเตือนระบบ",
                        size: "xs",
                        color: "#6B7280"
                      }
                    ],
                    flex: 1,
                    paddingStart: "md"
                  }
                ],
                paddingBottom: "md"
              },
              {
                type: "separator",
                margin: "md"
              },
              {
                type: "text",
                text: message,
                wrap: true,
                size: "md",
                color: "#374151",
                margin: "lg"
              }
            ],
            paddingAll: "lg"
          },
          styles: {
            body: {
              backgroundColor: "#F8FAFC"
            }
          }
        }
      }]
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('LINE API error:', errorText);
    throw new Error(`Failed to send LINE message: ${response.status} ${errorText}`);
  }

  console.log('LINE message sent successfully');
}

function generateReminderMessage(notification: any) {
  const tracking = notification.patient_vaccine_tracking;
  const vaccineName = tracking?.vaccine_schedules?.vaccine_name || 'ไม่ทราบ';
  const patientName = tracking?.patient_name || 'ผู้ป่วย';

  return `🔔 แจ้งเตือนการฉีดวัคซีน

สวัสดีคุณ ${patientName}

พรุ่งนี้คุณมีนัดฉีดวัคซีน:
💉 วัคซีน: ${vaccineName}
📅 วันที่: ${new Date(notification.scheduled_date).toLocaleDateString('th-TH')}

กรุณามาตรงเวลา
หากมีข้อสงสัยสามารถติดต่อเจ้าหน้าที่ได้`;
}

serve(handler);