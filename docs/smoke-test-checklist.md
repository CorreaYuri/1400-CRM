# Smoke Test Final

## Objetivo

Checklist curto para validar os fluxos mais criticos da central de chamados antes de demo, deploy ou homologacao final.

## Preparacao

- `.env` configurado
- banco acessivel
- tenant demo ou tenant de homologacao existente
- se quiser validar e-mail, configurar `APP_URL`, `RESEND_API_KEY` e remetente do tenant em `/configuracoes`

## 1. Validacao tecnica

1. rodar `npm run typecheck`
2. rodar `npm run build`

Esperado:
- ambos concluem sem erro

## 2. Login e sessao

1. abrir `/login`
2. entrar com usuario valido do tenant
3. navegar para `/dashboard`

Esperado:
- sessao criada
- sidebar carrega tenant ativo
- sem erro visual ou redirecionamento indevido

## 3. Portal do solicitante

1. abrir `/portal/{slug}`
2. confirmar nome e logo do tenant no topo
3. abrir chamado publico

Esperado:
- formulario carrega
- chamado e criado com protocolo `CH-...`
- inbox destino recebe o chamado

## 4. Abertura interna de chamado

1. abrir `/tickets/novo`
2. criar chamado manual
3. abrir detalhe do chamado criado

Esperado:
- chamado criado sem erro
- header, timeline e bloco de registro carregam normalmente

## 5. Tratamento principal

1. assumir o chamado
2. registrar observacao ou acordo
3. reagendar retorno
4. abrir chamado filho
5. transferir o chamado principal se estiver com `MANAGER` ou `ADMIN`

Esperado:
- cada acao retorna sucesso
- timeline atualiza
- chamado filho abre corretamente a partir do pai

## 6. Fechamento

1. abrir chamado em atendimento
2. finalizar com motivo
3. buscar o numero na fila

Esperado:
- chamado fecha sem erro
- sai das listas operacionais
- reaparece apenas na busca

## 7. Dashboard e busca

1. abrir `/dashboard`
2. verificar fila e detalhe
3. usar busca global do sidebar
4. usar busca em `/tickets` e `/`

Esperado:
- dashboard carrega sem bloco quebrado
- busca encontra por `CH-`, solicitante, email ou telefone

## 8. Tenant e plataforma

1. abrir `/configuracoes`
2. salvar nome, logo ou remetente do tenant
3. se for usuario de plataforma, abrir `/tenants` e entrar em modo suporte
4. sair do modo suporte

Esperado:
- configuracoes salvam sem erro
- modo suporte entra e sai corretamente
- auditoria registra entrada e saida

## 9. Notificacao por e-mail

1. garantir remetente configurado no tenant
2. movimentar um chamado com usuarios envolvidos

Esperado:
- sistema continua operando mesmo se o envio externo falhar
- quando o provedor estiver configurado corretamente, e-mail e disparado com o template visual novo

## Criterio rapido de aceite

Considerar o sistema pronto para uso quando:
- typecheck e build passarem
- portal publico criar chamado
- fluxo principal do chamado completar sem erro
- busca localizar chamados corretamente
- fechamento remover o chamado das listas operacionais
- configuracoes do tenant e modo suporte funcionarem
