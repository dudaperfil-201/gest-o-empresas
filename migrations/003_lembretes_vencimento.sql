-- Controle dos lembretes de vencimento já enviados (evita reenviar ao inquilino
-- mais de uma vez no mesmo ciclo). Uma linha por imóvel + mês/ano do vencimento.
create table if not exists lembretes_vencimento (
  imovel_id uuid not null references imoveis(id) on delete cascade,
  ano int not null,
  mes int not null,
  enviado_em timestamptz not null default now(),
  primary key (imovel_id, ano, mes)
);
