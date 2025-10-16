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

  // Get public base URL for converting relative paths to absolute
  const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://moradok.github.io/VaccineHomeBot";
  console.log('[ENV] PUBLIC_BASE_URL:', publicBaseUrl);

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
  // Convert LINE/LIFF app URLs to https://liff.line.me format
  function normalizeLiff(uri: string): string {
    // line://app/XXXX หรือ liff://app/XXXX -> https://liff.line.me/XXXX
    const m = uri.match(/^(?:line|liff):\/\/app\/([A-Za-z0-9._-]+)/);
    return m ? `https://liff.line.me/${m[1]}` : uri;
  }

  // Convert relative paths to absolute URLs using base
  function absolutize(uri: string, base?: string): string {
    // ถ้าเป็น path เริ่มด้วย "/" และมี base ให้รวมเป็น absolute
    if (uri.startsWith('/') && base) {
      try {
        return new URL(uri, base).toString();
      } catch {
        return uri;
      }
    }
    return uri;
  }

  // Check if URL scheme is allowed by LINE API
  function isAllowedScheme(u: URL): boolean {
    return ['http:', 'https:', 'tel:', 'mailto:', 'line:'].includes(u.protocol);
  }

  // Sanitize and validate URI for LINE API
  function sanitizeUri(raw: string, base?: string): string {
    const trimmed = (raw ?? '').toString().trim();
    if (!trimmed) {
      throw new Error('Invalid action URI: empty string');
    }

    // Apply transformations: LIFF normalization -> absolutize -> encode
    const normalized = normalizeLiff(trimmed);
    const absolute = absolutize(normalized, base);
    const encoded = encodeURI(absolute);

    let u: URL;
    try {
      u = new URL(encoded);
    } catch (e) {
      throw new Error(`Invalid action URI: ${raw} (reason: ${e instanceof Error ? e.message : String(e)})`);
    }

    if (!isAllowedScheme(u)) {
      throw new Error(`Invalid action URI scheme: ${u.protocol} (only http, https, tel, mailto, line are allowed)`);
    }

    return u.toString();
  }

  // Recursively walk message payload and sanitize all action URIs
  function walkAndFixActions(obj: any, base?: string): any {
    if (Array.isArray(obj)) {
      return obj.map(x => walkAndFixActions(x, base));
    }

    if (obj && typeof obj === 'object') {
      // Fix action.uri
      if (obj.type === 'uri' && typeof obj.uri === 'string') {
        try {
          obj.uri = sanitizeUri(obj.uri, base);

          // Fix altUri.desktop if exists
          if (obj.altUri?.desktop && typeof obj.altUri.desktop === 'string') {
            obj.altUri.desktop = sanitizeUri(obj.altUri.desktop, base);
          }
        } catch (e) {
          console.error('[URI Sanitization Error]', e instanceof Error ? e.message : String(e));
          throw e;
        }
      }

      // Recursively process all object properties
      for (const k of Object.keys(obj)) {
        obj[k] = walkAndFixActions(obj[k], base);
      }
    }

    return obj;
  }
  // ========== End URI Sanitization Helpers ==========

    let messageBody;

    if (type === 'template' && templateData) {
      // Modern Rich Message matching auto-notification style
      messageBody = {
        to: userId,
        messages: [{
          type: "flex",
          altText: `🏥 แจ้งเตือนการนัดฉีดวัคซีน - คุณ${templateData.patientName}`,
          contents: {
            type: "bubble",
            size: "kilo",
            header: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "image",
                      url: "https://moradok.github.io/VaccineHomeBot/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png",
                      flex: 0,
                      size: "sm",
                      aspectRatio: "1:1",
                      aspectMode: "cover"
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
                          color: "#1DB446"
                        },
                        {
                          type: "text",
                          text: "VCHome Hospital",
                          size: "sm",
                          color: "#666666"
                        }
                      ],
                      flex: 1,
                      margin: "md"
                    }
                  ]
                }
              ],
              backgroundColor: "#F8F9FA",
              paddingAll: "lg"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "🔔 แจ้งเตือนการนัดหมายฉีดวัคซีน",
                  weight: "bold",
                  size: "lg",
                  color: "#1DB446",
                  margin: "none"
                },
                {
                  type: "separator",
                  margin: "md"
                },
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: `สวัสดีคุณ ${templateData.patientName || "ไม่ระบุ"}`,
                      size: "md",
                      color: "#333333",
                      weight: "bold",
                      margin: "md"
                    },
                    {
                      type: "box",
                      layout: "vertical",
                      contents: [
                        {
                          type: "box",
                          layout: "horizontal",
                          contents: [
                            {
                              type: "text",
                              text: "📅",
                              size: "sm",
                              flex: 0
                            },
                            {
                              type: "text",
                              text: "วันที่นัด",
                              size: "sm",
                              color: "#666666",
                              flex: 2
                            },
                            {
                              type: "text",
                              text: new Date(templateData.appointmentDate).toLocaleDateString('th-TH'),
                              size: "sm",
                              color: "#333333",
                              weight: "bold",
                              flex: 3,
                              align: "end"
                            }
                          ],
                          margin: "md"
                        },
                        {
                          type: "box",
                          layout: "horizontal",
                          contents: [
                            {
                              type: "text",
                              text: "⏰",
                              size: "sm",
                              flex: 0
                            },
                            {
                              type: "text",
                              text: "เวลา",
                              size: "sm",
                              color: "#666666",
                              flex: 2
                            },
                            {
                              type: "text",
                              text: templateData.appointmentTime || "09:00 น.",
                              size: "sm",
                              color: "#333333",
                              weight: "bold",
                              flex: 3,
                              align: "end"
                            }
                          ],
                          margin: "sm"
                        },
                        {
                          type: "box",
                          layout: "horizontal",
                          contents: [
                            {
                              type: "text",
                              text: "💉",
                              size: "sm",
                              flex: 0
                            },
                            {
                              type: "text",
                              text: "วัคซีน",
                              size: "sm",
                              color: "#666666",
                              flex: 2
                            },
                            {
                              type: "text",
                              text: getVaccineNameThai(templateData.vaccineType),
                              size: "sm",
                              color: "#333333",
                              weight: "bold",
                              flex: 3,
                              align: "end",
                              wrap: true
                            }
                          ],
                          margin: "sm"
                        },
                        {
                          type: "box",
                          layout: "horizontal",
                          contents: [
                            {
                              type: "text",
                              text: "🏥",
                              size: "sm",
                              flex: 0
                            },
                            {
                              type: "text",
                              text: "สถานที่",
                              size: "sm",
                              color: "#666666",
                              flex: 2
                            },
                            {
                              type: "text",
                              text: "โรงพยาบาลโฮม",
                              size: "sm",
                              color: "#333333",
                              weight: "bold",
                              flex: 3,
                              align: "end"
                            }
                          ],
                          margin: "sm"
                        }
                      ],
                      backgroundColor: "#F8F9FA",
                      cornerRadius: "8px",
                      paddingAll: "md",
                      margin: "md"
                    }
                  ]
                }
              ],
              paddingAll: "lg"
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "separator",
                  margin: "none"
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        label: "📞 โทรติดต่อ",
                        uri: "tel:038-511-123"
                      },
                      style: "primary",
                      color: "#1DB446",
                      flex: 1
                    },
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        label: "📍 ดูแผนที่",
                        uri: "https://maps.google.com/?q=โรงพยาบาลโฮม"
                      },
                      style: "secondary",
                      flex: 1
                    }
                  ],
                  spacing: "sm",
                  margin: "md"
                },
                {
                  type: "text",
                  text: "⚠️ กรุณามาตามเวลานัดหมาย หากมีข้อสงสัยสามารถติดต่อ 038-511-123",
                  size: "xs",
                  color: "#666666",
                  wrap: true,
                  margin: "md",
                  align: "center"
                }
              ],
              paddingAll: "lg"
            }
          }
        }]
      };
    } else {
      // Enhanced Text Message with hospital branding
      messageBody = {
        to: userId,
        messages: [{
          type: "flex",
          altText: `🏥 ${message}`,
          contents: {
            type: "bubble",
            size: "kilo",
            header: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "image",
                      url: "https://moradok.github.io/VaccineHomeBot/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png",
                      flex: 0,
                      size: "sm",
                      aspectRatio: "1:1",
                      aspectMode: "cover"
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
                          color: "#1DB446"
                        },
                        {
                          type: "text",
                          text: "VCHome Hospital",
                          size: "sm",
                          color: "#666666"
                        }
                      ],
                      flex: 1,
                      margin: "md"
                    }
                  ]
                }
              ],
              backgroundColor: "#F8F9FA",
              paddingAll: "lg"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "text",
                  text: "📢 แจ้งเตือนจากโรงพยาบาล",
                  weight: "bold",
                  size: "lg",
                  color: "#1DB446",
                  margin: "none"
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
                  color: "#333333",
                  margin: "lg"
                }
              ],
              paddingAll: "lg"
            },
            footer: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "separator",
                  margin: "none"
                },
                {
                  type: "box",
                  layout: "horizontal",
                  contents: [
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        label: "📞 โทรติดต่อ",
                        uri: "tel:038-511-123"
                      },
                      style: "primary",
                      color: "#1DB446",
                      flex: 1
                    },
                    {
                      type: "button",
                      action: {
                        type: "uri",
                        label: "📍 ดูแผนที่",
                        uri: "https://maps.google.com/?q=โรงพยาบาลโฮม"
                      },
                      style: "secondary",
                      flex: 1
                    }
                  ],
                  spacing: "sm",
                  margin: "md"
                },
                {
                  type: "text",
                  text: "📞 ติดต่อสอบถาม: 038-511-123",
                  size: "xs",
                  color: "#666666",
                  wrap: true,
                  margin: "md",
                  align: "center"
                }
              ],
              paddingAll: "lg"
            }
          }
        }]
      };
    }

    console.log('[LINE] Sending message to:', userId);
    console.log('[LINE] Message body BEFORE sanitization:', JSON.stringify(messageBody.messages?.[0], null, 2));

    // Sanitize all action URIs in the message payload
    try {
      const sanitizedBody = walkAndFixActions(messageBody, publicBaseUrl);
      console.log('[LINE] Message body AFTER sanitization:', JSON.stringify(sanitizedBody.messages?.[0], null, 2));

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
    } catch (uriError: any) {
      // Handle URI validation errors separately with 400 status
      const errorMsg = uriError instanceof Error ? uriError.message : String(uriError);
      if (errorMsg.includes('Invalid action URI')) {
        console.error('[LINE] URI Validation Error:', errorMsg);
        return new Response(
          JSON.stringify({
            error: 'Invalid action URI',
            message: errorMsg,
            success: false
          }),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      // Re-throw other errors to be handled by outer catch
      throw uriError;
    }
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
