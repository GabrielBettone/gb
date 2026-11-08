# Análise de Vendas & Site Institucional Bettone

Aplicação web completa para a **Gesso Bettone** (São Pedro/SP):
- **Site Institucional & Portfólio**: Landing pages públicas, catálogo de serviços dinâmicos, projetos executados com galeria de fotos e vídeos, simulador de ambientes com IA e área de parceiros homologados.
- **Painel Administrativo**: Gestão de vendas, produtos, clientes, metas, orçamentos (Kanban e Gantt interativos), contas a receber (parcelamento) e CMS do site.

---

## 🌐 Indexação no Google & Sitemap Dinâmico (SEO)

O projeto conta com geração e atualização dinâmica do `sitemap.xml` para garantir indexação rápida de **todas as páginas e serviços cadastrados**:

1. **Deploy no Self-hosted (Hostinger / Servidor Estático puro)**:
   - O comando `npm run build` executa automaticamente o script `scripts/generate-sitemap.js` (via hook npm `prebuild`).
   - Durante a build, o script se conecta à API de dados (Supabase utilizando as variáveis de ambiente `VITE_SUPABASE_URL` e `VITE_SUPABASE_PUBLISHABLE_KEY`) e obtém em tempo real todos os serviços ativos e projetos de portfólio.
   - O arquivo `public/sitemap.xml` é regerado com todas as rotas públicas:
     - `/` (Home)
     - `/servicos` e `/servicos/<slug>` para cada serviço ativo cadastrado
     - `/portfolio` e `/portfolio/<slug>` para cada projeto público ativo
     - `/parceiros`, `/sobre`, `/contato`, `/simulador`
   - Rotas privadas/internas (`/painel`, `/login`, etc.) são excluídas do sitemap.
   - **Fallback Resiliente**: Caso a API esteja inacessível no momento exato do build, o script inclui automaticamente o catálogo completo dos 15 serviços padrão sem quebrar a compilação.
   - **Regerar Sitemap após cadastrar novos serviços**:
     Basta disparar um novo deploy na Hostinger (ou rodar `npm run build` localmente/no CI) para que o sitemap seja regerado com os novos slugs e suas datas de modificação (`<lastmod>`).

2. **Ambiente Skip Cloud**:
   - Disponibiliza adicionalmente o endpoint em tempo real `GET /backend/v1/sitemap.xml` (via `pocketbase/hooks/site_sitemap.pb.js`), que lê a base de dados instantaneamente a cada requisição.

3. **Arquivo `robots.txt`**:
   - O arquivo `public/robots.txt` aponta para:
     ```txt
     User-agent: *
     Allow: /

     Sitemap: https://gessobettone.com.br/sitemap.xml
     ```
   - Caso seu domínio de produção seja alterado, atualize a URL em **Painel > Site > Configurações > URL Base do Site** e ajuste a linha `Sitemap:` no `public/robots.txt`.

