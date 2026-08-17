-- "Desocupar" um imóvel: o inquilino que sai vira ativo=false (registro e histórico de
-- pagamentos PRESERVADOS) e o imóvel volta a ficar disponível (sem inquilino ATIVO).
-- `data_saida` guarda quando saiu (para a seção "Inquilinos anteriores"). A coluna
-- `ativo` já existe na tabela inquilinos.
alter table public.inquilinos add column if not exists data_saida date;
