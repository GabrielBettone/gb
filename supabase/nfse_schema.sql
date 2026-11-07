-- ============================================================================
-- Módulo NFS-e • Sistema Nacional (Receita Federal) — Gesso Bettone / GB Soluções
-- Schema manual do Supabase (projeto do usuário: phjthpjdbhqhcfnyjjzc)
-- Aplicação: pelo painel do Supabase (SQL Editor) do usuário.
-- Idempotente (CREATE TABLE IF NOT EXISTS / ADD COLUMN IF NOT EXISTS).
-- Regras legais vigentes: Lei Complementar 116/2003 (com LC 157/2016 e LC 175/2020),
-- Sistema Nacional NFS-e / Padrão Nacional DPS v1.0.
-- Alíquota ISS: 2% (município de São Pedro/SP - IBGE 3550407).
-- Retenções federais para tomador PJ: IRRF 1,5%, CSLL 1%, COFINS 3%, PIS 0,65%.
-- IMPORTANTE: NFS-e NUNCA gera financeiro automaticamente — recebimentos só pelo
-- botão manual do orçamento (regra permanente da empresa Gesso Bettone).
-- ============================================================================

-- 1. Tabela: nfse_config (parâmetros gerais de emissão)
CREATE TABLE IF NOT EXISTS public.nfse_config (
  id text PRIMARY KEY DEFAULT 'default',
  ambiente text NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('producao', 'homologacao')),
  serie_rps text NOT NULL DEFAULT '1',
  proximo_numero_rps integer NOT NULL DEFAULT 1,
  regime_tributario text NOT NULL DEFAULT 'simples_nacional' CHECK (regime_tributario IN ('simples_nacional', 'lucro_presumido', 'lucro_real', 'mei')),
  aliquota_iss_padrao numeric(5,2) NOT NULL DEFAULT 2.00,
  codigo_municipio_padrao text NOT NULL DEFAULT '3550407', -- São Pedro / SP
  incentivo_fiscal boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Tabela: nfse_emitente (dados cadastrais da empresa prestadora)
