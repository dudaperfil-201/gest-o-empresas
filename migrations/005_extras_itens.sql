-- Extras agora são uma LISTA de itens por imóvel/mês (antes era um valor único
-- em pagamentos.valor_extras). Cada item tem descrição + valor.
create table if not exists extras_itens (
  id uuid primary key default gen_random_uuid(),
  imovel_id uuid not null references imoveis(id) on delete cascade,
  ano int not null,
  mes int not null,
  descricao text,
  valor numeric not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists idx_extras_itens_imovel_mes on extras_itens(imovel_id, ano, mes);

-- Migra os extras já cadastrados (valor único em pagamentos) para a nova lista.
insert into extras_itens (imovel_id, ano, mes, descricao, valor)
select imovel_id, ano, mes, descricao_extras, valor_extras
from pagamentos
where valor_extras is not null and valor_extras > 0;
