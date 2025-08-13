import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface PatientData {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lineId?: string;
}

interface AppointmentData {
  patientId: string;
  patientName: string;
  date: string;
  time: string;
  vaccine: string;
  hospital: string;
  notes?: string;
  notificationDate?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let requestData;
    try {
      requestData = await req.json();
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      throw new Error('Invalid JSON in request body');
    }
    
    const { action, data } = requestData;
    
    const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    if (!serviceAccountKey) {
      throw new Error("Google Service Account credentials not configured");
    }
    
    let serviceAccount;
    try {
      serviceAccount = JSON.parse(serviceAccountKey);
    } catch (parseError) {
      console.error('Service account parsing error:', parseError);
      throw new Error("Invalid Google Service Account JSON format");
    }
    
    if (!serviceAccount.client_email) {
      throw new Error("Google Service Account credentials not configured properly");
    }

    // Create JWT token for Google Sheets API authentication
    const jwtHeader = btoa(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const now = Math.floor(Date.now() / 1000);
    const jwtPayload = btoa(JSON.stringify({
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    }));

    // Note: In a real implementation, you'd need to sign this JWT with the private key
    // For now, we'll use the Google Sheets API with proper authentication

    const spreadsheetId = Deno.env.get("GOOGLE_SHEETS_ID");
    if (!spreadsheetId) {
      throw new Error("Google Sheets ID not configured");
    }

    switch (action) {
      case 'readPatients':
        // Read patient data from Google Sheets
        const patientsResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Patients!A:E`,
          {
            headers: {
              'Authorization': `Bearer ${await getAccessToken(serviceAccount)}`,
            },
          }
        );
        
        const patientsData = await patientsResponse.json();
        const patients: PatientData[] = patientsData.values?.slice(1).map((row: string[]) => ({
          id: row[0] || '',
          name: row[1] || '',
          phone: row[2] || '',
          email: row[3] || '',
          lineId: row[4] || '',
        })) || [];

        return new Response(JSON.stringify({ patients }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'saveAppointment':
        const appointment: AppointmentData = data;
        // Save appointment to Google Sheets
        const appointmentRow = [
          new Date().toISOString(),
          appointment.patientId,
          appointment.patientName,
          appointment.date,
          appointment.time,
          appointment.vaccine,
          appointment.hospital,
          appointment.notes || '',
          appointment.notificationDate || '',
        ];

        const appendResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Appointments:append?valueInputOption=RAW`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await getAccessToken(serviceAccount)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [appointmentRow],
            }),
          }
        );

        if (!appendResponse.ok) {
          throw new Error('Failed to save appointment');
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      case 'scheduleNotification':
        // Schedule notification reminder
        const { patientId, appointmentDate, notificationDate, message } = data;
        const notificationRow = [
          new Date().toISOString(),
          patientId,
          appointmentDate,
          notificationDate,
          message,
          'pending',
        ];

        const notificationResponse = await fetch(
          `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Notifications:append?valueInputOption=RAW`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${await getAccessToken(serviceAccount)}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              values: [notificationRow],
            }),
          }
        );

        if (!notificationResponse.ok) {
          throw new Error('Failed to schedule notification');
        }

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Error in Google Sheets integration:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  try {
    // Create JWT payload
    const header = {
      alg: "RS256",
      typ: "JWT",
    };

    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Import crypto for signing
    const encoder = new TextEncoder();
    let keyData = serviceAccount.private_key;
    
    // Handle different key formats
    if (typeof keyData === 'string') {
      keyData = keyData.replace(/\\n/g, '\n');
    }
    
    // Convert PEM to DER format for import
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = keyData.replace(pemHeader, "").replace(pemFooter, "").replace(/\s/g, "");
    
    // Base64 decode the key
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    // Import the private key
    const cryptoKey = await crypto.subtle.importKey(
      "pkcs8",
      binaryKey,
      {
        name: "RSASSA-PKCS1-v1_5",
        hash: "SHA-256",
      },
      false,
      ["sign"]
    );

    // Create JWT
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const data = encoder.encode(`${headerB64}.${payloadB64}`);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, data);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;

    // Exchange JWT for access token
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: jwt,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      console.error('Token response error:', tokenData);
      throw new Error(`Failed to get access token: ${tokenData.error}`);
    }

    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error('Failed to authenticate with Google API');
  }
}

serve(handler);