4. **Como Validar e Submeter no Google Search Console**:
   - Acesse o [Google Search Console](https://search.google.com/search-console).
   - Verifique sua propriedade (você pode colar a tag de verificação do Google diretamente em **Painel > Site > Configurações > Código de verificação do Google Search Console**).
   - No menu lateral esquerdo, clique em **Sitemaps**.
   - No campo "Adicionar novo sitemap", digite `sitemap.xml` e clique em **Enviar**.
   - O Google processará o arquivo e listará todas as URLs de serviços e páginas encontradas com status verde "Sucesso".

---

## 🚀 Stack Tecnológica

- **React 19** - Biblioteca JavaScript para construção de interfaces
- **Vite** - Build tool extremamente rápida
- **TypeScript** - Superset tipado do JavaScript
- **Shadcn UI** - Componentes reutilizáveis e acessíveis
- **Tailwind CSS** - Framework CSS utility-first
- **React Router** - Roteamento para aplicações React
- **React Hook Form** - Gerenciamento de formulários performático
- **Zod** - Validação de schemas TypeScript-first
- **Recharts** - Biblioteca de gráficos para React

## 📋 Pré-requisitos

- Node.js 18+
- npm

## 🔧 Instalação

```bash
npm install
```

## 💻 Scripts Disponíveis

### Desenvolvimento

```bash
# Iniciar servidor de desenvolvimento
npm start
# ou
npm run dev
```

Abre a aplicação em modo de desenvolvimento em [http://localhost:5173](http://localhost:5173).

### Build

```bash
# Build para produção
npm run build

# Build para desenvolvimento
npm run build:dev
```

Gera os arquivos otimizados para produção na pasta `dist/`.

### Preview

```bash
# Visualizar build de produção localmente
npm run preview
```

Permite visualizar a build de produção localmente antes do deploy.

### 🚀 Deploy da Edge Function NFS-e (`nfse-emissao`)

> **Atenção:** O deploy da Edge Function é executado manualmente pelo administrador via Supabase CLI a partir da branch `main` atualizada do repositório GitHub. Nunca faça o deploy a partir de pastas locais avulsas (como `Downloads`), para evitar publicar código desatualizado.

Sequência correta de deploy:

```bash
# 1. Garantir que você está na pasta raiz do repositório clonado e na branch main
git status
git pull origin main

# 2. Conferir que o arquivo supabase/functions/nfse-emissao/index.ts está atualizado
# (verifique a versão ou histórico do git)
git log -1 --stat supabase/functions/nfse-emissao/index.ts

# 3. Executar o deploy no projeto Supabase (phjthpjdbhqhcfnyjjzc)
supabase functions deploy nfse-emissao --no-verify-jwt
```

> **Nota:** A flag `--no-verify-jwt` é intencional e necessária porque a função implementa sua própria validação administrativa rigorosa (`is_admin()` / token do usuário autenticado) e suporte a webhooks/comunicação direta.

### Testes Automatizados (Módulo NFS-e e Edge Function)

Os testes são executáveis de verdade e retornam falha (código de saída `exit 1`) caso qualquer asserção falhe.

```bash
# 1. Executar suíte de testes do Módulo NFS-e (Node.js)
node scripts/test-runner.js

# 2. Executar suíte de testes com Vitest
npx vitest run

# 3. Executar testes unitários da Edge Function Deno (Supabase)
deno test --allow-read supabase/functions/nfse-emissao/index_test.ts
```

#### ⚠️ Nota Importante sobre o script `npm test` e o arquivo `package.json`

O arquivo `package.json` deste projeto no ambiente de desenvolvimento é **protegido contra escrita pela IA (preventAI)** para preservar a integridade das dependências e builds. Por este motivo, a IA não possui permissão para editar diretamente o `package.json` na plataforma Skip.

Atualmente, o `package.json` padrão possui:
```json
"scripts": {
  "test": "echo \"there are no tests for this project\" && exit 0"
}
```

**Como corrigir no GitHub externo (uma única vez):**
Como a sincronização de código do Skip para o GitHub é de sentido único (sem pull de volta), edite o arquivo `package.json` diretamente no seu repositório GitHub e altere o script `"test"` para invocar o test-runner:
```json
"scripts": {
  "test": "node scripts/test-runner.js"
}
```
Dessa forma, tanto `npm test` quanto `node scripts/test-runner.js` executarão a suíte oficial com validação real e sem falsos positivos.

#### 📦 Processador XML Schema Real (`libxml2-wasm`)

Para validação estrita baseada em C/WASM contra os esquemas XSD oficiais v1.01 (com resolução de `xsd:import` e `xsd:include` em memória), adicione a dependência `libxml2-wasm` ao seu projeto via GitHub externo:

```bash
npm install libxml2-wasm
```

Enquanto a dependência é adicionada externamente, o módulo `nfseXsdValidate.ts` dispõe de:
1. **Detecção Dinâmica do `libxml2-wasm`** (`validarDpsXmlContraXsdAsync`): Se o pacote estiver presente no `node_modules`, o processador WASM é instanciado automaticamente com os 4 XSDs oficiais em buffers virtuais (`XmlBufferInputProvider`).
2. **Fallback Baseado no Modelo Oficial XSD v1.01**: Caso o pacote WASM ainda não esteja instalado, o motor compilado a partir dos 4 esquemas oficiais executa a verificação estrita de namespace, raiz, versão, ordenação de sequências (`xs:sequence`), cardinalidades (`minOccurs`/`maxOccurs`), padrões regex (`TSIdDPS`, `TSDateTimeUTC`, `TSCodMunIBGE`, etc.) e estrutura da assinatura digital (`xmldsig-core-schema.xsd`), emitindo sinalização explícita de `engine: "schema-model-fallback"`.

#### Cobertura dos Testes:
- **XSD v1.01 Vendored**: Verifica integridade e presença offline de `DPS_v1.01.xsd`, `tiposComplexos_v1.01.xsd`, `tiposSimples_v1.01.xsd` e `xmldsig-core-schema.xsd` nas pastas `schemas/nfse/v1.01/` e `src/schemas/nfse/v1.01/`.
- **Criptografia PKCS#12 e PKCS#8**: Conversão de chave privada para PEM `-----BEGIN PRIVATE KEY-----` para mTLS Deno.
- **Canonicalização Exclusive C14N**: Verificação de `c14nExclusiveNode` da própria Edge Function com propagação do namespace raiz (`xmlns="http://www.sped.fazenda.gov.br/nfse"`).
- **Assinatura e Verificação RSA-SHA256**: Recálculo independente do `DigestValue` (SHA-256) e validação matemática do `SignatureValue` contra a chave pública RSA do certificado digital.
- **Detecção de Fraude**: Comprovação de que adulterações posteriores no XML pós-assinatura quebram o Digest e a assinatura.
- **Validação de Regras XSD v1.01**: Rejeição estrita de campos invertidos, ausentes, formatos de Id da DPS (`DPS[0-9]{42}`) ou municípios IBGE incorretos.

### Linting e Formatação

```bash
# Executar linter
npm run lint

# Executar linter e corrigir problemas automaticamente
npm run lint:fix

# Formatar código com Oxfmt
npm run format
```

## 📁 Estrutura do Projeto

```
.
├── src/              # Código fonte da aplicação
├── public/           # Arquivos estáticos
├── dist/             # Build de produção (gerado)
├── node_modules/     # Dependências (gerado)
└── package.json      # Configurações e dependências do projeto
```

## 🎨 Componentes UI

Este template inclui uma biblioteca completa de componentes Shadcn UI baseados em Radix UI:

- Accordion
- Alert Dialog
- Avatar
- Button
- Checkbox
- Dialog
- Dropdown Menu
- Form
- Input
- Label
- Select
- Switch
- Tabs
- Toast
- Tooltip
- E muito mais...

## 📝 Ferramentas de Qualidade de Código

- **TypeScript**: Tipagem estática
- **Oxlint**: Linter extremamente rápido
- **Oxfmt**: Formatação automática de código

## 🔄 Workflow de Desenvolvimento

1. Instale as dependências: `npm install`
2. Inicie o servidor de desenvolvimento: `npm start`
3. Faça suas alterações
4. Verifique o código: `npm run lint`
5. Formate o código: `npm run format`
6. Crie a build: `npm run build`
7. Visualize a build: `npm run preview`

## 📦 Build e Deploy

Para criar uma build otimizada para produção:

```bash
npm run build
```

Os arquivos otimizados serão gerados na pasta `dist/` e estarão prontos para deploy.
