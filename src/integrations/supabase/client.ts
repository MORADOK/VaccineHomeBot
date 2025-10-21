// src/integrations/supabase/client.ts
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// ดึงค่าจาก .env.* (อย่าใส่ service_role ตรงนี้)
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY')
}

// กัน HMR สร้าง client ซ้ำ
type SupabaseClientTyped = ReturnType<typeof createClient<Database>>
const g = globalThis as unknown as { __supabase?: SupabaseClientTyped }

export const supabase: SupabaseClientTyped =
  g.__supabase ??
  createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: {
      storage: localStorage,      // ใช้ได้บนเว็บและ Tauri (WebView2)
      persistSession: true,
      autoRefreshToken: true,
    },
  })

if (!g.__supabase) g.__supabase = supabase
