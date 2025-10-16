# LINE URI Fix - Test Plan

## 🎯 Root Cause Summary

**Location**: `supabase/functions/send-line-message/index.ts` (~line 505, message assembly and LINE API call)

**Why it Failed**:
1. **Relative paths** like `/booking` sent directly to LINE API without base URL
2. **LIFF URLs** like `line://app/XXXXYYYY` or `liff://app/XXXXYYYY` not converted to `https://liff.line.me/XXXXYYYY`
3. **Thai characters/spaces** in URLs (e.g., `โรงพยาบาลโฮม`) not properly encoded
4. **Legacy `url` field** used instead of `uri` in some action objects
5. **altUri.desktop** containing relative paths

**Fix Applied**:
- Added comprehensive URI sanitization helpers (normalizeLiff, absolutize, isAllowedScheme, sanitizeUri)
- Implemented recursive walker `walkAndFixActions` to process entire message payload
- Added PUBLIC_BASE_URL environment variable support (with SITE_URL fallback)
- Hooked sanitization before LINE API call with BEFORE/AFTER logging
- Returns 400 for invalid URIs instead of 500

---

## 🔧 Changes Made

### File: `supabase/functions/send-line-message/index.ts`

**Lines 77-78**: Environment variable with fallbacks
```typescript
const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") ?? Deno.env.get("SITE_URL") ?? "https://moradok.github.io/VaccineHomeBot";
```

**Lines 95-145**: URI Sanitization Helpers
- `normalizeLiff()` - Converts `line://app/X` → `https://liff.line.me/X`
- `absolutize()` - Converts `/booking` → `https://base.url/booking`
- `isAllowedScheme()` - Validates URL schemes
- `sanitizeUri()` - Main validator with encoding

**Lines 147-183**: Recursive payload walker
- `walkAndFixActions()` - Processes entire message structure
- Handles legacy `url` → `uri` mapping
- Sanitizes both `uri` and `altUri.desktop`

**Lines 584-636**: Integration hook
- Applied before sending to LINE API
- BEFORE/AFTER logging for debugging
- 400 error handling for invalid URIs

---

## ✅ Test Commands

### Prerequisites
```bash
# Set environment variables
export LINE_CHANNEL_ACCESS_TOKEN="your_line_channel_access_token"
export SUPABASE_JWT_TOKEN="your_supabase_jwt_token"
export LINE_USER_ID="Uxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"  # Replace with real LINE user ID
```

---

### Test 1: Text-only Message (Baseline - No URIs)

**Purpose**: Verify LINE token and recipient are valid

```bash
curl -X POST https://api.line.me/v2/bot/message/push \
  -H "Authorization: Bearer $LINE_CHANNEL_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "to": "'"$LINE_USER_ID"'",
    "messages": [{
      "type": "text",
      "text": "OK"
    }]
  }'
```

**Expected Result**:
```json
{}
```
(200 OK, empty response means success)

---

### Test 2: Edge Function with Relative Path + LIFF URL

**Purpose**: Verify URI sanitization (relative → absolute, LIFF conversion)

```bash
curl -X POST https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "title": "บริการ",
      "text": "เลือก",
      "actions": [
        {
          "type": "uri",
          "label": "จองคิว",
          "uri": "/booking"
        },
        {
          "type": "uri",
          "label": "สถานะ",
          "uri": "line://app/1234567890-ABCDEFGH"
        }
      ]
    }
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

**Expected Logs** (in Supabase Dashboard → Edge Functions → Logs):
```
[ENV] PUBLIC_BASE_URL: https://moradok.github.io/VaccineHomeBot
[LINE] Message body BEFORE sanitization: {
  ...
  "actions": [
    { "type": "uri", "label": "จองคิว", "uri": "/booking" },
    { "type": "uri", "label": "สถานะ", "uri": "line://app/1234567890-ABCDEFGH" }
  ]
}
[LINE] Message body AFTER sanitization: {
  ...
  "actions": [
    { "type": "uri", "label": "จองคิว", "uri": "https://moradok.github.io/VaccineHomeBot/booking" },
    { "type": "uri", "label": "สถานะ", "uri": "https://liff.line.me/1234567890-ABCDEFGH" }
  ]
}
[LINE] Message sent successfully
```

---

### Test 3: Thai Characters in URL

**Purpose**: Verify URL encoding of non-ASCII characters

```bash
curl -X POST https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "ดูแผนที่",
      "actions": [{
        "type": "uri",
        "label": "Google Maps",
        "uri": "https://maps.google.com/?q=โรงพยาบาลโฮม จังหวัดลำปาง"
      }]
    }
  }'
