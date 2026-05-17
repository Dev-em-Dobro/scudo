# MGM Fase 0 — Indique e Ganhe (deploy & env)

Implementação da rota `/indique-e-ganhe` (Member-Get-Member pra alunos DevQuest).
Spec/contrato: `dobro-company-agents/docs/member-get-member/spec-fase-0-rota-scudo.md` v0.3
+ `plano-build-fase-0-recon.md`.

## ⚠️ Migration — NÃO aplicar vanilla

A migration `prisma/migrations/<ts>_add_mgm/` é **hand-authored**: além do DDL,
contém `GRANT` explícito + `ENABLE ROW LEVEL SECURITY` + policies. Isso é
**obrigatório** — `harden_app_user_auth_privileges_phase1` revogou default
privileges, então tabela nova nasce sem acesso pro role `app_user` (deploy
quebra silenciosamente sem o GRANT). Testar **local primeiro**:

```
npm run db:local:up
npm run prisma:migrate:local      # aplica em LOCAL_DATABASE_URL (NUNCA prod direto)
```

Deploy: `npm run prisma:migrate:deploy` no pipeline (Neon).

## Variáveis de ambiente novas

`.env*` é gitignored — setar direto no `.env` local e nas envs da Vercel.

| Var | Obrigatória | Default | Descrição |
|---|---|---|---|
| `ENABLE_MGM` / `NEXT_PUBLIC_ENABLE_MGM` | **Sim p/ ligar** | **OFF** | **Feature flag (kill-switch).** Default OFF → página, nav, `/i/[code]`, webhook e cron ficam inertes. Setar `true` nas duas (server + client/nav) pra liberar. `isMgmEnabled()` em `featureFlags.ts` |
| `HUBLA_WEBHOOK_SECRET` | Sim (webhook) | — | Bearer/`x-webhook-secret` do `POST /api/referrals/hubla-webhook` |
| `MGM_CHECKOUT_URL` | Sim (deploy) | fallback `/` | URL do checkout DevQuest na Hubla. **Pendência stakeholder.** Sem ela, `/i/[code]` redireciona pra `/` |
| `CRON_SECRET` | Sim | — | **Já existe** (reusado do cron de jobs). Auth do `/api/cron/mgm-validate` |
| `MGM_BOOST_STARTS_AT` | Não | — | ISO. Início da janela de boost (ex.: `2026-06-01T00:00:00-03:00`) |
| `MGM_BOOST_ENDS_AT` | Não | — | ISO. Fim da janela de boost |
| `MGM_BOOST_MULTIPLIER` | Não | `3.0` | Multiplicador de pontos na janela |
| `MGM_POINTS_BASE` | Não | `100` | Pontos-base por indicação válida |
| `MGM_GUARANTEE_DAYS` | Não | `15` | Período de garantia (dias) antes de `pending`→`valid` |
| `MGM_APP_URL` | Não | `BETTER_AUTH_URL` | Base usada em `buildShareLink` (`/i/<code>`) |

## Go-live: ligar o MGM em produção

Feature flag default **OFF** — nada do MGM aparece até concluir os passos, **nesta ordem**:

1. **Migration aplicada na Neon** — `npm run prisma:migrate:deploy` no pipeline (testar local antes; ver seção da migration). Sem isso, ligar a flag quebra (tabelas/RLS ausentes).
2. **Envs de produção setadas na Vercel** — `HUBLA_WEBHOOK_SECRET`, `MGM_CHECKOUT_URL` (URL real do checkout Hubla); opcional `MGM_BOOST_*`. `CRON_SECRET` já existe.
3. **Ligar a flag — setar AS DUAS na Vercel (Production):**
   - `ENABLE_MGM=true` → server (página, webhook, cron, `/i/[code]`)
   - `NEXT_PUBLIC_ENABLE_MGM=true` → client (item "Indique e Ganhe" no menu)
