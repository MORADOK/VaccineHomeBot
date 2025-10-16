// supabase/functions/send-line-message/index.ts
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.54.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface LineMessageRequest {
  userId: string;                        // LINE userId (Uxxxxxxxx...)
  message: string;                       // ข้อความหลัก
  type?: "text" | "template";            // ใช้ข้อความล้วน หรือ template-text ง่ายๆ
  templateData?: any;                    // data สำหรับข้อความแจ้งนัด (ถ้า type=template)
}

// ---------- URI Sanitization (ครอบคลุม uri/linkUri/altUri/defaultAction/quickReply) ----------
function normalizeLiff(uri: string) {
  const m = (uri ?? "").toString().trim().match(/^(?:line|liff):\/\/app\/([A-Za-z0-9._-]+)/);
  return m ? `https://liff.line.me/${m[1]}` : uri;
}
function absolutize(uri: string, base?: string) {
  if (uri && uri.startsWith("/") && base) return new URL(uri, base).toString();
  return uri;
}
function isAllowedScheme(u: URL) {
  return ["http:", "https:", "line:", "tel:"].includes(u.protocol);
}
function sanitizeUri(raw: string, base?: string): string {
  const trimmed = (raw ?? "").toString().trim();
  if (!trimmed) throw new Error("Invalid action URI: empty string");
  // tel:// → tel:
  const telFixed = trimmed.replace(/^tel:\/\/+/i, "tel:");
  const fixed = encodeURI(absolutize(normalizeLiff(telFixed), base));
  let u: URL;
  try { u = new URL(fixed); } catch { throw new Error(`Invalid action URI: ${raw}`); }
  if (!isAllowedScheme(u)) throw new Error(`Invalid action URI scheme: ${u.protocol}`);
  return u.toString();
}

/**
 * เดินทุกคีย์ใน payload แล้วซ่อม:
 * - action type: 'uri' ที่ใช้ 'uri' (ทั่วไป) หรือ 'linkUri' (imagemap)
 * - รองรับ legacy 'url' -> 'uri'
 * - ซ่อม altUri.desktop, defaultAction, quickReply.items[].action, flex/template/imagemap
 */
function walkAndFixActions(obj: any, base?: string): any {
  if (Array.isArray(obj)) return obj.map((x) => walkAndFixActions(x, base));
  if (obj && typeof obj === "object") {
    // 1) ตัว action เอง
    if (obj.type === "uri") {
      if (typeof obj.linkUri === "string") obj.linkUri = sanitizeUri(obj.linkUri, base); // imagemap
      if (!obj.uri && obj.url) obj.uri = obj.url; // legacy
      if (typeof obj.uri === "string") obj.uri = sanitizeUri(obj.uri, base);
      if (obj.altUri?.desktop) obj.altUri.desktop = sanitizeUri(obj.altUri.desktop, base);
    }
    // 2) จุดที่ action ซ่อนอยู่
    if (obj.defaultAction && typeof obj.defaultAction === "object") {
      obj.defaultAction = walkAndFixActions(obj.defaultAction, base);
    }
    if (obj.action && typeof obj.action === "object") {
      obj.action = walkAndFixActions(obj.action, base);
    }
    if (obj.quickReply?.items && Array.isArray(obj.quickReply.items)) {
      obj.quickReply.items = obj.quickReply.items.map((it: any) => walkAndFixActions(it, base));
    }
    // 3) ลงไปทุกคีย์อื่น (ยกเว้นที่จัดการไปแล้ว)
    for (const k of Object.keys(obj)) {
      if (k === "defaultAction" || k === "action" || k === "quickReply") continue;
      obj[k] = walkAndFixActions(obj[k], base);
    }
  }
  return obj;
}

/** รวม URI น่าสงสัย (ทั้ง uri/linkUri/url/altUri.desktop) ไว้ debug/error */
function listInvalidUris(obj: any): string[] {
  const bad: string[] = [];
  const visit = (x: any, path = "messages") => {
    if (Array.isArray(x)) { x.forEach((v, i) => visit(v, `${path}[${i}]`)); return; }
    if (x && typeof x === "object") {
      if (x.type === "uri") {
        const candidates: Array<[string, unknown]> = [
          ["uri", x.uri],
          ["linkUri", x.linkUri],
          ["url", x.url],
          ["altUri.desktop", x?.altUri?.desktop],
        ];
        for (const [name, val] of candidates) {
          if (typeof val === "string") {
            try { new URL(val); } catch { bad.push(`${path}(${name})=${val}`); }
          }
        }
      }
      if (x.defaultAction) visit(x.defaultAction, `${path}.defaultAction`);
      if (x.action) visit(x.action, `${path}.action`);
      if (x.quickReply?.items) visit(x.quickReply.items, `${path}.quickReply.items`);
      for (const k of Object.keys(x)) visit(x[k], `${path}.${k}`);
    }
  };
  visit(obj);
  return bad;
}

/** Redact PII from logs (message text) */
function redact(obj: any): string {
  return JSON.stringify(obj, (k, v) => k === 'text' ? '[redacted]' : v, 2);
}

