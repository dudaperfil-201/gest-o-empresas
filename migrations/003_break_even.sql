-- Break Even: distribuição de lucros por mês (10% sobre o rendimento das contas
-- Itaú Serginho + Itaú Eduardo + RNX, dividido por 3). Um registro por mês — cada mês
-- fica guardado, e o mês novo começa em branco.
-- serginho/eduardo: digitados pelo usuário. rnx: rendimento automático da carteira RNX
-- (congelado no momento do salvamento, para o histórico não mudar depois).

create table if not exists public.break_even (
  ano           int not null,
  mes           int not null check (mes between 1 and 12),
  serginho      numeric not null default 0,
  eduardo       numeric not null default 0,
  rnx           numeric not null default 0,
  atualizado_em timestamptz not null default now(),
  primary key (ano, mes)
);

alter table public.break_even enable row level security;

drop policy if exists "break_even_auth_all" on public.break_even;
create policy "break_even_auth_all" on public.break_even
  for all to authenticated using (true) with check (true);
