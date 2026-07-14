// Envio de e-mail via API HTTP do Brevo (mesmo provedor usado no Perfil).
// Requer BREVO_API_KEY e EMAIL_USER (remetente verificado) nas variáveis de ambiente.

export async function enviarEmail(opts: { destinatario: string; assunto: string; texto: string }) {
  const apiKey = process.env.BREVO_API_KEY
  const remetente = process.env.EMAIL_USER
  if (!apiKey || !remetente) {
    throw new Error('E-mail não configurado (BREVO_API_KEY / EMAIL_USER ausentes).')
  }

  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': apiKey, 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      sender: { name: 'HASE Management', email: remetente },
      to: [{ email: opts.destinatario }],
      subject: opts.assunto,
      textContent: opts.texto,
    }),
  })

  if (!res.ok) throw new Error('Erro ao enviar e-mail via Brevo: ' + (await res.text()))
}
