# Fechamento do Projeto

## Objetivo

Checklist executivo para considerar a central de chamados pronta para entrega final.

## 1. Estrutura tecnica

- `npm run typecheck` passando
- `npm run build` passando
- banco sincronizado com `prisma/schema.prisma`
- `.env` revisado para o ambiente alvo

## 2. Fluxos obrigatorios

- login por tenant funcionando
- criacao de tenant funcionando
- pagina `/tenants` protegida para a equipe da plataforma
- modo suporte entrando e saindo corretamente
- portal publico abrindo chamado
- abertura interna de chamado funcionando
- assumir, comentar, reagendar, transferir, derivar e fechar funcionando
- busca por `CH-`, solicitante, email e telefone funcionando
- anexos funcionando na abertura e na timeline

## 3. Fluxos de operacao

- dashboard abrindo sem erro
- tela `Hoje` retornando chamados do dia
- fila `/tickets` carregando com busca e filtros
- chamado fechado sumindo da lista operacional
- chamado fechado reaparecendo na busca

## 4. Tenant

- nome e slug atualizando corretamente
- logo visivel no portal do solicitante
- remetente configuravel salvo
- origens habilitadas funcionando
- motivos de encerramento funcionando

## 5. Inboxes e equipe

- inbox criada e editada sem erro
- SLA salvo por inbox
- membros vinculados corretamente
- regra de acesso por inbox respeitada por `AGENT`

## 6. Auditoria

- eventos sensiveis gravados
- entrada em suporte auditada
- saida de suporte auditada
- fechamento de chamado auditado

## 7. Produção

- plano de backup definido
- persistencia dos anexos definida
- HTTPS e cookie seguro definidos
- e-mail transacional validado ou conscientemente desabilitado

## 8. Aceite final

Considerar o projeto pronto quando:

- os fluxos principais estiverem validados sem erro
- o ambiente de producao estiver configurado
- anexos, portal, dashboard e fechamento estiverem homologados
- a equipe souber como operar tenants e suporte da plataforma
