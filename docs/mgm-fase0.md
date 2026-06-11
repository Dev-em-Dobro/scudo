# MGM — Indique e Ganhe (deploy & env)

Implementação da rota `/indique-e-ganhe` (Member-Get-Member pra alunos DevQuest).
Spec/contrato: `dobro-company-agents/docs/member-get-member/spec-fase-0-rota-scudo.md` v0.4
(Fase 0 + Fase 1) + `plano-build-fase-0-recon.md`.

**Fases:**
- **Fase 0** (mergeada 2026-05-16, branch `feat/mgm-fase0`): rota `/indique-e-ganhe`,
  schema MGM, webhook Hubla, atribuição P1/P2/P3, garantia, FAQ + Regulamento,
  feature flag. Vide commits `feat(mgm):*` Fase 0.
- **Fase 1** (branch `feat/mgm-fase1`, 2026-05-23): catálogo de prêmios + resgate,
  ranking ao vivo, admin de aprovação, multi-gateway (Hubla + Asaas), temporadas
  (renomeado de "LI-26").

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

## Variáveis de ambiente

`.env*` é gitignored — setar direto no `.env` local e nas envs da Vercel.

| Var | Obrigatória | Default | Descrição |
|---|---|---|---|
| `ENABLE_MGM` / `NEXT_PUBLIC_ENABLE_MGM` | **Sim p/ ligar** | **OFF** | **Feature flag (kill-switch).** Default OFF → página, nav, `/i/[code]`, webhook e cron ficam inertes. Setar `true` nas duas (server + client/nav) pra liberar. `isMgmEnabled()` em `featureFlags.ts` |
| `HUBLA_WEBHOOK_SECRET` | Sim (Hubla) | — | Bearer/`x-webhook-secret` do `POST /api/referrals/hubla-webhook` |
| `ASAAS_WEBHOOK_SECRET` | Sim (Asaas) | — | Header `asaas-access-token` do `POST /api/referrals/asaas-webhook` (Fase 1) |
| `MGM_CHECKOUT_URL` | Sim (deploy) | fallback `/` | URL do checkout DevQuest na Hubla. Sem ela, `/i/[code]` redireciona pra `/` |
| `MGM_CHECKOUT_COUPON` | Não | **`INDIQUEMGM`** | Cupom de desconto do indicado, anexado como `?coupon=` no redirect do `/i/[code]` pro checkout. Setar string vazia desliga o cupom |
| `MGM_RENEWAL_PRICE_CENTS` | Não | — | Preço da renovação anual em centavos (ex.: `129700` = R$ 1.297). Sem env, vitrine de prêmios mostra só o `%` sem ancorar preço |
| `MGM_ADMIN_EMAILS` | Sim (admin) | — | CSV de e-mails com acesso a `/admin/mgm-redemptions` (Fase 1) |
| `MGM_SEASON_NAME` | Não | — | Nome da temporada ativa exibido na UI (ex.: "Temporada Copa do Mundo") |
| `MGM_BOOST_STARTS_AT` | Não | — | ISO. Início da temporada com boost |
| `MGM_BOOST_ENDS_AT` | Não | — | ISO. Fim da temporada |
| `MGM_BOOST_MULTIPLIER` | Não | **`2.0`** (Fase 1; era 3.0 na Fase 0) | Multiplicador da temporada — 1.5, 2.0, 2.5, 3.0 |
| `MGM_POINTS_BASE` | Não | `100` | Pontos-base por indicação válida |
| `MGM_GUARANTEE_DAYS` | Não | `15` | Período de garantia (dias) antes de `pending`→`valid` |
| `MGM_APP_URL` | Não | `BETTER_AUTH_URL` | Base usada em `buildShareLink` (`/i/<code>`) |
| `CRON_SECRET` | Sim | — | **Já existe** (reusado do cron de jobs). Auth do `/api/cron/mgm-validate` |

## Prêmio especial da temporada (v0.5)