/** Optional: Strip bad URI actions instead of failing entire request */
function stripBadUriActions(obj: any): any {
  if (Array.isArray(obj)) return obj.map(stripBadUriActions);
  if (obj && typeof obj === 'object') {
    if (obj.type === 'uri') {
      try {
        new URL(obj.uri ?? obj.linkUri ?? obj.url);
      } catch {
        // Replace bad action with placeholder text
        return { type: 'text', text: '(ลิงก์ไม่ถูกต้อง ถูกตัดออกชั่วคราว)' };
      }
    }
    for (const k of Object.keys(obj)) obj[k] = stripBadUriActions(obj[k]);
  }
  return obj;
}
// ---------------------------------------------------------------------------------------------

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // ENV
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const channelAccessToken = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");
    const BASE = Deno.env.get("PUBLIC_BASE_URL") ?? Deno.env.get("SITE_URL") ?? undefined;

    if (!supabaseUrl || !supabaseAnonKey) {
      return new Response(JSON.stringify({ error: "Supabase configuration not found" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!channelAccessToken) {
      return new Response(JSON.stringify({ error: "LINE Channel Access Token not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // JWT (Bearer)
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Authorization header required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.split(" ")[1];

    // Supabase clients
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    const supabaseAuthed = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });

    // Validate user
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(jwt);
    if (authError || !user) {
      console.error("Authentication error:", authError);
      return new Response(JSON.stringify({ error: "Invalid authentication" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check role (must be healthcare staff)
    const { data: isStaff, error: roleError } = await supabaseAuthed.rpc("is_healthcare_staff", { _user_id: user.id });
    if (roleError || !isStaff) {
      console.error("Role check error:", roleError);
      return new Response(JSON.stringify({ error: "Access denied: Healthcare staff role required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse body
    const { userId, message, type = "text", templateData }: LineMessageRequest = await req.json();

    // Basic validation
    if (!userId || typeof userId !== "string" || !/^U[0-9a-f]{32}$/i.test(userId)) {
      return new Response(JSON.stringify({ error: "Invalid LINE userId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!message || typeof message !== "string" || message.length > 2000) {
      return new Response(JSON.stringify({ error: "Invalid message (1..2000 chars required)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build messages (ตัวอย่างเน้นข้อความล้วน; sanitizer จะทำงานแม้มี action แทรก)
    let messageBody: any;

    if (type === "template" && templateData) {
      // ข้อความแจ้งนัดแบบง่าย
      const getVaccineNameThai = (v: string) => ({
        flu: "วัคซีนไข้หวัดใหญ่",
        hep_b: "วัคซีนไวรัสตับอักเสบบี",
        hep_a: "วัคซีนไวรัสตับอักเสบเอ",
        hpv: "วัคซีน HPV",
        tetanus: "วัคซีนบาดทะยัก",
        rabies: "วัคซีนพิษสุนัขบ้า",
        pneumonia: "วัคซีนปอดบวม",
        covid19: "วัคซีน COVID-19",
      } as Record<string, string>)[v] || v;

      const appointmentText =
        `🏥 โรงพยาบาลโฮม\n` +
        `🔔 แจ้งเตือนการนัดหมายฉีดวัคซีน\n\n` +
        `สวัสดีคุณ ${templateData.patientName || "ไม่ระบุ"}\n\n` +
        `📅 วันที่นัด: ${new Date(templateData.appointmentDate).toLocaleDateString("th-TH")}\n` +
        `⏰ เวลา: ${templateData.appointmentTime || "09:00 น."}\n` +
        `💉 วัคซีน: ${getVaccineNameThai(templateData.vaccineType)}\n` +
        `🏥 สถานที่: โรงพยาบาลโฮม\n\n` +
        `📞 ติดต่อ: 038-511-123`;

      messageBody = {
        to: userId,
        messages: [{ type: "text", text: appointmentText }],
      };
    } else {
      // ข้อความล้วน
      messageBody = {
        to: userId,
        messages: [{ type: "text", text: `🏥 โรงพยาบาลโฮม\n\n${message}\n\n📞 ติดต่อ: 038-511-123` }],
      };
    }

    // --- Sanitize & Debug ---
    const messages = messageBody.messages;
    const suspicious = listInvalidUris(messages);
    if (suspicious.length) console.warn("[LINE] suspicious URIs:", suspicious);

    // Log with PII redaction
    console.log("[LINE] messages[0] BEFORE:", redact(messages?.[0]));

    let safeMessages;
    try {
      safeMessages = walkAndFixActions(messages, BASE);
      // Optional fallback: uncomment to strip bad actions instead of failing
      // safeMessages = stripBadUriActions(safeMessages);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("[LINE] URI Sanitization Failed:", msg);
      return new Response(JSON.stringify({
        error: "Invalid action URI",
        message: msg,
        base: BASE ?? null,
        suspicious,
      }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Log with PII redaction
    console.log("[LINE] messages[0] AFTER :", redact(safeMessages?.[0]));

    const sanitizedBody = { ...messageBody, messages: safeMessages };

    // --- Send to LINE (push) ---
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${channelAccessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(sanitizedBody),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error("[LINE] API Error:", res.status, errorText);
      throw new Error(`LINE API Error: ${res.status} - ${errorText}`);
    }

    // Success
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error: any) {
    console.error("Error in send-line-message function:", error);
    return new Response(JSON.stringify({ success: false, error: String(error?.message || error) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
