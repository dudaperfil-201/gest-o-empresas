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

// Botão PAGOU: alterna o pagamento do mês corrente. Se ainda não está pago,
// registra o pagamento com o valor do aluguel do imóvel; se já está pago,
// desmarca (remove o registro).
export async function alternarPagamento(imovelId: string, empresaId: string) {
  const supabase = await createClient()
  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const { data: existente } = await supabase
    .from('pagamentos')
    .select('id, status')
    .eq('imovel_id', imovelId)
    .eq('mes', mes)
    .eq('ano', ano)
    .maybeSingle()

  if (existente && existente.status === 'pago') {
    await supabase.from('pagamentos').delete().eq('id', existente.id)
  } else {
    const { data: imovel } = await supabase.from('imoveis').select('valor_aluguel').eq('id', imovelId).single()
    const valor = imovel?.valor_aluguel ?? 0
    await supabase.from('pagamentos').upsert({
      imovel_id: imovelId,
      mes,
      ano,
      valor_original: valor,
      valor_pago: valor,
      status: 'pago',
      data_pagamento: new Date().toISOString().slice(0, 10),
    }, { onConflict: 'imovel_id,mes,ano' })
  }

  revalidatePath(`/empresas/${empresaId}`)
  revalidatePath('/')
}

// Botão PAGOU COM ATRASO: registra o pagamento do mês corrente com um valor
// digitado (aluguel + multa), que é diferente do valor cadastrado. Status 'atrasado'.
export async function registrarPagamentoComAtraso(imovelId: string, empresaId: string, valorPago: number) {
  const supabase = await createClient()
  const mes = new Date().getMonth() + 1
  const ano = new Date().getFullYear()

  const { data: imovel } = await supabase.from('imoveis').select('valor_aluguel').eq('id', imovelId).single()
  const valorOriginal = imovel?.valor_aluguel ?? 0

  await supabase.from('pagamentos').upsert({
    imovel_id: imovelId,
    mes,
    ano,
    valor_original: valorOriginal,
    valor_pago: valorPago,
    status: 'atrasado',
    data_pagamento: new Date().toISOString().slice(0, 10),
  }, { onConflict: 'imovel_id,mes,ano' })

  revalidatePath(`/empresas/${empresaId}`)
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

  // Atualiza os dados do imóvel (nome/endereço e valor do aluguel), se informados
  const imovelUpdate: Record<string, unknown> = {}
  const endereco = (formData.get('endereco') as string | null)?.trim()
  if (endereco) imovelUpdate.endereco = endereco
  const valorRaw = formData.get('valor_aluguel') as string | null
  if (valorRaw != null && valorRaw !== '') {
    const valor = parseFloat(valorRaw.replace(',', '.'))
    if (!isNaN(valor)) imovelUpdate.valor_aluguel = valor
  }
  const diaRaw = formData.get('dia_vencimento') as string | null
  if (diaRaw != null && diaRaw !== '') {
    const dia = parseInt(diaRaw, 10)
    if (!isNaN(dia) && dia >= 1 && dia <= 31) imovelUpdate.dia_vencimento = dia
  }
  if (Object.keys(imovelUpdate).length > 0) {
    await supabase.from('imoveis').update(imovelUpdate).eq('id', imovel_id)
  }

  // Salva o inquilino apenas se o nome foi informado
  const nome = (formData.get('nome') as string || '').trim()
  if (nome) {
    const dados = {
      imovel_id,
      nome,
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
