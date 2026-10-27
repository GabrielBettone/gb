-- ============================================================================
-- GESSO BETTONE — SCRIPT DE LIMPEZA DE DADOS DEMO E MANUTENÇÃO (OPCIONAL)
-- ============================================================================
-- ATENÇÃO / AVISO IMPORTANTE:
-- ESTE ARQUIVO É DESTRUTIVO E SÓ DEVE SER EXECUTADO DELIBERADAMENTE UMA VEZ,
-- QUANDO O USUÁRIO DESEJAR COMEÇAR O SISTEMA TOTALMENTE DO ZERO!
--
-- NÃO EXECUTE ESTE SCRIPT EM ATUALIZAÇÕES DE ROTINA DO SISTEMA!
-- Para atualizações normais e idempotentes de schema, utilize APENAS o arquivo:
-- self-hosted/supabase/schema.sql (que é 100% seguro e preserva seus dados).
-- ============================================================================

-- 1. LIMPEZA TOTAL DOS PROJETOS DE DEMONSTRAÇÃO DO PORTFÓLIO
-- Remove todos os projetos de teste/demonstração cadastrados inicialmente
DELETE FROM public.site_portfolio;

-- 2. LIMPEZA TOTAL DOS PARCEIROS DE DEMONSTRAÇÃO E CATEGORIAS
-- Remove parceiros de teste e registros de cliques associados
DELETE FROM public.partner_clicks;
DELETE FROM public.site_partners;
DELETE FROM public.partner_categories;

-- 3. ZERA IMAGENS DEFAULT/DEMO DOS SERVIÇOS
-- Preserva o catálogo de nomes e descrições dos serviços, zerando apenas as fotos de exemplo
UPDATE public.site_services
SET imagem_principal = '',
    galeria = '[]'::jsonb,
    arquivo_principal = NULL,
    arquivos_galeria = '[]'::jsonb;

-- 4. LIMPEZA TOTAL DOS DADOS INICIAIS DE VENDAS E PRODUTOS DEMO
-- Desvincula produto_principal de orçamentos para evitar violações de chave estrangeira
UPDATE public.orcamentos SET produto_principal = NULL WHERE produto_principal IS NOT NULL;
DELETE FROM public.alertas;
DELETE FROM public.importacoes;
DELETE FROM public.vendas;
DELETE FROM public.produtos;

-- 5. DEDUPLICAÇÃO OPCIONAL DE PARCELAS DUPLICADAS EM CONTAS A RECEBER
-- Mantém a parcela mais recente de cada combinação (orcamento, numero_parcela, valor_previsto)
-- e cancela as parcelas duplicadas geradas por transições repetidas no Kanban
WITH ranking AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY COALESCE(orcamento, orcamento_id), numero_parcela, valor_previsto
      ORDER BY
        CASE WHEN status = 'paga' THEN 1 WHEN status = 'a_pagar' THEN 2 ELSE 3 END,
        created_at DESC,
        id DESC
    ) as rn
  FROM public.pagamentos_parcelas
)
UPDATE public.pagamentos_parcelas p
SET status = 'cancelada',
    observacoes_baixa = COALESCE(p.observacoes_baixa, '') || ' [Duplicata cancelada manualmente via cleanup]'
FROM ranking r
WHERE p.id = r.id AND r.rn > 1 AND p.status != 'paga';
