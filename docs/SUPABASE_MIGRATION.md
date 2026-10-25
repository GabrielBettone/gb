# Migração de PocketBase para Supabase — plano controlado

## Estado atual

- [x] Confirmado o repositório de origem: `GabrielBettone/gessobettone`, branch `main`.
- [x] Criada a branch isolada `migration/supabase-foundation`.
- [x] Preparado o esquema inicial PostgreSQL/RLS e buckets no Supabase.
- [ ] Criar o projeto Supabase e configurar variáveis de ambiente na Hostinger.
- [ ] Implementar a camada de acesso Supabase no frontend.
- [ ] Migrar autenticação, clientes, produtos, vendas, orçamentos, serviços/preços, parcelas e alertas.
- [ ] Migrar serviços do site, configurações, depoimentos, parceiros, analytics e mídias.
- [ ] Migrar os hooks do simulador para funções confiáveis no backend.
- [ ] Exportar/importar dados do PocketBase e transferir arquivos.
- [ ] Executar build, lint e testes de regressão.
- [ ] Validar no domínio temporário e só então planejar a troca de domínio.

## Segurança e publicação

A Hostinger está implantando a branch `main`; por isso, as alterações da migração ficam em branch separada e não devem afetar a publicação atual enquanto não forem integradas.

**Não configure o banco da Hostinger com o esquema inicial enquanto a migração do frontend não estiver pronta.** O aplicativo ainda usa o SDK e os serviços do PocketBase; criar tabelas Supabase por si só não conecta o frontend.

Nunca coloque a chave `service_role` do Supabase em variáveis `VITE_*` nem no código do navegador. O frontend usará apenas a URL do projeto e a chave pública `anon/publishable`, com RLS. A `service_role` deve ficar exclusivamente em funções/serviços server-side.

## Etapas técnicas

### 1. Banco de dados e acesso

A migração SQL em `supabase/migrations/202610250001_initial_schema.sql` define tabelas equivalentes às coleções principais do PocketBase, o perfil associado a Supabase Auth, regras de acesso RLS e dois buckets de Storage:

- `site-media`: leitura pública de mídia publicada; alterações restritas ao administrador.
- `simulator-private`: arquivos privados do simulador.

O campo `legacy_pocketbase_id` permite fazer um mapa de IDs antigos para UUIDs do Postgres sem perder a capacidade de relacionar registros durante a importação.

O primeiro administrador deverá ser promovido de maneira explícita depois que sua conta existir no Supabase Auth; novos cadastros são criados como `member` e não podem acessar os dados comerciais. Validar o procedimento de bootstrap do administrador antes de liberar o sistema.

### 2. Migração dos dados e mídias

- Exportar coleções PocketBase e arquivos sem modificar nem apagar a origem.
- Importar em ordem de dependências; criar mapa `legacy_pocketbase_id -> id` e traduzir todas as relações.
- Copiar arquivos para Storage e substituir URLs PHP antigas como `watermark.php?src=...` por caminhos/URLs de Storage.
- Não importar PINs/códigos de confirmação em texto puro do simulador; exigir redefinição ou aplicar hash no processo server-side.

### 3. Frontend e autenticação

Substituir gradualmente:

- `src/contexts/AuthContext.tsx` e `src/components/ProtectedRoute.tsx`;
- `src/services/orcamentos.ts`, `src/services/orcamentoModulo.ts`, `src/services/orcamentoCondicoes.ts`, `src/services/orcamentoPDF.ts`, `src/services/site.ts` e `src/services/simulador.ts`;
- `src/services/siteMidiasDownload.ts`, `src/hooks/use-realtime.ts`, `src/lib/watermark.ts`, e os componentes que montam URLs PocketBase.

Os nomes das coleções e os parâmetros de consulta do PocketBase não são compatíveis automaticamente com Supabase/PostgREST. A mudança exige chamadas de dados explícitas, joins, upload/download de Storage e adaptação de Realtime; não basta trocar a URL do banco.

### 4. Variáveis e validação

Quando o código Supabase estiver implementado, adicionar na configuração da Web App Hostinger:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY` (ou a chave pública/publishable equivalente oferecida pelo painel)

Recompilar a aplicação e validar em endereço temporário. Não expor chaves privadas no frontend. Não conectar o domínio principal até a regressão e a migração de dados estarem concluídas.

## Observação importante

Este PR é somente a fundação de schema e o plano técnico; **não migra o frontend nem os dados e não está pronto para ser implantado como substituição do PocketBase**.

### Código base de integração (ainda isolado)

Foi adicionada a camada `src/lib/supabase/client.ts` com funções HTTP tipadas para leitura, inserção, atualização, exclusão, RPC e upload de arquivos. Ela usa somente a URL do projeto e uma chave pública/publishable, respeitando as políticas RLS; não contém `service_role`. Também foi adicionado `.env.example` com os nomes das duas variáveis públicas esperadas.

**Esses helpers ainda não substituem o PocketBase nos módulos atuais.** A autenticação, o realtime, os serviços do site/orçamentos, o simulador e a migração de dados/mídias continuam pendentes. Não configurar a Hostinger com as variáveis Supabase nem promover esta branch para produção até concluir essas etapas e validar a compilação.