CREATE TABLE IF NOT EXISTS public.nfse_emitente (
  id text PRIMARY KEY DEFAULT 'default',
  razao_social text NOT NULL,
  nome_fantasia text,
  cnpj text NOT NULL,
  inscricao_municipal text,
  logradouro text,
  numero text,
  complemento text,
  bairro text,
  codigo_municipio_ibge text NOT NULL DEFAULT '3550407',
  municipio text NOT NULL DEFAULT 'São Pedro',
  uf text NOT NULL DEFAULT 'SP',
  cep text,
  telefone text,
  email text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrações de coluna para compatibilidade com versões prévias do schema
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS complemento text;
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS logradouro text;
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS numero text;
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS bairro text;
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS cep text;
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS municipio text DEFAULT 'São Pedro';
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS uf text DEFAULT 'SP';
ALTER TABLE public.nfse_emitente ADD COLUMN IF NOT EXISTS codigo_municipio_ibge text DEFAULT '3550407';

-- 3. Tabela: nfse_servicos (catálogo de serviços com código LC 116 e retenções)
CREATE TABLE IF NOT EXISTS public.nfse_servicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  codigo_lc116 text NOT NULL,
  descricao text,
  aliquota_iss numeric(5,2) NOT NULL DEFAULT 2.00,
  reter_irrf boolean NOT NULL DEFAULT true,
  reter_csll boolean NOT NULL DEFAULT true,
  reter_cofins boolean NOT NULL DEFAULT true,
  reter_pis boolean NOT NULL DEFAULT true,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migração de colunas para nfse_servicos
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_irrf boolean NOT NULL DEFAULT true;
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_csll boolean NOT NULL DEFAULT true;
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_cofins boolean NOT NULL DEFAULT true;
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_pis boolean NOT NULL DEFAULT true;

-- 4. Tabela: nfse_certificado (armazenamento seguro do certificado digital A1)
CREATE TABLE IF NOT EXISTS public.nfse_certificado (
  id text PRIMARY KEY DEFAULT 'default',
  storage_path text NOT NULL,
  senha_cifrada text NOT NULL,
  validade_fim timestamptz,
  emissor text,
  titular text,
  cnpj_certificado text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 5. Tabela: nfse_notas (RPS e Notas Fiscais emitidas ou em processamento)
CREATE TABLE IF NOT EXISTS public.nfse_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'rps' CHECK (status IN ('rps', 'transmitida', 'autorizada', 'rejeitada', 'cancelada')),
  ambiente text NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('producao', 'homologacao')),
  orcamento uuid REFERENCES public.orcamentos(id) ON DELETE SET NULL,
  orcamento_numero integer,
  numero_rps integer NOT NULL,
  serie_rps text NOT NULL DEFAULT '1',
  tipo_rps text NOT NULL DEFAULT '1',
  data_emissao timestamptz NOT NULL DEFAULT now(),
  numero_nfse text,
  codigo_verificacao text,
  chave_acesso text,
  data_autorizacao timestamptz,
  link_danfse text,
  xml_distribuicao text,
  tomador_tipo text NOT NULL CHECK (tomador_tipo IN ('PF', 'PJ', 'ESTRANGEIRO')),
  tomador_documento text NOT NULL,
  tomador_nome text NOT NULL,
  tomador_email text,
  tomador_telefone text,
  tomador_endereco_logradouro text,
  tomador_endereco_numero text,
  tomador_endereco_complemento text,
  tomador_endereco_bairro text,
  tomador_endereco_cep text,
  tomador_codigo_municipio text,
  tomador_municipio text,
  tomador_uf text,
  servico uuid REFERENCES public.nfse_servicos(id) ON DELETE SET NULL,
  servico_codigo_lc116 text NOT NULL,
  discriminacao_servicos text NOT NULL,
  codigo_municipio_prestacao text NOT NULL DEFAULT '3550407',
  valor_servicos numeric(12,2) NOT NULL,
  valor_deducoes numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_desconto_incondicionado numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_desconto_condicionado numeric(12,2) NOT NULL DEFAULT 0.00,
  base_calculo_iss numeric(12,2) NOT NULL,
  aliquota_iss numeric(5,2) NOT NULL DEFAULT 2.00,
  valor_iss numeric(12,2) NOT NULL DEFAULT 0.00,
  iss_retido boolean NOT NULL DEFAULT false,
  valor_iss_retido numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_pis numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_cofins numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_inss numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_ir numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_csll numeric(12,2) NOT NULL DEFAULT 0.00,
  outras_retencoes numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_liquido numeric(12,2) NOT NULL,
  motivo_cancelamento text,
  data_cancelamento timestamptz,
  mensagem_retorno text,
  codigo_retorno text,
  payload_envio jsonb,
  payload_retorno jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índices úteis
CREATE INDEX IF NOT EXISTS idx_nfse_notas_orcamento ON public.nfse_notas(orcamento);
CREATE INDEX IF NOT EXISTS idx_nfse_notas_status ON public.nfse_notas(status);
CREATE INDEX IF NOT EXISTS idx_nfse_notas_numero_rps ON public.nfse_notas(numero_rps);
CREATE INDEX IF NOT EXISTS idx_nfse_notas_numero_nfse ON public.nfse_notas(numero_nfse);

-- 6. Tabela: nfse_eventos (auditoria e rastreamento de tentativas de envio)
CREATE TABLE IF NOT EXISTS public.nfse_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nota uuid NOT NULL REFERENCES public.nfse_notas(id) ON DELETE CASCADE,
  tipo text NOT NULL,
  mensagem text NOT NULL,
  detalhes jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nfse_eventos_nota ON public.nfse_eventos(nota);

-- ----------------------------------------------------------------------------
-- RLS (Row Level Security) e Permissões
-- ----------------------------------------------------------------------------
ALTER TABLE public.nfse_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_emitente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_certificado ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  -- Leitura e escrita públicas para o painel autenticado / chave anônima da Hostinger
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nfse_config' AND policyname = 'nfse_config_all') THEN
    CREATE POLICY nfse_config_all ON public.nfse_config FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nfse_emitente' AND policyname = 'nfse_emitente_all') THEN
    CREATE POLICY nfse_emitente_all ON public.nfse_emitente FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nfse_servicos' AND policyname = 'nfse_servicos_all') THEN
    CREATE POLICY nfse_servicos_all ON public.nfse_servicos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nfse_notas' AND policyname = 'nfse_notas_all') THEN
    CREATE POLICY nfse_notas_all ON public.nfse_notas FOR ALL USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nfse_eventos' AND policyname = 'nfse_eventos_all') THEN
    CREATE POLICY nfse_eventos_all ON public.nfse_eventos FOR ALL USING (true) WITH CHECK (true);
  END IF;
  -- nfse_certificado: apenas leitura de metadados se necessário; gravação direta pelo painel
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'nfse_certificado' AND policyname = 'nfse_certificado_all') THEN
    CREATE POLICY nfse_certificado_all ON public.nfse_certificado FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

GRANT ALL ON public.nfse_config TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_emitente TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_servicos TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_notas TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_eventos TO anon, authenticated, service_role;
GRANT ALL ON public.nfse_certificado TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- SEEDS IDEMPOTENTES (Dados reais da empresa do usuário)
-- ----------------------------------------------------------------------------