A temporada (boost de pontos) continua 100% via envs — **abrir uma temporada não envolve código**. O prêmio especial é um reward do catálogo com `seasonOnly=true`: só aparece na vitrine e só aceita resgate enquanto `MGM_BOOST_STARTS_AT/ENDS_AT` estiver na janela. O gate é na entrada — resgates feitos durante a janela seguem o fluxo admin normal depois do fim.

**Checklist pra abrir uma temporada com prêmio** (ex.: Copa do Mundo, +50%, cadeira gamer):

1. Setar na Vercel: `MGM_SEASON_NAME`, `MGM_BOOST_STARTS_AT`, `MGM_BOOST_ENDS_AT`, `MGM_BOOST_MULTIPLIER=1.5` + redeploy.
2. Seed do prêmio: entrada no `scripts/seed-mgm-rewards.mjs` com `seasonOnly: true` e família **por temporada** (ex.: `temporada-copa-2026` — garante 1 resgate por aluno nesta temporada sem bloquear a próxima) → `node scripts/seed-mgm-rewards.mjs` apontando pro banco de prod.
3. Fim da temporada: automático (cadeira some da vitrine e resgate bloqueia com `season_inactive`). Opcional: `active=false` no reward por higiene.

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

O endpoint `POST /api/referrals/hubla-webhook` é só o **receptor** (formato
**Webhook v2.0.0** da Hubla). Pra ele disparar, **a Hubla precisa ser
configurada** (painel/admin, por quem tem acesso à conta — ops/stakeholder,
não `@dev`):

1. Painel Hubla → **Integrações → Webhooks** → criar webhook **versão 2.0**.
2. **URL:** `https://scudo.devemdobro.com/api/referrals/hubla-webhook`
3. **Eventos:** marcar **Fatura: pagamento bem-sucedido**
   (`invoice.payment_succeeded`) e **Fatura: reembolso** (`invoice.refunded`).
   Outros eventos assinados são respondidos com `{skipped: 'unhandled_event'}`
   (200, sem retry).
4. **Auth:** a Hubla assina cada request com o **token único da conta** no
   header `x-hubla-token` (não há header customizável). Copiar o token
   (painel → Integrações/Credenciais) e setar `HUBLA_WEBHOOK_SECRET` na Vercel
   com **esse valor**. Pra testes manuais via curl, o handler também aceita
   `x-webhook-secret` ou `Authorization: Bearer`.

**Mapeamento do payload v2** (handler): `event.invoice.id` → `gatewayOrderId`;
`event.payer` (fallback `event.user`) → comprador; `amount.totalCents/100` →
`saleAmount` em reais; `firstPaymentSession.utm.content` → `ref` (P1 — nosso
redirect `/i/[code]` manda `utm_content=<code>`); sem utm → P2 por e-mail.

**Não é bloqueante (resiliência §4.7):** sem webhook útil da Hubla, **P2**
(casar e-mail do comprador com `MgmClick` — basta qualquer webhook com o
e-mail) e **P3** (reconciliação por export CSV de vendas, zero webhook)
garantem a atribuição. Mas o crédito em **tempo real (P1)** exige este passo.
Confirmar os campos do payload = item G.

## Componentes

**Fase 0:**
- `prisma/schema.prisma` — `User.mgmReferralCode`, `MgmReferral`, `MgmClick`, enum `MgmReferralStatus`
- `app/lib/mgm/` — `service.ts`, `referral-code.ts`, `share-link.ts`, `rlsContext.ts`
- `app/api/referrals/hubla-webhook/route.ts` — adapter Hubla (refatorado em Fase 1 — agora chama `recordReferral`)
- `app/i/[code]/route.ts` — rota intermediária de tracking (P2)
- `app/api/cron/mgm-validate/route.ts` — cron diário `pending`→`valid`
- `app/indique-e-ganhe/` — página + componentes
- `proxy.ts` / `vercel.json` / `app/lib/constants.ts` / `Sidebar.tsx` / `Header.tsx` — wiring

