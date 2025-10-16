import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LineMessageRequest {
  userId: string;
  message: string;
  type?: 'text' | 'template';
  templateData?: any;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    
    if (!supabaseUrl || !supabaseAnonKey) {
      throw new Error("Supabase configuration not found");
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey);

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
    const { data: { user }, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(
        JSON.stringify({ error: "Invalid authentication" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is healthcare staff
    const { data: isStaff, error: roleError } = await supabase.rpc("is_healthcare_staff", { _user_id: user.id });
    if (roleError || !isStaff) {
      console.error("Role check error:", roleError);
      return new Response(
        JSON.stringify({ error: "Access denied: Healthcare staff role required" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { userId, message, type = 'text', templateData }: LineMessageRequest = await req.json();
    
    // Basic input validation
    if (!userId || !message || message.length > 2000) {
      throw new Error("Invalid input: userId and message (max 2000 chars) required");
    }
    
    const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    if (!channelAccessToken) {
      throw new Error("LINE Channel Access Token not configured");
    }

    // Helper function to convert vaccine type to Thai name
    function getVaccineNameThai(vaccineType: string): string {
      const vaccineMap: { [key: string]: string } = {
        'flu': 'วัคซีนไข้หวัดใหญ่',
        'hep_b': 'วัคซีนไวรัสตับอักเสบบี',
        'hep_a': 'วัคซีนไวรัสตับอักเสบเอ',
        'hpv': 'วัคซีน HPV',
        'tetanus': 'วัคซีนบาดทะยัก',
        'rabies': 'วัคซีนพิษสุนัขบ้า',
        'pneumonia': 'วัคซีนปอดบวม',
        'covid19': 'วัคซีน COVID-19'
      };
      return vaccineMap[vaccineType] || vaccineType;
    }

    // ========== URI Sanitization Helpers ==========
    function normalizeLiff(uri: string) {
      const m = (uri ?? '').toString().trim().match(/^(?:line|liff):\/\/app\/([A-Za-z0-9._-]+)/);
      return m ? `https://liff.line.me/${m[1]}` : uri;
    }

    function absolutize(uri: string, base?: string) {
      if (uri && uri.startsWith('/') && base) return new URL(uri, base).toString();
      return uri;
    }

    function isAllowedScheme(u: URL) {
      return ['http:', 'https:', 'tel:', 'mailto:', 'line:'].includes(u.protocol);
    }

    function sanitizeUri(raw: string, base?: string): string {
      const trimmed = (raw ?? '').toString().trim();
      if (!trimmed) throw new Error('Invalid action URI: empty string');
      const fixed = encodeURI(absolutize(normalizeLiff(trimmed), base));
      let u: URL;
      try { u = new URL(fixed); } catch { throw new Error(`Invalid action URI: ${raw}`); }
      if (!isAllowedScheme(u)) throw new Error(`Invalid action URI scheme: ${u.protocol}`);
      return u.toString();
    }

    function walkAndFixActions(obj: any, base?: string): any {
      if (Array.isArray(obj)) return obj.map(x => walkAndFixActions(x, base));
      if (obj && typeof obj === 'object') {
        if (obj.type === 'uri') {
          if (!obj.uri && obj.url) obj.uri = obj.url;        // fix legacy key
          if (typeof obj.uri === 'string') obj.uri = sanitizeUri(obj.uri, base);
          if (obj.altUri?.desktop) obj.altUri.desktop = sanitizeUri(obj.altUri.desktop, base);
        }
        for (const k of Object.keys(obj)) obj[k] = walkAndFixActions(obj[k], base);
      }
      return obj;
    }

    function listInvalidUris(obj: any): string[] {
      const bad: string[] = [];
      const visit = (x: any, path = 'messages') => {
        if (Array.isArray(x)) { x.forEach((v, i) => visit(v, `${path}[${i}]`)); return; }
        if (x && typeof x === 'object') {
          if (x.type === 'uri') {
            const value = x.uri ?? x.url;
            try { new URL(String(value)); } catch { bad.push(`${path}.action.uri=${value}`); }
          }
          for (const k of Object.keys(x)) visit(x[k], `${path}.${k}`);
        }
      };
      visit(obj);
      return bad;
    }
    // ========== End URI Sanitization Helpers ==========

    let messageBody;

    if (type === 'template' && templateData) {
      // Simple template message
      const appointmentText = `🏥 โรงพยาบาลโฮม
🔔 แจ้งเตือนการนัดหมายฉีดวัคซีน

สวัสดีคุณ ${templateData.patientName || "ไม่ระบุ"}

📅 วันที่นัด: ${new Date(templateData.appointmentDate).toLocaleDateString('th-TH')}
⏰ เวลา: ${templateData.appointmentTime || "09:00 น."}
💉 วัคซีน: ${getVaccineNameThai(templateData.vaccineType)}
🏥 สถานที่: โรงพยาบาลโฮม

📞 ติดต่อ: 038-511-123`;

      messageBody = {
        to: userId,
        messages: [{
          type: "text",
          text: appointmentText
        }]
      };
    } else {
      // Simple text message
      messageBody = {
        to: userId,
        messages: [{
          type: "text",
          text: `🏥 โรงพยาบาลโฮม\n\n${message}\n\n📞 ติดต่อ: 038-511-123`
        }]
      };
    }

    console.log('[LINE] Sending message to:', userId);

    // Get base URL for relative path resolution
    const BASE = Deno.env.get('PUBLIC_BASE_URL') ?? Deno.env.get('SITE_URL') ?? undefined;

    // Check for suspicious URIs before sanitization
    const messages = messageBody.messages;
    const suspicious = listInvalidUris(messages);
    if (suspicious.length) console.warn('[LINE] suspicious URIs:', suspicious);

    // Log BEFORE sanitization
    console.log('[LINE] messages[0] BEFORE:', JSON.stringify(messages?.[0], null, 2));

    // Sanitize all action URIs
    let safeMessages;
    try {
      safeMessages = walkAndFixActions(messages, BASE);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error('[LINE] URI Sanitization Failed:', msg);
      return new Response(
        JSON.stringify({
          error: 'Invalid action URI',
          message: msg,
          base: BASE,
          suspicious
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Log AFTER sanitization
    console.log('[LINE] messages[0] AFTER :', JSON.stringify(safeMessages?.[0], null, 2));

    // Send to LINE API with sanitized messages
    const sanitizedBody = { ...messageBody, messages: safeMessages };
    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify(sanitizedBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[LINE] API Error:', response.status, errorText);
      throw new Error(`LINE API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('[LINE] Message sent successfully:', result);

    return new Response(
      JSON.stringify({
        success: true,
        message: "LINE message sent successfully",
        result
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error: any) {
    console.error("Error in send-line-message function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});