```

**Expected Result**: 200 OK

**Expected Logs**: Thai characters properly encoded in AFTER log:
```
"uri": "https://maps.google.com/?q=%E0%B9%82%E0%B8%A3%E0%B8%87%E0%B8%9E%E0%B8%A2%E0%B8%B2%E0%B8%9A%E0%B8%B2%E0%B8%A5%E0%B9%82%E0%B8%AE%E0%B8%A1%20%E0%B8%88%E0%B8%B1%E0%B8%87%E0%B8%AB%E0%B8%A7%E0%B8%B1%E0%B8%94%E0%B8%A5%E0%B8%B3%E0%B8%9B%E0%B8%B2%E0%B8%87"
```

---

### Test 4: Legacy `url` field (should auto-convert to `uri`)

**Purpose**: Verify backward compatibility with old `url` field

```bash
curl -X POST https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "Legacy",
      "actions": [{
        "type": "uri",
        "label": "Old Format",
        "url": "/status"
      }]
    }
  }'
```

**Expected Result**: 200 OK (url → uri mapping works)

---

### Test 5: Invalid URI Scheme (Should Fail with 400)

**Purpose**: Verify fail-fast behavior for invalid URIs

```bash
curl -X POST https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "test",
    "type": "custom",
    "template": {
      "type": "buttons",
      "text": "Invalid",
      "actions": [{
        "type": "uri",
        "label": "FTP Link",
        "uri": "ftp://invalid.com/file"
      }]
    }
  }'
```

**Expected Result**:
```json
{
  "error": "Invalid action URI",
  "message": "Invalid action URI scheme: ftp: (only http, https, tel, mailto, line are allowed)",
  "success": false
}
```
(Status: 400 Bad Request)

---

### Test 6: Real-world Template Message (Appointment Reminder)

**Purpose**: Test actual production payload

```bash
curl -X POST https://fljyjbrgfzervxofrilo.supabase.co/functions/v1/send-line-message \
  -H "Authorization: Bearer $SUPABASE_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "'"$LINE_USER_ID"'",
    "message": "ทดสอบการแจ้งเตือน",
    "type": "template",
    "templateData": {
      "patientName": "สมชาย ใจดี",
      "appointmentDate": "2025-11-01",
      "appointmentTime": "09:00 น.",
      "vaccineType": "flu"
    }
  }'
```

**Expected Result**: 200 OK with Flex Message sent

**Expected Logs**: All URIs in footer buttons properly sanitized:
- `tel:038-511-123` → passed through (valid scheme)
- `https://maps.google.com/?q=โรงพยาบาลโฮม` → properly encoded

---

## 📋 Acceptance Criteria Checklist

- [ ] **Test 1** passes (text-only message)
- [ ] **Test 2** passes (relative path → absolute URL)
- [ ] **Test 2** passes (LIFF URL conversion)
- [ ] **Test 3** passes (Thai character encoding)
- [ ] **Test 4** passes (legacy `url` field mapping)
- [ ] **Test 5** returns 400 (invalid scheme rejection)
- [ ] **Test 6** passes (real-world template)
- [ ] Logs show BEFORE/AFTER transformation
- [ ] No 400 "Invalid action URI" errors from LINE API
- [ ] No 500 errors from Edge Function

---

## 🚀 Deployment Steps

### 1. Set Environment Variable in Supabase Dashboard

