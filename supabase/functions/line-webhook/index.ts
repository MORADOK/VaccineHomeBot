import { createClient } from "jsr:@supabase/supabase-js@2";

// ใช้ตัวที่แพลตฟอร์ม inject มาให้อยู่แล้ว (ไม่ต้องตั้งเอง)
const SUPABASE_URL = Deno.env.get("SUPABASE_URL"); 

// เปลี่ยนชื่อคีย์ Service Role เป็นชื่อของเราเอง (เช่น SERVICE_ROLE_KEY)
const SERVICE_ROLE = Deno.env.get("SERVICE_ROLE_KEY");

const LINE_CHANNEL_SECRET = Deno.env.get("LINE_CHANNEL_SECRET");
const LINE_CHANNEL_ACCESS_TOKEN = Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN");


function toBase64(buf: ArrayBuffer) {
  return btoa(String.fromCharCode(...new Uint8Array(buf)));
}
async function verifyLineSignature(rawBody: string, signatureHeader: string | null) {
  if (!signatureHeader || !LINE_CHANNEL_SECRET) return false;
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(LINE_CHANNEL_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false, ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(rawBody));
  return toBase64(sig) === signatureHeader;
}
function todayTH() {
  const d = new Date(new Date().toLocaleString("en-US",{ timeZone:"Asia/Bangkok"}));
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

  const raw = await req.text();

// ✅ ผ่าน verify URL ของ LINE (events ว่าง) โดยไม่ตรวจลายเซ็น
try {
  const probe = JSON.parse(raw);
  if (!Array.isArray(probe.events) || probe.events.length === 0) {
    return new Response("OK", { status: 200 });
  }
} catch {} // ถ้า parse ไม่ได้ ค่อยไปตรวจลายเซ็นตามปกติ

// จากนั้นค่อยตรวจลายเซ็นสำหรับอีเวนต์จริง
const ok = await verifyLineSignature(raw, req.headers.get("x-line-signature"));
if (!ok) {
  console.error("SIGNATURE_FAIL", {
    hasHeader: !!req.headers.get("x-line-signature"),
    bodyLen: raw.length,
    hasSecret: !!LINE_CHANNEL_SECRET,
  });
  return new Response("Invalid signature", { status: 401 });
}

  const body = JSON.parse(raw);

  // กรณีปุ่ม Verify ของ LINE (events ว่าง) => ตอบ 200 ทันที
  if (!Array.isArray(body.events) || body.events.length === 0) {
    return new Response("OK", { status: 200 });
  }

  // มี event จริงค่อยสร้าง client
  const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
  const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    console.error("Missing SUPABASE_URL or SERVICE_ROLE");
    return new Response("Server config error", { status: 500 });
  }
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE);
  const created_date_th = todayTH();

  const tasks = body.events.map(async (event: any) => {
    const userId: string | undefined = event?.source?.userId;
    if (!userId) return;

    // (ออปชัน) ดึงโปรไฟล์
    let displayName: string | undefined, pictureUrl: string | undefined;
    if (LINE_ACCESS_TOKEN) {
      try {
        const r = await fetch(`https://api.line.me/v2/bot/profile/${userId}`, {
          headers: { Authorization: `Bearer ${LINE_ACCESS_TOKEN}` }
        });
        if (r.ok) {
          const p = await r.json();
          displayName = p.displayName;
          pictureUrl = p.pictureUrl;
        }
      } catch {}
    }

    // upsert ผู้ใช้
    await supabase.from("line_users").upsert({
      line_user_id: userId, display_name: displayName, picture_url: pictureUrl
    });

    // upsert ลงทะเบียนรายวัน
    await supabase.from("patient_registrations").upsert(
      { line_user_id: userId, source: "line", created_date_th },
      { onConflict: "line_user_id,source,created_date_th" }
    );

    // ตัวอย่างตอบกลับเมื่อ follow
    if (event.type === "follow" && LINE_ACCESS_TOKEN) {
      await fetch("https://api.line.me/v2/bot/message/reply", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${LINE_ACCESS_TOKEN}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          replyToken: event.replyToken,
          messages: [{ type: "text", text: "ยินดีต้อนรับครับ! ลงทะเบียนสำเร็จแล้ว 🎉" }]
        })
      }).catch(() => {});
    }
  });

  // ให้ตอบไว ไม่ต้องรอ task จบ
  Promise.allSettled(tasks);
  return new Response("OK", { status: 200 });
});
