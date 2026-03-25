# 1400 Graus CRM

Central multi-tenant de tratamento de chamados por inbox, com foco em operacao, ownership, auditoria e suporte da plataforma.

## Escopo atual do produto

O sistema nao e um CRM de cadastro de clientes.

O foco atual e:
- abertura, fila e tratamento de chamados
- roteamento por inbox
- ownership por agente ou gestor
- timeline operacional
- reagendamento de retorno
- derivacao por chamado filho
- fechamento com motivo
- auditoria de acoes sensiveis
- gestao de tenants pela equipe da plataforma

Os dados de solicitante existem apenas como contexto do chamado.

## Stack

- Next.js 15
- React 19
- TypeScript
- Prisma ORM
- PostgreSQL
- Zod
- autenticacao propria por cookie assinado

## Funcionalidades entregues

- login por `tenantSlug`
- onboarding de tenant em `/cadastro`
- criacao de admin, inboxes iniciais e usuarios extras no onboarding
- painel operacional em `/dashboard`
- tela `Hoje` com entradas novas e retornos do dia
- fila completa de chamados com busca no banco
- abertura manual de chamado
- portal publico do solicitante por tenant
- assumir chamado
- repasse para integrante da mesma inbox
- transferencia entre inboxes para `MANAGER` e `ADMIN`
- reagendamento de retorno
- comentario e acordos na timeline
- criacao de chamado filho
- fechamento com motivo de encerramento e resumo opcional
- anexos na abertura e na timeline
- download autenticado de anexos
- auditoria de acoes operacionais e administrativas
- modo suporte da plataforma com auditoria de entrada e saida
- busca global no sidebar
- alertas de SLA operacional no dashboard
- selos de risco nos itens da fila
- notificacoes automaticas por e-mail com fila, retry e auditoria de falha

## Perfis e acesso

- `ADMIN`: opera todo o tenant, administra usuarios e inboxes
- `MANAGER`: opera todo o tenant e administra usuarios comuns
- `AGENT`: atua apenas nas inboxes em que estiver vinculado

Regras principais:
- `AGENT` pode assumir, comentar, reagendar, fechar e abrir chamado filho nas inboxes em que participa
- `AGENT` nao pode transferir o chamado principal entre inboxes
- `MANAGER` e `ADMIN` podem operar qualquer inbox do tenant
- acesso operacional depende de papel e membership por inbox

## Plataforma e tenants

A area `/tenants` e exclusiva da equipe interna da plataforma.

Controle atual:
- visibilidade liberada por `PLATFORM_ADMIN_EMAILS`
- entrada em tenant por modo suporte
- banner de sessao em suporte
- auditoria `PLATFORM_SUPPORT_ENTERED` e `PLATFORM_SUPPORT_EXITED`

## Fluxo principal do chamado

1. o chamado e aberto em `/tickets/novo`
2. entra na inbox inicial
3. fica na fila ate ser assumido
4. o atendente registra interacoes, acordos, anexos e reagendamentos
5. se necessario, cria chamado filho ou transfere o principal
6. ao concluir, fecha com motivo de encerramento
7. o chamado some das listas operacionais e passa a aparecer apenas na busca

## Buscas

### Fila completa `/tickets`

Busca por:
- `CH-2048` ou apenas numero
- assunto
- descricao
- nome do solicitante
- email
- telefone

### Tela `Hoje`

Tambem aceita busca no banco com os mesmos criterios.

### Busca global

Disponivel no sidebar e redireciona para `/tickets?search=...`.

## SLA operacional atual

O sistema possui SLA por inbox para orientar risco operacional.

Configuracoes atuais por inbox:
- `SLA primeira acao` em minutos
- `SLA resolucao` em horas

Esses valores alimentam os sinais operacionais:
- `Retorno vencido`
- `Urgente sem dono`
- `Fila +SLA`
- `Atendimento parado`

Esses sinais aparecem:
- nas notificacoes do `/dashboard`
- nos cards e resumos operacionais
- nos itens da fila e da lista de chamados

## E-mail transacional

As notificacoes por e-mail agora usam fila interna no banco.

Comportamento atual:
- movimentacoes do chamado criam jobs de notificacao
- processamento com retry automatico
- falha definitiva gera auditoria
- rota interna opcional para cron: `/api/internal/notification-jobs/process`

Configuracoes relacionadas:
- `RESEND_API_KEY`
- `APP_URL`
- `INTERNAL_CRON_SECRET`
- remetente configurado no tenant em `/configuracoes`

## Anexos e storage

Os anexos aceitam arquivos de ate 25 MB por item, com ate 5 anexos por envio.

Armazenamento atual:
- `ATTACHMENTS_ROOT_DIR` quando configurado
- `./storage/tickets` como fallback local
- compatibilidade com anexos antigos salvos em `public/uploads/tickets`

Os downloads do detalhe do chamado passam por rota autenticada, respeitando o acesso da sessao ao ticket.

## Credenciais demo

Tenant:
- `demo-1400`

Usuarios:
- `admin@1400.demo`
- `gerente@1400.demo`
- `camila@1400.demo`
- `rafael@1400.demo`

Senha padrao:
- `1400demo`

## Como rodar localmente

1. `npm install`
2. configurar `.env` a partir de `.env.example`
3. `npm run prisma:generate`
4. `npm run prisma:migrate:dev`
5. `npm run db:seed`
6. `npm run dev`

## Validacao

- typecheck: `npm run typecheck`
- lint: `npm run lint`
- build: `npm run build`

## Estrutura do projeto

- `src/app`: paginas e route handlers
- `src/modules`: modulos de negocio
- `src/server`: sessao, acesso, env e prisma
- `src/shared`: shell e componentes compartilhados
- `prisma`: schema, migrations e seed
- `docs`: guias funcional e tecnico

## Documentacao complementar

- [Visao do produto](./docs/product-overview.md)
- [Arquitetura](./docs/architecture.md)
- [Guia do sistema](./docs/system-guide.md)
- [Guia operacional](./docs/operations-guide.md)
- [Checklist de homologacao](./docs/acceptance-checklist.md)
- [Smoke test final](./docs/smoke-test-checklist.md)
- [Como configurar um tenant](./docs/tenant-setup-guide.md)
- [Guia de deploy e producao](./docs/deploy-guide.md)
- [Checklist de fechamento](./docs/project-closeout-checklist.md)
- [Resumo executivo do projeto](./docs/project-summary.md)
- [Guia de manutencao](./docs/maintenance-guide.md)
