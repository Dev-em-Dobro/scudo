# Performance da Jornada — Quick Wins (itens 1–6)

Branch: `feature/jornada-performance`  
Data: 2026-07-06  
Escopo: marcar/desmarcar tarefa (`PATCH /api/jornada`) e ações correlatas.

---

## Problema

Marcar uma aula como concluída parecia lenta porque o backend tratava **cada clique** como um reload completo da jornada: duas vezes o snapshot pesado, consulta ao CodeQuest, múltiplas transações Prisma e geração síncrona de PDF ao concluir rank.

O frontend já fazia **optimistic update** (checkbox muda na hora), mas o usuário percebia lentidão no spinner/confirmação e ao marcar várias aulas em sequência (fila serializada).

---

## O que mudou

| # | Melhoria | Antes | Depois |
|---|----------|-------|--------|
| 1 | **Validação leve** (`isTaskEditableForUser`) | Chamava `getUserJornadaSnapshot` completo | 2 queries paralelas (`taskProgress` + `stageCompletion`) + cálculo em memória |
| 2 | **Transação única** em `setTaskDoneForUser` | 2× `withRlsUserContext` | 1 transação: upsert/delete + streak + estágios + currículo JSON |
| 3 | **Sem CodeQuest no toggle** | 2× `fetchCodeQuestProgressByEmail` por PATCH | CodeQuest só no GET da página e nos endpoints de sync explícitos |
| 4 | **Resposta mínima no PATCH** | Snapshot inteiro (~500 tarefas + streak + CQ) | Payload ~200 bytes–2 KB: `taskId`, `done`, `editableStageId`, `currentRankLetter`, streak, `resumeUpdated` |
| 5 | **Cache do catálogo** | `bypassCache: true` a cada conclusão | Usa cache em memória (TTL 60s) via `getPublishedJornadaCatalog()` |
| 6 | **PDF assíncrono** | `generateAtsResumePdf` bloqueava a request ao concluir rank | JSON salvo na transação; PDF gerado via `after()` do Next.js |

### Arquivos principais

- `app/lib/jornada/service.ts` — orquestração otimizada
- `app/api/jornada/route.ts` — PATCH retorna delta
- `app/lib/resume/schedulePdfGeneration.ts` — PDF em background
- `app/lib/resume/syncGeneratedResume.ts` — opção `deferPdf`
- `app/components/jornada/JornadaBoard.tsx` — `applyTaskToggleResponse`

---

## Fluxo antes vs depois

### Antes (PATCH marcar aula)

```
auth → isOfficialStudent → getCatalogTaskById
  → isTaskEditableForUser → getUserJornadaSnapshot [CQ + sync estágios + resume?]
  → setTaskDoneForUser [tx1 streak] [tx2 bypassCache + estágios + PDF?]
  → getUserJornadaSnapshot DE NOVO [CQ + sync estágios + resume?]
→ resposta ~500 tasks
```

**Operações típicas por clique:** 5–8 transações DB, 2 consultas CodeQuest, 2–3 loads de catálogo (514 rows), 0–1 PDF síncrono.

### Depois (PATCH marcar aula)

```
auth → isOfficialStudent → getCatalogTaskById
  → isTaskEditableForUser [2 queries leves]
  → setTaskDoneForUser [1 tx: progresso + streak + estágios + resume JSON]
  → (se rank concluído) scheduleGeneratedResumePdfGeneration via after()
→ resposta mínima
```

**Operações típicas por clique:** 2 transações DB (validação + escrita), 0 CodeQuest, 1 catálogo (cache), PDF fora da request.

---

## Métricas estimadas de ganho

Valores baseados na análise estática do código e em perfis típicos (Postgres local ~5 ms/query, CodeQuest remoto ~100–400 ms, PDF ~200–800 ms). **Medir em staging/prod para validar.**

| Cenário | Latência antes (est.) | Latência depois (est.) | Redução |
|---------|----------------------|------------------------|---------|
| Marcar aula comum | 1,5–4,0 s | 150–500 ms | **~70–85%** |
| Marcar 5 aulas em sequência | 8–20 s | 1–3 s | **~80%** |
| Última aula do rank (com currículo) | 3–8 s | 300–700 ms* | **~85–90%** |
| Payload PATCH (rede) | ~80–150 KB JSON | ~0,5–2 KB | **~98%** |
| Queries CodeQuest por toggle | 2 | 0 | **100%** |
| Transações Prisma por toggle | 5–8 | 2 | **~60–75%** |

\* O PDF fica disponível alguns segundos depois (background). O JSON do currículo e o modal de rank aparecem na hora.

### Decomposição do tempo economizado (aula comum)

| Etapa removida/enxuta | Economia estimada |
|----------------------|-------------------|
| 2× CodeQuest (3 queries cada) | 200–800 ms |
| 2× `getUserJornadaSnapshot` (streak + stage sync) | 300–900 ms |
| Snapshot JSON serializado | 50–200 ms |
| `bypassCache` catálogo extra | 30–150 ms |
| Transação Prisma extra + round-trips | 20–80 ms |
| PDF síncrono (só ao concluir rank) | 200–800 ms |

---

## Trade-offs

### PDF assíncrono ao concluir rank

- **Pró:** request do toggle não espera `pdf-lib`.
- **Contra:** download imediato do PDF pode mostrar versão anterior por 2–10 s até o `after()` terminar.
- **Mitigação futura:** indicador “PDF atualizando…” no card do currículo ou polling leve no HEAD `/api/profile/generated-resume`.

### Resposta mínima no PATCH

- O board confia no optimistic update para status da tarefa.
- Syncs externos (Curseduca/CodeQuest) continuam devolvendo snapshot completo.

### Cache do catálogo (60 s)

- Admin que publicar catálogo novo pode levar até 60 s para refletir em toggles (já era assim para leituras; removido apenas o `bypassCache` forçado).

---

## Como medir localmente

Com servidor e banco locais rodando:

```bash
# Terminal 1
npm run db:local:up
npm run dev:local

# Terminal 2 — após login, copiar cookie de sessão
# Substituir TASK_ID e COOKIE pelos valores reais
time curl -s -o /dev/null -w "%{http_code} %{time_total}s\n" \
  -X PATCH http://localhost:3000/api/jornada \
  -H "Content-Type: application/json" \
  -H "Cookie: <session-cookie>" \
  -d '{"taskId":"t-s1-aula-01","done":true}'
```

Compare `time_total` antes e depois do merge desta branch.

Para inspecionar payload:

```bash
curl -s ... | wc -c   # bytes da resposta
```

---

## Próximos passos (fora deste PR)

| Prioridade | Item |
|------------|------|
| Média | Cache CodeQuest por usuário (TTL 2–5 min) no GET da jornada |
| Média | Instrumentação com logs de timing (`[jornada-patch] cq=… db=…`) |
| Baixa | Fila de eventos para streak/estágio/resume totalmente desacoplados |
| Baixa | Curseduca sync: carregar catálogo uma vez no loop |

---

## Referências

- Análise original: conversa de performance da jornada (jul/2026)
- Streak na jornada: `docs/jornada-streak-implementacao.md`
- Sync Curseduca: `docs/curseduca-jornada-sync.md`
