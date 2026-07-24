import crypto from 'crypto'

// Autenticação do PORTAL DO INQUILINO — sessão própria, separada do login da
// equipe (que usa Supabase Auth). Token HMAC assinado, guardado num cookie.
const SECRET = process.env.INQUILINO_AUTH_SECRET ?? 'gestao-inquilino-secret-2026'
export const COOKIE_NAME = 'inquilino_session'

export function criarToken(inquilinoId: string): string {
  const ts = Date.now().toString()
  const payload = `${inquilinoId}.${ts}`
  const sig = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
  return `${payload}.${sig}`
}

export function verificarToken(token: string): string | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const [id, ts, sig] = parts
    const payload = `${id}.${ts}`
    const expected = crypto.createHmac('sha256', SECRET).update(payload).digest('hex')
    if (sig !== expected) return null
    // Expira em 30 dias
    if (Date.now() - parseInt(ts) > 30 * 24 * 60 * 60 * 1000) return null
    return id
  } catch {
    return null
  }
}
