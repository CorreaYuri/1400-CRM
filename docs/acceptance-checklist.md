# Checklist de Homologacao

## Objetivo

Este checklist serve para validar o sistema por fluxo operacional antes de considerar a entrega homologada.

## Pre-condicoes

- ambiente local ou homolog com banco acessivel
- migrations aplicadas
- seed carregado quando necessario
- usuario com acesso de plataforma configurado em `PLATFORM_ADMIN_EMAILS`
- build e typecheck validos:
  - `npm run typecheck`
  - `npm run build`

## 1. Login

### 1.1 Login valido

Passos:
1. abrir `/login`
2. informar `tenantSlug`, email e senha validos
3. enviar formulario

Esperado:
- login concluido
- sessao criada
- acesso ao sistema liberado

### 1.2 Login invalido

Passos:
1. abrir `/login`
2. informar senha incorreta
3. enviar formulario

Esperado:
- erro visivel
- sessao nao criada

## 2. Onboarding de tenant

### 2.1 Criacao publica de tenant

Passos:
1. abrir `/cadastro`
2. informar nome, slug, admin e senha
3. selecionar inboxes iniciais
4. opcionalmente adicionar usuarios extras
5. concluir cadastro

Esperado:
- tenant criado
- admin criado
- inboxes criadas
- usuarios extras criados quando informados
- sessao final coerente com o contexto atual

### 2.2 Criacao por equipe da plataforma

Passos:
1. entrar com usuario listado em `PLATFORM_ADMIN_EMAILS`
2. abrir `/cadastro`
3. criar tenant

Esperado:
- tenant criado sem perder a sessao da plataforma
- retorno coerente ao fluxo interno

## 3. Area global de tenants

### 3.1 Visibilidade restrita

Passos:
1. entrar com usuario comum de tenant
2. verificar sidebar
3. tentar abrir `/tenants`

Esperado:
- item `Tenants` nao aparece
- rota global nao fica acessivel

### 3.2 Entrada em modo suporte

Passos:
1. entrar com usuario de plataforma
2. abrir `/tenants`
3. clicar em `Entrar como suporte`

Esperado:
- tenant alvo abre em modo suporte
- banner de suporte aparece
- contexto do tenant ativo muda no sidebar

### 3.3 Saida do modo suporte

Passos:
1. estando em modo suporte
2. clicar em sair do modo suporte

Esperado:
- sessao original restaurada
- tenant ativo volta ao contexto anterior

### 3.4 Auditoria do modo suporte

Passos:
1. entrar em um tenant como suporte
2. sair do modo suporte
3. abrir `/auditoria`

Esperado:
- existe evento `PLATFORM_SUPPORT_ENTERED`
- existe evento `PLATFORM_SUPPORT_EXITED`

## 4. Gestao de usuarios

### 4.1 Criar usuario

Passos:
1. abrir `/usuarios`
2. cadastrar usuario valido

Esperado:
- usuario criado
- usuario aparece na lista
- auditoria registrada

### 4.2 Editar usuario

Passos:
1. abrir usuario existente
2. alterar nome, email, papel ou status

Esperado:
- alteracoes persistidas
- auditoria registrada

### 4.3 Reset de senha

Passos:
1. selecionar usuario
2. redefinir senha
3. testar novo login

Esperado:
- senha atualizada
- login com nova senha funciona

### 4.4 Arquivamento logico

Passos:
1. arquivar usuario comum

Esperado:
- usuario fica inativo
- vinculos operacionais sao tratados corretamente
- auditoria registrada

## 5. Gestao de inboxes

### 5.1 Criar inbox

Passos:
1. abrir `/inboxes`
2. criar inbox com nome e codigo validos

Esperado:
- inbox criada
- aparece na listagem
- auditoria registrada

### 5.2 Editar inbox

Passos:
1. editar nome, codigo ou descricao

Esperado:
- dados atualizados
- auditoria registrada

### 5.3 Atualizar equipe

Passos:
1. vincular usuarios a inbox
2. remover usuarios da inbox

Esperado:
- equipe atualizada
- auditoria registrada

### 5.4 Bloqueio de inbox com chamados abertos

Passos:
1. tentar desativar ou arquivar inbox com chamados abertos

Esperado:
- operacao bloqueada
- mensagem clara de erro

## 6. Criacao e fila de chamados

### 6.1 Abrir chamado manualmente

Passos:
1. abrir `/tickets/novo`
2. informar solicitante, inbox, assunto e descricao
3. criar chamado

Esperado:
- chamado criado
- numero gerado
- redirecionamento para detalhe
- timeline inicial registrada

### 6.2 Visualizacao na fila

Passos:
1. abrir `/tickets`
2. localizar o chamado criado

Esperado:
- chamado aparece na fila correta
- selos de prioridade e risco aparecem quando aplicavel

