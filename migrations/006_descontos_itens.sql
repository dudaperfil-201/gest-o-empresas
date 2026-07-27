-- DESCONTOS: lista de descontos concedidos ao inquilino por imóvel/mês. Espelha
-- a estrutura de extras_itens, mas os valores SUBTRAEM do total recebido do mês.
create table if not exists descontos_itens (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis(id) on delete cascade,
  ano int not null,
  mes int not null,
  descricao text,
  valor numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_descontos_itens_imovel_mes on descontos_itens(imovel_id, ano, mes);

-- Mesma postura de segurança das demais tabelas: RLS ligado, sem policies (o app
-- acessa via service_role no servidor, que bypassa o RLS).
alter table descontos_itens enable row level security;