**Fase 1 (novos):**
- `prisma/schema.prisma` — `MgmReward`, `MgmRedemption`, `User.mgmRankingOptIn`, `UserProfile.mgmShippingAddress`, `MgmReferral.gateway` + rename `hublaOrderId`→`gatewayOrderId`, enums `PaymentGateway`, `MgmRewardType`, `MgmRedemptionStatus`
- `app/lib/mgm/seasons.ts` — substitui `boost.ts`. Adiciona `getSeasonName`, `getCurrentSeason`, multiplicador default 2.0
- `app/lib/mgm/recordReferral.ts` — **handler central gateway-agnóstico**. Hubla e Asaas são adapters finos sobre ele
- `app/lib/mgm/balance.ts` — saldo on-demand (valid − spent)
- `app/lib/mgm/rewards.ts` — catálogo (`listActiveRewards`, `upsertReward`)
- `app/lib/mgm/redemptions.ts` — resgate, cancelar, listar; ações de admin (approve/deliver/reject) com txn + regra de família
- `app/lib/mgm/ranking.ts` — leaderboard com toggle temporada/all-time + opt-in
- `app/lib/mgm/adminAuth.ts` — gate `isMgmAdmin(email)` via `MGM_ADMIN_EMAILS`
- `app/api/referrals/asaas-webhook/route.ts` — adapter Asaas (espelha Hubla)
- `app/api/mgm/redemptions/` — POST request + cancel
- `app/api/mgm/ranking-opt-in/route.ts` — toggle opt-in
- `app/api/admin/mgm-redemptions/[id]/` — approve, deliver, reject (gated)
- `app/admin/mgm-redemptions/` — página admin (lista + ações)
- `app/indique-e-ganhe/components/` — `PremiosTab`, `RankingTab` reescritos; novos: `RewardRedeemModal`, `rewardFormatting.ts`
- `scripts/seed-mgm-rewards.mjs` — seed dos 6 prêmios iniciais

## Atribuição (resiliência §4.7)

O link compartilhado é interno: `MGM_APP_URL/i/<code>` → registra `MgmClick`
→ `redirect(302)` pro checkout com `?ref=` + utm. Webhook resolve: P1 (ref no
payload) → P2 (match por e-mail via `MgmClick`, janela 14d) → senão skip.
P3 (reconciliação CSV) é script à parte na semana da apuração.

## Pendências externas (não bloqueiam o build)

- **Webhook Hubla configurado NA Hubla** (URL + secret) — pré-requisito do crédito em tempo real (P1); sem ele cai pra P2/P3. Quem configura: acesso admin Hubla (ops/stakeholder), não é código.
- **Webhook Asaas configurado NA Asaas** (Fase 1) — opcional, só se receber pagamentos por Asaas. Settings → Integrações → Webhooks → URL `/api/referrals/asaas-webhook`, header `asaas-access-token: $ASAAS_WEBHOOK_SECRET`, eventos `PAYMENT_CONFIRMED` e `PAYMENT_REFUNDED`.
- `MGM_CHECKOUT_URL` real (stakeholder) — sem ela `/i/[code]` cai pra `/`.
- Comportamento real da Hubla (item G): só decide qual caminho P1/P2 fica ativo; ajuste isolado em `extractRef()`. Mecanismo do 10% off é config da Hubla.
- Nome do programa: usando "Indique e Ganhe" (default).

## Operação do admin (Fase 1)

- `MGM_ADMIN_EMAILS=devemdobro@gmail.com,beto@...` (CSV).
- Bookmark: `https://scudo.devemdobro.com/admin/mgm-redemptions`.
- **Sem item no sidebar** — admin é raro; o link fica fora pra não poluir nav. Compartilhar URL com quem precisa.
- Fluxo PHYSICAL (camiseta/livro): `Aprovar` → produzir/comprar sob demanda → `Marcar entregue` (sem cupom).
- Fluxo DIGITAL (descontos/voucher renovação): clicar `Gerar cupom` direto → modal pede o `couponCode` gerado manualmente na Hubla → salva e marca `delivered`.
- Rejeitar: pede motivo, estorna pontos.