**Location**: Dashboard → Edge Functions → send-line-message → Settings

**Add Variable**:
```
PUBLIC_BASE_URL=https://vchome-registration.netlify.app
```
(or your actual production site URL)

**Alternative**: Use `SITE_URL` if already configured

---

### 2. Deploy Edge Function

```bash
# Option 1: Using Supabase CLI
supabase functions deploy send-line-message

# Option 2: Via Supabase Dashboard
# Dashboard → Edge Functions → send-line-message → Deploy
```

---

### 3. Verify Deployment

```bash
# Check function list
supabase functions list

# Expected output:
# send-line-message | deployed | <timestamp>
```

---

### 4. Monitor Logs

**Location**: Dashboard → Edge Functions → send-line-message → Logs

**Look for**:
```
✅ [ENV] PUBLIC_BASE_URL: https://...
✅ [LINE] Message body BEFORE sanitization: ...
✅ [LINE] Message body AFTER sanitization: ...
✅ [LINE] Message sent successfully
```

**Watch out for**:
```
❌ [URI Sanitization Error] ...
❌ [LINE] API Error: 400 ...
```

---

## 📊 Unified Diff Patch

```diff
--- a/supabase/functions/send-line-message/index.ts
+++ b/supabase/functions/send-line-message/index.ts
@@ -74,7 +74,7 @@ serve(async (req) => {
   }

   // Get public base URL for converting relative paths to absolute
-  const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") || "https://moradok.github.io/VaccineHomeBot";
+  const publicBaseUrl = Deno.env.get("PUBLIC_BASE_URL") ?? Deno.env.get("SITE_URL") ?? "https://moradok.github.io/VaccineHomeBot";
   console.log('[ENV] PUBLIC_BASE_URL:', publicBaseUrl);

   // Helper function to convert vaccine type to Thai name
@@ -95,7 +95,7 @@ serve(async (req) => {
   // ========== URI Sanitization Helpers ==========
   // Convert LINE/LIFF app URLs to https://liff.line.me format
   function normalizeLiff(uri: string): string {
-    const m = uri.match(/^(?:line|liff):\/\/app\/([A-Za-z0-9._-]+)/);
+    const m = (uri ?? '').toString().trim().match(/^(?:line|liff):\/\/app\/([A-Za-z0-9._-]+)/);
     return m ? `https://liff.line.me/${m[1]}` : uri;
   }

@@ -147,14 +147,20 @@ serve(async (req) => {
   // Recursively walk message payload and sanitize all action URIs
   function walkAndFixActions(obj: any, base?: string): any {
     if (Array.isArray(obj)) {
       return obj.map(x => walkAndFixActions(x, base));
     }

     if (obj && typeof obj === 'object') {
-      // Fix action.uri
-      if (obj.type === 'uri' && typeof obj.uri === 'string') {
-        try {
+      // Fix action.uri (handle legacy 'url' field)
+      if (obj.type === 'uri') {
+        // Map legacy 'url' to 'uri' if uri is missing
+        if (!obj.uri && obj.url) {
+          obj.uri = obj.url;
+        }
+
+        if (typeof obj.uri === 'string') {
+          try {
             obj.uri = sanitizeUri(obj.uri, base);

             // Fix altUri.desktop if exists
@@ -166,6 +172,7 @@ serve(async (req) => {
             throw e;
           }
         }
+      }

       // Recursively process all object properties
       for (const k of Object.keys(obj)) {
```

---

## 🎯 Success Metrics

After deployment, you should see:

1. ✅ **No more 400 "Invalid action URI" errors** from LINE API
2. ✅ **All relative paths converted** to absolute URLs in logs
3. ✅ **LIFF URLs properly formatted** as `https://liff.line.me/...`
4. ✅ **Thai characters encoded** correctly
5. ✅ **Invalid URIs fail fast** with 400 (not 500)
6. ✅ **Clear BEFORE/AFTER logs** for debugging

---

**Date**: 2025-10-17
**Status**: ✅ Ready for Deployment and Testing
