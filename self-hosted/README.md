# Guia de Instalação no Seu Próprio Servidor (Self-Hosted)
### Gesso Bettone • Sistema de Gestão de Vendas, Orçamentos e Site Institucional

Este guia foi elaborado para ser simples, direto e à prova de dúvidas, mesmo que você nunca tenha configurado um servidor na vida.

Seguindo este passo a passo, você terá o sistema completo rodando no seu próprio VPS (ex.: **Hostinger VPS**, DigitalOcean, Hetzner, AWS, Linode ou qualquer servidor Linux com Docker).

---

## 📋 Sumário
1. [O que está incluído no pacote](#1-o-que-está-incluído-no-pacote)
2. [Pré-requisitos mínimos](#2-pré-requisitos-mínimos)
3. [Passo a Passo de Instalação (5 minutos)](#3-passo-a-passo-de-instalação-5-minutos)
4. [Criando o Administrador e seu Primeiro Acesso](#4-criando-o-administrador-e-seu-primeiro-acesso)
5. [Configurando seu Domínio e SSL Grátis (HTTPS)](#5-configurando-seu-domínio-e-ssl-grátis-https)
6. [Simulador de Ambientes com IA (Opcional)](#6-simulador-de-ambientes-com-ia-opcional)
7. [Backup e Segurança dos Dados](#7-backup-e-segurança-dos-dados)
8. [Como Atualizar o Sistema no Futuro](#8-como-atualizar-o-sistema-no-futuro)
9. [Solução de Dúvidas Frequentes](#9-solução-de-dúvidas-frequentes)

---

## 1. O que está incluído no pacote

O pacote autônomo entrega exatamente tudo o que sua empresa precisa, com banco de dados **zerado (sem dados de demonstração)** e todo o esquema pronto:

- **Site Institucional Completo:** Home, Serviços com fotos/vídeos e marca d'água, Portfólio de Obras, Depoimentos, Parceiros comerciais, Botão Flutuante de WhatsApp e SEO integrado.
- **Módulo de Orçamentos Completo:**
  - Cadastro de clientes e grupos de preços (ex.: Geral, Parceiros, Senac).
  - Serviços de orçamento com cálculo por área ($m^2$) ou dimensões (largura $\times$ comprimento).
  - Métodos de pagamento personalizados com desconto à vista.
  - Funil de vendas e Kanban visual.
  - Cronograma de obras Gantt interativo.
  - Geração de PDF profissional com CNPJ, Razão Social e logotipo.
  - Contas a Receber com baixa de parcelas e conciliação.
- **Gestão de Vendas e Alertas:** Cadastro de vendas por canal/cidade e robô interno de alertas automáticos.
- **Central de Mídias e Download em ZIP:** Upload de fotos/vídeos de alta qualidade com marca d'água automática e download de todo o acervo em um único arquivo ZIP organizado por pastas.
- **Simulador de Ambientes:** Com controles liga/desliga, login por celular, cotas mensais e fallback com fotos do portfólio caso não use chave de IA.

---

## 2. Pré-requisitos mínimos

Você precisará de:
1. **Um VPS Linux:** Recomendamos **Ubuntu 22.04 LTS** ou **Ubuntu 24.04 LTS**.
   - Configuração recomendada: 1 vCPU, 1 GB ou 2 GB de RAM (planos básicos da Hostinger VPS tipo KVM 1 ou KVM 2 atendem perfeitamente com folga).
2. **Docker e Docker Compose instalados:** A maioria dos provedores (incluindo a Hostinger) oferece a opção de instalar o VPS já com o template **Docker** pré-instalado em um clique. Se o seu VPS estiver limpo, basta rodar o comando oficial:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
3. **Um domínio próprio (opcional, mas recomendado):** ex: `gessobettone.com.br`.

---

## 3. Passo a Passo de Instalação (5 minutos)

Acesse o terminal do seu VPS via SSH (pelo PuTTY no Windows ou pelo terminal no Mac/Linux):

### 3.1. Enviar ou Clonar o Projeto no Servidor
Se você estiver usando o Git ou baixou os arquivos compactados em `.zip`:

```bash
# Crie a pasta do projeto e acesse
mkdir -p /opt/gesso-bettone
cd /opt/gesso-bettone

# Se você enviou os arquivos via SFTP/SCP ou descompactou o zip:
# Acesse a pasta self-hosted:
cd self-hosted
```

### 3.2. Configurar o Arquivo de Ambiente (.env)
Copie o modelo de configuração:

```bash
cp env-example.txt .env
```

Abra o arquivo `.env` para conferir ou ajustar (usando o editor nano):
```bash
nano .env
```

*Por padrão, você não precisa alterar nada! As portas e URLs já vêm configuradas para funcionar automaticamente na porta web 80.*
*(Para salvar no nano: aperte `Ctrl + O`, depois `Enter`, e `Ctrl + X` para sair).*

### 3.3. Subir o Sistema com o Docker
Execute o comando abaixo dentro da pasta `self-hosted`:

```bash
docker compose up -d --build
```

O Docker fará o download das imagens oficiais, compilará o front-end otimizado e iniciará o banco de dados PocketBase com todas as tabelas e regras prontas.

Para verificar se está tudo rodando perfeitamente:
```bash
docker compose ps
```
Você verá dois contêineres: `bettone_pocketbase` (saudável / healthy) e `bettone_frontend` (up).

Pronto! Acesse no seu navegador:
`http://IP-DO-SEU-VPS`

---

## 4. Criando o Administrador e seu Primeiro Acesso

Como o banco nasce 100% limpo e seguro por decisão de privacidade:

### 4.1. Criar o Superusuário do Banco (PocketBase Admin)
1. No seu navegador, abra:
   `http://IP-DO-SEU-VPS/_/`
   *(ou `http://IP-DO-SEU-VPS:8090/_/` se configurou porta direta)*
2. O PocketBase mostrará a tela de boas-vindas: **"Create your first admin account"**.
3. Digite seu e-mail e uma senha forte (mínimo 10 caracteres).
4. Clique em **Create and login**.
5. No menu lateral, você verá todas as coleções criadas e estruturadas:
   - `users`, `vendas`, `produtos`, `orcamentos`, `clientes`, `clientes_grupos`...
   - `site_services`, `site_portfolio`, `site_settings`, `simulador_clientes`...

### 4.2. Criar a sua Conta de Usuário do Aplicativo
1. Abra a página inicial do sistema no seu navegador:
   `http://IP-DO-SEU-VPS/login`
2. Clique no link **"Não tem conta? Cadastre-se"** (ou acesse diretamente `http://IP-DO-SEU-VPS/register`).
3. Cadastre seu nome, e-mail e senha.
4. Faça o login e você terá acesso imediato a todo o painel interno de Vendas, Orçamentos, Estoque e Gerenciamento do Site!

---

## 5. Configurando seu Domínio e SSL Grátis (HTTPS)

Para que o site responda em `https://gessobettone.com.br` com cadeado verde de segurança:

### Opção Recomendada: Usar Caddy ou Nginx Proxy Manager
Se o seu VPS tiver IP fixo (ex: `123.45.67.89`):
1. No painel onde você comprou o domínio (Registro.br, GoDaddy, Cloudflare, etc.), aponte os registros:
   - Tipo `A`: `@` -> `IP-DO-SEU-VPS`
   - Tipo `A`: `www` -> `IP-DO-SEU-VPS`

2. Se quiser usar o **Caddy** (servidor web ultraleve que gera SSL Let's Encrypt 100% automático):
   Instale o Caddy no servidor:
   ```bash
   sudo apt install -y caddy
   ```
   Edite `/etc/caddy/Caddyfile`:
   ```caddy
   seudominio.com.br, www.seudominio.com.br {
       reverse_proxy localhost:80
   }
   ```
   Reinicie o Caddy:
   ```bash
   sudo systemctl restart caddy
   ```
   Em menos de 10 segundos seu site estará no ar com HTTPS válido e certificado renovado automaticamente para sempre!

---

## 6. Simulador de Ambientes com IA (Opcional)

O sistema conta com um simulador onde clientes podem enviar fotos do ambiente para visualizar reformas de gesso e drywall.

- **Sem chave de API:** O sistema utiliza automaticamente fotos temáticas do portfólio executado pela Bettone. Nada quebra e a experiência do cliente continua elegante.
- **Com Inteligência Artificial real (DALL-E 3):**
  1. Obtenha uma chave em [platform.openai.com](https://platform.openai.com/api-keys).
  2. Abra seu arquivo `.env` na pasta `self-hosted`:
     ```env
     OPENAI_API_KEY=sk-proj-sua-chave-aqui...
     ```
  3. Reinicie o contêiner:
     ```bash
     docker compose restart pocketbase
     ```
  4. O simulador passará a gerar transformações fotográficas realistas para os clientes!

---

## 7. Backup e Segurança dos Dados

Todos os orçamentos, vendas, clientes cadastrados e imagens enviadas ficam armazenados com segurança em um volume Docker persistente chamado `bettone_pb_data`.

### 7.1. Fazer Backup Manual com 1 Comando
Dentro da pasta `self-hosted`, fornecemos um script pronto:
```bash
chmod +x backup.sh
./backup.sh
```
O script gerará um arquivo `.tar.gz` compactado dentro da pasta `self-hosted/backups/` com data e hora. Você pode baixar esse arquivo para o seu computador ou Google Drive.

### 7.2. Restaurar um Backup
Se precisar reinstalar ou trocar de VPS:
```bash
chmod +x restaurar.sh
./restaurar.sh ./backups/bettone_backup_2025-01-01_12-00-00.tar.gz
```

### 7.3. Backup Automático Diário (Opcional)
Para programar o backup todo dia às 03:00 da manhã, adicione ao `crontab`:
```bash
crontab -e
# Adicione a linha:
0 3 * * * cd /opt/gesso-bettone/self-hosted && ./backup.sh > /dev/null 2>&1
```

---

## 8. Como Atualizar o Sistema no Futuro

Quando houver uma nova versão do sistema:
1. Puxe as atualizações do repositório ou envie os arquivos atualizados:
   ```bash
   cd /opt/gesso-bettone/self-hosted
   git pull   # ou extraia os novos arquivos
   ```
2. Reconstrua e suba os contêineres:
   ```bash
   docker compose up -d --build
   ```
O Docker atualizará os arquivos do site e aplicará qualquer migração pendente no banco de dados automaticamente, **sem apagar nenhum dos seus clientes, vendas ou orçamentos**.

---

## 9. Solução de Dúvidas Frequentes

### P: A porta 80 já está em uso no meu VPS por outro serviço (ex: Apache). O que fazer?
No seu arquivo `.env`, altere:
```env
APP_PORT=8080
```
E acesse em `http://IP-DO-SEU-VPS:8080`.

### P: Como visualizar os logs em tempo real se algo der errado?
Basta executar:
```bash
docker compose logs -f
```
Ou para ver apenas os logs do banco de dados:
```bash
docker compose logs -f pocketbase
```

### P: Meus dados somem se eu reiniciar o VPS?
**Não!** O Docker Compose utiliza um volume persistente gerenciado (`bettone_pb_data`). Os contêineres podem ser desligados, atualizados ou o servidor reiniciado que todos os dados permanecem intactos.

---
*Gesso Bettone — Soluções sob medida em Gesso e Drywall.*
