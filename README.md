# Scudo (MVP)

Hub de oportunidades para estudantes e iniciantes em tecnologia, com foco em vagas de entrada (estagio/junior), analise de aderencia por skills, ingestao automatica de vagas e jornada guiada de evolucao do aluno.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL
- Better Auth (email/senha + social)
- Zod + React Hook Form

## Funcionalidades implementadas

- Autenticação:
    - login/cadastro com email/senha
    - login social (Google/LinkedIn, quando configurado)
    - fluxo de acesso para aluno oficial via validacao em API externa (`/acesso`)
    - recuperacao e redefinicao de senha por e-mail
- Dashboard e perfil:
    - upload de curriculo em PDF/DOCX
    - extracao de dados para preencher perfil
    - status de aptidao e gap de skills
    - tooltip explicativo de "vagas avaliaveis" (diferenca entre total da pagina e total avaliavel)
    - troca de senha na area de perfil
- Job Board:
    - listagem de vagas com filtros
    - modelo de trabalho (remoto/hibrido/presencial)
    - paginacao e ordenacao
- Ingestão de vagas:
    - conectores Gupy, Remotive, RemoteOK, ProgramaThor, Trampos e Adzuna
    - deduplicacao por fingerprint
    - bootstrap protegido por segredo
    - endpoint de webhook para automacao externa (n8n/Make)
    - enriquecimento opcional com IA para stack e senioridade
- LGPD (MVP):
    - exportacao de dados de perfil
    - limpeza de dados pessoais do perfil
- Jornada do aluno:
    - board de ranks de `I` a `S`
    - progressao e tarefas persistidas por usuario
    - status salvo em banco por tarefa concluida
    - edicao restrita ao Rank I (controle de rollout)
    - acesso permitido apenas para aluno oficial
    - sincronizacao com Curseduca
    - sincronizacao de tarefas praticas via CodeQuest
- Onboarding:
    - onboarding inicial com progresso persistido
    - modo guiado opcional por feature flag
- Feedback de produto:
    - formulario autenticado para bugs, UX, conteudo e sugestoes
    - endpoint com validacao e rate limit por usuario
- Telas adicionais:
    - `/assessments`
    - `/analytics`
    - `/feedback`

## Status atual (mar/2026)

- Branding unificado com componente reutilizavel `BrandLogo` nas telas de autenticacao e layout.
- E-mail de redefinicao de senha atualizado com logo da marca inline (CID).
- Jornada com sincronizacao Curseduca e endpoint dedicado de sincronizacao manual.
- Novo canal interno de feedback em `/feedback` com persistencia em banco.
- Onboarding inicial/guiado controlado por feature flags.

## Estrutura de rotas principais

- `/` Dashboard
- `/jobs` Job Board
- `/jornada` Jornada do aluno
- `/perfil` Perfil
- `/assessments` Skill Assessments
- `/analytics` Analytics
- `/feedback` Feedback
- `/login` Login
- `/cadastro` Cadastro
- `/acesso` Entrada de aluno oficial
- `/recuperar-senha` Recuperacao de senha
- `/redefinir-senha` Redefinicao de senha

## Setup local

1. Instalar dependências:

```bash
npm install
```

2. Configurar `.env` com, no mínimo:

