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

-- RLS ligado + política pro usuário logado (role authenticated), IGUAL às demais
-- tabelas do app. IMPORTANTE: sem esta policy, o cliente do servidor (que age como
-- o usuário logado, NÃO como service_role) fica bloqueado para LER e GRAVAR — foi
-- o bug em que os descontos "sumiam" (não salvavam nem apareciam no total).
alter table descontos_itens enable row level security;
create policy "descontos_itens_auth_all" on descontos_itens
  for all to authenticated using (true) with check (true);
