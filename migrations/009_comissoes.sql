-- Comissões do funcionário responsável pela gestão dos imóveis.
-- Cada NOVO contrato de aluguel gera uma comissão = 60% do 1º aluguel pago pelo inquilino.
-- Os PAGAMENTOS feitos ao funcionário abatem do saldo a receber.
-- Saldo a receber = soma das comissões − soma dos pagamentos.

create table if not exists public.comissoes (
  id             uuid primary key default gen_random_uuid(),
  descricao      text,                                   -- aluguel/imóvel locado
  valor_aluguel  numeric(12,2) not null default 0,       -- valor do 1º aluguel
  percentual     numeric(5,2)  not null default 60,      -- % da comissão (60)
  valor_comissao numeric(12,2) not null default 0,       -- 60% do valor_aluguel
  created_at     timestamptz not null default now()
);
alter table public.comissoes enable row level security;
drop policy if exists "comissoes_auth_all" on public.comissoes;
create policy "comissoes_auth_all" on public.comissoes
  for all to authenticated using (true) with check (true);

create table if not exists public.comissoes_pagamentos (
  id             uuid primary key default gen_random_uuid(),
  descricao      text,
  valor          numeric(12,2) not null default 0,
  data_pagamento date,
  created_at     timestamptz not null default now()
);
alter table public.comissoes_pagamentos enable row level security;
drop policy if exists "comissoes_pagamentos_auth_all" on public.comissoes_pagamentos;
create policy "comissoes_pagamentos_auth_all" on public.comissoes_pagamentos
  for all to authenticated using (true) with check (true);
