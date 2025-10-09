import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface RegistrationRequest {
  action: string;
  patientName: string;
  phoneNumber: string;
  lineUserId?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Parse request body
    const body: RegistrationRequest = await req.json()
    
    // Validate required fields
    if (!body.patientName || !body.phoneNumber) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'กรุณากรอกชื่อและเบอร์โทรศัพท์' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Normalize phone number
    const normalizePhone = (phone: string) => {
      const digits = phone.replace(/[^0-9]/g, '')
      if (digits.startsWith('66')) return '0' + digits.slice(2)
      return digits
    }

    const normalizedPhone = normalizePhone(body.phoneNumber)
    
    // Validate Thai mobile number
    if (!/^0[689][0-9]{8}$/.test(normalizedPhone)) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'เบอร์โทรศัพท์ไม่ถูกต้อง กรุณาใช้เบอร์มือถือไทย' 
        }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Generate unique registration ID
    const registrationId = `REG-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`

    // Check if patient already exists
    const { data: existingPatient } = await supabase
      .from('patient_registrations')
      .select('id, full_name, phone')
      .eq('phone', normalizedPhone)
      .single()

    if (existingPatient) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: `เบอร์โทรศัพท์นี้ได้ลงทะเบียนแล้วในชื่อ "${existingPatient.full_name}" หากต้องการแก้ไขข้อมูล กรุณาติดต่อเจ้าหน้าที่` 
        }),
        { 
          status: 409, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Create patient registration
    const { data: newPatient, error: insertError } = await supabase
      .from('patient_registrations')
      .insert([{
        registration_id: registrationId,
        full_name: body.patientName.trim(),
        phone: normalizedPhone,
        hospital: 'โรงพยาบาลโฮม',
        source: 'line_liff',
        line_user_id: body.lineUserId || null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }])
      .select()
      .single()

    if (insertError) {
      console.error('Database insert error:', insertError)
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'เกิดข้อผิดพลาดในการบันทึกข้อมูล กรุณาลองใหม่อีกครั้ง' 
        }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      )
    }

    // Send LINE notification if LINE User ID is provided
    if (body.lineUserId) {
      try {
        await supabase
          .from('line_notifications')
          .insert([{
            line_user_id: body.lineUserId,
            message_type: 'registration_success',
            message_text: `✅ ลงทะเบียนสำเร็จ\n\nชื่อ: ${body.patientName}\nเบอร์: ${normalizedPhone}\nรหัสลงทะเบียน: ${registrationId}\n\nเจ้าหน้าที่จะติดต่อกลับเพื่อนัดหมายภายใน 24 ชม.\n\n📍 โรงพยาบาลโฮม`,
            template_data: JSON.stringify({
              patientName: body.patientName,
              phoneNumber: normalizedPhone,
              registrationId: registrationId,
              hospital: 'โรงพยาบาลโฮม'
            }),
            status: 'pending',
            created_at: new Date().toISOString()
          }])
      } catch (notificationError) {
        console.error('LINE notification error:', notificationError)
        // Don't fail the registration if notification fails
      }
    }

    // Log successful registration
    console.log(`New patient registration: ${registrationId} - ${body.patientName} (${normalizedPhone})`)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'ลงทะเบียนสำเร็จ เจ้าหน้าที่จะติดต่อกลับเพื่อนัดหมายภายใน 24 ชม.',
        data: {
          registrationId: registrationId,
          patientName: body.patientName,
          phoneNumber: normalizedPhone
        }
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Registration error:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        message: 'เกิดข้อผิดพลาดในระบบ กรุณาลองใหม่อีกครั้ง' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})