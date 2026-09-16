-- Acertos/rescisões de um EX-inquilino. Quando um inquilino quebra o contrato e sai, a
-- sala fica disponível, mas ele ainda paga rescisão/multa/acertos. Esses valores são
-- "extras" do imóvel (já contam no relatório por imóvel/mês, regime de caixa), agora com
-- vínculo OPCIONAL ao inquilino que pagou — assim dá para listar e editar os acertos dele
-- na seção "Inquilinos anteriores" mesmo depois de ter saído da sala.
-- Coluna nullable: extras normais (energia, condomínio) continuam sem inquilino.
alter table public.extras_itens
  add column if not exists inquilino_id uuid references public.inquilinos(id) on delete set null;

create index if not exists idx_extras_itens_inquilino on public.extras_itens(inquilino_id);
