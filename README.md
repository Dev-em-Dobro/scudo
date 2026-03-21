# Scudo (MVP)

Hub de oportunidades para estudantes e iniciantes em tecnologia, com foco em vagas de entrada (estágio/júnior), análise de aderência por skills, ingestão automática de vagas e jornada guiada de evolução do aluno.

## Stack

- Next.js 16 (App Router)
- React 19 + TypeScript
- Tailwind CSS 4
- Prisma + PostgreSQL
- Better Auth (email/senha + social)

## Funcionalidades implementadas

- Autenticação:
    - login/cadastro com email/senha
    - login social (Google/LinkedIn, quando configurado)
    - fluxo de acesso para aluno oficial via validação em API externa (`/acesso`)
- Dashboard e perfil:
    - upload de currículo em PDF
    - extração de dados para preencher perfil
    - status de aptidão e gap de skills
    - tooltip explicativo de "vagas avaliáveis" (diferença entre total da página e total avaliável)
- Job Board:
    - listagem de vagas com filtros
    - modelo de trabalho (remoto/híbrido/presencial)
    - paginação e ordenação
- Ingestão de vagas:
    - conectores Gupy, Remotive, RemoteOK, ProgramaThor, Trampos e Adzuna
    - deduplicação por fingerprint
    - bootstrap protegido por segredo
    - endpoint de webhook para automação externa (n8n/Make)
- LGPD (MVP):
    - exportação de dados de perfil
    - limpeza de dados pessoais do perfil
- Jornada do aluno (novo):
    - board de ranks de `I` a `S`
    - progressão e tarefas persistidas por usuário
    - status salvo em banco por tarefa concluída
    - edição restrita ao Rank I (controle de rollout)
    - acesso permitido apenas para aluno oficial
    - usabilidade do board melhorada com snap scroll, drag, setas e scroll lateral
- Telas MVP adicionais:
    - `/assessments`
    - `/analytics`

## Novidades desde a última atualização do README

- Persistência da jornada no banco:
    - novo modelo `UserJornadaTaskProgress`
    - API dedicada: `GET/PATCH /api/jornada`
- Aluno oficial como fonte de verdade no banco:
    - novo campo `User.officialStudentVerifiedAt`
    - preenchido no fluxo de criação via `/api/auth/student-access`
- Controle de acesso da jornada:
    - rota `/jornada` protegida para aluno oficial
    - item de menu "Jornada do aluno" oculto no sidebar para não oficiais
- Build fix:
    - `mockUserProfile` atualizado com `isOfficialStudent`

## Estrutura de rotas principais

- `/` Dashboard
- `/jobs` Job Board
- `/jornada` Jornada do aluno
- `/perfil` Perfil
- `/assessments` Skill Assessments
- `/analytics` Analytics
- `/login` Login
- `/cadastro` Cadastro
- `/acesso` Entrada de aluno oficial

## Setup local

1. Instalar dependências:

```bash
npm install
```

2. Configurar `.env` com, no mínimo:

```env
DATABASE_URL="postgresql://..."

BETTER_AUTH_SECRET="segredo-forte"
BETTER_AUTH_URL="http://localhost:3000"
NEXT_PUBLIC_BETTER_AUTH_URL="http://localhost:3000"

# Validação de aluno oficial (obrigatório para /acesso)
USER_API_BASE_URL="https://sua-api-externa"
AUTHORIZATION_TOKEN="token-da-api-externa"
API_KEY_HEADER="api-key-da-api-externa"

# SMTP (obrigatório para envio da senha no fluxo /acesso)
# Pode usar SMTP_* ou RESEND_SMTP_*
SMTP_HOST="smtp.seu-provedor.com"
SMTP_PORT="465"
SMTP_USER="usuario"
SMTP_PASS="senha"
SMTP_FROM="Scudo <no-reply@seudominio.com>"

JOBS_BOOTSTRAP_SECRET="seu-segredo-bootstrap"
CRON_SECRET="seu-segredo-cron"

# Conectores opcionais
JOBS_CONNECTOR_REMOTIVE="false"
JOBS_CONNECTOR_REMOTEOK="false"
JOBS_CONNECTOR_PROGRAMATHOR="false"
JOBS_CONNECTOR_TRAMPOS="false"
JOBS_CONNECTOR_ADZUNA="false"

# Adzuna (obrigatório se JOBS_CONNECTOR_ADZUNA=true)
ADZUNA_APP_ID="..."
ADZUNA_APP_KEY="..."
ADZUNA_COUNTRY="br"
ADZUNA_WHERE=""
ADZUNA_WHAT="software developer"
ADZUNA_WHAT_EXCLUDE=""

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

- Rodar bootstrap de vagas via API local:

```bash
curl -X POST http://localhost:3000/api/jobs/bootstrap \
	-H "x-bootstrap-secret: $JOBS_BOOTSTRAP_SECRET"
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

## Documentação interna

- `docs/prd.md` — PRD do produto
- `docs/jobs-scraping-implementation.md` — pipeline de ingestão
- `docs/jobs-webhook-contract.md` — contrato do webhook
- `docs/lgpd-operations.md` — operações LGPD MVP
- `docs/local-email-testing.md` — testes de e-mail em ambiente local
