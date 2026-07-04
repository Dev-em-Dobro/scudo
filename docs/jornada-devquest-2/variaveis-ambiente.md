# Variáveis de ambiente — Jornada DevQuest 2.0

O que adicionar ou revisar na **Vercel (Scudo)** e o que fica só **local/CI**.

---

## Novas ou revisar na Vercel (Production + Preview)

| Variável | Obrigatória? | Valor sugerido | Para quê |
|----------|--------------|----------------|----------|
| `NEXT_PUBLIC_CURSEDUCA_APP_URL` | **Sim** (links de prática) | `https://devquest.curseduca.pro` | Base URL do botão **Ir praticar** na jornada |
| `DOBRO_API_KEY` | Recomendada | API key da dobro-api em prod | Scripts de reconcile e futuras integrações server-side |
| `DOBRO_API_BASE_URL` | Opcional | `https://dobro-api.vercel.app` | Default já é esse URL se omitir |

### Kill-switch (só se precisar)

| Variável | Quando usar |
|----------|-------------|
| `JORNADA_CATALOG_SOURCE=code` | Forçar UI a ler `mockJornada.ts` e ignorar `JornadaCatalogTask` |
| `JORNADA_USE_PUBLISHED_CATALOG=false` | Mesmo efeito do item acima |

---

## Já existiam — confirmar que estão na Vercel

Estas **não são novas**, mas a jornada depende delas:

| Variável | Uso |
|----------|-----|
| `DATABASE_URL` | Postgres Neon (runtime app) |
| `CURSEDUCA_API_URL` ou `USER_API_BASE_URL` | Sync de progresso Curseduca |
| `CURSEDUCA_CONTENTS_API_URL` | Conteúdos/aulas |
| `CURSEDUCA_API_TOKEN` ou `AUTHORIZATION_TOKEN` | Auth Curseduca |
| `CURSEDUCA_API_KEY` ou `API_KEY_HEADER` | Header API Curseduca |
| `CODEQUEST_DATABASE_URL` | Sync exercícios CodeQuest (Ferro–Prata) |
| `NEXT_PUBLIC_CODEQUEST_URL` | Links CodeQuest (default: codequest.devemdobro.com) |

---

## NÃO colocar na Vercel (local / operação manual)

| Variável | Onde usar |
|----------|-----------|
| `LOCAL_DATABASE_URL` | Docker Postgres local |
| `DATABASE_URL_ANTIGO` | Só na sua máquina para `migrate deploy` (role owner) |
| `CATALOG_DATABASE_URL` | Só no comando de bootstrap (apontar para Neon owner) |
| `FORCE_BOOTSTRAP=1` | Só no terminal ao rodar bootstrap — **nunca** env permanente |
| `JORNADA_SEED_EMAIL` / `JORNADA_SEED_THROUGH_STAGE` | Script de QA local |
| `JORNADA_CATALOG_VERSION` | Default `1`; só mudar se versionar catálogo de propósito |
| `DOBRO_API_COURSE_SLUG` | **Deixe vazio** ou use slug completo. `devquest` quebra reconcile |

---

## Resumo para copiar na Vercel

**Mínimo novo para esta entrega:**

```env
NEXT_PUBLIC_CURSEDUCA_APP_URL=https://devquest.curseduca.pro
```

**Recomendado (operacao/manutencao):**

```env
DOBRO_API_KEY=<sua-api-key-prod>
DOBRO_API_BASE_URL=https://dobro-api.vercel.app
```

**Não setar:**

```env
# DOBRO_API_COURSE_SLUG=devquest   ← ambíguo, evitar
# FORCE_BOOTSTRAP=1                 ← só no terminal
```

---

## Após alterar env na Vercel

`NEXT_PUBLIC_*` é inlined no **build**. Salvar a env **não basta** — é necessário **novo deploy** para valer.
