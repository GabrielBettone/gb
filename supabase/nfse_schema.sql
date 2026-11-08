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
  municipio_incidencia_ibge text NOT NULL DEFAULT '3550407',
  municipio_incidencia text NOT NULL DEFAULT 'São Pedro',
  uf_municipio_incidencia text NOT NULL DEFAULT 'SP',
  municipio_iss text NOT NULL DEFAULT 'São Pedro/SP — IBGE 3550407',
  reter_federais_padrao boolean NOT NULL DEFAULT true,
  incentivo_fiscal boolean NOT NULL DEFAULT false,
  observacoes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrações idempotentes de coluna para nfse_config
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS municipio_incidencia_ibge text DEFAULT '3550407';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS municipio_incidencia text DEFAULT 'São Pedro';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS uf_municipio_incidencia text DEFAULT 'SP';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS municipio_iss text DEFAULT 'São Pedro/SP — IBGE 3550407';
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS reter_federais_padrao boolean DEFAULT true;
ALTER TABLE public.nfse_config ADD COLUMN IF NOT EXISTS observacoes text;

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

-- Migrações idempotentes de coluna para compatibilidade com versões prévias do schema
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

-- Migrações idempotentes de coluna para nfse_servicos
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_irrf boolean NOT NULL DEFAULT true;
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_csll boolean NOT NULL DEFAULT true;
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_cofins boolean NOT NULL DEFAULT true;
ALTER TABLE public.nfse_servicos ADD COLUMN IF NOT EXISTS reter_pis boolean NOT NULL DEFAULT true;

