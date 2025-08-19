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

    let messageBody;

    if (type === 'template' && templateData) {
      // Modern Flex Message Card for appointment notifications
      messageBody = {
        to: userId,
        messages: [{
          type: "flex",
          altText: message,
          contents: {
            type: "bubble",
            hero: {
              type: "image",
              url: "https://9c116328-942e-4c36-bc79-61f41d6414de.lovableproject.com/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png",
              size: "full",
              aspectRatio: "20:13",
              aspectMode: "cover"
            },
            body: {
              type: "box",
              layout: "vertical",
              contents: [
                {
                  type: "box",
                  layout: "vertical",
                  contents: [
                    {
                      type: "text",
                      text: "โรงพยาบาลโฮม",
                      weight: "bold",
                      size: "xl",
                      color: "#1E40AF",
                      align: "center"
                    },
                    {
                      type: "text",
                      text: "การนัดหมายฉีดวัคซีน",
                      size: "md",
                      color: "#6B7280",
                      align: "center",
                      margin: "sm"
                    }
                  ],
                  paddingBottom: "lg"
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
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "👤",
                          color: "#1E40AF",
                          size: "sm",
                          flex: 1
                        },
                        {
                          type: "text",
                          text: templateData.patientName || "ไม่ระบุ",
                          wrap: true,
                          color: "#374151",
                          size: "sm",
                          flex: 4,
                          weight: "bold"
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "📅",
                          color: "#1E40AF",
                          size: "sm",
                          flex: 1
                        },
                        {
                          type: "text",
                          text: new Date(templateData.appointmentDate).toLocaleDateString('th-TH', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          }),
                          wrap: true,
                          color: "#374151",
                          size: "sm",
                          flex: 4,
                          weight: "bold"
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "⏰",
                          color: "#1E40AF",
                          size: "sm",
                          flex: 1
                        },
                        {
                          type: "text",
                          text: "09:00 น.",
                          wrap: true,
                          color: "#374151",
                          size: "sm",
                          flex: 4,
                          weight: "bold"
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "💉",
                          color: "#1E40AF",
                          size: "sm",
                          flex: 1
                        },
                        {
                          type: "text",
                          text: getVaccineNameThai(templateData.vaccineType),
                          wrap: true,
                          color: "#374151",
                          size: "sm",
                          flex: 4,
                          weight: "bold"
                        }
                      ]
                    },
                    {
                      type: "box",
                      layout: "baseline",
                      spacing: "sm",
                      contents: [
                        {
                          type: "text",
                          text: "🏥",
                          color: "#1E40AF",
                          size: "sm",
                          flex: 1
                        },
                        {
                          type: "text",
                          text: "รพ.โฮม",
                          wrap: true,
                          color: "#374151",
                          size: "sm",
                          flex: 4,
                          weight: "bold"
                        }
                      ]
                    }
                  ],
                  spacing: "md",
                  margin: "lg"
                }
              ]
            },
            footer: {
              type: "box",
              layout: "vertical",
              spacing: "sm",
              contents: [
                {
                  type: "button",
                  style: "primary",
                  height: "sm",
                  action: {
                    type: "uri",
                    label: "ดูรายละเอียด",
                    uri: "https://9c116328-942e-4c36-bc79-61f41d6414de.lovableproject.com"
                  },
                  color: "#1E40AF"
                },
                {
                  type: "button",
                  style: "secondary",
                  height: "sm",
                  action: {
                    type: "uri",
                    label: "แผนที่โรงพยาบาล",
                    uri: "https://maps.google.com/?q=โรงพยาบาลโฮม"
                  }
                },
                {
                  type: "spacer",
                  size: "sm"
                }
              ],
              flex: 0
            },
            styles: {
              footer: {
                separator: true
              }
            }
          }
        }]
      };
    } else {
      // Enhanced Text Message with better formatting
      messageBody = {
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
                      url: "https://9c116328-942e-4c36-bc79-61f41d6414de.lovableproject.com/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png",
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
      };
    }

    console.log('Sending LINE message to:', userId);
    console.log('Message body:', JSON.stringify(messageBody, null, 2));

    const response = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${channelAccessToken}`,
      },
      body: JSON.stringify(messageBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('LINE API Error:', response.status, errorText);
      throw new Error(`LINE API Error: ${response.status} - ${errorText}`);
    }

    const result = await response.json();
    console.log('LINE message sent successfully:', result);

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