4. **Redeploy obrigatório** — `NEXT_PUBLIC_*` é inlinado no build. Salvar a env **não basta**: disparar um novo deploy da branch pra valer.
5. **Validar em prod** — item aparece no menu, `/indique-e-ganhe` abre pra aluno oficial, webhook responde sem `skipped: mgm_disabled`.

**Desligar (kill-switch / rollback imediato):** setar as duas envs para `false` (ou remover) + redeploy. Volta a ficar 100% inerte. Não há migration reversa — as tabelas ficam, só param de ser usadas.

**Rodar local com a flag ligada** (senão a página redireciona pra `/` e o item some — default é OFF). No PowerShell, antes do `npx next dev`:

```
$env:ENABLE_MGM="true"; $env:NEXT_PUBLIC_ENABLE_MGM="true"
```

> Deploy/push/PR e setar envs em prod = `@github-devops` / stakeholder. `@dev` não tem autoridade de deploy.

### Configurar o webhook NA Hubla (pré-requisito — não é código)

O endpoint `POST /api/referrals/hubla-webhook` é só o **receptor**. Pra ele
disparar, **a Hubla precisa ser configurada** (painel/admin ou API da Hubla,
por quem tem acesso à conta — ops/stakeholder, não `@dev`) para enviar webhook
de **compra aprovada** e **reembolso** para:

- **URL:** `https://scudo.devemdobro.com/api/referrals/hubla-webhook`
- **Auth:** header `x-webhook-secret: <HUBLA_WEBHOOK_SECRET>` **ou**
  `Authorization: Bearer <HUBLA_WEBHOOK_SECRET>` (o handler aceita os dois).
  Se a Hubla só assinar com esquema próprio, ajustar só a auth do handler
  (mudança isolada) — não rearquiteta o resto.

**Não é bloqueante (resiliência §4.7):** sem webhook útil da Hubla, **P2**
(casar e-mail do comprador com `MgmClick` — basta qualquer webhook com o
e-mail) e **P3** (reconciliação por export CSV de vendas, zero webhook)
garantem a atribuição. Mas o crédito em **tempo real (P1)** exige este passo.
Confirmar os campos do payload = item G.

## Componentes

- `prisma/schema.prisma` — `User.mgmReferralCode`, `MgmReferral`, `MgmClick`, enum `MgmReferralStatus`
- `app/lib/mgm/` — `service.ts`, `referral-code.ts`, `share-link.ts`, `boost.ts`, `rlsContext.ts`
- `app/api/referrals/hubla-webhook/route.ts` — atribuição (P1 + P2)
- `app/i/[code]/route.ts` — rota intermediária de tracking (P2)
- `app/api/cron/mgm-validate/route.ts` — cron diário `pending`→`valid`
- `app/indique-e-ganhe/` — página + componentes (aba Indicação funcional; Prêmios/Ranking placeholder)
- `proxy.ts` / `vercel.json` / `app/lib/constants.ts` / `Sidebar.tsx` / `Header.tsx` — wiring

## Atribuição (resiliência §4.7)

O link compartilhado é interno: `MGM_APP_URL/i/<code>` → registra `MgmClick`
→ `redirect(302)` pro checkout com `?ref=` + utm. Webhook resolve: P1 (ref no
payload) → P2 (match por e-mail via `MgmClick`, janela 14d) → senão skip.
P3 (reconciliação CSV) é script à parte na semana da apuração.

## Pendências externas (não bloqueiam o build)

- **Webhook configurado NA Hubla** (URL + secret) — pré-requisito do crédito em tempo real (P1); sem ele cai pra P2/P3. Quem configura: acesso admin Hubla (ops/stakeholder), não é código.
- `MGM_CHECKOUT_URL` real (stakeholder) — sem ela `/i/[code]` cai pra `/`.
- Comportamento real da Hubla (item G): só decide qual caminho P1/P2 fica ativo;
  ajuste isolado em `extractRef()`. Mecanismo do 10% off é config da Hubla.
- Nome do programa: usando "Indique e Ganhe" (default).
