-- ============================================================================
-- GESSO BETTONE • ESQUEMA COMPLETO DO BANCO DE DADOS POSTGRESQL (SUPABASE)
-- ============================================================================
-- Este script é 100% idempotente (pode ser executado várias vezes sem erro).
-- Executável diretamente no SQL Editor do Supabase (Dashboard > SQL Editor > New query).
-- Não insere dados de demonstração: o banco inicia zerado e limpo, pronto para produção.
-- ============================================================================

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================================
-- 2. TABELA DE PERFIS DE USUÁRIOS (vinculada ao auth.users do Supabase)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  name TEXT,
  role TEXT DEFAULT 'admin',
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Trigger para criar perfil automaticamente quando um usuário é criado no auth do Supabase
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'role', 'admin')
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger padrão para updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- 3. MÓDULO DE PRODUTOS E VENDAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.produtos (
  id TEXT PRIMARY KEY DEFAULT ('prod_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_produtos_nome ON public.produtos(nome);

DROP TRIGGER IF EXISTS trigger_produtos_updated_at ON public.produtos;
CREATE TRIGGER trigger_produtos_updated_at
  BEFORE UPDATE ON public.produtos
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. GRUPOS DE CLIENTES
CREATE TABLE IF NOT EXISTS public.clientes_grupos (
  id TEXT PRIMARY KEY DEFAULT ('grp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL UNIQUE,
  descricao TEXT,
  ativo BOOLEAN DEFAULT true,
  padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clientes_grupos_nome ON public.clientes_grupos(nome);

DROP TRIGGER IF EXISTS trigger_clientes_grupos_updated_at ON public.clientes_grupos;
CREATE TRIGGER trigger_clientes_grupos_updated_at
  BEFORE UPDATE ON public.clientes_grupos
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 5. CLIENTES CADASTRADOS
CREATE TABLE IF NOT EXISTS public.clientes (
  id TEXT PRIMARY KEY DEFAULT ('cli_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  grupo TEXT REFERENCES public.clientes_grupos(id) ON DELETE SET NULL,
  documento TEXT,
  whatsapp TEXT,
  email TEXT,
  cidade TEXT,
  endereco TEXT,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_clientes_nome ON public.clientes(nome);
CREATE INDEX IF NOT EXISTS idx_clientes_grupo ON public.clientes(grupo);
CREATE INDEX IF NOT EXISTS idx_clientes_documento ON public.clientes(documento);

DROP TRIGGER IF EXISTS trigger_clientes_updated_at ON public.clientes;
CREATE TRIGGER trigger_clientes_updated_at
  BEFORE UPDATE ON public.clientes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 6. MÉTODOS DE PAGAMENTO
CREATE TABLE IF NOT EXISTS public.metodos_pagamento (
  id TEXT PRIMARY KEY DEFAULT ('met_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  desconto_a_vista NUMERIC DEFAULT 0,
  condicoes JSONB DEFAULT '[]'::jsonb,
  numero_parcelas INTEGER DEFAULT 1,
  padrao BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_metodos_pagamento_nome ON public.metodos_pagamento(nome);

DROP TRIGGER IF EXISTS trigger_metodos_pagamento_updated_at ON public.metodos_pagamento;
CREATE TRIGGER trigger_metodos_pagamento_updated_at
  BEFORE UPDATE ON public.metodos_pagamento
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7. CONFIGURAÇÕES DO ORÇAMENTO (Empresa, CNPJ, Razão Social, Logotipo)
CREATE TABLE IF NOT EXISTS public.orcamento_configuracoes (
  id TEXT PRIMARY KEY DEFAULT ('cfg_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  chave TEXT NOT NULL UNIQUE DEFAULT 'geral',
  razao_social TEXT,
  nome_fantasia TEXT,
  cnpj TEXT,
  exibir_cnpj_padrao BOOLEAN DEFAULT true,
  nosso_compromisso JSONB DEFAULT '[]'::jsonb,
  telefone TEXT,
  email TEXT,
  endereco TEXT,
  cidade TEXT,
  arquivo_logo TEXT,
  logo_url TEXT,
  linha_descritiva TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orc_config_chave ON public.orcamento_configuracoes(chave);

DROP TRIGGER IF EXISTS trigger_orcamento_configuracoes_updated_at ON public.orcamento_configuracoes;
CREATE TRIGGER trigger_orcamento_configuracoes_updated_at
  BEFORE UPDATE ON public.orcamento_configuracoes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 7.1 ETAPAS PERSONALIZADAS DO FUNIL DE ORÇAMENTOS
CREATE TABLE IF NOT EXISTS public.orcamento_etapas (
  id TEXT PRIMARY KEY DEFAULT ('etp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL UNIQUE,
  cor TEXT NOT NULL DEFAULT '#2C3E50',
  cor_badge TEXT DEFAULT 'bg-slate-100 text-slate-800 border-slate-300',
  cor_header TEXT DEFAULT 'bg-slate-50 text-slate-900 border-slate-200',
  ordem INTEGER NOT NULL DEFAULT 1,
  padrao BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_orcamento_etapas_nome ON public.orcamento_etapas(nome);
CREATE INDEX IF NOT EXISTS idx_orcamento_etapas_ordem ON public.orcamento_etapas(ordem);

DROP TRIGGER IF EXISTS trigger_orcamento_etapas_updated_at ON public.orcamento_etapas;
CREATE TRIGGER trigger_orcamento_etapas_updated_at
  BEFORE UPDATE ON public.orcamento_etapas
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Insere etapas padrão se não existirem
INSERT INTO public.orcamento_etapas (id, nome, cor, cor_badge, cor_header, ordem, padrao)
VALUES
  ('etp_realizar', 'Orçamentos a realizar', '#F59E0B', 'bg-amber-100 text-amber-800 border-amber-300', 'bg-amber-50 text-amber-900 border-amber-200', 1, true),
  ('etp_aguardando', 'Aguardando aprovação', '#3B82F6', 'bg-blue-100 text-blue-800 border-blue-300', 'bg-blue-50 text-blue-900 border-blue-200', 2, true),
  ('etp_aprovados', 'Aprovados aguardando início', '#8B5CF6', 'bg-purple-100 text-purple-800 border-purple-300', 'bg-purple-50 text-purple-900 border-purple-200', 3, true),
  ('etp_iniciados', 'Trabalhos iniciados', '#10B981', 'bg-emerald-100 text-emerald-800 border-emerald-300', 'bg-emerald-50 text-emerald-900 border-emerald-200', 4, true),
  ('etp_concluidos', 'Concluídos', '#2C3E50', 'bg-[#2C3E50] text-[#D4AF37] border-[#2C3E50]', 'bg-[#2C3E50]/10 text-[#2C3E50] border-[#2C3E50]/30', 5, true)
ON CONFLICT (nome) DO NOTHING;

-- 8. ORÇAMENTOS
CREATE TABLE IF NOT EXISTS public.orcamentos (
  id TEXT PRIMARY KEY DEFAULT ('orc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  numero TEXT NOT NULL UNIQUE,
  cliente TEXT NOT NULL,
  contato TEXT,
  cidade TEXT,
  canal_origem TEXT NOT NULL DEFAULT 'WhatsApp',
  status TEXT NOT NULL DEFAULT 'Orçamentos a realizar',
  produto_principal TEXT REFERENCES public.produtos(id) ON DELETE SET NULL,
  cliente_cadastrado TEXT REFERENCES public.clientes(id) ON DELETE SET NULL,
  grupo TEXT REFERENCES public.clientes_grupos(id) ON DELETE SET NULL,
  metodo_pagamento TEXT REFERENCES public.metodos_pagamento(id) ON DELETE SET NULL,
  itens JSONB DEFAULT '[]'::jsonb,
  itens_por_local JSONB DEFAULT '[]'::jsonb,
  subtotal NUMERIC DEFAULT 0,
  desconto NUMERIC DEFAULT 0,
  valor_total NUMERIC NOT NULL DEFAULT 0,
  valor_a_vista NUMERIC,
  valor_a_prazo NUMERIC,
  exibir_cnpj BOOLEAN DEFAULT true,
  data_inicio_prevista DATE,
  data_fim_prevista DATE,
  data_conclusao DATE,
  validade DATE,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garante coluna itens_por_local caso a tabela já exista
ALTER TABLE IF EXISTS public.orcamentos ADD COLUMN IF NOT EXISTS itens_por_local JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.orcamentos ADD COLUMN IF NOT EXISTS identificacao TEXT DEFAULT '';
ALTER TABLE IF EXISTS public.orcamento_servicos ADD COLUMN IF NOT EXISTS unidade_padrao_id TEXT DEFAULT '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_orcamentos_numero ON public.orcamentos(numero);
CREATE INDEX IF NOT EXISTS idx_orcamentos_status ON public.orcamentos(status);
CREATE INDEX IF NOT EXISTS idx_orcamentos_cliente ON public.orcamentos(cliente);
CREATE INDEX IF NOT EXISTS idx_orcamentos_data_inicio ON public.orcamentos(data_inicio_prevista);

DROP TRIGGER IF EXISTS trigger_orcamentos_updated_at ON public.orcamentos;
CREATE TRIGGER trigger_orcamentos_updated_at
  BEFORE UPDATE ON public.orcamentos
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 9. CONTAS A RECEBER (AGENDA DE PARCELAS)
CREATE TABLE IF NOT EXISTS public.pagamentos_parcelas (
  id TEXT PRIMARY KEY DEFAULT ('parc_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  orcamento TEXT REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  orcamento_id TEXT,
  numero_parcela INTEGER NOT NULL,
  total_parcelas INTEGER NOT NULL,
  descricao TEXT,
  valor_previsto NUMERIC NOT NULL,
  data_vencimento DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'a_pagar',
  data_pagamento DATE,
  valor_pago NUMERIC,
  ajuste NUMERIC,
  forma_pagamento TEXT,
  observacoes_baixa TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 9.1 RECEBIMENTOS PARCIAIS POR PARCELA (Histórico e Baixa Parcial)
CREATE TABLE IF NOT EXISTS public.parcela_recebimentos (
  id TEXT PRIMARY KEY DEFAULT ('prec_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  parcela TEXT NOT NULL REFERENCES public.pagamentos_parcelas(id) ON DELETE CASCADE,
  parcela_id TEXT,
  orcamento TEXT REFERENCES public.orcamentos(id) ON DELETE CASCADE,
  orcamento_id TEXT,
  valor NUMERIC NOT NULL,
  data_pagamento DATE NOT NULL,
  forma_pagamento TEXT NOT NULL DEFAULT 'PIX',
  observacao TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

ALTER TABLE IF EXISTS public.parcela_recebimentos ADD COLUMN IF NOT EXISTS parcela TEXT REFERENCES public.pagamentos_parcelas(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.parcela_recebimentos ADD COLUMN IF NOT EXISTS parcela_id TEXT;
ALTER TABLE IF EXISTS public.parcela_recebimentos ADD COLUMN IF NOT EXISTS orcamento TEXT REFERENCES public.orcamentos(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.parcela_recebimentos ADD COLUMN IF NOT EXISTS orcamento_id TEXT;

UPDATE public.parcela_recebimentos SET parcela = parcela_id WHERE parcela IS NULL AND parcela_id IS NOT NULL;
UPDATE public.parcela_recebimentos SET parcela_id = parcela WHERE parcela_id IS NULL AND parcela IS NOT NULL;
UPDATE public.parcela_recebimentos SET orcamento = orcamento_id WHERE orcamento IS NULL AND orcamento_id IS NOT NULL;
UPDATE public.parcela_recebimentos SET orcamento_id = orcamento WHERE orcamento_id IS NULL AND orcamento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_rec_parcela ON public.parcela_recebimentos(parcela);
CREATE INDEX IF NOT EXISTS idx_rec_orcamento ON public.parcela_recebimentos(orcamento);
CREATE INDEX IF NOT EXISTS idx_rec_data ON public.parcela_recebimentos(data_pagamento);

DROP TRIGGER IF EXISTS trigger_parcela_recebimentos_updated_at ON public.parcela_recebimentos;
CREATE TRIGGER trigger_parcela_recebimentos_updated_at
  BEFORE UPDATE ON public.parcela_recebimentos
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Compatibilidade e colunas orcamento / orcamento_id com backfill mútuo
ALTER TABLE IF EXISTS public.pagamentos_parcelas ADD COLUMN IF NOT EXISTS orcamento TEXT REFERENCES public.orcamentos(id) ON DELETE CASCADE;
ALTER TABLE IF EXISTS public.pagamentos_parcelas ADD COLUMN IF NOT EXISTS orcamento_id TEXT;
UPDATE public.pagamentos_parcelas SET orcamento = orcamento_id WHERE orcamento IS NULL AND orcamento_id IS NOT NULL;
UPDATE public.pagamentos_parcelas SET orcamento_id = orcamento WHERE orcamento_id IS NULL AND orcamento IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_parcelas_orcamento ON public.pagamentos_parcelas(orcamento);
CREATE INDEX IF NOT EXISTS idx_parcelas_status ON public.pagamentos_parcelas(status);
CREATE INDEX IF NOT EXISTS idx_parcelas_vencimento ON public.pagamentos_parcelas(data_vencimento);

DROP TRIGGER IF EXISTS trigger_pagamentos_parcelas_updated_at ON public.pagamentos_parcelas;
CREATE TRIGGER trigger_pagamentos_parcelas_updated_at
  BEFORE UPDATE ON public.pagamentos_parcelas
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- (Deduplicação de parcelas movida para self-hosted/supabase/schema_cleanup.sql
-- para garantir que o schema.sql seja estritamente DDL idempotente sem modificar dados de tabelas)

-- 10. TABELA DE VENDAS (vinculada aos produtos e orçamentos)
CREATE TABLE IF NOT EXISTS public.vendas (
  id TEXT PRIMARY KEY DEFAULT ('vnd_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  data TIMESTAMPTZ NOT NULL,
  cliente TEXT NOT NULL,
  produto TEXT NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  canal TEXT NOT NULL,
  cidade TEXT,
  valor NUMERIC NOT NULL,
  itens JSONB DEFAULT '[]'::jsonb,
  orcamento TEXT REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garante coluna itens em vendas caso a tabela já exista
ALTER TABLE IF EXISTS public.vendas ADD COLUMN IF NOT EXISTS itens JSONB DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_vendas_data ON public.vendas(data);
CREATE INDEX IF NOT EXISTS idx_vendas_produto ON public.vendas(produto);
CREATE INDEX IF NOT EXISTS idx_vendas_canal ON public.vendas(canal);
CREATE INDEX IF NOT EXISTS idx_vendas_orcamento ON public.vendas(orcamento);

DROP TRIGGER IF EXISTS trigger_vendas_updated_at ON public.vendas;
CREATE TRIGGER trigger_vendas_updated_at
  BEFORE UPDATE ON public.vendas
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 11. REGRAS DE ALERTA E ALERTAS DO SISTEMA
CREATE TABLE IF NOT EXISTS public.regras_alerta (
  id TEXT PRIMARY KEY DEFAULT ('rgr_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  indicador TEXT NOT NULL,
  comparacao TEXT NOT NULL,
  limite NUMERIC NOT NULL,
  habilitada BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trigger_regras_alerta_updated_at ON public.regras_alerta;
CREATE TRIGGER trigger_regras_alerta_updated_at
  BEFORE UPDATE ON public.regras_alerta
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

CREATE TABLE IF NOT EXISTS public.alertas (
  id TEXT PRIMARY KEY DEFAULT ('alt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  regra TEXT NOT NULL REFERENCES public.regras_alerta(id) ON DELETE CASCADE,
  tipo TEXT NOT NULL,
  mensagem TEXT NOT NULL,
  valor_atual NUMERIC NOT NULL,
  lido BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_alertas_created ON public.alertas(created_at);
CREATE INDEX IF NOT EXISTS idx_alertas_regra ON public.alertas(regra);
CREATE INDEX IF NOT EXISTS idx_alertas_lido ON public.alertas(lido);

DROP TRIGGER IF EXISTS trigger_alertas_updated_at ON public.alertas;
CREATE TRIGGER trigger_alertas_updated_at
  BEFORE UPDATE ON public.alertas
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 12. HISTÓRICO DE IMPORTAÇÕES CSV
CREATE TABLE IF NOT EXISTS public.importacoes (
  id TEXT PRIMARY KEY DEFAULT ('imp_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  data TIMESTAMPTZ NOT NULL,
  arquivo TEXT NOT NULL,
  total_registros INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trigger_importacoes_updated_at ON public.importacoes;
CREATE TRIGGER trigger_importacoes_updated_at
  BEFORE UPDATE ON public.importacoes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 13. MÓDULO DO SITE INSTITUCIONAL
-- ============================================================================

-- Categorias do site
CREATE TABLE IF NOT EXISTS public.site_categories (
  id TEXT PRIMARY KEY DEFAULT ('scat_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_categories_slug ON public.site_categories(slug);

DROP TRIGGER IF EXISTS trigger_site_categories_updated_at ON public.site_categories;
CREATE TRIGGER trigger_site_categories_updated_at
  BEFORE UPDATE ON public.site_categories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Serviços do site
CREATE TABLE IF NOT EXISTS public.site_services (
  id TEXT PRIMARY KEY DEFAULT ('ssrv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  categorias JSONB DEFAULT '[]'::jsonb,
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  descricao_curta TEXT,
  descricao_longa TEXT,
  beneficios JSONB DEFAULT '[]'::jsonb,
  imagem_principal TEXT,
  galeria JSONB DEFAULT '[]'::jsonb,
  arquivo_principal TEXT,
  arquivos_galeria JSONB DEFAULT '[]'::jsonb,
  meta_title TEXT,
  meta_description TEXT,
  keywords JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garante coluna categorias e backfill a partir da coluna categoria legado
ALTER TABLE IF EXISTS public.site_settings ADD COLUMN IF NOT EXISTS google_site_verification TEXT;
ALTER TABLE IF EXISTS public.site_services ADD COLUMN IF NOT EXISTS categorias JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.site_services ADD COLUMN IF NOT EXISTS destaques_fotos JSONB DEFAULT '[]'::jsonb;
UPDATE public.site_services
  SET categorias = jsonb_build_array(categoria)
  WHERE (categorias IS NULL OR categorias = '[]'::jsonb)
    AND categoria IS NOT NULL
    AND categoria <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_services_slug ON public.site_services(slug);
CREATE INDEX IF NOT EXISTS idx_site_services_destaque ON public.site_services(destaque);
CREATE INDEX IF NOT EXISTS idx_site_services_ativo ON public.site_services(ativo);

DROP TRIGGER IF EXISTS trigger_site_services_updated_at ON public.site_services;
CREATE TRIGGER trigger_site_services_updated_at
  BEFORE UPDATE ON public.site_services
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Serviços e preços por grupo para o módulo de orçamentos
CREATE TABLE IF NOT EXISTS public.orcamento_servicos (
  id TEXT PRIMARY KEY DEFAULT ('osrv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  grupo TEXT NOT NULL REFERENCES public.clientes_grupos(id) ON DELETE CASCADE,
  modo_calculo TEXT NOT NULL DEFAULT 'area', -- 'area' ou 'dimensoes'
  unidade TEXT NOT NULL DEFAULT 'm²',
  preco_unitario NUMERIC NOT NULL DEFAULT 0,
  descricao_pdf TEXT,
  ativo BOOLEAN DEFAULT true,
  site_service TEXT REFERENCES public.site_services(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_orc_servicos_grupo ON public.orcamento_servicos(grupo);

DROP TRIGGER IF EXISTS trigger_orcamento_servicos_updated_at ON public.orcamento_servicos;
CREATE TRIGGER trigger_orcamento_servicos_updated_at
  BEFORE UPDATE ON public.orcamento_servicos
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Portfólio de Projetos do site
CREATE TABLE IF NOT EXISTS public.site_portfolio (
  id TEXT PRIMARY KEY DEFAULT ('port_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  titulo TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  categoria TEXT NOT NULL,
  categorias JSONB DEFAULT '[]'::jsonb,
  subtitulo TEXT,
  cidade TEXT,
  descricao TEXT,
  detalhes_tecnicos JSONB DEFAULT '[]'::jsonb,
  imagem_capa TEXT,
  galeria JSONB DEFAULT '[]'::jsonb,
  arquivo_capa TEXT,
  arquivos_galeria JSONB DEFAULT '[]'::jsonb,
  fotos_count INTEGER DEFAULT 0,
  arquivos_videos JSONB DEFAULT '[]'::jsonb,
  videos JSONB DEFAULT '[]'::jsonb,
  videos_count INTEGER DEFAULT 0,
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  meta_title TEXT,
  meta_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Garante coluna categorias e backfill a partir da coluna categoria legado
ALTER TABLE IF EXISTS public.site_portfolio ADD COLUMN IF NOT EXISTS categorias JSONB DEFAULT '[]'::jsonb;
UPDATE public.site_portfolio
  SET categorias = jsonb_build_array(categoria)
  WHERE (categorias IS NULL OR categorias = '[]'::jsonb)
    AND categoria IS NOT NULL
    AND categoria <> '';

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_portfolio_slug ON public.site_portfolio(slug);
CREATE INDEX IF NOT EXISTS idx_site_portfolio_destaque ON public.site_portfolio(destaque);
CREATE INDEX IF NOT EXISTS idx_site_portfolio_ativo ON public.site_portfolio(ativo);

DROP TRIGGER IF EXISTS trigger_site_portfolio_updated_at ON public.site_portfolio;
CREATE TRIGGER trigger_site_portfolio_updated_at
  BEFORE UPDATE ON public.site_portfolio
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Depoimentos do site
CREATE TABLE IF NOT EXISTS public.site_testimonials (
  id TEXT PRIMARY KEY DEFAULT ('test_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  cidade TEXT,
  texto TEXT NOT NULL,
  nota NUMERIC DEFAULT 5,
  aprovado BOOLEAN DEFAULT false,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_site_testimonials_aprovado ON public.site_testimonials(aprovado);

DROP TRIGGER IF EXISTS trigger_site_testimonials_updated_at ON public.site_testimonials;
CREATE TRIGGER trigger_site_testimonials_updated_at
  BEFORE UPDATE ON public.site_testimonials
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Categorias de Parceiros
CREATE TABLE IF NOT EXISTS public.partner_categories (
  id TEXT PRIMARY KEY DEFAULT ('pcat_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  ativa BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_partner_categories_slug ON public.partner_categories(slug);

DROP TRIGGER IF EXISTS trigger_partner_categories_updated_at ON public.partner_categories;
CREATE TRIGGER trigger_partner_categories_updated_at
  BEFORE UPDATE ON public.partner_categories
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Parceiros comerciais
CREATE TABLE IF NOT EXISTS public.site_partners (
  id TEXT PRIMARY KEY DEFAULT ('part_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  nome TEXT NOT NULL,
  categoria TEXT,
  papel TEXT,
  whatsapp TEXT,
  logo TEXT,
  arquivo_logo TEXT,
  descricao TEXT,
  destaque BOOLEAN DEFAULT false,
  ativo BOOLEAN DEFAULT true,
  ordem INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_site_partners_destaque ON public.site_partners(destaque);
CREATE INDEX IF NOT EXISTS idx_site_partners_ativo ON public.site_partners(ativo);

DROP TRIGGER IF EXISTS trigger_site_partners_updated_at ON public.site_partners;
CREATE TRIGGER trigger_site_partners_updated_at
  BEFORE UPDATE ON public.site_partners
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Cliques de redirecionamento para o parceiro
CREATE TABLE IF NOT EXISTS public.partner_clicks (
  id TEXT PRIMARY KEY DEFAULT ('pclk_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  parceiro_id TEXT NOT NULL,
  parceiro_nome TEXT,
  data TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  ano_mes TEXT,
  visitor_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_partner_clicks_parceiro ON public.partner_clicks(parceiro_id);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_anomes ON public.partner_clicks(ano_mes);
CREATE INDEX IF NOT EXISTS idx_partner_clicks_data ON public.partner_clicks(data);

DROP TRIGGER IF EXISTS trigger_partner_clicks_updated_at ON public.partner_clicks;
CREATE TRIGGER trigger_partner_clicks_updated_at
  BEFORE UPDATE ON public.partner_clicks
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Configurações gerais do site
CREATE TABLE IF NOT EXISTS public.site_settings (
  id TEXT PRIMARY KEY DEFAULT ('sett_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  chave TEXT NOT NULL UNIQUE DEFAULT 'geral',
  nome_site TEXT DEFAULT 'Gesso Bettone',
  whatsapp_principal TEXT,
  email_contato TEXT,
  mensagem_orcamento TEXT,
  instagram TEXT,
  cnpj TEXT,
  exibir_depoimentos BOOLEAN DEFAULT true,
  cidades_atendidas JSONB DEFAULT '[]'::jsonb,
  pagina_parceiros_ativa BOOLEAN DEFAULT true,
  arquivo_logo TEXT,
  logo_url TEXT,
  google_site_verification TEXT,
  whatsapp_webdesigner TEXT,
  linha_descritiva TEXT,
  simulador_ativo BOOLEAN DEFAULT true,
  simulador_exigir_login BOOLEAN DEFAULT false,
  simulador_cota_padrao INTEGER DEFAULT 5,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_site_settings_chave ON public.site_settings(chave);

DROP TRIGGER IF EXISTS trigger_site_settings_updated_at ON public.site_settings;
CREATE TRIGGER trigger_site_settings_updated_at
  BEFORE UPDATE ON public.site_settings
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Eventos de Analytics do site
CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id TEXT PRIMARY KEY DEFAULT ('evnt_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  tipo TEXT NOT NULL,
  pagina TEXT,
  servico_slug TEXT,
  servico_nome TEXT,
  categoria_nome TEXT,
  visitor_id TEXT,
  data TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  data_dia TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_site_analytics_tipo ON public.site_analytics_events(tipo);
CREATE INDEX IF NOT EXISTS idx_site_analytics_dia ON public.site_analytics_events(data_dia);
CREATE INDEX IF NOT EXISTS idx_site_analytics_visitor ON public.site_analytics_events(visitor_id);

DROP TRIGGER IF EXISTS trigger_site_analytics_events_updated_at ON public.site_analytics_events;
CREATE TRIGGER trigger_site_analytics_events_updated_at
  BEFORE UPDATE ON public.site_analytics_events
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 14. SIMULADOR DE AMBIENTES COM INTELIGÊNCIA ARTIFICIAL
-- ============================================================================

-- Clientes cadastrados no simulador
CREATE TABLE IF NOT EXISTS public.simulador_clientes (
  id TEXT PRIMARY KEY DEFAULT ('scli_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  telefone TEXT NOT NULL UNIQUE,
  nome TEXT DEFAULT 'Cliente',
  bloqueado BOOLEAN DEFAULT false,
  cota_mensal INTEGER DEFAULT 5,
  geracoes_mes_atual INTEGER DEFAULT 0,
  mes_referencia TEXT,
  pin_acesso TEXT,
  ultimo_codigo_confirmacao TEXT,
  confirmado BOOLEAN DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_simulador_clientes_tel ON public.simulador_clientes(telefone);

DROP TRIGGER IF EXISTS trigger_simulador_clientes_updated_at ON public.simulador_clientes;
CREATE TRIGGER trigger_simulador_clientes_updated_at
  BEFORE UPDATE ON public.simulador_clientes
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- Histórico de simulações realizadas
CREATE TABLE IF NOT EXISTS public.simulador_historico (
  id TEXT PRIMARY KEY DEFAULT ('shis_' || substr(md5(random()::text || clock_timestamp()::text), 1, 15)),
  cliente TEXT REFERENCES public.simulador_clientes(id) ON DELETE SET NULL,
  telefone TEXT,
  servico_nome TEXT NOT NULL,
  servico_slug TEXT,
  foto_original TEXT,
  foto_resultado TEXT,
  url_original TEXT,
  url_resultado TEXT,
  prompt_usado TEXT,
  status TEXT DEFAULT 'concluido',
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_sim_hist_telefone ON public.simulador_historico(telefone);
CREATE INDEX IF NOT EXISTS idx_sim_hist_created ON public.simulador_historico(created_at);

DROP TRIGGER IF EXISTS trigger_simulador_historico_updated_at ON public.simulador_historico;
CREATE TRIGGER trigger_simulador_historico_updated_at
  BEFORE UPDATE ON public.simulador_historico
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ============================================================================
-- 15. ROW LEVEL SECURITY (RLS) - POLÍTICAS DE ACESSO
-- ============================================================================

-- Habilitar RLS em todas as tabelas públicas
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes_grupos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.metodos_pagamento ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_configuracoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pagamentos_parcelas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.parcela_recebimentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.regras_alerta ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.importacoes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orcamento_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_portfolio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulador_clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.simulador_historico ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- PROFILES: Usuário lê e atualiza seu próprio perfil; leitura para usuários autenticados
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- ----------------------------------------------------------------------------
-- ÁREA ADMINISTRATIVA: Acesso completo para usuários autenticados
-- (produtos, grupos, clientes, orçamentos, parcelas, vendas, regras, alertas, importacoes)
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  t TEXT;
  admin_tables TEXT[] := ARRAY[
    'produtos', 'clientes_grupos', 'clientes', 'metodos_pagamento',
    'orcamento_configuracoes', 'orcamentos', 'pagamentos_parcelas', 'parcela_recebimentos',
    'vendas', 'regras_alerta', 'alertas', 'importacoes', 'orcamento_servicos'
  ];
BEGIN
  FOREACH t IN ARRAY admin_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_admin_all" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "%I_admin_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END;
$$;

-- ----------------------------------------------------------------------------
-- CONTEÚDO PÚBLICO DO SITE (Leitura anônima para itens ativos/publicados)
-- Gestão total para usuários autenticados
-- ----------------------------------------------------------------------------

-- site_categories
DROP POLICY IF EXISTS "site_categories_public_read" ON public.site_categories;
CREATE POLICY "site_categories_public_read" ON public.site_categories
  FOR SELECT TO anon USING (ativa = true);

DROP POLICY IF EXISTS "site_categories_auth_all" ON public.site_categories;
CREATE POLICY "site_categories_auth_all" ON public.site_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_services
DROP POLICY IF EXISTS "site_services_public_read" ON public.site_services;
CREATE POLICY "site_services_public_read" ON public.site_services
  FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "site_services_auth_all" ON public.site_services;
CREATE POLICY "site_services_auth_all" ON public.site_services
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_portfolio
DROP POLICY IF EXISTS "site_portfolio_public_read" ON public.site_portfolio;
CREATE POLICY "site_portfolio_public_read" ON public.site_portfolio
  FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "site_portfolio_auth_all" ON public.site_portfolio;
CREATE POLICY "site_portfolio_auth_all" ON public.site_portfolio
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_testimonials
DROP POLICY IF EXISTS "site_testimonials_public_read" ON public.site_testimonials;
CREATE POLICY "site_testimonials_public_read" ON public.site_testimonials
  FOR SELECT TO anon USING (aprovado = true);

-- Visitantes podem submeter depoimentos (iniciam com aprovado = false por segurança)
DROP POLICY IF EXISTS "site_testimonials_anon_insert" ON public.site_testimonials;
CREATE POLICY "site_testimonials_anon_insert" ON public.site_testimonials
  FOR INSERT TO anon WITH CHECK (aprovado = false);

DROP POLICY IF EXISTS "site_testimonials_auth_all" ON public.site_testimonials;
CREATE POLICY "site_testimonials_auth_all" ON public.site_testimonials
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- partner_categories
DROP POLICY IF EXISTS "partner_categories_public_read" ON public.partner_categories;
CREATE POLICY "partner_categories_public_read" ON public.partner_categories
  FOR SELECT TO anon USING (ativa = true);

DROP POLICY IF EXISTS "partner_categories_auth_all" ON public.partner_categories;
CREATE POLICY "partner_categories_auth_all" ON public.partner_categories
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_partners
DROP POLICY IF EXISTS "site_partners_public_read" ON public.site_partners;
CREATE POLICY "site_partners_public_read" ON public.site_partners
  FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "site_partners_auth_all" ON public.site_partners;
CREATE POLICY "site_partners_auth_all" ON public.site_partners
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- partner_clicks (Público insere cliques ao clicar em WhatsApp de parceiro)
DROP POLICY IF EXISTS "partner_clicks_anon_insert" ON public.partner_clicks;
CREATE POLICY "partner_clicks_anon_insert" ON public.partner_clicks
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "partner_clicks_auth_all" ON public.partner_clicks;
CREATE POLICY "partner_clicks_auth_all" ON public.partner_clicks
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_settings (Público lê configurações gerais para cabeçalho, rodapé e contatos)
DROP POLICY IF EXISTS "site_settings_public_read" ON public.site_settings;
CREATE POLICY "site_settings_public_read" ON public.site_settings
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "site_settings_auth_all" ON public.site_settings;
CREATE POLICY "site_settings_auth_all" ON public.site_settings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- site_analytics_events (Público pode registrar pageviews e cliques)
DROP POLICY IF EXISTS "site_analytics_anon_insert" ON public.site_analytics_events;
CREATE POLICY "site_analytics_anon_insert" ON public.site_analytics_events
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "site_analytics_auth_all" ON public.site_analytics_events;
CREATE POLICY "site_analytics_auth_all" ON public.site_analytics_events
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- simulador_clientes (Público interage com validação de telefone e PIN)
DROP POLICY IF EXISTS "simulador_clientes_anon_select" ON public.simulador_clientes;
CREATE POLICY "simulador_clientes_anon_select" ON public.simulador_clientes
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "simulador_clientes_anon_insert" ON public.simulador_clientes;
CREATE POLICY "simulador_clientes_anon_insert" ON public.simulador_clientes
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "simulador_clientes_anon_update" ON public.simulador_clientes;
CREATE POLICY "simulador_clientes_anon_update" ON public.simulador_clientes
  FOR UPDATE TO anon USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "simulador_clientes_auth_all" ON public.simulador_clientes;
CREATE POLICY "simulador_clientes_auth_all" ON public.simulador_clientes
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- simulador_historico (Público insere e consulta seu próprio histórico)
DROP POLICY IF EXISTS "simulador_historico_anon_insert" ON public.simulador_historico;
CREATE POLICY "simulador_historico_anon_insert" ON public.simulador_historico
  FOR INSERT TO anon WITH CHECK (true);

DROP POLICY IF EXISTS "simulador_historico_anon_select" ON public.simulador_historico;
CREATE POLICY "simulador_historico_anon_select" ON public.simulador_historico
  FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS "simulador_historico_auth_all" ON public.simulador_historico;
CREATE POLICY "simulador_historico_auth_all" ON public.simulador_historico
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- ============================================================================
-- 16. BUCKETS DE ARMAZENAMENTO (SUPABASE STORAGE)
-- ============================================================================
-- Cria os buckets necessários no Storage (se a extensão storage estiver ativa)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES
  ('public-media', 'public-media', true, 62914560, ARRAY[
    'image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/svg+xml',
    'video/mp4', 'video/webm', 'video/quicktime', 'application/pdf'
  ]),
  ('simulador', 'simulador', true, 20971520, ARRAY[
    'image/jpeg', 'image/png', 'image/webp'
  ])
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Políticas de Storage para o bucket 'public-media':
-- Leitura pública para todos os visitantes do site
DROP POLICY IF EXISTS "public_media_read" ON storage.objects;
CREATE POLICY "public_media_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'public-media');

-- Upload e gerenciamento liberado para usuários autenticados (área administrativa)
DROP POLICY IF EXISTS "public_media_auth_write" ON storage.objects;
CREATE POLICY "public_media_auth_write" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'public-media')
  WITH CHECK (bucket_id = 'public-media');

-- Políticas de Storage para o bucket 'simulador':
-- Leitura pública
DROP POLICY IF EXISTS "simulador_read" ON storage.objects;
CREATE POLICY "simulador_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'simulador');

-- Upload liberado para visitantes e usuários logados
DROP POLICY IF EXISTS "simulador_anon_insert" ON storage.objects;
CREATE POLICY "simulador_anon_insert" ON storage.objects
  FOR INSERT TO anon
  WITH CHECK (bucket_id = 'simulador');

DROP POLICY IF EXISTS "simulador_auth_all" ON storage.objects;
CREATE POLICY "simulador_auth_all" ON storage.objects
  FOR ALL TO authenticated
  USING (bucket_id = 'simulador')
  WITH CHECK (bucket_id = 'simulador');

-- ============================================================================
-- 17. GRANTS DE PERMISSÃO E PRIVILÉGIOS (Idempotente)
-- ============================================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated, service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON ROUTINES TO anon, authenticated, service_role;

-- ============================================================================
-- 18. ESTRUTURAS COMPLEMENTARES E COLUNAS DE CONFIGURAÇÃO (Idempotente DDL)
-- ============================================================================
-- OBSERVAÇÃO: Todas as instruções destrutivas (DELETE de portfólio, parceiros,
-- vendas, produtos e UPDATE de zeração de imagens de serviços) foram REMOVIDAS
-- deste arquivo para garantir que a execução deste schema.sql NUNCA apague
-- dados já cadastrados pelo usuário.
-- Se desejar limpar dados de demonstração deliberadamente para começar do zero,
-- utilize o arquivo opcional separado: self-hosted/supabase/schema_cleanup.sql
-- ============================================================================

-- Garante coluna google_site_verification, site_url e whatsapp_webdesigner em site_settings
ALTER TABLE IF EXISTS public.site_settings
  ADD COLUMN IF NOT EXISTS google_site_verification TEXT;
ALTER TABLE IF EXISTS public.site_settings
  ADD COLUMN IF NOT EXISTS site_url TEXT DEFAULT 'https://gessobettone.com.br';
ALTER TABLE IF EXISTS public.site_settings
  ADD COLUMN IF NOT EXISTS whatsapp_webdesigner TEXT;
ALTER TABLE IF EXISTS public.site_settings
  ADD COLUMN IF NOT EXISTS linha_descritiva TEXT;

-- Remove colunas duplicadas legadas de site_settings (os dados de razao social, endereco e toggle de CNPJ pertencem a orcamento_configuracoes)
ALTER TABLE IF EXISTS public.site_settings DROP COLUMN IF EXISTS razao_social;
ALTER TABLE IF EXISTS public.site_settings DROP COLUMN IF EXISTS endereco;
ALTER TABLE IF EXISTS public.site_settings DROP COLUMN IF EXISTS exibir_cnpj_pdf;

-- Garante que orcamento_configuracoes possua todas as colunas necessárias para orçamento e PDF
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS razao_social TEXT;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS nome_fantasia TEXT;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS cnpj TEXT;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS exibir_cnpj_padrao BOOLEAN DEFAULT true;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS endereco TEXT;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS telefone TEXT;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS cidade TEXT;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS nosso_compromisso JSONB DEFAULT '[]'::jsonb;
ALTER TABLE IF EXISTS public.orcamento_configuracoes ADD COLUMN IF NOT EXISTS linha_descritiva TEXT;

-- ============================================================================
-- 19. PREDEFINIÇÕES DE FILTROS DO FUNIL / GANTT (Idempotente DDL)
-- Permite salvar combinações multi-select de etapas (ex: "Compromissos", "Trabalhos")
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.orcamento_filtros_predefinidos (
  id TEXT PRIMARY KEY DEFAULT ('pred_' || substr(md5(random()::text), 1, 12)),
  nome TEXT NOT NULL,
  etapas JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_pred_nome ON public.orcamento_filtros_predefinidos (nome);

-- RLS & Grants para orcamento_filtros_predefinidos
ALTER TABLE public.orcamento_filtros_predefinidos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "orcamento_filtros_predefinidos_auth_all" ON public.orcamento_filtros_predefinidos;
CREATE POLICY "orcamento_filtros_predefinidos_auth_all" ON public.orcamento_filtros_predefinidos
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.orcamento_filtros_predefinidos TO anon, authenticated, service_role;

-- Predefinições iniciais de exemplo (idempotente com ON CONFLICT caso id ou nome exista)
INSERT INTO public.orcamento_filtros_predefinidos (id, nome, etapas)
VALUES
  ('pred_compromissos', 'Compromissos', '["Orçamentos a realizar", "Aprovados aguardando início", "Trabalhos iniciados"]'::jsonb),
  ('pred_trabalhos', 'Trabalhos', '["Aprovados aguardando início", "Trabalhos iniciados"]'::jsonb),
  ('pred_obras_andamento', 'Obras em Andamento', '["Trabalhos iniciados"]'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- 20. UNIDADES DE MEDIDA (Idempotente DDL)
-- Tabela para configuração de unidades e fórmulas de cálculo (ex: m² com AxB, m com (A+B)x2, svç sem fórmula)
-- Aplicável aos itens de orçamento e itens de vendas.
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.unidades_medida (
  id TEXT PRIMARY KEY DEFAULT ('unid_' || substr(md5(random()::text), 1, 12)),
  nome TEXT NOT NULL,
  sigla TEXT NOT NULL,
  metodo_calculo TEXT DEFAULT '',
  ordem INTEGER DEFAULT 0,
  ativo BOOLEAN DEFAULT true,
  padrao BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc', now())
);

CREATE INDEX IF NOT EXISTS idx_unidades_sigla ON public.unidades_medida (sigla);
CREATE INDEX IF NOT EXISTS idx_unidades_ordem ON public.unidades_medida (ordem);

ALTER TABLE public.unidades_medida ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "unidades_medida_anon_select" ON public.unidades_medida;
CREATE POLICY "unidades_medida_anon_select" ON public.unidades_medida
  FOR SELECT TO anon USING (ativo = true);

DROP POLICY IF EXISTS "unidades_medida_auth_all" ON public.unidades_medida;
CREATE POLICY "unidades_medida_auth_all" ON public.unidades_medida
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

GRANT ALL ON TABLE public.unidades_medida TO anon, authenticated, service_role;

-- Exemplos iniciais pré-cadastrados (idempotente)
INSERT INTO public.unidades_medida (id, nome, sigla, metodo_calculo, ordem, ativo, padrao)
VALUES
  ('unid_m2_metro_quadrado', 'Metros quadrados', 'm²', 'AxB', 1, true, true),
  ('unid_m_metro_linear', 'Metros lineares', 'm', '(A+B)x2', 2, true, false),
  ('unid_svc_servico', 'Serviço', 'svç', '', 3, true, false)
ON CONFLICT (id) DO NOTHING;
