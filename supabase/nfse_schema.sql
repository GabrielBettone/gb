-- ============================================================================
-- GESSO BETTONE • MÓDULO NFS-e NACIONAL (Supabase)
-- ============================================================================
-- Arquivo para rodar manualmente no SQL Editor do Supabase do usuário
-- (projeto phjthpjdbhqhcfnyjjzc — o mesmo do site na Hostinger).
--
-- Idempotente: pode ser executado várias vezes sem erro — os seeds usam
-- INSERT ... WHERE NOT EXISTS + UPDATE por CNPJ/nome, então a reexecução
-- atualiza emitente/serviços/impostos SEM duplicar registros e SEM tocar
-- em notas existentes (nfse_notas nunca é apagada nem regravada aqui).
-- Rodar DEPOIS de self-hosted/supabase/schema.sql (referencia public.orcamentos).
--
-- Cria: nfse_emitente, nfse_servicos, nfse_config, nfse_certificado, nfse_notas
-- RLS liberada para usuários autenticados no padrão já usado no projeto
-- (GRANT + policies "admin_all").
-- Seed: emitente GB SOLUCOES LTDA (dados do Cartão CNPJ) + 7 serviços reais
-- (marcenaria, serralheria, montagem de móveis, gesso, drywall, alvenaria,
-- hidráulica) com códigos LC 116 e impostos configurados para emissão.
-- Alíquota ISS padrão de São Pedro/SP: 3% (usual; editável em Configurações).
-- Retenções federais (tomador PJ): IRRF 1,5%, CSLL 1%, COFINS 3%, PIS 0,65% —
-- PIS/COFINS/CSLL retidos somente quando o serviço individual > R$ 215,00.
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
  aliquota_iss NUMERIC NOT NULL DEFAULT 3,
  reter_irrf BOOLEAN NOT NULL DEFAULT true,
  reter_csll BOOLEAN NOT NULL DEFAULT true,
  reter_cofins BOOLEAN NOT NULL DEFAULT true,
  reter_pis BOOLEAN NOT NULL DEFAULT true,
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
-- 7. SEED: EMITENTE PADRÃO (regra do dono — GB SOLUCOES LTDA)
-- Dados do Cartão CNPJ (comprovante de inscrição e de situação cadastral).
-- INSERT inicial + UPDATE por CNPJ em cada reexecução (idempotente: corrige
-- dados desatualizados sem duplicar nem apagar nada).
-- ----------------------------------------------------------------------------
INSERT INTO public.nfse_emitente (razao_social, nome_fantasia, cnpj, inscricao_municipal, logradouro, numero, bairro, codigo_municipio_ibge, municipio, uf, cep, telefone, email)
SELECT 'GB SOLUCOES LTDA', 'GGB INFOTECH LTDA', '53.242.055/0001-74', '', 'R Heitor Mariotti', '185', 'Mariluz', '3550407', 'São Pedro', 'SP', '13.522-340', '(19) 8109-3379', 'JAFASSESSORIACONTABIL@HOTMAIL.COM'
WHERE NOT EXISTS (SELECT 1 FROM public.nfse_emitente WHERE cnpj = '53.242.055/0001-74');

UPDATE public.nfse_emitente SET
  razao_social = 'GB SOLUCOES LTDA',
  nome_fantasia = 'GGB INFOTECH LTDA',
  logradouro = 'R Heitor Mariotti',
  numero = '185',
  bairro = 'Mariluz',
  codigo_municipio_ibge = '3550407',
  municipio = 'São Pedro',
  uf = 'SP',
  cep = '13.522-340',
  telefone = '(19) 8109-3379',
  email = 'JAFASSESSORIACONTABIL@HOTMAIL.COM',
  updated_at = timezone('utc'::text, now())
WHERE cnpj = '53.242.055/0001-74';

-- ----------------------------------------------------------------------------
-- 8. SEED: CONFIG PADRÃO (São Pedro/SP, ISS 3%, homologação)
-- ----------------------------------------------------------------------------
INSERT INTO public.nfse_config (ambiente, municipio_incidencia, municipio_incidencia_ibge, uf_municipio_incidencia, aliquota_iss_padrao, reter_federais_padrao)
SELECT 'homologacao', 'São Pedro', '3550407', 'SP', 3, true
WHERE NOT EXISTS (SELECT 1 FROM public.nfse_config);

UPDATE public.nfse_config SET
  municipio_incidencia = 'São Pedro',
  municipio_incidencia_ibge = '3550407',
  uf_municipio_incidencia = 'SP',
  updated_at = timezone('utc'::text, now())
WHERE municipio_incidencia_ibge = '3550407';
-- (aliquota_iss_padrao e reter_federais_padrao existentes NÃO são sobrescritos
--  pelo re-run — o usuário pode ter ajustado; novos bancos já nascem com 3%.)

