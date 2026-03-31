# Sincronização Curseduca → Jornada Scudo

Este documento descreve o processo planejado para alinhar **aulas concluídas na Curseduca** com as **tarefas de tipo aula** da jornada na Scudo.

## Objetivo

- Quando o aluno conclui uma aula na Curseduca (`finishedAt` preenchido no relatório de progresso), a **tarefa correspondente** na Scudo deve aparecer como **concluída** na jornada.
- **Primeira carga**: após o cadastro via fluxo de aluno oficial (`POST /api/auth/student-access`), buscar o histórico de progresso e persistir no banco.
- **Atualizações**: botão na tela da jornada para sincronizar de novo (e, em fase opcional, sync em background com throttle).

## Fonte de dados na Curseduca

| Item | Detalhe |
|------|---------|
| Endpoint | `GET {CURSEDUCA_CONTENTS_API_URL}/reports/progress` |
| Parâmetros | `member={slugDoMembro}` — **obrigatório usar o slug** do membro (não o id numérico); `limit` e `offset` para paginação |
| Headers | `Authorization: Bearer {CURSEDUCA_API_TOKEN}`, `api_key: {CURSEDUCA_API_KEY}`, `Content-Type: application/json` |
| Paginação | Repetir requisições com `offset += limit` enquanto `metadata.hasMore` for verdadeiro |

### O que conta como “aula feita”

Para cada elemento em `data[]`:

- **`finishedAt`**: se estiver preenchido, a aula foi concluída na Curseduca.
- **`lesson.id`** / **`lesson.title`**: identificam qual aula foi (o vínculo com a Scudo usa preferencialmente `lesson.id` via mapa explícito).

Demais campos podem ser ignorados se o objetivo for apenas “fez ou não fez” por aula.

## Como isso vira “tarefa feita” na Scudo

1. **Persistência**: o progresso da jornada por usuário fica na tabela **`UserJornadaTaskProgress`** (`userId`, `taskId`, `completedAt`), definida no Prisma.
2. **Leitura na UI**: `getUserJornadaSnapshot` (em `app/lib/jornada/service.ts`) carrega essas linhas e marca cada tarefa do catálogo com `status: done` quando existe registro para aquele `taskId`.
3. **Escrita pelo sync**: o serviço de integração faz **`upsert`** nessa mesma tabela para cada aula concluída na Curseduca que tenha um **`taskId` Scudo** resolvido via mapa (`lesson.id` Curseduca → `taskId` na jornada).

Ou seja: **o efeito na interface é o mesmo** de ter marcado a tarefa como concluída, porque ambos usam a **mesma tabela** de progresso.

### Sync importado × clique manual na jornada

- O **`PATCH /api/jornada`** (marcação manual pelo usuário na UI) aplica a regra **`isTaskEditableForUser`**: só permite alterar tarefas do **rank/etapa atual** editável.
- O **sync vindo da Curseduca** deve gravar progresso **sem** essa restrição (escrita direta no Prisma / função dedicada), para refletir o histórico real de quem já concluiu aulas fora da ordem estrita da jornada na Scudo.

## Pré-requisito: slug do membro

O parâmetro `member` na API de progresso aceita o **slug** do aluno na Curseduca. Esse valor precisa ser obtido na API de membros (por exemplo `GET .../members/by?email=...` no fluxo de aluno oficial) e **persistido no usuário** (ex.: campo `curseducaMemberSlug` no model `User`). Sem o slug salvo, não é possível chamar `/reports/progress` de forma confiável.

## Mapa Curseduca ↔ Scudo

As tarefas da jornada estão no catálogo (`app/lib/jornada/mockJornada.ts`) com ids estáveis (ex.: `ferro-10`). A correspondência com aulas da Curseduca deve ser feita por um **mapa explícito** `lesson.id` → `taskId`, mantido em código ou em tabela administrável.

Recomenda-se restringir a tarefas cujo tipo efetivo seja **aula** (alinhado à inferência de `kind` usada na UI, hoje em `JornadaBoard`).

Itens sem entrada no mapa: ignorar (e opcionalmente registrar em log para completar o mapa depois).

## Momentos de execução (estratégia híbrida)

| Momento | Comportamento |
|---------|----------------|
| Após cadastro aluno oficial | Sync automática em background (não bloquear a resposta HTTP se a API da Curseduca falhar). |
| Uso contínuo | Botão na jornada para disparar o **mesmo** serviço de sync (atualizar após novas conclusões na Curseduca ou repetir após falha). |
| Opcional (fase 2) | Sync em background ao abrir a jornada, com throttle por usuário, ou cron interno. |

## Variáveis de ambiente

Usar as credenciais e base da API de conteúdos já previstas para o projeto, por exemplo:

- `CURSEDUCA_CONTENTS_API_URL`
- `CURSEDUCA_API_KEY`
- `CURSEDUCA_API_TOKEN`

Tokens e chaves devem ser usados **somente no servidor**; não expor segredos ao bundle do browser.

## Referências de código (Scudo)

- Modelo de progresso: `prisma/schema.prisma` → `UserJornadaTaskProgress`
- Snapshot da jornada: `app/lib/jornada/service.ts`
- API de toggle manual: `app/api/jornada/route.ts`
- Cadastro aluno oficial: `app/api/auth/student-access/route.ts`

---

*Documento alinhado ao plano de integração Curseduca ↔ jornada; atualize este arquivo quando a implementação estiver concluída (rotas finais, nomes de campos e mapa de aulas).*
