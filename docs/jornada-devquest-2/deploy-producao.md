# Deploy em produção — Jornada DevQuest 2.0

Ordem recomendada. Não pule o bootstrap se quiser que a UI leia o catálogo do banco.

---

## Pré-requisitos

- [ ] QA local OK (jornada, ordem Platina → Esmeralda, links "Ir praticar").
- [ ] PR revisada e merge na branch principal (ou deploy da branch aprovada).
- [ ] Acesso à Neon com role de **migração** (`DATABASE_URL` owner/admin).
- [ ] Envs na Vercel atualizadas (ver [variaveis-ambiente.md](./variaveis-ambiente.md)).

---

## Passo 1 — Deploy do código (Vercel)

1. Merge do PR → deploy automático **ou** push na branch conectada.
2. Aguardar build verde.
3. (Opcional) Validar no **Preview** antes de promover produção.

> O código novo funciona mesmo com `JornadaCatalogTask` vazia (fallback para `mockJornada.ts`), mas o fluxo oficial é catálogo no banco.

---

## Passo 2 — Migrations na Neon

Na máquina local, com URL de **migração** (owner — no repo: `DATABASE_URL_ANTIGO`):

```bash
cd carrer-quest-v2

DATABASE_URL_MIGRATION="$(grep -m1 '^DATABASE_URL_ANTIGO=' .env | cut -d= -f2-)"

# Conferir pendentes
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate status

# Aplicar
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate deploy
```

Migrations desta entrega:

- `20260626195000_add_jornada_catalog_task` — tabela `JornadaCatalogTask`
- `20260627120000_add_user_jornada_stage_completion` — snapshot de rank

---

## Passo 3 — Bootstrap do catálogo

Publica as 443 tasks + 375 IDs Curseduca na Neon:

```bash
FORCE_BOOTSTRAP=1 CATALOG_DATABASE_URL="$DATABASE_URL_MIGRATION" npm run jornada:bootstrap-catalog
```

Saída esperada: `tasksFromCode: 443`, `mappedLessons: 375`.

Idempotente: pode rodar de novo com `FORCE_BOOTSTRAP=1` para atualizar títulos/ordem.

---

## Passo 4 — Smoke pós-deploy

1. Logar como aluno oficial na prod.
2. Abrir jornada — conferir rank editável e ordem Esmeralda (carreira no fim).
3. Clicar "Ir praticar" em task de carreira → curso empregabilidade.
4. Sync Curseduca: aula concluída na plataforma marca task no Scudo.

Reconcile (opcional, local):

```bash
DOBRO_API_COURSE_SLUG= CATALOG_DATABASE_URL="$DATABASE_URL_MIGRATION" npm run jornada:reconcile-catalog
```

> Deixe `DOBRO_API_COURSE_SLUG` vazio — valor `devquest` quebra o script (slug ambíguo).

---

## Passo 5 — Pós-deploy automático

No **primeiro acesso** de cada aluno após deploy, o Scudo faz backfill de `UserJornadaStageCompletion` para ranks já 100% concluídos (idempotente).

---

## Rollback

| Situação | Ação |
|----------|------|
| UI quebrada | Redeploy versão anterior na Vercel |
| Catálogo errado | `JORNADA_CATALOG_SOURCE=code` na Vercel (kill-switch) + redeploy |
| Migration problemática | Não reverter migration em prod sem runbook — contatar dev |

**Nunca** apagar `UserJornadaTaskProgress` em prod.

---

## O que NÃO rodar em prod

- `npm run jornada:seed-user-progress:local` — só QA local.
- `FORCE_BOOTSTRAP` sem revisar diff — sempre conferir output antes em homolog/preview se possível.
