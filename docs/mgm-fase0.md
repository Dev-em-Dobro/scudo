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
| `MGM_POINTS_BASE` | Não | `40` | Pontos-base por indicação válida |
| `MGM_APP_URL` | Não | `BETTER_AUTH_URL` | Base usada em `buildShareLink` (`/i/<code>`) |

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

- `MGM_CHECKOUT_URL` real (stakeholder) — sem ela `/i/[code]` cai pra `/`.
- Comportamento real da Hubla (item G): só decide qual caminho P1/P2 fica ativo;
  ajuste isolado em `extractRef()`. Mecanismo do 10% off é config da Hubla.
- Nome do programa: usando "Indique e Ganhe" (default).