-- 4. Tabela: nfse_certificado (armazenamento seguro do certificado digital A1)
-- Reconciliada com a Edge Function: aceita arquivo_path/storage_path, senha_cifrada,
-- senha_iv, senha_tag, valido_ate/validade_fim, nome_arquivo, ativo, titular, emissor, cnpj_certificado.
CREATE TABLE IF NOT EXISTS public.nfse_certificado (
  id text PRIMARY KEY DEFAULT 'default',
  storage_path text,
  arquivo_path text,
  nome_arquivo text NOT NULL DEFAULT 'certificado.pfx',
  senha_cifrada text NOT NULL,
  senha_iv text,
  senha_tag text,
  validade_fim timestamptz,
  valido_ate text,
  emissor text,
  titular text,
  cnpj_certificado text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrações idempotentes de colunas para nfse_certificado
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS storage_path text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS arquivo_path text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS nome_arquivo text DEFAULT 'certificado.pfx';
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS senha_iv text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS senha_tag text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS validade_fim timestamptz;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS valido_ate text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS emissor text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS titular text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS cnpj_certificado text;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS ativo boolean DEFAULT true;
ALTER TABLE public.nfse_certificado ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- 5. Tabela: nfse_notas (RPS e Notas Fiscais emitidas ou em processamento)
-- Status aceitos reconciliados: rps, enviando, transmitida, autorizada, rejeitada, cancelada, erro
CREATE TABLE IF NOT EXISTS public.nfse_notas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'rps' CHECK (status IN ('rps', 'enviando', 'transmitida', 'autorizada', 'rejeitada', 'cancelada', 'erro')),
  ambiente text NOT NULL DEFAULT 'homologacao' CHECK (ambiente IN ('producao', 'homologacao')),
  orcamento uuid,
  orcamento_numero text,
  numero_rps integer NOT NULL,
  serie_rps text NOT NULL DEFAULT '1',
  tipo_rps text NOT NULL DEFAULT '1',
  protocolo text,
  data_emissao timestamptz NOT NULL DEFAULT now(),
  data_emissao_dps text,
  data_competencia text,
  numero_nfse text,
  codigo_verificacao text,
  chave_acesso text,
  data_autorizacao timestamptz,
  link_danfse text,
  xml_dps text,
  xml_nfse text,
  xml_distribuicao text,
  tomador_tipo text NOT NULL DEFAULT 'PF' CHECK (tomador_tipo IN ('PF', 'PJ', 'ESTRANGEIRO')),
  tomador_documento text NOT NULL,
  tomador_nome text NOT NULL,
  tomador_email text,
  tomador_telefone text,
  tomador_endereco text,
  tomador_endereco_logradouro text,
  tomador_endereco_numero text,
  tomador_endereco_complemento text,
  tomador_endereco_bairro text,
  tomador_endereco_cep text,
  tomador_codigo_municipio text,
  tomador_municipio text,
  tomador_uf text,
  servico uuid REFERENCES public.nfse_servicos(id) ON DELETE SET NULL,
  codigo_lc116 text,
  servico_codigo_lc116 text,
  codigo_tributario_municipio text,
  descricao_servico text,
  discriminacao_servicos text,
  observacoes text,
  codigo_municipio_prestacao text NOT NULL DEFAULT '3550407',
  exigibilidade_iss integer NOT NULL DEFAULT 1,
  valor_servicos numeric(12,2) NOT NULL,
  valor_deducoes numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_desconto_incondicionado numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_desconto_condicionado numeric(12,2) NOT NULL DEFAULT 0.00,
  base_calculo_iss numeric(12,2) NOT NULL DEFAULT 0.00,
  aliquota_iss numeric(5,2) NOT NULL DEFAULT 2.00,
  valor_iss numeric(12,2) NOT NULL DEFAULT 0.00,
  iss_retido boolean NOT NULL DEFAULT false,
  valor_iss_retido numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_pis numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_cofins numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_inss numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_ir numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_irrf numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_csll numeric(12,2) NOT NULL DEFAULT 0.00,
  outras_retencoes numeric(12,2) NOT NULL DEFAULT 0.00,
  valor_liquido numeric(12,2) NOT NULL DEFAULT 0.00,
  motivo_cancelamento text,
  data_cancelamento timestamptz,
  mensagem_erro text,
  mensagem_retorno text,
  codigo_retorno text,
  payload_envio jsonb,
  payload_retorno jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Migrações idempotentes de coluna para nfse_notas (reconciliação total de campos)
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS protocolo text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS data_emissao_dps text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS data_competencia text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS xml_dps text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS xml_nfse text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS xml_distribuicao text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS tomador_endereco text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS codigo_lc116 text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS servico_codigo_lc116 text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS codigo_tributario_municipio text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS descricao_servico text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS discriminacao_servicos text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS observacoes text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS exigibilidade_iss integer DEFAULT 1;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS valor_irrf numeric(12,2) DEFAULT 0.00;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS mensagem_erro text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS mensagem_retorno text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS codigo_retorno text;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS payload_envio jsonb;
ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS payload_retorno jsonb;

-- Atualiza CHECK constraint de status em nfse_notas de forma idempotente
DO $$
DECLARE
  v_con_name text;
BEGIN
  -- Localiza a constraint CHECK da coluna status em nfse_notas
  SELECT con.conname INTO v_con_name
  FROM pg_constraint con
  JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY(con.conkey)
  WHERE con.conrelid = 'public.nfse_notas'::regclass
    AND con.contype = 'c'
    AND att.attname = 'status'
  LIMIT 1;

  IF v_con_name IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.nfse_notas DROP CONSTRAINT ' || quote_ident(v_con_name);
  END IF;

  ALTER TABLE public.nfse_notas
    ADD CONSTRAINT nfse_notas_status_check
    CHECK (status IN ('rps', 'enviando', 'transmitida', 'autorizada', 'rejeitada', 'cancelada', 'erro'));
END $$;

-- Migrações de coluna e compatibilização dinâmica da Foreign Key com orcamentos(id)
-- Trata execuções prévias onde a coluna 'orcamento' pode ter sido criada como text ou uuid
-- e onde 'orcamentos.id' no banco do usuário é uuid ou text.
DO $$
DECLARE
  v_orcamento_data_type text;
  v_orcamentos_pk_type text;
  v_orcamento_num_type text;
BEGIN
  -- 5.1 Garante coluna orcamento_numero como text (para aceitar números como '001', 'ORC-2026-01' etc.)
  SELECT data_type INTO v_orcamento_num_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'nfse_notas' AND column_name = 'orcamento_numero';

  IF v_orcamento_num_type IS NOT NULL AND v_orcamento_num_type <> 'text' THEN
    ALTER TABLE public.nfse_notas ALTER COLUMN orcamento_numero TYPE text USING orcamento_numero::text;
  END IF;

  -- 5.2 Descobre o tipo de dados da PK da tabela public.orcamentos (se existir)
  SELECT c.data_type INTO v_orcamentos_pk_type
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name AND tc.table_schema = kcu.table_schema
  JOIN information_schema.columns c
    ON kcu.table_schema = c.table_schema AND kcu.table_name = c.table_name AND kcu.column_name = c.column_name
  WHERE tc.constraint_type = 'PRIMARY KEY'
    AND tc.table_schema = 'public'
    AND tc.table_name = 'orcamentos'
  LIMIT 1;

  -- Fallback se a constraint PK não for encontrada mas a coluna id existir
  IF v_orcamentos_pk_type IS NULL THEN
    SELECT data_type INTO v_orcamentos_pk_type
    FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'orcamentos' AND column_name = 'id';
  END IF;

  -- 5.3 Descobre o tipo de dados da coluna 'orcamento' em nfse_notas
  SELECT data_type INTO v_orcamento_data_type
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'nfse_notas' AND column_name = 'orcamento';

  -- Remove qualquer constraint FK prévia com tipo incompatível para poder migrar
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'nfse_notas'
      AND constraint_name = 'nfse_notas_orcamento_fkey'
  ) THEN
    ALTER TABLE public.nfse_notas DROP CONSTRAINT nfse_notas_orcamento_fkey;
  END IF;

  -- Se orcamentos.id for uuid (caso do Supabase real do usuário) e a coluna em nfse_notas for text/outro tipo:
  IF v_orcamentos_pk_type = 'uuid' THEN
    IF v_orcamento_data_type IS NOT NULL AND v_orcamento_data_type <> 'uuid' THEN
      ALTER TABLE public.nfse_notas
        ALTER COLUMN orcamento TYPE uuid
        USING (
          CASE
            WHEN orcamento ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
            THEN orcamento::uuid
            ELSE NULL
          END
        );
    END IF;

    -- Cria a foreign key compatível (uuid -> uuid)
    ALTER TABLE public.nfse_notas
      ADD CONSTRAINT nfse_notas_orcamento_fkey
      FOREIGN KEY (orcamento) REFERENCES public.orcamentos(id) ON DELETE SET NULL;

  -- Se orcamentos.id for text (caso de bases customizadas com IDs textuais orc_...)
  ELSIF v_orcamentos_pk_type = 'text' OR v_orcamentos_pk_type LIKE 'character%' THEN
    IF v_orcamento_data_type IS NOT NULL AND v_orcamento_data_type <> 'text' THEN
      ALTER TABLE public.nfse_notas
        ALTER COLUMN orcamento TYPE text
        USING orcamento::text;
    END IF;

    -- Cria a foreign key compatível (text -> text)
    ALTER TABLE public.nfse_notas
      ADD CONSTRAINT nfse_notas_orcamento_fkey
      FOREIGN KEY (orcamento) REFERENCES public.orcamentos(id) ON DELETE SET NULL;

  -- Se a tabela orcamentos não existir no momento da execução, garante coluna uuid por padrão
  ELSIF v_orcamento_data_type IS NULL THEN
    ALTER TABLE public.nfse_notas ADD COLUMN IF NOT EXISTS orcamento uuid;
  END IF;

