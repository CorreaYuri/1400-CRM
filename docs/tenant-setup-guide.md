# Como Configurar um Tenant

## Objetivo

Este guia explica como criar, configurar e validar um tenant para operar corretamente na central de chamados.

## 1. Criar o tenant

Voce pode criar um tenant de duas formas:

- pela rota `/cadastro`
- pela area da plataforma, quando estiver logado com um email autorizado em `PLATFORM_ADMIN_EMAILS`

No cadastro, preencha:
- nome da empresa
- slug do tenant
- logo do portal, se quiser
- nome do administrador
- email do administrador
- senha inicial do administrador
- inboxes iniciais
- usuarios extras, se necessario

### Resultado esperado

Ao concluir, o sistema:
- cria o tenant
- cria o usuario `ADMIN` principal
- cria as inboxes iniciais selecionadas
- cria usuarios extras, quando informados
- distribui os usuarios extras nas inboxes escolhidas

## 2. Definir o slug do tenant

O `slug` e o identificador do tenant e sera usado em:
- login
- portal do solicitante
- referencia interna da plataforma

Exemplo:
- tenant: `Acme Operacoes`
- slug: `acme-operacoes`
- login: informar `acme-operacoes`
- portal: `/portal/acme-operacoes`

Boas praticas:
- usar nome curto e estavel
- evitar trocar o slug depois de divulgar o portal

## 3. Configurar a logo

A logo pode ser configurada:
- no onboarding inicial
- depois em `/configuracoes`

Use uma URL publica de imagem, por exemplo:
- `https://suaempresa.com/logo.png`

A logo aparece em:
- portal do solicitante
- emails de notificacao do chamado

## 4. Configurar usuarios

Abra `/usuarios` para revisar ou complementar a equipe do tenant.

### Perfis disponiveis

- `ADMIN`: administra o tenant inteiro
- `MANAGER`: opera qualquer inbox do tenant e administra usuarios comuns
- `AGENT`: opera apenas as inboxes em que estiver vinculado

### Regras importantes

- `AGENT` precisa estar vinculado a pelo menos uma inbox
- `MANAGER` e `ADMIN` podem operar qualquer inbox do tenant
- o email do usuario deve ser unico dentro do tenant

## 5. Configurar inboxes

Abra `/inboxes` para criar, editar e revisar as filas do tenant.

Cada inbox representa um setor operacional, por exemplo:
- Suporte
- Comercial
- Financeiro
- Backoffice
- Infra

### O que revisar

- nome da inbox
- codigo da inbox
- descricao
- usuarios vinculados
- status ativo

## 6. Configurar o portal do solicitante

Abra `/configuracoes`.

O portal publico do tenant fica em:
- `/portal/{slug}`

Exemplo:
- `/portal/acme-operacoes`

Na tela de configuracoes, voce encontra:
- link do portal
- botao para copiar o link
- botao para abrir o portal
- status se a origem `Portal do solicitante` esta habilitada

Para o portal funcionar corretamente, revise:
- slug correto
- logo do tenant
- origem `Portal do solicitante` habilitada
- pelo menos uma inbox ativa

## 7. Configurar regras operacionais

Em `/configuracoes`, voce pode ajustar:
- nome do tenant
- slug
- logo
- prioridade padrao
- origens habilitadas
- motivos de encerramento

### Origens habilitadas

Definem de onde novos chamados podem nascer:
- manual por atendente
- portal do solicitante
- email
- WhatsApp
- API

### Motivos de encerramento

Esses motivos aparecem no fechamento do chamado.

Exemplos:
- Resolvido
- Solicitacao atendida
- Sem retorno do solicitante

## 8. Configurar disparo de e-mail automatico

Na mesma tela de `/configuracoes`, existe o bloco de notificacoes por e-mail.

Preencha:
- nome do remetente
- email remetente

Exemplo:
- nome: `Central Acme`
- email: `chamados@acme.com.br`

Esses dados sao usados para avisar os usuarios envolvidos quando o chamado receber movimentacoes como:
- assumir
- repassar
- comentar
- reagendar
- transferir
- abrir chamado filho
- finalizar

## 9. Configurar variaveis de ambiente para e-mail

Para o disparo automatico funcionar, o ambiente precisa ter:
- `APP_URL`
- `RESEND_API_KEY`

Exemplo:

```env
APP_URL="http://localhost:3000"
RESEND_API_KEY="re_..."
```

Sem essas variaveis, o sistema continua funcionando normalmente, mas nao envia notificacoes.

## 10. Validar o tenant apos configuracao

Checklist rapido:

1. fazer login com o administrador do tenant
2. abrir `/configuracoes` e revisar nome, slug, logo e remetente
3. abrir `/usuarios` e confirmar a equipe ativa
4. abrir `/inboxes` e confirmar memberships
5. criar um chamado interno em `/tickets/novo`
6. criar um chamado publico em `/portal/{slug}`
7. assumir, comentar e fechar um chamado
8. validar se os emails saem quando o provedor estiver configurado

## 11. Fluxo sugerido para colocar um tenant em operacao

1. criar o tenant
2. revisar slug e logo
3. revisar inboxes iniciais
4. cadastrar equipe principal
5. distribuir usuarios nas inboxes
6. revisar configuracoes operacionais
7. configurar remetente de e-mail
8. validar portal do solicitante
9. executar o smoke test final

## 12. Problemas comuns

### O tenant nao aparece na area global

A area `/tenants` e exclusiva da equipe da plataforma. O usuario precisa estar em `PLATFORM_ADMIN_EMAILS`.

### O portal nao abre chamados

Verifique:
- se a origem `Portal do solicitante` esta habilitada
- se existe inbox ativa
- se o slug esta correto

### O e-mail nao dispara

Verifique:
- `RESEND_API_KEY`
- `APP_URL`
- remetente configurado no tenant
- usuarios envolvidos com email valido

### O agente nao consegue operar

Verifique se ele esta vinculado a alguma inbox em `/inboxes`.

## 13. Arquivos relacionados

- [cadastro/page.tsx](/j:/Projetos/1400Graus_CRM/src/app/cadastro/page.tsx)
- [register-tenant-form.tsx](/j:/Projetos/1400Graus_CRM/src/modules/tenants/components/register-tenant-form.tsx)
- [tenant-service.ts](/j:/Projetos/1400Graus_CRM/src/modules/tenants/server/tenant-service.ts)
- [configuracoes/page.tsx](/j:/Projetos/1400Graus_CRM/src/app/configuracoes/page.tsx)
- [tenant-settings-form.tsx](/j:/Projetos/1400Graus_CRM/src/modules/tenants/components/tenant-settings-form.tsx)
- [tenant-settings-service.ts](/j:/Projetos/1400Graus_CRM/src/modules/tenants/server/tenant-settings-service.ts)
- [portal/[slug]/page.tsx](/j:/Projetos/1400Graus_CRM/src/app/portal/[slug]/page.tsx)