### 6.3 Busca global

Passos:
1. usar busca global do sidebar
2. buscar por numero, assunto, solicitante, email e telefone

Esperado:
- redirecionamento para `/tickets?search=...`
- resultado coerente com o termo

### 6.4 Busca na tela Hoje

Passos:
1. abrir `/`
2. buscar por numero ou solicitante

Esperado:
- resultados do dia filtrados corretamente

## 7. Tratamento do chamado

### 7.1 Assumir para mim

Passos:
1. abrir chamado sem responsavel
2. clicar em `Assumir para mim`

Esperado:
- mensagem de sucesso
- status vira `Em atendimento`
- acao deixa de ficar disponivel para o mesmo usuario

### 7.2 Repassar para integrante da mesma inbox

Passos:
1. abrir chamado com membros elegiveis
2. repassar para outro integrante

Esperado:
- responsavel atualizado
- feedback de sucesso
- acao respeita elegibilidade da inbox

### 7.3 Registrar interacao

Passos:
1. abrir chamado
2. adicionar observacao interna
3. adicionar mensagem do solicitante
4. adicionar acordo

Esperado:
- itens aparecem na timeline
- feedback visual consistente

### 7.4 Reagendar retorno

Passos:
1. abrir chamado
2. reagendar para horario futuro

Esperado:
- retorno pendente criado
- status adequado
- timeline atualizada
- item aparece em `/agendamentos`

### 7.5 Transferir chamado principal

Passos:
1. entrar como `MANAGER` ou `ADMIN`
2. transferir o chamado para outra inbox

Esperado:
- inbox alterada
- responsavel atual limpo quando aplicavel
- auditoria registrada

### 7.6 Bloqueio de transferencia para agente

Passos:
1. entrar como `AGENT`
2. abrir chamado principal

Esperado:
- transferencia principal indisponivel

### 7.7 Criar chamado filho

Passos:
1. abrir chamado pai
2. criar chamado filho para outra inbox

Esperado:
- chamado filho criado sem erro 500
- relacao pai e filho preservada
- timeline registra a derivacao

### 7.8 Abertura do chamado filho

Passos:
1. abrir o chamado filho a partir do pai

Esperado:
- detalhe abre corretamente
- se o acesso vier via pai, a consulta funciona
- atalho de voltar para o pai aparece

## 8. Fechamento

### 8.1 Fechar chamado

Passos:
1. abrir chamado em atendimento
2. escolher motivo de encerramento
3. opcionalmente informar resumo
4. concluir fechamento

Esperado:
- fechamento concluido
- timeline atualizada
- auditoria registrada

### 8.2 Regras de fechamento

Passos:
1. tentar fechar chamado sem motivo
2. tentar fechar chamado sem permissao

Esperado:
- validacao de motivo no backend e frontend
- bloqueio por regra operacional

### 8.3 Sumir das listas operacionais

Passos:
1. fechar chamado
2. abrir `/tickets`
3. abrir `/dashboard`
4. buscar pelo numero do chamado fechado

Esperado:
- chamado nao aparece mais nas listas operacionais por padrao
- chamado aparece quando buscado

## 9. Dashboard e risco operacional

### 9.1 Alertas operacionais

Passos:
1. abrir `/dashboard`
2. validar existencia de alertas quando houver cenario correspondente

Esperado:
- alertas de retorno vencido, urgente sem dono, fila envelhecendo e atendimento parado aparecem quando aplicavel

### 9.2 Selos de risco na fila

Passos:
1. abrir `/dashboard`
2. abrir `/tickets`
3. localizar chamados em situacao critica

Esperado:
- selo visual coerente no item da fila
- destaque entre `critical` e `warning`

## 10. Auditoria

### 10.1 Eventos de chamados

Passos:
1. criar, assumir, comentar, reagendar, derivar, transferir e fechar chamado
2. abrir `/auditoria`

Esperado:
- eventos relevantes aparecem com entidade, acao e autor

### 10.2 Eventos administrativos

Passos:
1. criar ou editar usuario
2. criar ou editar inbox

Esperado:
- eventos administrativos aparecem na auditoria

## 11. Estabilidade final

### 11.1 Typecheck

Esperado:
- `npm run typecheck` conclui sem erro

### 11.2 Build

Esperado:
- `npm run build` conclui sem erro

### 11.3 Navegacao

Esperado:
- sidebar sem item residual de modulo nao utilizado
- rotas antigas como `/clientes` e `/permissoes` redirecionam de forma segura

## Criterio de aceite sugerido

Considerar homologado quando:
- fluxos criticos de login, tenant, fila e fechamento passarem
- modo suporte estiver auditado
- buscas estiverem coerentes
- build e typecheck estiverem limpos
- nao houver erro 500 nos fluxos principais de chamados
