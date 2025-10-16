# LINE URI Sanitization - Test Plan

## 🎯 Problem Fixed

**Location**: `supabase/functions/send-line-message/index.ts`

**Root Cause**: LINE API returns 400 "Invalid action URI" when:
- Relative paths like `/booking` sent without base URL
- LIFF URLs like `line://app/XXXXYYYY` not converted to HTTPS
- Thai characters/spaces not URL-encoded
- Legacy `url` field used instead of `uri`
- Invalid URL schemes (ftp, etc.)

**Solution**: Added comprehensive URI sanitization system that:
1. Converts `line://app/X` → `https://liff.line.me/X`
2. Converts relative paths → absolute URLs using `PUBLIC_BASE_URL`
3. Encodes Thai characters and spaces
4. Maps legacy `url` → `uri`
5. Validates URL schemes (http, https, tel, mailto, line only)
6. Returns 400 with details for invalid URIs

---

## 📦 Changes Summary

**File**: `supabase/functions/send-line-message/index.ts`

### Added Functions (lines 91-144):
- `normalizeLiff()` - Convert LIFF/LINE schemes to HTTPS
- `absolutize()` - Convert relative paths to absolute URLs
- `isAllowedScheme()` - Validate URL schemes
- `sanitizeUri()` - Main sanitizer with validation
- `walkAndFixActions()` - Recursive payload walker
- `listInvalidUris()` - Find suspicious URIs for debugging

### Integration Hook (lines 180-226):
- Added `PUBLIC_BASE_URL` / `SITE_URL` environment variable support
- Suspicious URI detection before sanitization
- BEFORE/AFTER logging for visibility
- 400 error response for invalid URIs with details
- Sanitized messages sent to LINE API

---

## ✅ Test Commands

### Prerequisites

```bash
# Set your environment variables
export LINE_CHANNEL_ACCESS_TOKEN="your_line_channel_access_token"
export SUPABASE_JWT_TOKEN="your_supabase_jwt_token"
export LINE_USER_ID="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Real LINE user ID
export EDGE_FUNCTION_URL="https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message"
```

---

### Test 1: Text-only Message (Baseline - No URIs)

**Purpose**: Verify LINE token, authentication, and basic message sending work

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "ทดสอบระบบ - Text only",
    "type": "text"
  }'
```

**Expected Result**:
```json
{
  "success": true,
  "message": "LINE message sent successfully",
  "result": {}
}
```

**Expected Logs**:
```
[LINE] Sending message to: Uxxx...
[LINE] messages[0] BEFORE: { "type": "text", "text": "🏥 โรงพยาบาลโฮม\n\n..." }
[LINE] messages[0] AFTER : { "type": "text", "text": "🏥 โรงพยาบาลโฮม\n\n..." }
[LINE] Message sent successfully
```

---

### Test 2: Template with Relative Path

**Purpose**: Verify relative path → absolute URL conversion

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "เลือกบริการ",
      "actions": [
        {
          "type": "uri",
          "label": "จองคิว",
          "uri": "/booking"
        }
      ]
    }
  }'
```

**Expected Result**: 200 OK

**Expected Logs** (with PUBLIC_BASE_URL set):
```
[LINE] messages[0] BEFORE: {
  "template": {
    "actions": [
      { "type": "uri", "label": "จองคิว", "uri": "/booking" }
    ]
  }
}
[LINE] messages[0] AFTER : {
  "template": {
    "actions": [
      { "type": "uri", "label": "จองคิว", "uri": "https://vchome-registration.netlify.app/booking" }
    ]
  }
}
```

**Note**: If `PUBLIC_BASE_URL` is not set and you have relative paths, sanitization will throw an error.

---

### Test 3: LIFF URL Conversion

**Purpose**: Verify `line://app/X` → `https://liff.line.me/X`

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "เปิดแอป",
      "actions": [
        {
          "type": "uri",
          "label": "LIFF App",
          "uri": "line://app/1234567890-ABCDEFGH"
        },
        {
          "type": "uri",
          "label": "LIFF App 2",
          "uri": "liff://app/9876543210-ZYXWVU"
        }
      ]
    }
  }'
```

**Expected Logs**:
```
[LINE] messages[0] BEFORE: {
  "actions": [
    { "uri": "line://app/1234567890-ABCDEFGH" },
    { "uri": "liff://app/9876543210-ZYXWVU" }
  ]
}
[LINE] messages[0] AFTER : {
  "actions": [
    { "uri": "https://liff.line.me/1234567890-ABCDEFGH" },
    { "uri": "https://liff.line.me/9876543210-ZYXWVU" }
  ]
}
```

---

### Test 4: Thai Characters Encoding

**Purpose**: Verify Thai characters/spaces are properly URL-encoded

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "แผนที่",
      "actions": [
        {
          "type": "uri",
          "label": "Google Maps",
          "uri": "https://maps.google.com/?q=โรงพยาบาลโฮม จังหวัดลำปาง"
        }
      ]
    }
  }'
```

