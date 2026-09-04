import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Masalan Business Enterprise is missing its Supabase configuration.\n\n' +
      'Create a `.env` file in the project root with:\n' +
      '  VITE_SUPABASE_URL=https://gxrnlrogpmlagzmwlwjp.supabase.co\n' +
      '  VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...\n\n' +
      'See `.env.example` for a template. Do NOT commit real credentials.',
  )
}

if (!supabasePublishableKey.startsWith('sb_publishable_') && !supabasePublishableKey.startsWith('eyJ')) {
  throw new Error(
    'Invalid Supabase key detected.\n\n' +
      'Only the SUPABASE PUBLISHABLE (client/anon) key may be used in the frontend.\n' +
      'Never put a service_role or secret key in this application.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
})

export function isConfigValid(): boolean {
  return Boolean(supabaseUrl && supabasePublishableKey)
}

export function getConfigSummary() {
  return {
    urlConfigured: Boolean(supabaseUrl),
    keyConfigured: Boolean(supabasePublishableKey),
    url: supabaseUrl || '(missing)',
    keyPrefix: supabasePublishableKey ? supabasePublishableKey.slice(0, 14) + '…' : '(missing)',
  }
}
