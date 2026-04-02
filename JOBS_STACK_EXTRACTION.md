# Dossie Atualizado: Pipeline de Vagas (Deterministico + IA)

Este documento consolida tudo que foi mexido na parte de vagas: ingestao, normalizacao, curadoria com IA, persistencia, exibicao no board e scripts de avaliacao/backfill.

## Visao geral do fluxo

```
Conectores (Gupy/Programathor/Trampos/RemoteOK/Remotive/Adzuna)
        │
        ▼
RawSourceJob (title, level, stack, description, sourceUrl, ...)
        │
        ▼
curateJobData()
  ├─ stack base: stack da fonte + inferStackFromText(title/description)
  ├─ stack IA: enrichStackWithAi() (opcional por flag)
  ├─ nivel deterministico: normalizeLevel()
  ├─ nivel por regras (anos/keywords)
  └─ nivel IA: inferLevelWithAi() (fallback opcional por flag)
        │
        ▼
persistRawJob()/webhook
  ├─ fingerprint (dedupe)
  ├─ upsert por source+externalId (quando existir)
  └─ fallback por fingerprint
        │
        ▼
jobBoard.ts + UI (fit de skills, filtros, ordenacao, paginacao)
```

---

## O que mudou por area

### 1) Curadoria centralizada (`app/lib/jobs/curation.ts`)

Nova funcao `curateJobData()` virou ponto unico para padronizar:

- `normalizedStack`:
  - junta stack bruta da fonte;
  - adiciona inferencia deterministica de titulo/descricao (`inferStackFromText`);
  - pode enriquecer com IA (`enrichStackWithAi`) quando habilitado.
- `normalizedLevel`:
  - comeca no `normalizeLevel(input.level)`;
  - aplica heuristicas por regras (`inferLevelByYearsRule` e `inferLevelByRoleKeywords`);
  - se continuar `OUTRO`, usa IA como segunda opiniao (`inferLevelWithAi`), se habilitado.

Resultado: toda entrada (bootstrap e webhook) usa o mesmo criterio de stack e nivel.

### 2) IA para stack (`app/lib/jobs/stackAi.ts`)

Melhorias implementadas:

- Suporte a provider selecionavel via `JOBS_AI_PROVIDER`:
  - `gemini` (default) via API Google;
  - `openai` via Chat Completions.
- Modelo configuravel por `JOBS_AI_MODEL` (ou fallback legados).
- Prompt restrito para retornar apenas JSON array de strings em minusculas.
- Timeout de 10s e fallback seguro para `baseStack` em qualquer erro.
- `parseJsonArrayFromText()` tolera respostas com texto extra e extrai o array.
- Resultado final sempre normalizado e limitado a 20 itens.

### 3) IA para nivel (`app/lib/jobs/levelAi.ts`)

Novo modulo para classificar nivel da vaga:

- Ativado por `JOBS_LEVEL_AI_ENRICHMENT=true`;
- Provider e modelo seguem a mesma estrategia de stack AI;
- Resposta esperada: `estagio | junior | pleno | senior | outro`;
- Mapeia para enum `JobLevel` do Prisma;
- So entra quando o fluxo deterministico ainda nao conseguiu definir nivel com confianca.

### 4) Extracao de descricao relevante (`app/lib/jobs/sourceDescription.ts`)

Novo modulo para limpar e priorizar texto da vaga:

- Tenta JSON-LD (`JobPosting.description`) quando presente;
- Fallback para HTML limpo (remove scripts/styles/tags);
- Decodifica entidades HTML e normaliza espacos;
- Recorta secao de skills/requisitos via `extractSkillsSectionFromText()`;
- Mantem tamanho maximo controlado (default 8k chars);
- Inclui helper para fetch direto da pagina da vaga (`fetchAndExtractJobDescription`).

### 5) Extracao de secao de skills (`app/lib/jobs/extractSkillsSection.ts`)

Novo parser de trecho relevante:

- Detecta inicio por keywords PT/EN (ex.: `habilidades`, `requisitos`, `skills`, `requirements`);
- Encerra antes de secoes de beneficios/perks;
- Se nao achar marcador claro, retorna inicio truncado do texto completo;
- Reduz ruido antes da inferencia deterministica e da IA.

### 6) Integracao no bootstrap e webhook

Arquivos:
- `app/lib/jobs/bootstrap.ts`
- `app/api/jobs/webhook/route.ts`

Mudancas:

- Ambos passaram a usar `curateJobData()` (stack + nivel).
- Dedupe e upsert preservados:
  - prioridade para `source + externalId` quando disponivel;
  - fallback para `fingerprint`.
- `bootstrap` manteve conectores em paralelo e backfill opcional de Programathor.

### 7) Conectores atualizados (coleta + descricao)

Principais ajustes:

- `programathor.ts`:
  - scraping de listagem + detalhe por vaga;
  - usa `extractRelevantDescriptionFromHtml`;
  - tenta secao de skills;
  - aciona IA quando stack deterministica vem pobre (<3).
- `gupy.ts` e `trampos.ts`:
  - passaram a buscar descricao detalhada da URL da vaga.
- `remotive.ts`, `remoteok.ts`, `adzuna.ts`:
  - passaram a normalizar descricao recebida pela API.