**Expected Logs**:
```
[LINE] messages[0] AFTER : {
  "actions": [{
    "uri": "https://maps.google.com/?q=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5%E0%B9%82%E0%B8%AE%E0%B8%A1%20%E0%B8%88%E0%B8%B1%E0%B8%87%E0%B8%AB%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%A5%E0%B8%B3%E0%B8%9B%E0%B8%B2%E0%B8%87"
  }]
}
```

---

### Test 5: Legacy `url` Field (Auto-convert to `uri`)

**Purpose**: Verify backward compatibility

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "Legacy Format",
      "actions": [
        {
          "type": "uri",
          "label": "Old Link",
          "url": "/status"
        }
      ]
    }
  }'
```

**Expected**: 200 OK (url → uri mapping works, then absolutized)

---

### Test 6: Invalid URI Scheme (Should Return 400)

**Purpose**: Verify fail-fast behavior for invalid URIs

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "Invalid",
      "actions": [
        {
          "type": "uri",
          "label": "FTP Link",
          "uri": "ftp://invalid.com/file"
        }
      ]
    }
  }'
```

**Expected Result**:
```json
{
  "error": "Invalid action URI",
  "message": "Invalid action URI scheme: ftp:",
  "base": "https://vchome-registration.netlify.app",
  "suspicious": ["messages[0].template.actions[0].action.uri=ftp://invalid.com/file"]
}
```
**Status**: 400 Bad Request

---

### Test 7: Mixed Valid URIs

**Purpose**: Verify multiple action types work together

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "ติดต่อเรา",
      "actions": [
        {
          "type": "uri",
          "label": "โทร",
          "uri": "tel:038-511-123"
        },
        {
          "type": "uri",
          "label": "Email",
          "uri": "mailto:contact@hospital.com"
        },
        {
          "type": "uri",
          "label": "จองคิว",
          "uri": "/booking"
        },
        {
          "type": "uri",
          "label": "LIFF",
          "uri": "line://app/ABC123"
        }
      ]
    }
  }'
```

**Expected**: All URIs sanitized correctly:
- `tel:038-511-123` → passed through (valid)
- `mailto:contact@hospital.com` → passed through (valid)
- `/booking` → `https://.../booking` (absolutized)
- `line://app/ABC123` → `https://liff.line.me/ABC123` (normalized)

---

### Test 8: Appointment Template (Real-world)

**Purpose**: Test production template message

```bash
curl -X POST "$EDGE_FUNCTION_URL" \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "template",
    "templateData": {
      "patientName": "สมชาย ใจดี",
      "appointmentDate": "2025-11-15",
      "appointmentTime": "14:30 น.",
      "vaccineType": "flu"
    }
  }'
```

**Expected**: 200 OK (text message sent, no URIs to sanitize)

---

## 📋 Deployment Steps

### 1. Set Environment Variable in Supabase

**Dashboard**: Edge Functions → send-line-message → Settings

**Add Variable**:
```
PUBLIC_BASE_URL=https://vchome-registration.netlify.app
```

**Alternative**: If you already have `SITE_URL` set, it will be used as fallback

---

### 2. Deploy Edge Function

```bash
# Using Supabase CLI
supabase functions deploy send-line-message
```

**Or via Dashboard**:
1. Go to Edge Functions
2. Click `send-line-message`
3. Click **Deploy** or **New version**

---

### 3. Monitor Logs

**Dashboard**: Edge Functions → send-line-message → Logs

**Look for**:
```
✅ [LINE] Sending message to: Uxxx...
✅ [LINE] messages[0] BEFORE: ...
✅ [LINE] messages[0] AFTER : ...
✅ [LINE] Message sent successfully
```

**Watch for errors**:
```
❌ [LINE] suspicious URIs: ["..."]
❌ [LINE] URI Sanitization Failed: Invalid action URI: ...
❌ [LINE] API Error: 400 - {"message":"Invalid action URI"}
```

---

## 🔍 Unified Diff Patch

