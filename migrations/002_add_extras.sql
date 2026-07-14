-- Extras pagos pelo inquilino além do aluguel (energia, condomínio, etc.).
-- valor_extras: valor total dos extras do mês (entra no montante total).
-- descricao_extras: texto livre descrevendo os extras (ex: "energia + condomínio").
alter table pagamentos add column if not exists valor_extras numeric;
alter table pagamentos add column if not exists descricao_extras text;
