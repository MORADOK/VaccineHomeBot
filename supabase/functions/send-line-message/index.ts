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

    let messageBody;

    if (type === 'template' && templateData) {
      // Template message for appointment notifications
      messageBody = {
        to: userId,
        messages: [{
          type: "template",
          altText: message,
          template: {
            type: "buttons",
            thumbnailImageUrl: "https://9c116328-942e-4c36-bc79-61f41d6414de.lovableproject.com/lovable-uploads/1b8e7853-1bde-4b32-b01d-6dad1be1008c.png",
            imageAspectRatio: "rectangle",
            imageSize: "cover",
            imageBackgroundColor: "#FFFFFF",
            title: "โรงพยาบาลโฮม",
            text: message,
            actions: [
              {
                type: "uri",
                label: "ดูรายละเอียด",
                uri: "https://9c116328-942e-4c36-bc79-61f41d6414de.lovableproject.com"
              },
              {
                type: "uri", 
                label: "แผนที่โรงพยาบาล",
                uri: "https://maps.google.com/?q=โรงพยาบาลโฮม"
              }
            ]
          }
        }]
      };
    } else {
      // Simple text message
      messageBody = {
        to: userId,
        messages: [{
          type: "text",
          text: message
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