END $$;

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
-- 7. Funções de Suporte à Segurança e Perfis Administrativos
-- - is_admin(): verificação SECURITY DEFINER centralizada contra a tabela profiles.
--   Evita recursão de RLS e padroniza a checagem de privilégio administrativo.
-- - handle_new_user(): trigger seguro para auth.users. Atribui papel padrão 'cliente'
--   (NUNCA admin) e ignora metadados do cliente para evitar autopromoção.
-- - Proteção de profiles: usuário comum pode atualizar apenas seu próprio nome/avatar,
--   mas NUNCA o campo 'role'. Promoção a admin é estritamente manual ou via admin.
-- ----------------------------------------------------------------------------

-- Garante existência da tabela profiles com role restrito
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  name text,
  role text NOT NULL DEFAULT 'cliente',
  avatar_url text,
  created_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at timestamptz NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Migrações idempotentes de colunas para profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'cliente';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT timezone('utc'::text, now());
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT timezone('utc'::text, now());

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Função SECURITY DEFINER estável para checagem de admin sem recursão de RLS
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid()
      AND LOWER(COALESCE(p.role, '')) IN ('admin', 'administrador')
  );
$$;

-- Trigger seguro para cadastro de novos usuários
-- Regra de segurança: role SEMPRE inicia como 'cliente' (ou 'user'); NUNCA lê raw_user_meta_data->>'role'.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(COALESCE(NEW.email, ''), '@', 1)),
    'cliente'
  )
  ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email,
        name = COALESCE(EXCLUDED.name, public.profiles.name),
        updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$;

