# Visao do Produto

## Posicionamento atual

O 1400 Graus CRM hoje funciona como uma central operacional de chamados multi-tenant.

Apesar do nome historico do projeto, o produto atual nao busca cobrir CRM, cadastro de clientes ou relacionamento comercial amplo. O foco e tratamento de chamados por inbox, com operacao rastreavel e apoio da equipe da plataforma.

## O problema que resolve

Times que operam atendimento por setor costumam perder contexto em filas soltas, usuarios sem ownership definido e retornos esquecidos. O sistema centraliza:
- abertura de chamados
- distribuicao por inbox
- ownership por responsavel
- timeline operacional
- reagendamentos
- derivacao por chamado filho
- fechamento com motivo
- auditoria

## Escopo funcional atual

### Operacao de chamados

- abertura manual de chamado
- fila por inbox
- assumir para si
- repasse para integrante da mesma inbox
- transferencia entre inboxes para perfis autorizados
- timeline com observacoes, mensagens e acordos
- reagendamento de retorno
- criacao de chamado filho
- fechamento com motivo e resumo opcional

### Visoes operacionais

- `Hoje`: entradas novas e retornos do dia
- `Dashboard`: fila, detalhe do chamado selecionado, alertas operacionais e risco de SLA
- `Chamados`: fila completa com busca no banco
- `Agendamentos`: visao dos retornos pendentes

### Administracao do tenant

- usuarios
- inboxes
- configuracoes operacionais do tenant
- auditoria

### Plataforma

- gestao global de tenants para equipe interna
- modo suporte com entrada no tenant sem depender de usuario do cliente
- auditoria de entrada e saida do modo suporte

## O que nao faz parte do foco atual

- modulo de CRM de clientes
- cadastro e gestao independente de clientes
- permissoes granulares alem de papel + inbox + acoes operacionais
- portal publico completo de autosservico como pilar principal do produto

## Conceitos centrais

### Tenant

Cada empresa atendida no SaaS possui isolamento proprio de dados, usuarios, inboxes, chamados e auditoria.

### Inbox

Cada inbox representa uma fila operacional de um setor.

### Chamado

Entidade central do sistema. Guarda contexto do solicitante, inbox atual, responsavel, status, prioridade, origem e historico.

### Solicitante

O solicitante existe como dado do chamado. Nao ha modulo autonomo de CRM como parte do fluxo principal.

### Timeline

Toda acao relevante do atendimento gera historico operacional no chamado.

### Auditoria

Mudancas administrativas e operacionais sensiveis ficam rastreaveis por tenant.

## Fluxo principal

1. abrir chamado
2. colocar na inbox inicial
3. assumir atendimento
4. registrar interacoes e acordos
5. reagendar ou derivar quando necessario
6. encerrar com motivo
7. consultar historico e auditoria

## Sinais operacionais atuais

O produto ja destaca risco sem configuracao complexa:
- retorno vencido
- urgente sem dono
- fila acima de 2 horas
- atendimento parado acima de 4 horas

## Direcao de produto

A direcao atual e consolidar uma operacao de chamados robusta, simples e multi-tenant, com foco em estabilidade, visibilidade e produtividade do atendimento.
