# Guia de Instalação no Seu Próprio Servidor (Self-Hosted com Supabase)
### Gesso Bettone • Sistema de Gestão de Vendas, Orçamentos e Site Institucional

Este guia foi elaborado para ser simples, direto e à prova de dúvidas, mesmo para quem nunca configurou um servidor ou banco de dados na vida.

Nesta edição, o sistema utiliza o **Supabase** (PostgreSQL gerenciado na nuvem) para o banco de dados, autenticação de usuários e armazenamento de fotos/vídeos. O front-end roda perfeitamente em hospedagem compartilhada da **Hostinger (via Git deployment ou upload do `dist/`)** ou em VPS próprio com Docker/Nginx.

---

## 📋 Sumário
1. [O que você vai precisar (Pré-requisitos)](#1-o-que-você-vai-precisar-pré-requisitos)
2. [Passo 1: Criar seu Projeto no Supabase (Gratuito)](#passo-1-criar-seu-projeto-no-supabase-gratuito)
3. [Passo 2: Rodar o Script de Tabelas no SQL Editor](#passo-2-rodar-o-script-de-tabelas-no-sql-editor)
4. [Passo 3: Criar os Buckets de Armazenamento (Fotos e Mídias)](#passo-3-criar-os-buckets-de-armazenamento-fotos-e-mídias)
5. [Passo 4: Configurar a Autenticação e Criar seu Usuário](#passo-4-configurar-a-autenticação-e-criar-seu-usuário)
6. [Passo 5: Pegar a URL e a Anon Key do Projeto](#passo-5-pegar-a-url-e-a-anon-key-do-projeto)
7. [Passo 6: Subir o Front-End no VPS com Docker](#passo-6-subir-o-front-end-no-vps-com-docker)
8. [Passo 7: Configurar seu Domínio e SSL Grátis (HTTPS)](#passo-7-configurar-seu-domínio-e-ssl-grátis-https)
9. [Edge Functions do Supabase (Mídias, Marca d'Água e IA)](#edge-functions-do-supabase-mídias-marca-dágua-e-ia)
10. [Checklist de Verificação Pós-Instalação](#checklist-de-verificação-pós-instalação)

---

## 0. Deploy na Hostinger (Hospedagem Web / Cloud / Git) — Evitando Erro 404

Ao hospedar uma aplicação SPA (Single Page Application em React) na Hostinger, rotas como `/orcamentos`, `/painel`, `/vendas` podem retornar erro **404 Not Found** se o servidor Apache/LiteSpeed tentar procurar arquivos físicos nessas pastas.

Para garantir que o roteamento funcione 100%:
1. **Arquivos automáticos no repositório**:
   - `public/.htaccess`: Já incluído no projeto com regras do `mod_rewrite` para redirecionar todas as requisições não físicas para o `index.html`.
   - `public/_redirects`: Para ambientes compatíveis (`/* /index.html 200`).
   - `public/404.html`: Cópia espelho do `index.html` para roteamento SPA automático caso a Hostinger use a página 404 personalizada do servidor.
2. **Build e Deploy na Hostinger**:
   - O comando de build do repositório copia todos os arquivos da pasta `public/` para a raiz de `dist/`.
   - Se você faz deploy via Git automatizado da Hostinger: aponte o diretório de publicação para `dist` ou copie o conteúdo de `dist/` para `public_html/`.
   - Certifique-se de que o arquivo `.htaccess` esteja presente na raiz da sua pasta `public_html/` (habilite "Mostrar arquivos ocultos" no Gerenciador de Arquivos da Hostinger se não o visualizar).

---

## 1. O que você vai precisar (Pré-requisitos)

1. **Uma conta no Supabase:** Acesse [supabase.com](https://supabase.com) e entre com sua conta (plano gratuito atende com folga).
2. **Um VPS Linux:** Recomendamos **Ubuntu 22.04 LTS** ou **Ubuntu 24.04 LTS** na Hostinger (plano KVM 1 ou KVM 2).
3. **Docker instalado no VPS:** Se a Hostinger já não veio com Docker pré-instalado, basta rodar no terminal:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. **Um domínio próprio (opcional):** ex.: `gessobettone.com.br`.

---

## Passo 1: Criar seu Projeto no Supabase (Gratuito)

1. Faça login em [supabase.com/dashboard](https://supabase.com/dashboard).
2. Clique no botão verde **"New project"**.
3. Selecione a sua organização.
4. Preencha os dados:
   - **Name:** `gesso-bettone` (ou o nome que preferir).
   - **Database Password:** Crie uma senha forte e guarde-a em local seguro.
   - **Region:** Selecione `South America (São Paulo)` para ter o menor tempo de resposta no Brasil.
   - **Pricing Plan:** Escolha `Free` (ou o que desejar).
5. Clique em **"Create new project"** e aguarde cerca de 1 a 2 minutos até o banco ficar com o status verde (ativo).

---

## Passo 2: Rodar o Script de Tabelas no SQL Editor

1. No menu lateral esquerdo do Supabase, clique no ícone **SQL Editor** (parece um terminal com `>_`).
2. Clique em **"New query"** (botão verde no topo).
3. Abra o arquivo `self-hosted/supabase/schema.sql` que vem neste pacote.
4. Copie **todo o conteúdo** do arquivo e cole dentro do editor do Supabase.
5. Clique no botão **"Run"** (ou aperte `Ctrl + Enter`).
6. Em poucos segundos, você verá a mensagem `Success. No rows returned`.
7. **Pronto!** Todas as 19 tabelas foram criadas com chaves estrangeiras, índices de alta performance e políticas de segurança (Row Level Security) já configuradas:
   - `profiles`, `vendas`, `produtos`, `orcamentos`, `clientes`, `clientes_grupos`...
   - `site_services`, `site_portfolio`, `site_testimonials`, `site_settings`...
   - `simulador_clientes`, `simulador_historico`, etc.

---

## Passo 3: Criar os Buckets de Armazenamento (Fotos e Mídias)

O script `schema.sql` já tenta criar os buckets automaticamente, mas você pode conferir ou criar manualmente caso necessário:

1. No menu lateral esquerdo, clique em **Storage**.
2. Verifique se existem dois buckets:
   - `public-media` (deve estar marcado como **Public bucket**).
   - `simulador` (deve estar marcado como **Public bucket**).
3. Se algum deles não estiver na lista:
   - Clique em **"New bucket"**.
   - Digite o nome: `public-media`.
   - Ative a opção **"Public bucket"** (verde).
   - Clique em **"Save"**.
   - Repita para o bucket `simulador`.

---

## Passo 4: Configurar a Autenticação e Criar seu Usuário

### 4.1. Desabilitar confirmação obrigatória de e-mail (Recomendado para início imediato)
Por padrão, o Supabase exige que o usuário clique em um link enviado por e-mail para ativar a conta. Para poder entrar no painel imediatamente:
1. No menu lateral esquerdo, clique no ícone de engrenagem **Project Settings** > **Authentication**.
2. Na aba **Email**, desmarque a opção **"Confirm email"** (desative o toggle).
3. Clique em **Save**.
*(Se preferir usar confirmação de e-mail com SMTP da Hostinger ou SendGrid, você pode configurar as credenciais de SMTP nativo nessa mesma tela).*

### 4.2. Criar o seu primeiro usuário de login
1. No menu lateral esquerdo, clique no ícone **Authentication** (dois bonecos/usuários).
2. Clique na aba **Users** > **"Add user"** > **"Create user"**.
3. Preencha:
   - **Email:** seu e-mail de acesso (ex.: `admin@gessobettone.com.br`).
   - **Password:** sua senha secreta.
   - Marque a opção **"Auto Confirm User?"** se ela aparecer.
4. Clique em **"Create user"**.
5. O trigger automático do PostgreSQL criará o perfil de administrador correspondente na tabela `profiles`.

---

## Passo 5: Pegar a URL e a Anon Key do Projeto

1. No menu lateral esquerdo, clique em **Project Settings** (engrenagem) > **API** (ou **Data API**).
2. Copie os dois dados abaixo:
   - **Project URL:** algo como `https://abcdefghij.supabase.co`.
   - **Project API Keys (anon / public):** uma chave longa que começa normalmente com `eyJhbGciOiJIUzI1NiIsIn...`.

---

## Passo 6: Subir o Front-End no VPS com Docker

Acesse o terminal do seu VPS via SSH:

### 6.1. Acessar a pasta do projeto
```bash
cd /opt/gesso-bettone/self-hosted
```

### 6.2. Configurar o arquivo `.env`
Copie o modelo de ambiente:
```bash
cp env-example.txt .env
```
Abra o `.env` com o editor nano:
```bash
nano .env
```
Substitua com a URL e a anon key copiadas do seu painel do Supabase no Passo 5:
```env
APP_PORT=80
VITE_SUPABASE_URL=https://SEU-PROJETO.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```
*(Para salvar no nano: aperte `Ctrl + O`, depois `Enter`, e `Ctrl + X` para sair).*

### 6.3. Compilar e subir com o Docker Compose
Execute dentro da pasta `self-hosted`:
```bash
docker compose up -d --build
```
O Docker fará o build otimizado da aplicação React e iniciará o Nginx na porta 80.

Para conferir o status:
```bash
docker compose ps
```
Você verá o contêiner `bettone_frontend` com status **Up**.

Acesse no navegador:
`http://IP-DO-SEU-VPS`

Faça o login em:
`http://IP-DO-SEU-VPS/login` com o e-mail e a senha criados no Passo 4!

---

## Passo 7: Configurar seu Domínio e SSL Grátis (HTTPS)

Para apontar `gessobettone.com.br` para o seu VPS com certificado HTTPS Let's Encrypt automático:

1. No painel onde registrou seu domínio (Registro.br, GoDaddy, Cloudflare, etc.), crie os apontamentos:
   - Tipo `A`: `@` apontando para o `IP-DO-SEU-VPS`.
   - Tipo `A`: `www` apontando para o `IP-DO-SEU-VPS`.

2. No VPS, instale o **Caddy** (servidor web que automatiza HTTPS sem complicações):
   ```bash
   sudo apt install -y caddy
   ```
3. Edite o arquivo `/etc/caddy/Caddyfile`:
   ```caddy
   seudominio.com.br, www.seudominio.com.br {
       reverse_proxy localhost:80
   }
   ```
4. Reinicie o Caddy:
   ```bash
   sudo systemctl restart caddy
   ```
Pronto! Seu site e painel estarão no ar com cadeado de segurança verde e certificado renovado automaticamente para sempre.

---

## Edge Functions do Supabase (Mídias, Marca d'Água e IA)

O pacote já inclui na pasta `self-hosted/supabase/functions/` as três funções Deno prontas:
1. `simulador-ia`: Gateway do simulador de ambientes com IA (DALL-E 3) e fallback automático para fotos de alta qualidade da Bettone caso a chave da OpenAI não esteja configurada.
2. `watermark`: Aplicação e processamento de imagem diretamente na nuvem.
3. `site-midias-inventario`: Consulta estruturada de todas as fotos e vídeos para o botão **"Baixar todas as mídias em ZIP"** do painel.

### Como fazer deploy das funções (Opcional via Supabase CLI):
Se quiser publicar as Edge Functions no Supabase:
```bash
# Instale a CLI do Supabase na sua máquina
npm install -g supabase

# Faça login e vincule ao seu projeto
supabase login
supabase link --project-ref SEU-ID-DE-PROJETO

# Configure o segredo da OpenAI se desejar usar IA real no simulador
supabase secrets set OPENAI_API_KEY=sua-chave-aqui

# Faça deploy das funções
supabase functions deploy simulador-ia --no-verify-jwt
supabase functions deploy watermark --no-verify-jwt
supabase functions deploy site-midias-inventario
```

---

## Checklist de Verificação Pós-Instalação

- [ ] Script `schema.sql` executado sem erros no SQL Editor do Supabase.
- [ ] Buckets `public-media` e `simulador` criados e com acesso público ativado.
- [ ] Confirmação de e-mail desativada OU servidor SMTP configurado no Authentication.
- [ ] Primeiro usuário criado no menu Authentication > Users.
- [ ] Arquivo `.env` preenchido com `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
- [ ] Contêiner `bettone_frontend` em execução (`docker compose ps`).
- [ ] Login efetuado com sucesso em `/login`.
- [ ] Cadastro de teste de um novo orçamento e cliente realizado com sucesso.
- [ ] Site público exibindo seções de Serviços, Portfólio, Sobre e Contato.

## Atualizações do Banco de Dados (schema.sql — 100% Seguro e Idempotente)

O arquivo `self-hosted/supabase/schema.sql` contém **apenas instruções DDL idempotentes** (`CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, índices, triggers, grants e policies).

> **IMPORTANTE:** O script `schema.sql` principal **NUNCA apaga nem sobrescreve dados** já cadastrados no seu Supabase. Você pode executá-lo no SQL Editor do Supabase a cada nova versão do aplicativo com total segurança para aplicar novas colunas, tabelas e permissões sem perder projetos, serviços, imagens ou vendas.

## Limpeza de Dados Demo — Começar o Site do Zero (OPCIONAL / DESTRUTIVO)

Se você estiver configurando o sistema pela primeira vez e quiser deliberadamente zerar os dados de demonstração (projetos de teste, parceiros demo, dados demo de vendas e imagens de exemplo dos serviços), utilize o arquivo **separado e opcional**:

`self-hosted/supabase/schema_cleanup.sql`

1. Acesse seu projeto no Supabase > **SQL Editor** > **New query**.
2. Abra o arquivo `self-hosted/supabase/schema_cleanup.sql`, copie seu conteúdo e cole no editor.
3. Clique em **Run**.
4. **Nunca execute esse script em atualizações de rotina**, apenas quando quiser deliberadamente começar do zero.

## Indexação no Google (SEO Completo & Google Search Console)

O site está estruturado para indexação otimizada no Google Search, com foco em São Pedro/SP e toda a região (Piracicaba, Águas de São Pedro, Charqueada, Santa Maria da Serra, Rio Claro e Brotas), incluindo serviços e a rede de parceiros locais.

### Passo a passo para indexar seu site:

1. **Acesse o Google Search Console:**
   - Entre em [https://search.google.com/search-console](https://search.google.com/search-console) com sua conta Google.
   - Adicione uma nova propriedade escolhendo **Prefixo do URL** com o endereço do seu site (ex: `https://gessobettone.com.br`).

2. **Verificar a Propriedade via Tag HTML:**
   - Escolha o método de verificação **Tag HTML**.
   - Copie apenas o código contido dentro de `content="..."` (ou a meta tag inteira). Exemplo: `abc123xyz456...`.
   - Acesse o painel da Bettone em `/painel/site/configuracoes` (Menu Lateral: *Contato, conversão e presença digital*).
   - Cole o código no campo **Código de verificação do Google Search Console** e clique em **SALVAR ALTERAÇÕES**.
   - A tag `<meta name="google-site-verification" content="...">` será injetada automaticamente no `<head>` do site público.
   - Volte ao Search Console e clique no botão **Verificar**.

3. **Submeter o Sitemap XML:**
   - No menu lateral esquerdo do Search Console, clique em **Sitemaps**.
   - No campo *Adicionar um novo sitemap*, digite `sitemap.xml` e clique em **Enviar**.
   - O sitemap cobre as rotas principais (`/`, `/servicos`, `/portfolio`, `/parceiros`, `/sobre`, `/contato`), bem como as páginas detalhadas de serviços e projetos.

4. **Gerar ou Atualizar o Sitemap Dinâmico via Script (Opcional):**
   - O projeto gera automaticamente `public/sitemap.xml` no build com todas as páginas fixas e serviços.
   - Se você possui acesso ao Supabase no seu ambiente de build/CI e deseja que o sitemap consulte dinamicamente os novos slugs cadastrados no banco remoto, execute:
     ```bash
     npm run generate:sitemap
     ```
   - O script lê `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` do `.env` e atualiza `public/sitemap.xml` e `dist/sitemap.xml`.

---
*Gesso Bettone — Soluções sob medida em Gesso e Drywall.*