```diff
--- a/supabase/functions/send-line-message/index.ts
+++ b/supabase/functions/send-line-message/index.ts
@@ -89,6 +89,58 @@ serve(async (req) => {
       return vaccineMap[vaccineType] || vaccineType;
     }

+    // ========== URI Sanitization Helpers ==========
+    function normalizeLiff(uri: string) {
+      const m = (uri ?? '').toString().trim().match(/^(?:line|liff):\/\/app\/([A-Za-z0-9._-]+)/);
+      return m ? `https://liff.line.me/${m[1]}` : uri;
+    }
+
+    function absolutize(uri: string, base?: string) {
+      if (uri && uri.startsWith('/') && base) return new URL(uri, base).toString();
+      return uri;
+    }
+
+    function isAllowedScheme(u: URL) {
+      return ['http:', 'https:', 'tel:', 'mailto:', 'line:'].includes(u.protocol);
+    }
+
+    function sanitizeUri(raw: string, base?: string): string {
+      const trimmed = (raw ?? '').toString().trim();
+      if (!trimmed) throw new Error('Invalid action URI: empty string');
+      const fixed = encodeURI(absolutize(normalizeLiff(trimmed), base));
+      let u: URL;
+      try { u = new URL(fixed); } catch { throw new Error(`Invalid action URI: ${raw}`); }
+      if (!isAllowedScheme(u)) throw new Error(`Invalid action URI scheme: ${u.protocol}`);
+      return u.toString();
+    }
+
+    function walkAndFixActions(obj: any, base?: string): any {
+      if (Array.isArray(obj)) return obj.map(x => walkAndFixActions(x, base));
+      if (obj && typeof obj === 'object') {
+        if (obj.type === 'uri') {
+          if (!obj.uri && obj.url) obj.uri = obj.url;        // fix legacy key
+          if (typeof obj.uri === 'string') obj.uri = sanitizeUri(obj.uri, base);
+          if (obj.altUri?.desktop) obj.altUri.desktop = sanitizeUri(obj.altUri.desktop, base);
+        }
+        for (const k of Object.keys(obj)) obj[k] = walkAndFixActions(obj[k], base);
+      }
+      return obj;
+    }
+
+    function listInvalidUris(obj: any): string[] {
+      const bad: string[] = [];
+      const visit = (x: any, path = 'messages') => {
+        if (Array.isArray(x)) { x.forEach((v, i) => visit(v, `${path}[${i}]`)); return; }
+        if (x && typeof x === 'object') {
+          if (x.type === 'uri') {
+            const value = x.uri ?? x.url;
+            try { new URL(String(value)); } catch { bad.push(`${path}.action.uri=${value}`); }
+          }
+          for (const k of Object.keys(x)) visit(x[k], `${path}.${k}`);
+        }
+      };
+      visit(obj);
+      return bad;
+    }
+    // ========== End URI Sanitization Helpers ==========
+
     let messageBody;

@@ -125,10 +177,41 @@ serve(async (req) => {
     }

     console.log('[LINE] Sending message to:', userId);
-    console.log('[LINE] Message body:', JSON.stringify(messageBody, null, 2));

-    const response = await fetch("https://api.line.me/v2/bot/message/push", {
+    // Get base URL for relative path resolution
+    const BASE = Deno.env.get('PUBLIC_BASE_URL') ?? Deno.env.get('SITE_URL') ?? undefined;
+
+    // Check for suspicious URIs before sanitization
+    const messages = messageBody.messages;
+    const suspicious = listInvalidUris(messages);
+    if (suspicious.length) console.warn('[LINE] suspicious URIs:', suspicious);
+
+    // Log BEFORE sanitization
+    console.log('[LINE] messages[0] BEFORE:', JSON.stringify(messages?.[0], null, 2));
+
+    // Sanitize all action URIs
+    let safeMessages;
+    try {
+      safeMessages = walkAndFixActions(messages, BASE);
+    } catch (e) {
+      const msg = e instanceof Error ? e.message : String(e);
+      console.error('[LINE] URI Sanitization Failed:', msg);
+      return new Response(
+        JSON.stringify({
+          error: 'Invalid action URI',
+          message: msg,
+          base: BASE,
+          suspicious
+        }),
+        {
+          status: 400,
+          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
+        }
+      );
+    }
+
+    // Log AFTER sanitization
+    console.log('[LINE] messages[0] AFTER :', JSON.stringify(safeMessages?.[0], null, 2));
+
+    // Send to LINE API with sanitized messages
+    const sanitizedBody = { ...messageBody, messages: safeMessages };
+    const response = await fetch("https://api.line.me/v2/bot/message/push", {
       method: "POST",
       headers: {
         "Content-Type": "application/json",
         "Authorization": `Bearer ${channelAccessToken}`,
       },
-      body: JSON.stringify(messageBody),
+      body: JSON.stringify(sanitizedBody),
     });
```

---

## ✅ Acceptance Criteria Checklist

- [x] Helpers added: normalizeLiff, absolutize, isAllowedScheme, sanitizeUri, walkAndFixActions, listInvalidUris
- [x] Integration before LINE API call with BEFORE/AFTER logging
- [x] 400 error response for invalid URIs (not 500)
- [x] PUBLIC_BASE_URL / SITE_URL environment variable support
- [x] Relative paths → absolute URLs (when BASE is set)
- [x] LIFF URLs → `https://liff.line.me/...`
- [x] Thai characters properly encoded
- [x] Legacy `url` → `uri` mapping
- [x] Invalid schemes rejected (ftp, etc.)
- [x] Suspicious URI detection and logging
- [x] Test commands provided (8 tests)

---

## 🎯 Success Metrics

After deployment, verify:

1. ✅ **Text messages work** (baseline test)
2. ✅ **Relative paths converted** to absolute URLs
3. ✅ **LIFF URLs normalized** to `https://liff.line.me/...`
4. ✅ **Thai characters encoded** properly
5. ✅ **Invalid URIs fail with 400** (not 500)
6. ✅ **Logs show BEFORE/AFTER** transformation
7. ✅ **No 400 errors from LINE API** for valid URIs

---

**Date**: 2025-10-17
**Status**: ✅ Ready for Deployment
