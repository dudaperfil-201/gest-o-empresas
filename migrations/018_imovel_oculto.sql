-- Gestão Empresas · ocultar imóvel (arquivar sem apagar)
-- Marca um imóvel como OCULTO: some das listas, totais e lembretes, MAS os registros e o
-- histórico de pagamentos ficam guardados (não é delete). Ex.: uma garagem incorporada a
-- uma sala — para de ser cobrada à parte, mas o histórico dela permanece.
-- Rodar no SQL Editor do projeto Supabase do Gestão Empresas.

alter table imoveis add column if not exists oculto boolean not null default false;
create index if not exists imoveis_oculto_idx on imoveis (oculto);
