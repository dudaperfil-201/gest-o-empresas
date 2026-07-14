'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Marca o WhatsApp de um lembrete (imóvel + mês/ano do vencimento) como enviado.
export async function marcarWhatsAppEnviado(imovelId: string, ano: number, mes: number) {
  const supabase = await createClient()
  await supabase.from('lembretes_whatsapp').upsert(
    { imovel_id: imovelId, ano, mes },
    { onConflict: 'imovel_id,ano,mes', ignoreDuplicates: true }
  )
  revalidatePath('/lembretes')
  revalidatePath('/imoveis')
}

// Desfaz a marcação (caso o operador tenha clicado por engano).
export async function desmarcarWhatsAppEnviado(imovelId: string, ano: number, mes: number) {
  const supabase = await createClient()
  await supabase
    .from('lembretes_whatsapp')
    .delete()
    .eq('imovel_id', imovelId)
    .eq('ano', ano)
    .eq('mes', mes)
  revalidatePath('/lembretes')
  revalidatePath('/imoveis')
}
