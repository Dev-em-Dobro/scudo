# Teste de compra real — Indique e Ganhe (MGM)

> Runbook do teste ponta-a-ponta com **pagamento real na Hubla**, incluindo como
> os 15 dias de garantia contam e quando os pontos caem pro aluno.
> Complementa `docs/mgm-fase0.md` (runbook geral) e a spec v0.5.

---

## 1. O fluxo completo (o que acontece em produção)

```
ALUNO (indicador)                INDICADO                          SISTEMA
─────────────────                ────────                          ───────
1. Copia o link em               
   /indique-e-ganhe              
   → https://<scudo>/i/<code>    
                                 2. Abre o link
                                                                   3. Scudo grava MgmClick (P2)
                                                                      e redireciona (302) pra página
                                                                      de matrículas com:
                                                                      ?ref=<code>&utm_content=<code>
                                                                      &utm_source=mgm&coupon=INDIQUEMGM
                                 4. Página de matrículas repassa
                                    coupon + ref + utm pros botões
                                    de compra (pay.hub.la/...)
                                 5. Compra na Hubla — o cupom
                                    INDIQUEMGM já entra aplicado
                                                                   6. Hubla captura os utm na sessão
                                                                      de checkout e dispara o webhook
                                                                      invoice.payment_succeeded (v2)
                                                                   7. Scudo valida o token, mapeia o
                                                                      payload e cria MgmReferral:
                                                                      • status: pending
                                                                      • pointsEarned: 100 × boost
                                                                      • guaranteeUntil: venda + 15 dias
8. Vê a indicação "Em garantia"
   na hora, com os pontos pendentes
                                                                   9. Cron diário (06:00 UTC) vira
                                                                      pending → valid quando
                                                                      guaranteeUntil passa
10. Pontos caem no saldo
    disponível → pode resgatar
```

**Reembolso dentro da garantia:** a Hubla dispara `invoice.refunded` → o
referral vira `reverted` e os pontos nunca caem. Por isso os 15 dias existem —
espelham a garantia da compra do DevQuest.

### Onde os 15 dias são contados

- O webhook grava `guaranteeUntil = saleDate + MGM_GUARANTEE_DAYS` (default 15)
  no momento da venda. **A contagem começa sozinha — não tem ação manual.**
- O cron `/api/cron/mgm-validate` (agendado no `vercel.json`, diário 06:00 UTC)
  move `pending → valid` quando `guaranteeUntil < agora`.
- O saldo resgatável (`pointsAvailable`) conta **só pontos `valid`** — o aluno
  vê os pendentes na UI, mas não consegue gastar antes da garantia vencer.

### Atribuição em camadas (se algo falhar no caminho)

| Camada | Como funciona | Depende de |
|---|---|---|
| **P1** | `ref` chega no webhook via `firstPaymentSession.utm.content` | Página de matrículas propagar os utm pros botões da Hubla |
| **P2** | Sem ref → casa o e-mail do comprador com `MgmClick` dos últimos 14 dias | Click registrado COM e-mail (raro — só quando o link tem `?email=`) |
| **P3** | Reconciliação manual por export CSV da Hubla | Processo de ops, sem código |

Na prática: **P1 é o caminho que vale**. Sem o deploy da página de matrículas
com a propagação de utm, a atribuição automática não acontece.

---

## 2. Pré-requisitos do teste real (checklist)

Estado em 2026-06-11 — ambiente de teste: `https://scudo-dev-em-dobros-projects.vercel.app`

- [x] Scudo deployado com adapter Hubla v2 + cupom no redirect (conta Dev em Dobro)
- [x] Migration `seasonOnly` + seed do catálogo aplicados na Neon
- [x] Cron `mgm-validate` agendado (entra junto no deploy via `vercel.json`)
- [ ] **Deploy da página de matrículas** com o script que propaga
      `coupon`/`ref`/`utm` pros botões da Hubla (mudança feita no
      `ferramentas-ded/matriculas-site/index.html`, ainda não deployada)
- [ ] **Cupom `INDIQUEMGM` criado na Hubla** nas ofertas de 1 ano e 2 anos
- [ ] **Webhook v2 configurado NA Hubla** (painel → Integrações → Webhooks):
      - URL: `https://scudo-dev-em-dobros-projects.vercel.app/api/referrals/hubla-webhook`
      - Eventos: `invoice.payment_succeeded` + `invoice.refunded`