## Seed do catálogo

Após aplicar a migration da Fase 1, rodar 1 vez (idempotente):
```
node scripts/seed-mgm-rewards.mjs
```
Cria/atualiza os 6 prêmios: camiseta (100), livro Clean Code (200), descontos renovação 30/40/50% (300/400/500) e 1 ano grátis (800).

## Ferramentas de QA (staging / teste interno)

⚠️ **Não usar em prod com dados reais.** Pra acelerar smoke test do fluxo
completo sem precisar de pagamento real ou esperar a garantia 15d.

### 1. Simular venda sem passar pela Hubla

Endpoint `POST /api/mgm/dev/fake-purchase` — gated por:
- `MGM_DEV_TEST_ENABLED=true` na env (default OFF → endpoint retorna 404)
- Sessão autenticada de admin (e-mail em `MGM_ADMIN_EMAILS`)
- `ENABLE_MGM=true`

Cria um `MgmReferral` sintético chamando `recordReferral()` direto com
um `orderId` gerado (`dev-<gateway>-<ts>-<rand>`). Idempotente — chamar 2x
com mesmo `orderId` (passar `--data orderId`) retorna `idempotent: true`.

```bash
# Logar no admin via browser, copiar o cookie da sessão, depois:
curl -X POST https://scudo.devemdobro.com/api/mgm/dev/fake-purchase \
  -H "Cookie: __Secure-better-auth.session_token=COLA_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "referralCode": "ricardo-47",
    "customerEmail": "teste@friend.com",
    "customerName": "Amigo Teste",
    "amount": 1297
  }'
```

Body opcional: `customerPhone`, `gateway` (`hubla|asaas|stripe|other`),
`event` (`purchase.approved|purchase.refunded`), `orderId` (pra testar
idempotência ou refund de venda anterior).

### 2. Pular a garantia de 15d

Script `scripts/mgm-fast-forward-garantia.mjs` move referrals
`pending → valid` sem esperar o cron — útil pra testar o resgate logo
após simular a indicação.

```bash
# Tudo que está pending vira valid (cuidado!)
node scripts/mgm-fast-forward-garantia.mjs --all

# Só de um aluno específico:
node scripts/mgm-fast-forward-garantia.mjs --user-id cmiabcd1234

# Só 1 referral:
node scripts/mgm-fast-forward-garantia.mjs --referral-id cmrefxyz9876

# Listar sem alterar:
node scripts/mgm-fast-forward-garantia.mjs --all --dry-run
```

Roda sob contexto RLS `system:mgm-cron` (mesma policy do cron real).

### Roteiro de smoke test sugerido

1. `MGM_DEV_TEST_ENABLED=true` na env de staging (NUNCA em prod com dados reais)
2. Login como admin no `/indique-e-ganhe` (gera referral code, ex.: `ricardo-47`)
3. `POST /api/mgm/dev/fake-purchase` com `referralCode=ricardo-47` e e-mail novo
4. Confirmar que `MgmReferral` foi criado em status `pending`
5. `node scripts/mgm-fast-forward-garantia.mjs --referral-id <id>` → vira `valid`
6. Voltar em `/indique-e-ganhe` → aba Prêmios → saldo deve mostrar `pointsEarned`
7. Resgatar camiseta → preencher endereço → confirmar
8. Abrir `/admin/mgm-redemptions` → aprovar → "Marcar entregue"
9. Conferir no histórico do aluno: status `Entregue`, info do envio

Pra refund: chamar `POST /api/mgm/dev/fake-purchase` com `event=purchase.refunded`
e o mesmo `orderId` do passo 3 — `MgmReferral` vira `reverted` e saldo cai.