-- Compatibilização: se a função chamava handle_new_auth_user no schema legado
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.handle_new_user();
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Trigger que impede qualquer usuário não-admin de alterar o próprio role na tabela profiles
CREATE OR REPLACE FUNCTION public.protect_profiles_role_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Se o campo role está sendo modificado e o usuário da sessão NÃO é admin, bloqueia
  IF (NEW.role IS DISTINCT FROM OLD.role) THEN
    IF NOT public.is_admin() THEN
      RAISE EXCEPTION 'Acesso negado: apenas administradores podem alterar o papel (role) de usuários.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_profiles_role ON public.profiles;
CREATE TRIGGER trg_protect_profiles_role
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE PROCEDURE public.protect_profiles_role_update();

-- RLS para tabela profiles:
-- Usuário lê seu próprio registro ou qualquer registro se for admin
-- Usuário só atualiza seu próprio registro (e o trigger acima bloqueia modificação de role)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_read_self_or_admin" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_owner" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_manage" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_service" ON public.profiles;

CREATE POLICY "profiles_select_auth" ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.is_admin());

CREATE POLICY "profiles_update_owner" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id OR public.is_admin())
  WITH CHECK (auth.uid() = id OR public.is_admin());

-- ----------------------------------------------------------------------------
-- 8. Storage Bucket: nfse_certificados (PRIVADO — RESTRIÇÃO RIGOROSA)
-- - Apenas acessível pelo service_role (a Edge Function nfse-emissao baixa o .pfx
--   e processa a criptografia/mTLS com service role no servidor).
-- - Nenhum acesso concedido a usuários 'authenticated' nem 'anon' no browser.
-- ----------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'nfse_certificados',
  'nfse_certificados',
  false,
  5242880, -- 5 MB
  ARRAY['application/x-pkcs12', 'application/octet-stream', 'application/pkcs12']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['application/x-pkcs12', 'application/octet-stream', 'application/pkcs12'];

-- Limpeza total de políticas no storage.objects para o bucket nfse_certificados
-- Bloqueia expressamente qualquer leitura, escrita ou deleção direta por clientes/navegador
DO $$ BEGIN
  DROP POLICY IF EXISTS "nfse_certificados_anon_read" ON storage.objects;
  DROP POLICY IF EXISTS "nfse_certificados_anon_insert" ON storage.objects;
  DROP POLICY IF EXISTS "nfse_certificados_all" ON storage.objects;
  DROP POLICY IF EXISTS "nfse_certificados_auth_access" ON storage.objects;
  DROP POLICY IF EXISTS "nfse_certificados_auth_read" ON storage.objects;
  DROP POLICY IF EXISTS "nfse_certificados_auth_write" ON storage.objects;
END $$;

-- ----------------------------------------------------------------------------
-- 9. RLS (Row Level Security) e Permissões das 6 Tabelas Fiscais
-- - nfse_config, nfse_emitente, nfse_servicos, nfse_notas, nfse_eventos, nfse_certificado
-- - Acesso exclusivo para administradores (public.is_admin() = true) ou service_role.
-- - Usuários autenticados comuns (não-admin) NÃO conseguem ler nem gravar dados fiscais.
-- - Anon terminantemente revogado.
-- - Script 100% idempotente (DROP POLICY IF EXISTS antes de cada CREATE POLICY).
-- ----------------------------------------------------------------------------
ALTER TABLE public.nfse_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_emitente ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_servicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_notas ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_eventos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nfse_certificado ENABLE ROW LEVEL SECURITY;