- [ ] **`HUBLA_WEBHOOK_SECRET` setada na Vercel** (projeto da conta dev) com o
      **token da conta Hubla** (painel → Integrações/Credenciais) + redeploy.
      ⚠️ Essa env NÃO existe no projeto ainda — sem ela o webhook responde 500.

> Quando o programa for pro domínio definitivo, repetir webhook + secret
> apontando pro domínio final.

---

## 3. Passo a passo do teste

1. **Loga** no ambiente de teste com uma conta de aluno oficial
   (ex.: `cadudias@hotmail.com`) e copia o link de indicação em
   `/indique-e-ganhe` (ex.: `https://scudo-dev-em-dobros-projects.vercel.app/i/ricardo-17`).
2. **Abre o link numa aba anônima** (papel de indicado). Confere:
   - caiu na página de matrículas com `?ref=...&coupon=INDIQUEMGM` na URL;
   - os botões de compra apontam pra `pay.hub.la/...?coupon=INDIQUEMGM&ref=...`;
   - o checkout da Hubla abre **com o cupom já aplicado**.
3. **Compra de verdade** com um e-mail que NÃO seja de aluno
   (senão a validação marca `existing_student` e invalida) — pode ser cartão
   real; o estorno vem no passo 7.
4. **Confere o crédito em tempo real** (até ~1 min depois do pagamento):
   - na conta do indicador: indicação aparece como **"Em garantia"** com os
     pontos pendentes (com boost da temporada se ativa);
   - no banco, se quiser: `MgmReferral` novo com `status='pending'`,
     `gatewayOrderId` = id da fatura Hubla, `guaranteeUntil` = venda + 15 dias.
5. **Valida a contagem dos 15 dias:** o campo `guaranteeUntil` já nasce
   preenchido — a contagem está rodando. Em produção real, é só esperar:
   o cron diário vira o status sozinho no primeiro 06:00 UTC após o vencimento.
6. **(QA) Pra não esperar 15 dias:** acelera com o script
   (⚠️ só em dados de teste):

   ```bash
   # mover a garantia pro passado e validar na hora:
   DATABASE_URL="<owner-url>" node scripts/mgm-fast-forward-garantia.mjs --referral-id <id>

   # ou simular o trabalho do cron manualmente:
   curl -X POST https://scudo-dev-em-dobros-projects.vercel.app/api/cron/mgm-validate \
     -H "Authorization: Bearer $CRON_SECRET"
   ```

   Depois disso os pontos caem no saldo disponível e dá pra testar resgate.
7. **Testa o estorno:** reembolsa a compra no painel da Hubla → webhook
   `invoice.refunded` → a indicação vira **revertida** e os pontos somem do
   pendente (ou do saldo, podendo ficar negativo — comportamento esperado,
   documentado na UI).

## 4. O que conferir em cada ponta (diagnóstico)

| Sintoma | Onde olhar |
|---|---|
| Cupom não aplicou no checkout | URL do botão da Hubla tem `?coupon=INDIQUEMGM`? O cupom existe na oferta? |
| Indicação não apareceu | Logs da function `hubla-webhook` na Vercel: 401 = token errado; 400 = payload inesperado (ver `details`); `skipped: no_ref` = utm não chegou (P1 falhou — página de matrículas propagou?) |
| Indicação `invalid` | `invalidReason`: `existing_student` (e-mail já é aluno), `self_referral`, `duplicate`, `disposable_domain` |
| Pontos não caíram após 15 dias | Cron rodou? (Vercel → Crons → mgm-validate) `CRON_SECRET` confere? |

## 5. Limpeza pós-teste

```sql
-- indicação do teste real (substituir o orderId da fatura):
DELETE FROM "MgmRedemption" WHERE "userId" = '<id-do-indicador>' AND status = 'requested';
DELETE FROM "MgmReferral" WHERE "gatewayOrderId" = '<invoice-id-do-teste>';
-- dados sintéticos de QA (se houver):
DELETE FROM "MgmReferral" WHERE "gatewayOrderId" LIKE 'qa-%' OR "gatewayOrderId" LIKE 'dev-%';
```

O estorno na Hubla devolve o dinheiro do teste; o cupom de teste pode ficar.
