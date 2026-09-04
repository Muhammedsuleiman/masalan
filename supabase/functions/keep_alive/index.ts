// =============================================================================
// MASALAN BUSINESS ENTERPRISE — keep_alive Edge Function
//
// Purpose:
//   Generate one lightweight, legitimate request against the Supabase project
//   every day so the project is not considered inactive on the Free Plan.
//
// How it runs:
//   Server-side only, triggered by a pg_cron schedule (see
//   supabase/migrations/002_keep_alive_schedule.sql). It works even when
//   nobody is logged in and nobody has opened the website.
//
// IMPORTANT:
//   * READ-ONLY. This function never creates, updates or deletes rows.
//   * It only performs a harmless `select id limit 1` against `businesses`.
//   * It uses the service-role key ONLY server-side (auto-injected by Supabase
//     as SUPABASE_SERVICE_ROLE_KEY). That key never leaves the server and is
//     never exposed to the browser.
//   * It returns no sensitive information — just ok/not_ok plus a timestamp.
//
// Manual test (after `supabase functions deploy keep_alive`):
//   curl -X POST https://gxrnlrogpmlagzmwlwjp.supabase.co/functions/v1/keep_alive
// =============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.46.1'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
}

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight (harmless; the function is public).
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  const at = new Date().toISOString()
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !serviceRoleKey) {
    console.error(`[keep_alive] ${at} FAILED missing env (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY)`)
    return json({ ok: false, error: 'not_configured' }, 500)
  }

  const client = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  try {
    // Lightweight read-only health probe against an existing safe table.
    // No rows are inserted or modified — business data is untouched.
    const { data, error } = await client.from('businesses').select('id').limit(1)

    if (error) {
      console.error(`[keep_alive] ${at} FAILED db probe: ${error.message}`)
      return json({ ok: false, error: 'db_probe_failed' }, 502)
    }

    console.log(`[keep_alive] ${at} OK probe_rows=${data?.length ?? 0}`)
    return json({ ok: true, at })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(`[keep_alive] ${at} ERROR ${msg}`)
    return json({ ok: false, error: 'unexpected' }, 500)
  }
})