-- Limpeza de todas as políticas legadas para garantir idempotência em reexecuções
DROP POLICY IF EXISTS nfse_config_all ON public.nfse_config;
DROP POLICY IF EXISTS nfse_config_auth ON public.nfse_config;
DROP POLICY IF EXISTS nfse_config_admin ON public.nfse_config;

DROP POLICY IF EXISTS nfse_emitente_all ON public.nfse_emitente;
DROP POLICY IF EXISTS nfse_emitente_auth ON public.nfse_emitente;
DROP POLICY IF EXISTS nfse_emitente_admin ON public.nfse_emitente;

DROP POLICY IF EXISTS nfse_servicos_all ON public.nfse_servicos;
DROP POLICY IF EXISTS nfse_servicos_auth ON public.nfse_servicos;
DROP POLICY IF EXISTS nfse_servicos_admin ON public.nfse_servicos;

DROP POLICY IF EXISTS nfse_notas_all ON public.nfse_notas;
DROP POLICY IF EXISTS nfse_notas_auth ON public.nfse_notas;
DROP POLICY IF EXISTS nfse_notas_admin ON public.nfse_notas;

DROP POLICY IF EXISTS nfse_eventos_all ON public.nfse_eventos;
DROP POLICY IF EXISTS nfse_eventos_auth ON public.nfse_eventos;
DROP POLICY IF EXISTS nfse_eventos_admin ON public.nfse_eventos;

DROP POLICY IF EXISTS nfse_certificado_all ON public.nfse_certificado;
DROP POLICY IF EXISTS nfse_certificado_auth ON public.nfse_certificado;
DROP POLICY IF EXISTS nfse_certificado_admin ON public.nfse_certificado;

-- Novas políticas endurecidas: somente administradores da empresa têm acesso
CREATE POLICY nfse_config_admin ON public.nfse_config
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY nfse_emitente_admin ON public.nfse_emitente
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY nfse_servicos_admin ON public.nfse_servicos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY nfse_notas_admin ON public.nfse_notas
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY nfse_eventos_admin ON public.nfse_eventos
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY nfse_certificado_admin ON public.nfse_certificado
  FOR ALL TO authenticated
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Revoga explicitamente permissões do papel anon (público sem login)
REVOKE ALL ON public.nfse_config FROM anon;
REVOKE ALL ON public.nfse_emitente FROM anon;
REVOKE ALL ON public.nfse_servicos FROM anon;
REVOKE ALL ON public.nfse_notas FROM anon;
REVOKE ALL ON public.nfse_eventos FROM anon;
REVOKE ALL ON public.nfse_certificado FROM anon;

-- Concede privilégios aos papéis autenticados (a RLS acima filtra por admin) e service_role
GRANT ALL ON public.nfse_config TO authenticated, service_role;
GRANT ALL ON public.nfse_emitente TO authenticated, service_role;
GRANT ALL ON public.nfse_servicos TO authenticated, service_role;
GRANT ALL ON public.nfse_notas TO authenticated, service_role;
GRANT ALL ON public.nfse_eventos TO authenticated, service_role;
GRANT ALL ON public.nfse_certificado TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- SEEDS IDEMPOTENTES (Dados reais da empresa do usuário)
-- ----------------------------------------------------------------------------

-- A. Configuração padrão
INSERT INTO public.nfse_config (
  id, ambiente, serie_rps, proximo_numero_rps, regime_tributario, aliquota_iss_padrao,
  codigo_municipio_padrao, municipio_incidencia_ibge, municipio_incidencia, uf_municipio_incidencia,
  municipio_iss, reter_federais_padrao
) VALUES (
  'default', 'homologacao', '1', 1, 'simples_nacional', 2.00,
  '3550407', '3550407', 'São Pedro', 'SP',
  'São Pedro/SP — IBGE 3550407', true
)
ON CONFLICT (id) DO UPDATE SET
  aliquota_iss_padrao = EXCLUDED.aliquota_iss_padrao,
  codigo_municipio_padrao = EXCLUDED.codigo_municipio_padrao,
  municipio_incidencia_ibge = EXCLUDED.municipio_incidencia_ibge,
  municipio_incidencia = EXCLUDED.municipio_incidencia,
  uf_municipio_incidencia = EXCLUDED.uf_municipio_incidencia,
  municipio_iss = EXCLUDED.municipio_iss;

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
