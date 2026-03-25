# Guia do Sistema

## Visao geral

O projeto e um monolito modular em Next.js com frontend e backend no mesmo repositorio. O objetivo atual e suportar uma central de chamados multi-tenant com operacao por inbox, auditoria e modo suporte da plataforma.

## Stack tecnica

- Next.js App Router
- React 19
- TypeScript
- Prisma
- PostgreSQL
- Zod
- cookie assinado com HMAC para sessao

## Entidades principais

### Tenant

Representa a empresa atendida. Todo dado operacional relevante fica isolado por `tenantId`.

### User

Usuario autenticado do tenant.

Campos centrais:
- `role`: `ADMIN`, `MANAGER` ou `AGENT`
- `isActive`
- `passwordHash`

### Inbox

Fila operacional do tenant.

### InboxMembership

Relacionamento entre usuario e inbox. Base da autorizacao operacional para `AGENT`.

### Customer

Registro simplificado de solicitante vinculado ao chamado. Existe para dar contexto ao ticket, nao como modulo de CRM do produto.

### Ticket

Entidade central do sistema.

Guarda:
- inbox atual
- criador
- responsavel
- status
- prioridade
- origem
- assunto
- descricao
- datas

### TicketInteraction

Timeline do chamado.

### TicketSchedule

Controle de proxima acao e retorno.

### TicketRelation

Relaciona chamado pai e filho.

### AuditEvent

Trilha de auditoria administrativa e operacional.

## Camadas do projeto

### `src/app`

Paginas App Router e rotas HTTP.

### `src/modules`

Dominios de negocio. Modulos principais:
- `audit`
- `auth`
- `dashboard`
- `inboxes`
- `scheduling`
- `tenants`
- `tickets`
- `users`

### `src/server`

Infra compartilhada:
- sessao
- controle de acesso
- ambiente
- prisma

### `src/shared`

Shell, componentes reutilizaveis e primitives visuais.

## Autenticacao e sessao

A sessao usa cookie assinado `crm1400_session`.

Fluxo:
1. login valida tenant, email e senha
2. o sistema emite cookie assinado
3. a sessao carrega `id`, `tenantId`, `name`, `email` e `role`
4. paginas e APIs protegem acesso via helpers de sessao

Helpers principais:
- `requirePageSession`
- `requireApiSession`
- `requirePageRole`
- `requireApiRole`

## Autorizacao

A autorizacao combina:
- papel do usuario no tenant
- memberships por inbox
- regras operacionais especificas da acao

Resumo:
- `ADMIN`: acesso total no tenant
- `MANAGER`: acesso operacional amplo e administracao de usuarios comuns
- `AGENT`: acesso apenas nas inboxes em que participa

## Fluxos principais de chamados

### Criacao

`POST /api/tickets`
- valida schema Zod
- valida inbox e permissao
- reaproveita solicitante quando houver match util
- gera numero sequencial por tenant com advisory lock
- cria interacao inicial
- registra auditoria `TICKET_CREATED`

### Assumir ou repassar

`POST /api/tickets/[id]/assign`
- pode assumir para si
- pode repassar para integrante elegivel da mesma inbox
- registra interacao e auditoria

### Interacao

`POST /api/tickets/[id]/interactions`
- adiciona item na timeline
- suporta observacao interna, mensagem do solicitante e acordo

### Reagendamento

`POST /api/tickets/[id]/schedule`
- cancela retorno pendente anterior
- cria novo schedule
- move para `WAITING_RETURN`
- registra interacao e auditoria

### Transferencia

`POST /api/tickets/[id]/transfer`
- restrita a `MANAGER` e `ADMIN`
- move inbox do chamado principal
- limpa responsavel atual
- devolve para fila
- registra interacao e auditoria

### Chamado filho

`POST /api/tickets/[id]/child`
- cria novo ticket em outra inbox
- mantem relacao pai e filho
- registra historico e auditoria

### Fechamento

`POST /api/tickets/[id]/close`
- exige motivo de encerramento valido no tenant
- aceita resumo opcional
- registra `closedAt`, timeline e auditoria

## Busca

O helper de busca de tickets atende:
- numero (`CH-2048` ou numerico)
- assunto
- descricao
- nome do solicitante
- email
- telefone

Ele e usado em:
- `/tickets`
- `/`
- busca global do sidebar

## Dashboard e sinais operacionais

O dashboard combina dados reais de:
- fila acessivel
- agendamentos
- inboxes
- usuarios
- ticket selecionado

Hoje ele calcula sinais operacionais fixos:
- retorno vencido
- urgente sem dono
- fila acima de 2 horas
- atendimento parado acima de 4 horas

Esses sinais aparecem como alertas e tambem como selo nos itens da fila.

## Plataforma e modo suporte

A plataforma possui area global de tenants.

Regras:
- acesso liberado por `PLATFORM_ADMIN_EMAILS`
- entrada em tenant via modo suporte
- banner visual no app
- auditoria de entrada e saida do suporte

Rotas principais:
- `POST /api/tenants/[id]/enter`
- `POST /api/tenants/support/exit`

## Qualidade tecnica

Validacoes atuais:
- `npm run typecheck`
- `npm run build`
- `npm run lint`

No estado atual do projeto:
- typecheck passa sem depender de artefatos antigos de `.next`
- build de producao passa
