'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function criarEmpresa(formData: FormData) {
  const supabase = await createClient()
  const nome = formData.get('nome') as string
  const { error } = await supabase.from('empresas').insert({ nome })
  if (error) throw new Error(error.message)
  revalidatePath('/')
}

export async function criarImovel(formData: FormData) {
  const supabase = await createClient()
  const empresa_id = formData.get('empresa_id') as string
  const endereco = formData.get('endereco') as string
  const valor_aluguel = parseFloat(formData.get('valor_aluguel') as string)
  const { error } = await supabase.from('imoveis').insert({ empresa_id, endereco, valor_aluguel })
  if (error) throw new Error(error.message)
  revalidatePath(`/empresas/${empresa_id}`)
}

export async function apagarImovel(imovelId: string, empresaId: string) {
  const supabase = await createClient()
  await supabase.from('pagamentos').delete().eq('imovel_id', imovelId)
  await supabase.from('inquilinos').delete().eq('imovel_id', imovelId)
  await supabase.from('imoveis').delete().eq('id', imovelId)
  revalidatePath(`/empresas/${empresaId}`)
}

export async function editarImovel(formData: FormData) {
  const supabase = await createClient()
  const id = formData.get('id') as string
  const empresa_id = formData.get('empresa_id') as string
  const endereco = formData.get('endereco') as string
  const valor_aluguel = parseFloat(formData.get('valor_aluguel') as string)
  await supabase.from('imoveis').update({ endereco, valor_aluguel }).eq('id', id)
  revalidatePath(`/empresas/${empresa_id}`)
}

export async function salvarInquilino(formData: FormData) {
  const supabase = await createClient()
  const imovel_id = formData.get('imovel_id') as string
  const empresa_id = formData.get('empresa_id') as string
  const id = formData.get('id') as string | null

  const dados = {
    imovel_id,
    nome: formData.get('nome') as string,
    cpf: formData.get('cpf') as string || null,
    telefone: formData.get('telefone') as string || null,
    email: formData.get('email') as string || null,
    data_inicio: formData.get('data_inicio') as string || null,
    juros_mes: parseFloat(formData.get('juros_mes') as string) || 2,
  }

  if (id) {
    await supabase.from('inquilinos').update(dados).eq('id', id)
  } else {
    await supabase.from('inquilinos').insert(dados)
  }

  // Atualiza o valor do aluguel do imóvel, se informado no cadastro
  const valorRaw = formData.get('valor_aluguel') as string | null
  if (valorRaw != null && valorRaw !== '') {
    const valor = parseFloat(valorRaw.replace(',', '.'))
    if (!isNaN(valor)) {
      await supabase.from('imoveis').update({ valor_aluguel: valor }).eq('id', imovel_id)
    }
  }

  revalidatePath(`/empresas/${empresa_id}/imoveis/${imovel_id}`)
  revalidatePath(`/empresas/${empresa_id}`)
  revalidatePath('/')
}

export async function registrarPagamento(formData: FormData) {
  const supabase = await createClient()
  const imovel_id = formData.get('imovel_id') as string
  const empresa_id = formData.get('empresa_id') as string
  const mes = parseInt(formData.get('mes') as string)
  const ano = parseInt(formData.get('ano') as string)
  const valor_original = parseFloat(formData.get('valor_original') as string)
  const valor_pago = parseFloat(formData.get('valor_pago') as string)
  const data_pagamento = formData.get('data_pagamento') as string
  const observacao = formData.get('observacao') as string || null

  const vencimento = new Date(ano, mes - 1, 10)
  const pagamento = new Date(data_pagamento)
  const atrasado = pagamento > vencimento

  const { error: upsertError } = await supabase.from('pagamentos').upsert({
    imovel_id,
    mes,
    ano,
    valor_original,
    valor_pago,
    data_pagamento,
    status: atrasado ? 'atrasado' : 'pago',
    observacao,
  }, { onConflict: 'imovel_id,mes,ano' })

  if (upsertError) throw new Error(upsertError.message)
  revalidatePath(`/empresas/${empresa_id}/imoveis/${imovel_id}`)
}

export async function marcarPendente(imovel_id: string, mes: number, ano: number, valor_original: number, empresa_id: string) {
  const supabase = await createClient()
  await supabase.from('pagamentos').upsert({
    imovel_id, mes, ano, valor_original, status: 'pendente'
  }, { onConflict: 'imovel_id,mes,ano' })
  revalidatePath(`/empresas/${empresa_id}/imoveis/${imovel_id}`)
}
