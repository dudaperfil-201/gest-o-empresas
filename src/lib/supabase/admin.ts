import { createClient } from '@supabase/supabase-js'

// Client com a chave secreta (service role) — usado só em Server Actions de
// administração (criar/excluir usuários, mudar papel). Nunca expor no cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SECRET_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  )
}
