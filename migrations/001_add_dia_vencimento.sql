-- Adiciona o "dia do pagamento" (dia do mês em que o aluguel vence) ao imóvel.
-- Rodar no SQL Editor do Supabase.
alter table imoveis
  add column if not exists dia_vencimento int check (dia_vencimento between 1 and 31);
