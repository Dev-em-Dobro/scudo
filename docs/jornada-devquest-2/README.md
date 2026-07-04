# Jornada DevQuest 2.0 — Resumo para daily

Documentação simples do trabalho de sincronização **Scudo (jornada)** ↔ **Curseduca (aulas)** via **dobro-api**.

---

## O problema que resolvemos

O board da jornada no Scudo tinha ordem e conteúdo diferentes da plataforma de aulas (Curseduca). O aluno via tarefas fora de ordem, links errados ou progresso que não batia.

## O que fizemos (em uma frase)

**Alinhamos a trilha completa do DevQuest 2.0** — do Ferro ao Lendário — com os cursos reais da Curseduca, reorganizamos o fluxo pedagógico e deixamos o sistema pronto para publicar o catálogo no banco sem quebrar o progresso de quem já avançou.

---

## Fluxo pedagógico novo (formação principal)

```
Ferro → Bronze → Prata → Ouro     HTML, CSS, JS, Git (+ CodeQuest até JS)
Platina                           React avançado + teoria de backend
Esmeralda                         Backend prático + carreira (empregabilidade)
Diamante+                         Extras (IA, workshops, projetos) — parcial
Mestre / Lendário                 Metas de empregabilidade real (Scudo)
```

**Regra importante:** depois de JavaScript, exercícios com "Exercício" ou "Desafio" no título viram **aula na Curseduca/Notion**, não CodeQuest.

**Carreira** (currículo, LinkedIn, Gupy, entrevistas) foi para o **final do Esmeralda**, depois do backend prático — não no meio do Platina.

**Monitorias** (65 lives longas de empregabilidade) ficaram **fora** da jornada — conteúdo opcional.

---

## Números

| Métrica | Valor |
|--------|------|
| Tasks na jornada | 443 |
| Aulas mapeadas à Curseduca | 375 |
| Sem mapeamento (checkpoints, projetos Scudo, metas elite) | 68 |
| Cursos da formação principal validados | 4 (primeiros passos, front, back, empregabilidade) |
| Aulas novas na Curseduca sem task | **0** |

---

## Mudanças técnicas (para o time dev)

1. **`mockJornada.ts`** — ordem e títulos das tasks por rank.
2. **`curseducaLessonTaskMap.ts`** — liga ID da aula Curseduca → `taskId` do Scudo.
3. **`JornadaCatalogTask`** (tabela nova) — catálogo publicado no Postgres; a UI lê daqui quando existir.
4. **`UserJornadaStageCompletion`** (tabela nova) — congela rank concluído; aluno não regride se entrar aula nova.
5. **`practiceLinks.ts`** — botão "Ir praticar" aponta pro curso Curseduca certo.
6. **Scripts** — bootstrap, reconcile, seed de QA local.

---

## O que NÃO entrou (backlog)

- Mapear todos os extras do Diamante+ (IA, N8N, projetos avulsos).
- Monitorias Tech Recruiter.
- Cron automático de reconcile (fase 2).

---

## Como explicar na daily (30 segundos)

> "Fechamos o mapeamento da formação DevQuest 2.0 no Scudo: front, back e carreira na ordem certa da Curseduca. Protegemos o progresso dos alunos com snapshot de rank. Validamos local, falta migrate + bootstrap + deploy em prod."

---

## Arquivos nesta pasta

| Arquivo | Conteúdo |
|---------|----------|
| [deploy-producao.md](./deploy-producao.md) | Passo a passo do deploy |
| [variaveis-ambiente.md](./variaveis-ambiente.md) | Envs novas e opcionais na Vercel |
| [atualizacao-automatica.md](./atualizacao-automatica.md) | Roadmap do sync automático Curseduca → board |