-- ----------------------------------------------------------------------------
-- 9. SEED: SERVIÇOS REAIS LC 116 (7 itens do dia a dia da empresa)
-- Códigos da tabela da LC 116/2003 (Lei Complementar 116/2003, Anexo):
--   14.01 = execução, por empreitada, de obras de construção civil,
--           hidráulica ou elétrica (gesso/drywall/alvenaria/hidráulica)
--   14.13 = execução de laje, carpintaria e serralheria (marcenaria/serralheria)
--   7.16  = execução por empreitada de instalação/montagem não especificada
--           nos itens anteriores (montagem de móveis de qualquer material)
-- Retenções federais (tomador PJ): IRRF 1,5%, CSLL 1%, COFINS 3%, PIS 0,65%.
-- PIS/COFINS/CSLL só retidos quando o serviço individual > R$ 215,00 e
-- IRRF >= R$ 10,00 (limites legais de dispensa) — a tela Nova NFS-e aplica
-- esses limites em tempo real; as flags abaixo são o padrão de cada serviço.
-- Alíquota ISS: 3% (padrão usual São Pedro/SP) — editável na tela Serviços.
-- ----------------------------------------------------------------------------
INSERT INTO public.nfse_servicos (nome, codigo_lc116, descricao, aliquota_iss, reter_irrf, reter_csll, reter_cofins, reter_pis)
SELECT v.nome, v.codigo_lc116, v.descricao, 3, true, true, true, true
FROM (VALUES
  ('Marcenaria (móveis e artigos de carpintaria sob medida)', '14.13',
   'Fabricação e instalação de móveis e artigos de carpintaria sob medida (bancadas, armários, closets, painéis) — CNAE 16.22-6-99 / 31.01-2-00.'),
  ('Serralheria (esquadrias e artigos de metal)', '14.13',
   'Execução de serviços de serralheria: esquadrias de metal, portas, janelas, grades e estruturas metálicas — CNAE 25.12-8-00 / 25.42-0-00.'),
  ('Montagem de móveis de qualquer material', '7.16',
   'Serviços de montagem e instalação de móveis de qualquer material no local do cliente — CNAE 33.29-5-01.'),
  ('Obras de acabamento em gesso e estuque (forros, sancas, molduras)', '14.01',
   'Aplicação de forro de gesso, sancas, molduras e trabalhos em estuque em obras de acabamento — CNAE 43.30-4-03.'),
  ('Instalação de drywall — portas, janelas, tetos, divisórias e armários embutidos (forro e paredes)', '14.01',
   'Instalação de drywall (forro e paredes), divisórias, tetos, portas, janelas e armários embutidos de qualquer material — CNAE 43.30-4-02.'),
  ('Obras de alvenaria', '14.01',
   'Execução de obras de alvenaria e acabamento em construções novas, reformas e ampliações — CNAE 43.99-1-03.'),
  ('Instalações hidráulicas, sanitárias e de gás', '14.01',
   'Instalações hidráulicas, sanitárias e de gás em obras de construção civil — CNAE 43.22-3-01.')
) AS v(nome, codigo_lc116, descricao)
WHERE NOT EXISTS (SELECT 1 FROM public.nfse_servicos s WHERE s.nome = v.nome);

-- Idempotência por NOME + Código LC 116: se o serviço existir com nome igual,
-- atualiza o código/descrição; se existir com mesmo código mas nome antigo
-- (ex.: seeds anteriores), insere a versão nova sem duplicar códigos.
UPDATE public.nfse_servicos s SET
  codigo_lc116 = v.codigo_lc116,
  descricao = v.descricao,
  updated_at = timezone('utc'::text, now())
FROM (VALUES
  ('Marcenaria (móveis e artigos de carpintaria sob medida)', '14.13',
   'Fabricação e instalação de móveis e artigos de carpintaria sob medida (bancadas, armários, closets, painéis) — CNAE 16.22-6-99 / 31.01-2-00.'),
  ('Serralheria (esquadrias e artigos de metal)', '14.13',
   'Execução de serviços de serralheria: esquadrias de metal, portas, janelas, grades e estruturas metálicas — CNAE 25.12-8-00 / 25.42-0-00.'),
  ('Montagem de móveis de qualquer material', '7.16',
   'Serviços de montagem e instalação de móveis de qualquer material no local do cliente — CNAE 33.29-5-01.'),
  ('Obras de acabamento em gesso e estuque (forros, sancas, molduras)', '14.01',
   'Aplicação de forro de gesso, sancas, molduras e trabalhos em estuque em obras de acabamento — CNAE 43.30-4-03.'),
  ('Instalação de drywall — portas, janelas, tetos, divisórias e armários embutidos (forro e paredes)', '14.01',
   'Instalação de drywall (forro e paredes), divisórias, tetos, portas, janelas e armários embutidos de qualquer material — CNAE 43.30-4-02.'),
  ('Obras de alvenaria', '14.01',
   'Execução de obras de alvenaria e acabamento em construções novas, reformas e ampliações — CNAE 43.99-1-03.'),
  ('Instalações hidráulicas, sanitárias e de gás', '14.01',
   'Instalações hidráulicas, sanitárias e de gás em obras de construção civil — CNAE 43.22-3-01.')
) AS v(nome, codigo_lc116, descricao)
WHERE s.nome = v.nome;

-- Serviços de seeds ANTIGOS (lista provisória anterior) ficam INATIVOS —
-- não aparecem mais na Nova NFS-e, mas continuam no banco para as notas
-- históricas que os referenciam (FK ON DELETE SET NULL preservada).
UPDATE public.nfse_servicos SET ativo = false, updated_at = timezone('utc'::text, now())
WHERE nome IN (
  'Aplicação de forro de gesso',
  'Instalação e montagem de drywall / paredes de gesso acartonado',
  'Execução de alvenaria e revestimento de paredes',
  'Obras de concreto e acabamento em edificações',
  'Instalação e montagem de estruturas metálicas / drywall industrial',
  'Reformas e acabamentos em interiores (gesso, pintura e molduras)'
) AND nome NOT IN (SELECT nome FROM (VALUES
  ('Marcenaria (móveis e artigos de carpintaria sob medida)'),
  ('Serralheria (esquadrias e artigos de metal)'),
  ('Montagem de móveis de qualquer material'),
  ('Obras de acabamento em gesso e estuque (forros, sancas, molduras)'),
  ('Instalação de drywall — portas, janelas, tetos, divisórias e armários embutidos (forro e paredes)'),
  ('Obras de alvenaria'),
  ('Instalações hidráulicas, sanitárias e de gás')
) AS novos(nome));
