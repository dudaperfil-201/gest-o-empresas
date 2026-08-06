-- Financeiro editável: os saldos mensais de cada investimento saem do código e vêm
-- para o banco, para poderem ser lançados/editados pela tela (e preenchidos por mim a
-- partir dos extratos). A ESTRUTURA (carteiras/contas/investimentos) continua no código;
-- só os VALORES por mês ficam aqui.
--
-- Chave = (carteira_slug, banco, investimento, ano, mes). valor = R$; valor_moeda = na
-- moeda original (só internacionais). Um registro por investimento por mês.

create table if not exists public.financeiro_valores (
  carteira_slug text not null,
  banco         text not null,
  investimento  text not null,
  ano           int  not null,
  mes           int  not null check (mes between 1 and 12),
  valor         numeric not null default 0,
  valor_moeda   numeric,
  atualizado_em timestamptz not null default now(),
  primary key (carteira_slug, banco, investimento, ano, mes)
);

create index if not exists idx_financeiro_valores_periodo on public.financeiro_valores (ano, mes);

alter table public.financeiro_valores enable row level security;

drop policy if exists "financeiro_valores_auth_all" on public.financeiro_valores;
create policy "financeiro_valores_auth_all" on public.financeiro_valores
  for all to authenticated using (true) with check (true);