```env
DATABASE_URL="postgresql://..."
CODEQUEST_DATABASE_URL="postgresql://..."

BETTER_AUTH_SECRET="segredo-forte"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# Validacao de aluno oficial e sincronizacao Curseduca
# (suporta nomes legados USER_API_BASE_URL/AUTHORIZATION_TOKEN/API_KEY_HEADER)
CURSEDUCA_API_URL="https://sua-api-externa"
CURSEDUCA_CONTENTS_API_URL="https://sua-api-conteudos"
CURSEDUCA_API_TOKEN="token-da-api-externa"
CURSEDUCA_API_KEY="api-key-da-api-externa"

# SMTP (obrigatorio para envio de e-mails de acesso e reset)
# Pode usar SMTP_* ou RESEND_SMTP_*
SMTP_HOST="smtp.seu-provedor.com"
SMTP_PORT="465"
SMTP_USER="usuario"
SMTP_PASS="senha"
SMTP_FROM="Scudo <no-reply@seudominio.com>"
EMAIL_DELIVERY_DOMAIN="seudominio.com"

JOBS_BOOTSTRAP_SECRET="seu-segredo-bootstrap"
JOBS_WEBHOOK_SECRET="seu-segredo-webhook"
CRON_SECRET="seu-segredo-cron"

# Conectores opcionais
JOBS_CONNECTOR_GUPY="true"
JOBS_CONNECTOR_REMOTIVE="false"
JOBS_CONNECTOR_REMOTEOK="false"
JOBS_CONNECTOR_PROGRAMATHOR="false"
JOBS_CONNECTOR_TRAMPOS="false"
JOBS_CONNECTOR_ADZUNA="false"
JOBS_PROGRAMATHOR_BACKFILL="false"

# Adzuna (obrigatório se JOBS_CONNECTOR_ADZUNA=true)
ADZUNA_APP_ID="..."
ADZUNA_APP_KEY="..."
ADZUNA_COUNTRY="br"
ADZUNA_WHERE=""
ADZUNA_WHAT="software developer"
ADZUNA_WHAT_EXCLUDE=""

# Enriquecimento opcional com IA para vagas
JOBS_STACK_AI_ENRICHMENT="false"
JOBS_LEVEL_AI_ENRICHMENT="false"
JOBS_AI_PROVIDER="gemini"
JOBS_AI_MODEL="gemini-1.5-flash"
GEMINI_API_KEY="..."
# OPENAI_API_KEY="..."

# Feature flags
ENABLE_STUDENT_VERIFIED_AUTH_ONLY="false"
NEXT_PUBLIC_ENABLE_STUDENT_VERIFIED_AUTH_ONLY="false"
ENABLE_INITIAL_ONBOARDING="true"
ENABLE_GUIDED_ONBOARDING="false"

# Social login (opcional)
GOOGLE_CLIENT_ID="..."
GOOGLE_CLIENT_SECRET="..."
LINKEDIN_CLIENT_ID="..."
LINKEDIN_CLIENT_SECRET="..."
```

3. Preparar banco:

```bash
npm run prisma:generate
npm run prisma:migrate
```

4. Subir app:

```bash
npm run dev
```

## Comandos úteis

- Validar build de produção:

```bash
npm run build
```

- Rodar lint:

```bash
npm run lint
```

- Rodar bootstrap de vagas via API local:

```bash
curl -X POST http://localhost:3000/api/jobs/bootstrap \
	-H "x-bootstrap-secret: $JOBS_BOOTSTRAP_SECRET"
```

- Enviar vagas para webhook:

```bash
curl -X POST http://localhost:3000/api/jobs/webhook \
    -H "Content-Type: application/json" \
    -H "x-webhook-secret: $JOBS_WEBHOOK_SECRET" \
    -d '{"jobs":[{"title":"Dev Junior","companyName":"Empresa X","sourceUrl":"https://example.com/job/1"}]}'
```

- Exportar aulas da Curseduca para apoio operacional:

```bash
npm run curseduca:export-lessons
```

- Ver Prisma Studio:

```bash
npm run prisma:studio
```

## Troubleshooting

- Erro de lock no Next (`.next/dev/lock`):

```bash
pkill -f "next dev" || true
rm -f .next/dev/lock
npm run dev
```

- Se houver conflito de porta 3000:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

- Healthcheck local:

```bash
curl http://localhost:3000/api/health
```

## Documentação interna

- `docs/prd.md` — PRD do produto
- `docs/jobs-scraping-implementation.md` — pipeline de ingestão
- `docs/jobs-webhook-contract.md` — contrato do webhook
- `docs/lgpd-operations.md` — operações LGPD MVP
- `docs/local-email-testing.md` — testes de e-mail em ambiente local
