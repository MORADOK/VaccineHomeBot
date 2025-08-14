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

const handler = async (req: Request): Promise<Response> => {
  console.log('Function called with method:', req.method);
  
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse request data
    let requestData;
    try {
      const requestText = await req.text();
      console.log('Request body text:', requestText);
      requestData = JSON.parse(requestText);
    } catch (jsonError) {
      console.error('JSON parsing error:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    const { action } = requestData;
    console.log('Action requested:', action);
    
    // Get environment variables
    const serviceAccountKey = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_KEY");
    const spreadsheetId = "1ASjl_kZrQ4InVWmCS2qzf_ofT4Uj0gEo_Oy-fqwCc7Q";
    
    console.log('Service account key exists:', !!serviceAccountKey);
    console.log('Spreadsheet ID exists:', !!spreadsheetId);
    
    if (!serviceAccountKey) {
      console.error('Missing GOOGLE_SERVICE_ACCOUNT_KEY');
      return new Response(
        JSON.stringify({ error: 'Google Service Account credentials not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!spreadsheetId) {
      console.error('Missing GOOGLE_SHEETS_ID');
      return new Response(
        JSON.stringify({ error: 'Google Sheets ID not configured' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse service account
    let serviceAccount;
    try {
      // Clean up the service account key - remove any extra whitespace and handle newlines
      let cleanedKey = serviceAccountKey.trim();
      
      // If the key doesn't start with {, it might be base64 encoded or corrupted
      if (!cleanedKey.startsWith('{')) {
        console.error('Service account key does not appear to be JSON, first 50 chars:', cleanedKey.substring(0, 50));
        return new Response(
          JSON.stringify({ error: 'Google Service Account key must be valid JSON format' }),
          {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }
      
      serviceAccount = JSON.parse(cleanedKey);
      console.log('Service account parsed successfully, client_email:', serviceAccount.client_email);
    } catch (parseError) {
      console.error('Service account parsing error:', parseError);
      console.error('Service account key first 100 characters:', serviceAccountKey?.substring(0, 100));
      return new Response(
        JSON.stringify({ 
          error: 'Invalid Google Service Account JSON format', 
          details: parseError.message 
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
    
    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      console.error('Missing required fields in service account');
      return new Response(
        JSON.stringify({ error: 'Google Service Account credentials incomplete' }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    switch (action) {
      case 'readPatients':
        try {
          console.log('Attempting to get access token...');
          const accessToken = await getAccessToken(serviceAccount);
          console.log('Access token obtained successfully');
          
          console.log('Making request to Google Sheets API...');
          const patientsResponse = await fetch(
            `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Patients!A:E`,
            {
              headers: {
                'Authorization': `Bearer ${accessToken}`,
              },
            }
          );
          
          console.log('Google Sheets API response status:', patientsResponse.status);
          
          if (!patientsResponse.ok) {
            const errorText = await patientsResponse.text();
            console.error('Google Sheets API error:', errorText);
            throw new Error(`Google Sheets API error: ${patientsResponse.status} - ${errorText}`);
          }
          
          const patientsData = await patientsResponse.json();
          console.log('Patients data received:', patientsData);
          
          const patients: PatientData[] = patientsData.values?.slice(1).map((row: string[]) => ({
            id: row[0] || '',
            name: row[1] || '',
            phone: row[2] || '',
            email: row[3] || '',
            lineId: row[4] || '',
          })) || [];

          console.log('Processed patients:', patients.length);
          
          return new Response(JSON.stringify({ patients }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (readError) {
          console.error('Error reading patients:', readError);
          return new Response(
            JSON.stringify({ error: `Failed to read patients: ${readError.message}` }),
            {
              status: 500,
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            }
          );
        }

      default:
        console.log('Invalid action:', action);
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
    }
  } catch (error: any) {
    console.error('Unexpected error in Google Sheets integration:', error);
    return new Response(
      JSON.stringify({ error: `Unexpected error: ${error.message}` }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
};

async function getAccessToken(serviceAccount: any): Promise<string> {
  try {
    console.log('Creating JWT for authentication...');
    
    // Create JWT payload
    const now = Math.floor(Date.now() / 1000);
    const payload = {
      iss: serviceAccount.client_email,
      scope: "https://www.googleapis.com/auth/spreadsheets.readonly",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    };

    // Handle the private key format
    let privateKey = serviceAccount.private_key;
    if (typeof privateKey === 'string') {
      privateKey = privateKey.replace(/\\n/g, '\n');
    }
    
    console.log('Private key format looks correct');
    
    // Remove PEM headers and footers, clean up
    const pemHeader = "-----BEGIN PRIVATE KEY-----";
    const pemFooter = "-----END PRIVATE KEY-----";
    const pemContents = privateKey
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
    
    // Base64 decode the key
    const binaryKey = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0));
    
    console.log('Private key decoded successfully');
    
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
    
    console.log('Private key imported successfully');

    // Create JWT
    const header = { alg: "RS256", typ: "JWT" };
    const headerB64 = btoa(JSON.stringify(header)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    const payloadB64 = btoa(JSON.stringify(payload)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", cryptoKey, data);
    const signatureB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
      .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
    
    const jwt = `${headerB64}.${payloadB64}.${signatureB64}`;
    
    console.log('JWT created successfully');

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
      throw new Error(`Failed to get access token: ${tokenData.error_description || tokenData.error}`);
    }

    console.log('Access token obtained successfully');
    return tokenData.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    throw new Error(`Failed to authenticate with Google API: ${error.message}`);
  }
}

serve(handler);