### 8) Board e UX das vagas

Arquivos:
- `app/lib/jobs/jobBoard.ts`
- `app/components/dashboard/CuratedJobCard.tsx`
- `app/components/dashboard/JobBoardResults.tsx`
- `app/jobs/page.tsx`

Mudancas observadas:

- Board limita recência das vagas (janela de ~2 meses).
- Filtro por fontes e stacks alvo mantido.
- Quando stack vem vazio, UI tenta inferir skills pelo titulo para calcular compatibilidade.
- Compatibilidade mostra estado estimado quando inferido por titulo.
- Ordenacao/filtros/paginacao do resultado refinados.
- Regra de bloqueio por rank para niveis mais altos no CTA de candidatura.

---

## Inferencia deterministica (base do pipeline)

Em `app/lib/jobs/normalizers.ts`:

- `inferStackFromText()` cobre um catalogo extenso de regex canonicos:
  - linguagens, frameworks, cloud, banco, devops, testes, IA/automacao, etc.
- `normalizeStack()` aplica trim + lowercase + dedupe.
- `normalizeLevel()` mapeia texto para enum de nivel.
- `normalizeLocation()` detecta remoto por padroes textuais.

---

## Variaveis de ambiente relevantes

### IA e curadoria

| Variavel | Padrao | Efeito |
|---|---|---|
| `JOBS_STACK_AI_ENRICHMENT` | `false` | Habilita enriquecimento de stack por IA |
| `JOBS_LEVEL_AI_ENRICHMENT` | `false` | Habilita classificacao de nivel por IA (fallback) |
| `JOBS_AI_PROVIDER` | `gemini` | Provider de IA (`gemini` ou `openai`) |
| `JOBS_AI_MODEL` | provider default | Modelo usado pelo provider selecionado |
| `JOBS_STACK_AI_MODEL` | `gemini-1.5-flash` | Fallback de compatibilidade para stack |
| `GEMINI_API_KEY` / `GOOGLE_GENERATIVE_AI_API_KEY` | — | Credenciais Gemini |
| `OPENAI_API_KEY` | — | Credencial OpenAI |

### Conectores e ingestao

| Variavel | Padrao | Efeito |
|---|---|---|
| `JOBS_CONNECTOR_GUPY` | `true` | Habilita coleta da Gupy |
| `JOBS_CONNECTOR_REMOTIVE` | `false` | Habilita Remotive |
| `JOBS_CONNECTOR_REMOTEOK` | `false` | Habilita RemoteOK |
| `JOBS_CONNECTOR_PROGRAMATHOR` | `false` | Habilita Programathor |
| `JOBS_CONNECTOR_TRAMPOS` | `false` | Habilita Trampos |
| `JOBS_CONNECTOR_ADZUNA` | `false` | Habilita Adzuna |
| `JOBS_PROGRAMATHOR_BACKFILL` | `false` | Reprocessa stacks antigas de Programathor |

### Adzuna

| Variavel | Padrao | Efeito |
|---|---|---|
| `ADZUNA_APP_ID` | — | Credencial Adzuna |
| `ADZUNA_APP_KEY` | — | Credencial Adzuna |
| `ADZUNA_COUNTRY` | `br` | Pais da busca |
| `ADZUNA_WHAT` | `software developer` | Termo principal |
| `ADZUNA_WHERE` | — | Filtro de localidade |
| `ADZUNA_WHAT_EXCLUDE` | — | Exclusoes da busca |

---

## Scripts utilitarios criados para validar/backfill

Diretorio `scripts/` recebeu utilitarios para:

- avaliar curation em amostras (`evaluate-*`, `pilot-*`);
- aplicar curation em lotes (`apply-*`);
- revisar e reprocessar vagas especificas (`recheck-one-job`, `apply-evaluation-to-job`);
- comparar antes/depois de enriquecimento/backfill (`backfill-*`).

Tambem houve geracao de artefatos de apoio em `artifacts/` para analise dos resultados.

---

## Arquivos chave (resumo)

| Arquivo | Responsabilidade |
|---|---|
| `app/lib/jobs/curation.ts` | Orquestra stack + nivel (deterministico e IA) |
| `app/lib/jobs/stackAi.ts` | Enriquecimento de stack com Gemini/OpenAI |
| `app/lib/jobs/levelAi.ts` | Inferencia de nivel com IA |
| `app/lib/jobs/sourceDescription.ts` | Extracao/normalizacao de descricao relevante |
| `app/lib/jobs/extractSkillsSection.ts` | Foco na secao de requisitos/skills |
| `app/lib/jobs/normalizers.ts` | Normalizacao e regex deterministicas |
| `app/lib/jobs/bootstrap.ts` | Ingestao, dedupe, persistencia e backfill |
| `app/api/jobs/webhook/route.ts` | Entrada externa de vagas com mesmo pipeline de curadoria |
| `app/lib/jobs/sources/*.ts` | Conectores de fontes e enriquecimento de descricao |
| `app/lib/jobs/jobBoard.ts` | Query/filtro de exibicao no board |
| `app/components/dashboard/*` | Compatibilidade, ordenacao, filtros e UX de vagas |
