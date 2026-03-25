# Guia de Manutencao

## Objetivo

Guia rapido para manutencao do sistema com foco em diagnostico. A ideia aqui e: problema em X lugar, verifique Y no codigo.

## 1. Problema ao autenticar no `/login`

Verifique:
- `src/app/api/auth/login/route.ts`
- `src/server/auth/auth-service.ts`
- `src/server/auth/session.ts`
- `src/server/env.ts`

Pontos principais:
- `tenantSlug`, e-mail e senha enviados pelo formulario
- tenant ativo ou desativado
- `AUTH_SECRET`
- cookie de sessao sendo emitido

## 2. Item `Tenants` nao aparece no sidebar

Verifique:
- `src/modules/dashboard/components/app-sidebar.tsx`
- `src/shared/components/app-shell.tsx`
- `src/server/auth/platform-access.ts`
- `.env`

Pontos principais:
- e-mail logado precisa estar em `PLATFORM_ADMIN_EMAILS`
- sessao precisa estar autenticada
- contexto de plataforma ou suporte precisa estar sendo montado corretamente

## 3. Falha ao entrar em tenant como suporte

Verifique:
- `src/app/api/tenants/[id]/enter/route.ts`
- `src/app/api/tenants/support/exit/route.ts`
- `src/server/auth/platform-access.ts`
- `src/server/auth/session.ts`

Pontos principais:
- tenant alvo ativo
- e-mail autorizado como plataforma
- criacao da sessao com `support`
- auditoria `PLATFORM_SUPPORT_ENTERED` e `PLATFORM_SUPPORT_EXITED`

## 4. Problema ao criar tenant no `/cadastro`

Verifique:
- `src/app/cadastro/page.tsx`
- `src/modules/tenants/components/register-tenant-form.tsx`
- `src/app/api/tenants/register/route.ts`
- `src/modules/tenants/server/tenant-service.ts`

Pontos principais:
- `slug` unico
- usuarios iniciais e inboxes iniciais sendo criados
- diferenca entre fluxo publico e fluxo da plataforma

## 5. Problema nas configuracoes do tenant

Verifique:
- `src/app/configuracoes/page.tsx`
- `src/modules/tenants/components/tenant-settings-form.tsx`
- `src/app/api/tenants/current/route.ts`
- `src/modules/tenants/server/tenant-settings-service.ts`

Pontos principais:
- permissoes por papel
- persistencia de logo, remetente e origens habilitadas
- motivos de encerramento e prioridade padrao

## 6. Chamado nao aparece na fila ou na tela `Hoje`

Verifique:
- `src/modules/tickets/server/ticket-service.ts`
- `src/modules/today/server/today-service.ts`
- `src/modules/tickets/server/ticket-search.ts`

Pontos principais:
- status do chamado
- inbox acessivel para a sessao
- busca ativa filtrando resultado
- chamados fechados somem das listas e aparecem apenas na busca

## 7. Erro ao abrir o detalhe do chamado

Verifique:
- `src/app/tickets/[id]/page.tsx`
- `src/modules/tickets/server/ticket-service.ts`
- `src/server/auth/access.ts`

Pontos principais:
- numero do chamado convertido corretamente
- acesso por inbox
- acesso ao chamado filho via chamado pai
- dados carregados para timeline, responsavel e inboxes relacionadas

## 8. Problema em assumir, repassar ou finalizar chamado

Verifique:
- `src/modules/tickets/components/ticket-actions.tsx`
- `src/app/api/tickets/[id]/assign/route.ts`
- `src/app/api/tickets/[id]/close/route.ts`
- `src/modules/tickets/server/ticket-service.ts`

Pontos principais:
- status atual do chamado
- usuario responsavel atual
- papel do usuario
- membership do usuario na inbox
- motivo de encerramento valido para o tenant

## 9. Problema em transferir chamado ou criar chamado filho

Verifique:
- `src/app/api/tickets/[id]/transfer/route.ts`
- `src/app/api/tickets/[id]/child/route.ts`
- `src/modules/tickets/server/ticket-service.ts`
- `src/app/tickets/[id]/page.tsx`

Pontos principais:
- regras de permissao por papel
- inbox destino ativa
- criacao de relacao pai e filho
- renderizacao do modal de chamados filhos

## 10. Problema em registrar observacao, acordo ou reagendamento

Verifique:
- `src/modules/tickets/components/add-interaction-form.tsx`
- `src/app/api/tickets/[id]/interactions/route.ts`
- `src/app/api/tickets/[id]/schedule/route.ts`
- `src/modules/tickets/server/ticket-service.ts`

Pontos principais:
- `content-type` chegando como multipart ou json
- validacao do schema
- fallback de conteudo quando houver so anexo
- cancelamento de reagendamento pendente anterior

## 11. Anexos nao sobem, retornam 400 ou nao aparecem

Verifique:
- `src/modules/tickets/server/attachment-storage.ts`
- `src/app/api/tickets/route.ts`
- `src/app/api/tickets/[id]/interactions/route.ts`
- `src/app/api/portal/[slug]/tickets/route.ts`
- `next.config.ts`

