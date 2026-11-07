-- ============================================================================
-- GESSO BETTONE • MÓDULO NFS-e NACIONAL (Supabase)
-- ============================================================================
-- Arquivo para rodar manualmente no SQL Editor do Supabase do usuário
-- (projeto phjthpjdbhqhcfnyjjzc — o mesmo do site na Hostinger).
--
-- Idempotente: pode ser executado várias vezes sem erro.
-- Rodar DEPOIS de self-hosted/supabase/schema.sql (referencia public.orcamentos).
--
-- Cria: nfse_emitente, nfse_servicos, nfse_config, nfse_certificado, nfse_notas
-- RLS liberada para usuários autenticados no padrão já usado no projeto
-- (GRANT + policies "admin_all").
-- Seed: emitente GB SOLUCOES LTDA + serviços LC 116 (gesso/drywall/obras).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. EMITENTE (dados da empresa emitente)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nfse_emitente (
  id TEXT PRIMARY KEY DEFAULT ('nfse_emit_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  razao_social TEXT NOT NULL,
  nome_fantasia TEXT,
  cnpj TEXT NOT NULL,
  inscricao_municipal TEXT,
  logradouro TEXT,
  numero TEXT,
  bairro TEXT,
  codigo_municipio_ibge TEXT,
  municipio TEXT,
  uf TEXT,
  cep TEXT,
  telefone TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trigger_nfse_emitente_updated_at ON public.nfse_emitente;
CREATE TRIGGER trigger_nfse_emitente_updated_at
  BEFORE UPDATE ON public.nfse_emitente
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 2. SERVIÇOS (itens da LC 116/2003 praticados pela empresa)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nfse_servicos (
  id TEXT PRIMARY KEY DEFAULT ('nfse_serv_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  nome TEXT NOT NULL,
  codigo_lc116 TEXT NOT NULL,
  descricao TEXT,
  aliquota_iss NUMERIC NOT NULL DEFAULT 2,
  reter_irrf BOOLEAN NOT NULL DEFAULT false,
  reter_csll BOOLEAN NOT NULL DEFAULT false,
  reter_cofins BOOLEAN NOT NULL DEFAULT false,
  reter_pis BOOLEAN NOT NULL DEFAULT false,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_nfse_servicos_nome ON public.nfse_servicos(nome);
CREATE INDEX IF NOT EXISTS idx_nfse_servicos_lc ON public.nfse_servicos(codigo_lc116);

DROP TRIGGER IF EXISTS trigger_nfse_servicos_updated_at ON public.nfse_servicos;
CREATE TRIGGER trigger_nfse_servicos_updated_at
  BEFORE UPDATE ON public.nfse_servicos
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 3. CONFIGURAÇÕES DO MÓDULO (município de incidência, alíquota, ambiente)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nfse_config (
  id TEXT PRIMARY KEY DEFAULT ('nfse_cfg_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
  municipio_incidencia TEXT NOT NULL DEFAULT 'São Pedro',
  municipio_incidencia_ibge TEXT NOT NULL DEFAULT '3550407',
  uf_municipio_incidencia TEXT NOT NULL DEFAULT 'SP',
  aliquota_iss_padrao NUMERIC NOT NULL DEFAULT 2,
  reter_federais_padrao BOOLEAN NOT NULL DEFAULT false,
  observacoes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trigger_nfse_config_updated_at ON public.nfse_config;
CREATE TRIGGER trigger_nfse_config_updated_at
  BEFORE UPDATE ON public.nfse_config
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 4. CERTIFICADO A1 (binário .pfx + senha CIFRADA — nunca em texto plano)
-- ----------------------------------------------------------------------------
-- A senha é cifrada no SERVIDOR (Edge Function) com AES-256-GCM usando a
-- variável de segredo NFSE_CERT_PASSWORD_KEY; a chave nunca sai do servidor.
-- O arquivo .pfx fica em Storage privado (bucket nfse_certificados), nunca público.
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nfse_certificado (
  id TEXT PRIMARY KEY DEFAULT ('nfse_cert_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  arquivo_path TEXT NOT NULL,
  nome_arquivo TEXT,
  senha_cifrada TEXT,
  senha_iv TEXT,
  senha_tag TEXT,
  valido_ate DATE,
  cnpj_certificado TEXT,
  ativo BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

DROP TRIGGER IF EXISTS trigger_nfse_certificado_updated_at ON public.nfse_certificado;
CREATE TRIGGER trigger_nfse_certificado_updated_at
  BEFORE UPDATE ON public.nfse_certificado
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 5. NOTAS (DPS + NFS-e)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.nfse_notas (
  id TEXT PRIMARY KEY DEFAULT ('nfse_nota_' || substr(md5(random()::text || clock_timestamp()::text), 1, 12)),
  status TEXT NOT NULL DEFAULT 'rps' CHECK (status IN (
    'rps', 'enviando', 'autorizada', 'rejeitada', 'cancelada', 'erro'
  )),
  ambiente TEXT NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('homologacao', 'producao')),
  orcamento TEXT REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  orcamento_numero TEXT,
  servico TEXT REFERENCES public.nfse_servicos(id) ON DELETE SET NULL,
  numero_rps INTEGER,
  serie_rps TEXT DEFAULT '1',
  protocolo TEXT,
  numero_nfse TEXT,
  data_autorizacao TIMESTAMPTZ,
  data_competencia DATE,
  data_emissao_dps TEXT,
  codigo_lc116 TEXT,
  codigo_tributario_municipio TEXT,
  exigibilidade_iss INTEGER DEFAULT 1,
  valor_servicos NUMERIC NOT NULL DEFAULT 0,
  aliquota_iss NUMERIC NOT NULL DEFAULT 2,
  valor_iss NUMERIC NOT NULL DEFAULT 0,
  iss_retido BOOLEAN NOT NULL DEFAULT false,
  valor_irrf NUMERIC DEFAULT 0,
  valor_csll NUMERIC DEFAULT 0,
  valor_cofins NUMERIC DEFAULT 0,
  valor_pis NUMERIC DEFAULT 0,
  tomador_nome TEXT,
  tomador_documento TEXT,
  tomador_email TEXT,
  tomador_endereco TEXT,
  tomador_municipio TEXT,
  tomador_uf TEXT,
  descricao_servico TEXT,
  observacoes TEXT,
  xml_dps TEXT,
  xml_nfse TEXT,
  mensagem_erro TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_nfse_notas_status ON public.nfse_notas(status);
CREATE INDEX IF NOT EXISTS idx_nfse_notas_orcamento ON public.nfse_notas(orcamento);
CREATE INDEX IF NOT EXISTS idx_nfse_notas_numero ON public.nfse_notas(numero_nfse);

DROP TRIGGER IF EXISTS trigger_nfse_notas_updated_at ON public.nfse_notas;
CREATE TRIGGER trigger_nfse_notas_updated_at
  BEFORE UPDATE ON public.nfse_notas
  FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- ----------------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (padrão do projeto: tudo liberado para autenticados)
-- ----------------------------------------------------------------------------
ALTER TABLE public.nfse_emitente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_certificado ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_notas ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  t TEXT;
  nfse_tables TEXT[] := ARRAY[
    'nfse_emitente', 'nfse_servicos', 'nfse_config',
    'nfse_certificado', 'nfse_notas'
  ];
BEGIN
  FOREACH t IN ARRAY nfse_tables LOOP
    EXECUTE format('DROP POLICY IF EXISTS "%I_admin_all" ON public.%I;', t, t);
    EXECUTE format('CREATE POLICY "%I_admin_all" ON public.%I FOR ALL TO authenticated USING (true) WITH CHECK (true);', t, t);
  END LOOP;
END;
$$;

GRANT ALL ON public.nfse_emitente TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_servicos TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_config TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_certificado TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_notas TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 7. SEED: EMITENTE PADRÃO (regra do dono — empresa GB SOLUCOES LTDA)
-- ----------------------------------------------------------------------------
INSERT INTO public.nfse_emitente (razao_social, nome_fantasia, cnpj, inscricao_municipal, logradouro, numero, bairro, codigo_municipio_ibge, municipio, uf, cep, telefone, email)
SELECT 'GB SOLUCOES LTDA', 'Gesso Bettone', '53.242.055/0001-74', '', '', 'S/N', 'Centro', '3550407', 'São Pedro', 'SP', '', '', ''
WHERE NOT EXISTS (SELECT 1 FROM public.nfse_emitente);

-- ----------------------------------------------------------------------------
-- 8. SEED: CONFIG PADRÃO (São Pedro/SP, homologação)
-- ----------------------------------------------------------------------------
INSERT INTO public.nfse_config (ambiente, municipio_incidencia, municipio_incidencia_ibge, uf_municipio_incidencia, aliquota_iss_padrao, reter_federais_padrao)
SELECT 'homologacao', 'São Pedro', '3550407', 'SP', 2, false
WHERE NOT EXISTS (SELECT 1 FROM public.nfse_config);

-- ----------------------------------------------------------------------------
-- 9. SEED: SERVIÇOS LC 116 derivados dos CNAEs do CNPJ (gesso/drywall/obras)
-- ----------------------------------------------------------------------------
INSERT INTO public.nfse_servicos (nome, codigo_lc116, descricao, aliquota_iss, reter_irrf, reter_csll, reter_cofins, reter_pis)
SELECT v.nome, v.codigo_lc116, v.descricao, 2, false, false, false, false
FROM (VALUES
  ('Aplicação de forro de gesso', '7.04',
   'Serviços de instalação e montagem de forros de gesso (placas e gesso liso), inclusive sancas e iluminação embutida.'),
  ('Instalação e montagem de drywall / paredes de gesso acartonado', '7.04',
   'Montagem de paredes e divisórias em drywall (gesso acartonado), plumas, steel frame e acabamentos.'),
  ('Execução de alvenaria e revestimento de paredes', '7.01',
   'Execução de alvenaria, emboço, reboco e revestimento de paredes em obras de construção civil.'),
  ('Obras de concreto e acabamento em edificações', '7.02',
   'Serviços e obras de concreto em geral e acabamentos em edificações (novo, reforma ou ampliação).'),
  ('Instalação e montagem de estruturas metálicas / drywall industrial', '7.05',
   'Instalação e montagem de estruturas metálicas e divisórias industriais.'),
  ('Reformas e acabamentos em interiores (gesso, pintura e molduras)', '7.07',
   'Reformas em geral: gesso, pintura, molduras, sancas e acabamentos internos.')
) AS v(nome, codigo_lc116, descricao)
WHERE NOT EXISTS (SELECT 1 FROM public.nfse_servicos s WHERE s.nome = v.nome);
