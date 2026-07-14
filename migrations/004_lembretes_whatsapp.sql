-- Marca quais lembretes já tiveram o WhatsApp enviado (envio manual pelo operador).
-- Uma linha por imóvel + mês/ano do vencimento. Serve para o botão "Lembretes"
-- ficar vermelho enquanto houver WhatsApp pendente.
create table if not exists lembretes_whatsapp (
  imovel_id uuid not null references imoveis(id) on delete cascade,
  ano int not null,
  mes int not null,
  enviado_em timestamptz not null default now(),
  primary key (imovel_id, ano, mes)
);