Pontos principais:
- limite de 25 MB por arquivo
- ate 5 anexos por envio
- `content-type` do request
- extensao suportada
- `middlewareClientMaxBodySize` configurado
- formulario enviando `FormData`

## 12. Anexo nao baixa ao clicar

Verifique:
- `src/app/api/tickets/attachments/[attachmentId]/route.ts`
- `src/modules/tickets/server/attachment-storage.ts`
- `src/modules/tickets/server/ticket-service.ts`
- `src/app/tickets/[id]/page.tsx`

Pontos principais:
- usuario autenticado
- acesso a inbox do ticket
- link montado como `/api/tickets/attachments/[attachmentId]`
- arquivo salvo no storage atual ou em legado `/uploads/tickets`
- `ATTACHMENTS_ROOT_DIR` apontando para diretorio existente e persistente

## 13. Portal publico do solicitante com erro

Verifique:
- `src/app/portal/[slug]/page.tsx`
- `src/modules/tickets/components/portal-ticket-form.tsx`
- `src/app/api/portal/[slug]/tickets/route.ts`
- `src/modules/tickets/server/ticket-service.ts`

Pontos principais:
- `slug` do tenant
- tenant ativo
- origem `CUSTOMER_PORTAL` habilitada
- inbox selecionada ativa
- logo do tenant e nome exibidos corretamente

## 14. E-mails automaticos nao sao enviados

Verifique:
- `src/modules/tickets/server/ticket-email-notifications.ts`
- `src/modules/tickets/server/ticket-service.ts`
- `src/app/api/internal/notification-jobs/process/route.ts`
- `src/modules/tenants/server/tenant-settings-service.ts`
- `.env`

Pontos principais:
- `RESEND_API_KEY`
- `APP_URL`
- `INTERNAL_CRON_SECRET`
- remetente configurado no tenant
- jobs pendentes ou falhados na tabela `NotificationJob`
- retry automatico e `lastError` do job

## 15. Dashboard lento ou dados incoerentes

Verifique:
- `src/modules/dashboard/data.ts`
- `src/modules/dashboard/components/topbar.tsx`
- `src/modules/dashboard/components/dashboard-view.tsx`
- `src/modules/dashboard/components/queue-list.tsx`

Pontos principais:
- consultas leves usando `select` e `_count`
- SLA da inbox aplicado ao risco
- filtros de inbox acessivel
- alerta transformado em notificacao de header

## 16. Inboxes ou usuarios com comportamento estranho

Verifique:
- `src/modules/inboxes/server/inbox-service.ts`
- `src/modules/inboxes/components/inbox-manager.tsx`
- `src/modules/users/server/user-service.ts`
- `src/modules/users/components/user-inbox-membership-manager.tsx`

Pontos principais:
- memberships por inbox
- tenant correto
- arquivamento versus exclusao definitiva
- SLA de primeira acao e resolucao por inbox

## 17. Erros de Prisma, schema ou banco

Verifique:
- `prisma/schema.prisma`
- `src/server/db.ts`
- `.env`

Comandos uteis:
- `npx prisma db push`
- `npm run prisma:generate`

Pontos principais:
- `DATABASE_URL`
- colunas novas aplicadas no banco
- client Prisma regenerado

## 18. `npm run typecheck` ou `npm run build` falhando

Verifique:
- `package.json`
- `tsconfig.json`
- `src/app/not-found.tsx`
- rotas criadas recentemente em `src/app/api`

Comandos uteis:
- `npm run typecheck`
- `npm run build`

Pontos principais:
- typegen do Next antes do TypeScript
- arquivo novo de rota salvo no lugar certo
- cache intermitente do `.next` quando o dev server esta aberto ha muito tempo

## 19. Erros visuais ou componentes fora de lugar

Verifique:
- `src/app/globals.css`
- `src/shared/components/panel.tsx`
- `src/shared/components/app-shell.tsx`
- componentes especificos da tela com problema

Pontos principais:
- classes globais reutilizadas
- espacos, alturas e scrolls
- excesso de arredondamento foi reduzido no padrao atual

## 20. Fila de notificacao parada ou acumulando

Verifique:
- `src/modules/tickets/server/ticket-email-notifications.ts`
- `src/app/api/internal/notification-jobs/process/route.ts`
- tabela `NotificationJob` no banco
- `.env`

Pontos principais:
- jobs com `status = FAILED`
- `nextAttemptAt` vencido sem processador rodando
- `INTERNAL_CRON_SECRET` divergente
- remetente do tenant nao configurado

## 21. Checklist rapido de manutencao

Quando surgir um problema novo:
1. reproduza com um tenant de teste
2. confirme se e problema de UI, regra de negocio, permissao ou storage
3. verifique primeiro a rota `api` envolvida
4. depois verifique o service server correspondente
5. por fim, confirme a tela e o componente que disparam a acao
6. valide com `npm run typecheck` e `npm run build`

## Documentos de apoio

- `docs/project-summary.md`
- `docs/deploy-guide.md`
- `docs/tenant-setup-guide.md`
- `docs/acceptance-checklist.md`
- `docs/smoke-test-checklist.md`
