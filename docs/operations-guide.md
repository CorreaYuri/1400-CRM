# Guia Operacional

## Ambiente demo

Tenant:
- `demo-1400`

Senha padrao:
- `1400demo`

Usuarios demo:
- `admin@1400.demo`
- `gerente@1400.demo`
- `camila@1400.demo`
- `rafael@1400.demo`

## Inboxes do tenant demo

- `Financeiro`
- `Comercial`
- `Suporte`
- `Backoffice`
- `Triagem Tecnica`
- `Dev`
- `Infra`

## Onboarding de novo tenant

A rota `/cadastro` cria um tenant novo.

Fluxo atual:
- define nome e slug
- cria o usuario inicial `ADMIN`
- cria inboxes iniciais selecionadas
- permite criar usuarios extras com senha propria
- distribui usuarios extras pelas inboxes escolhidas

Regras atuais:
- o admin entra em todas as inboxes criadas
- cada usuario extra precisa ficar em pelo menos uma inbox
- a distribuicao respeita apenas inboxes selecionadas no onboarding

## Rotina de atendimento

### 1. Abrir chamado

Em `/tickets/novo`, informar:
- solicitante
- email e telefone opcionais
- inbox inicial
- assunto
- descricao
- prioridade
- origem

### 2. Entrar na fila

O chamado nasce na inbox escolhida e fica visivel para quem tem acesso operacional.

### 3. Assumir atendimento

Ao assumir:
- o responsavel atual passa a ser o usuario
- o status muda para `Em atendimento`
- a acao fica indisponivel para o mesmo usuario

### 4. Registrar timeline

A timeline aceita:
- observacao interna
- mensagem do solicitante
- acordo

### 5. Reagendar retorno

Use quando a demanda precisar voltar em horario futuro.

### 6. Derivar ou transferir

- chamado filho: permitido para quem tem acesso operacional
- transferencia do principal: apenas `MANAGER` e `ADMIN`

### 7. Encerrar

O fechamento exige:
- motivo de encerramento
- resumo opcional da solucao

Ao fechar:
- o chamado sai das listas operacionais
- continua acessivel pela busca
- historico e auditoria sao preservados

## Regras por perfil

### ADMIN

Pode:
- operar qualquer chamado do tenant
- administrar usuarios
- administrar inboxes
- transferir chamado principal
- abrir chamado filho
- atuar em qualquer inbox

### MANAGER

Pode:
- operar qualquer chamado do tenant
- administrar usuarios comuns
- administrar inboxes
- transferir chamado principal
- abrir chamado filho

Nao pode:
- administrar outro `ADMIN`

### AGENT

Pode:
- operar apenas inboxes em que participa
- assumir
- comentar
- reagendar
- fechar
- abrir chamado filho
- repassar para integrante elegivel da mesma inbox

Nao pode:
- transferir chamado principal entre inboxes
- operar inbox sem membership

## Modo suporte da plataforma

Uso pela equipe interna:
1. fazer login com email listado em `PLATFORM_ADMIN_EMAILS`
2. abrir `/tenants`
3. clicar em `Entrar como suporte`

Ao entrar:
- a sessao troca para o tenant alvo
- o app mostra banner de modo suporte
- a auditoria registra entrada

Ao sair:
- a sessao original e restaurada
- a auditoria registra saida

## Buscas

### Busca global

No sidebar, aceita:
- numero do chamado
- assunto
- nome do solicitante
- email
- telefone

### Fila completa `/tickets`

Busca real no banco com os mesmos criterios.

### Tela `Hoje`

Tambem permite busca no banco, combinada com filtros do dia.

## Sinais de risco operacional

O sistema destaca:
- `Retorno vencido`
- `Urgente sem dono`
- `Fila +2h`
- `Atendimento parado`

Esses sinais aparecem no dashboard e nas filas.

## Validacoes de rotina

Antes de consolidar uma rodada maior de mudancas:
- `npm run typecheck`
- `npm run build`
- `npm run lint`

## Observacoes importantes

- o login usa `tenantSlug`
- o numero do chamado e sequencial por tenant
- o solicitante pode ser reaproveitado por nome, email ou telefone dentro do fluxo do chamado
- auditoria e timeline se complementam, mas nao sao a mesma coisa