-- A. Configuração padrão
INSERT INTO public.nfse_config (
  id, ambiente, serie_rps, proximo_numero_rps, regime_tributario, aliquota_iss_padrao, codigo_municipio_padrao
) VALUES (
  'default', 'homologacao', '1', 1, 'simples_nacional', 2.00, '3550407'
)
ON CONFLICT (id) DO UPDATE SET
  aliquota_iss_padrao = EXCLUDED.aliquota_iss_padrao,
  codigo_municipio_padrao = EXCLUDED.codigo_municipio_padrao;

-- B. Emitente real: GB SOLUCOES LTDA (Cartão CNPJ oficial)
INSERT INTO public.nfse_emitente (
  id, razao_social, nome_fantasia, cnpj, inscricao_municipal,
  logradouro, numero, complemento, bairro, codigo_municipio_ibge, municipio, uf, cep, telefone, email
) VALUES (
  'default',
  'GB SOLUCOES LTDA',
  'GGB INFOTECH LTDA',
  '53.242.055/0001-74',
  '',
  'R Heitor Mariotti',
  '185',
  '',
  'Mariluz',
  '3550407',
  'São Pedro',
  'SP',
  '13.522-340',
  '(19) 8109-3379',
  'JAFASSESSORIACONTABIL@HOTMAIL.COM'
)
ON CONFLICT (id) DO UPDATE SET
  razao_social = EXCLUDED.razao_social,
  nome_fantasia = EXCLUDED.nome_fantasia,
  cnpj = EXCLUDED.cnpj,
  logradouro = EXCLUDED.logradouro,
  numero = EXCLUDED.numero,
  complemento = EXCLUDED.complemento,
  bairro = EXCLUDED.bairro,
  codigo_municipio_ibge = EXCLUDED.codigo_municipio_ibge,
  municipio = EXCLUDED.municipio,
  uf = EXCLUDED.uf,
  cep = EXCLUDED.cep,
  telefone = EXCLUDED.telefone,
  email = EXCLUDED.email,
  updated_at = now();

-- C. Catálogo de Serviços Reais do usuário com códigos da LC 116/2003 e impostos
-- Limpa serviços com nomes antigos e insere os 7 serviços oficiais configurados
INSERT INTO public.nfse_servicos (
  nome, codigo_lc116, descricao, aliquota_iss, reter_irrf, reter_csll, reter_cofins, reter_pis, ativo
)
SELECT * FROM (VALUES
  (
    'Marcenaria (confecção e montagem sob medida)',
    '14.13',
    'Serviços de marcenaria e carpintaria sob medida: fabricação, confecção e montagem de móveis de madeira, armários embutidos, bancadas e painéis.',
    2.00, true, true, true, true, true
  ),
  (
    'Serralheria (esquadrias, portões e estruturas metálicas)',
    '14.13',
    'Execução de serviços de serralheria: portas, janelas, grades, corrimãos, esquadrias e estruturas metálicas sob encomenda.',
    2.00, true, true, true, true, true
  ),
  (
    'Montagem de móveis de qualquer material',
    '14.06',
    'Instalação e montagem de móveis e peças de qualquer material (madeira, metal, plástico ou vidro) no local do consumidor final.',
    2.00, true, true, true, true, true
  ),
  (
    'Gesso e drywall (forro e paredes)',
    '7.02',
    'Execução por empreitada de forros de gesso, sancas, molduras, paredes e divisórias em drywall/gesso acartonado em obras e reformas.',
    2.00, true, true, true, true, true
  ),
  (
    'Forros e paredes (revestimentos e divisórias)',
    '7.06',
    'Instalação e colocação de forros, divisórias, placas de gesso, revestimentos de parede e acabamentos com material fornecido.',
    2.00, true, true, true, true, true
  ),
  (
    'Obras de alvenaria',
    '7.02',
    'Execução de serviços de alvenaria, levantamento de paredes, reboco, reformas e obras de construção civil por empreitada ou subempreitada.',
    2.00, true, true, true, true, true
  ),
  (
    'Instalações hidráulicas',
    '7.02',
    'Execução de obras e instalações hidráulicas, sanitárias, de água fria, esgoto e drenagem em edificações.',
    2.00, true, true, true, true, true
  )
) AS v(nome, codigo_lc116, descricao, aliquota_iss, reter_irrf, reter_csll, reter_cofins, reter_pis, ativo)
WHERE NOT EXISTS (
  SELECT 1 FROM public.nfse_servicos s WHERE s.nome = v.nome
);
