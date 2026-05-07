# Soft Inativação Semanal de Vagas

## Contexto

Foi implementada uma rotina de manutenção para inativar vagas antigas de forma **soft** (sem delete), com execução semanal via cron.

Objetivos:

- reduzir exibição de vagas indisponíveis;
- evitar impacto no usuário final;
- reduzir casos de links que abrem vagas já encerradas/finalizadas no destino;
- manter possibilidade de reativação automática quando a vaga reaparecer na ingestão.

## O que foi implementado

### 1. Banco de dados (Prisma + migration)

Modelo `Job` atualizado com novos campos:

- `isActive Boolean @default(true)`
- `inactivatedAt DateTime?`
- `inactivationReason String?`

Índice adicionado:

- `@@index([isActive, lastSeenAt])`

Migration criada:

- `prisma/migrations/20260504145000_add_job_soft_inactivation/migration.sql`

### 2. Filtro de leitura de vagas

A função de recência foi centralizada para sempre aplicar:

- `isActive = true`
- janela temporal (atualmente 1 mês por padrão, configurável)

Arquivo:

- `app/lib/jobs/jobBoard.ts`

Além disso, o filtro do board foi ajustado para usar composição por `AND`, evitando colisão de `OR` entre recência e filtros de stack.

### 3. Reativação automática na ingestão

Quando uma vaga reaparece em qualquer fluxo de ingestão, ela é reativada automaticamente:

- `isActive = true`
- `inactivatedAt = null`
- `inactivationReason = null`

Arquivos:

- `app/lib/jobs/bootstrap.ts`
- `app/api/jobs/webhook/route.ts`

### 4. Endpoint de manutenção (soft inativação + varredura ativa)

Rota criada:

- `POST/GET /api/jobs/maintenance/soft-inactivate`

Implementação:

- `app/api/jobs/maintenance/soft-inactivate/route.ts`
- `app/lib/jobs/softInactivation.ts`

Comportamento:

- seleciona vagas ativas com `lastSeenAt < now - staleDays`;
- processa em lote (`batchSize`);
- suporta `dryRun` sem escrita no banco;
- em execução normal, atualiza para inativa com motivo `stale_last_seen`.
- varre URLs de vagas ativas com fetch server-side controlado por `timeout` e `concorrência`;
- evita URLs inseguras (localhost/IPs privadas) para reduzir risco de SSRF;
- inativa por indisponibilidade quando encontra `404/410/451` com motivo `source_unavailable_http`;
- inativa por conteúdo quando identifica sinais de vaga encerrada (PT/EN) com motivo `source_unavailable_content`.

### 5. Segurança e acesso da rota de manutenção

A rota aceita autenticação por:

- header `x-jobs-maintenance-secret`
- ou `Authorization: Bearer <secret>`

Segredos aceitos:

- `JOBS_MAINTENANCE_SECRET`
- `JOBS_BOOTSTRAP_SECRET`
- `CRON_SECRET`

Também foi adicionado bypass no proxy para não exigir sessão de usuário nessa rota interna:

- `proxy.ts` com prefixo público `'/api/jobs/maintenance'`

### 6. Agendamento semanal no Vercel

`vercel.json` atualizado com novo cron:

- path: `/api/jobs/maintenance/soft-inactivate`
- schedule: `0 3 * * 0` (semanal, domingo às 03:00)

## Variáveis de ambiente

Novas variáveis recomendadas:

- `JOBS_MAINTENANCE_SECRET`
- `JOBS_SOFT_INACTIVATION_ENABLED` (default lógico: `true`)
- `JOBS_SOFT_INACTIVATION_DAYS` (default: `30`)
- `JOBS_SOFT_INACTIVATION_BATCH_SIZE` (default: `500`)
- `JOBS_SOFT_INACTIVATION_DRY_RUN` (default: `false`)
- `JOBS_UNAVAILABILITY_SWEEP_ENABLED` (default lógico: `false`)
- `JOBS_UNAVAILABILITY_SWEEP_BATCH_SIZE` (default: `120`)
- `JOBS_UNAVAILABILITY_SWEEP_TIMEOUT_MS` (default: `8000`)
- `JOBS_UNAVAILABILITY_SWEEP_CONCURRENCY` (default: `6`)
- `JOBS_UNAVAILABILITY_SWEEP_DRY_RUN` (default: `false`)

Rollout recomendado da varredura ativa:

1. habilitar com `JOBS_UNAVAILABILITY_SWEEP_ENABLED=true` e `JOBS_UNAVAILABILITY_SWEEP_DRY_RUN=true` por 1 ciclo;
2. revisar o payload de `sampledUnavailable`;
3. desativar dry-run para aplicar inativação automática.

## Como executar manualmente

Dry-run:

```bash
curl -X POST "http://localhost:3000/api/jobs/maintenance/soft-inactivate?dryRun=true" \
  -H "Authorization: Bearer $JOBS_MAINTENANCE_SECRET"
```

Execução efetiva:

```bash
curl -X POST "http://localhost:3000/api/jobs/maintenance/soft-inactivate" \
  -H "Authorization: Bearer $JOBS_MAINTENANCE_SECRET"
```

Ajuste de parâmetros na chamada:

- `softInactivation` (`true|false`)
- `unavailabilitySweep` (`true|false`)
- `staleDays` (ex.: `30`)
- `batchSize` (ex.: `500`)
- `sweepBatchSize` (ex.: `120`)
- `sweepTimeoutMs` (ex.: `8000`)
- `sweepConcurrency` (ex.: `6`)
- `dryRun` (`true|false`)

Exemplo (ambos ativos):

```bash
curl -X POST "http://localhost:3000/api/jobs/maintenance/soft-inactivate?softInactivation=true&unavailabilitySweep=true&staleDays=30&batchSize=300&sweepBatchSize=120&sweepTimeoutMs=8000&sweepConcurrency=6&dryRun=false" \
  -H "Authorization: Bearer $JOBS_MAINTENANCE_SECRET"
```

Exemplo (somente varredura ativa):

```bash
curl -X POST "http://localhost:3000/api/jobs/maintenance/soft-inactivate?softInactivation=false&unavailabilitySweep=true&dryRun=true" \
  -H "Authorization: Bearer $JOBS_MAINTENANCE_SECRET"
```

## Rollback rápido

Sem rollback de schema:

1. Definir `JOBS_SOFT_INACTIVATION_ENABLED=false`.
2. Definir `JOBS_UNAVAILABILITY_SWEEP_ENABLED=false`.
3. Remover cron em `vercel.json` se necessário.
4. Reprocessar ingestão para reativar vagas reencontradas automaticamente.

Com rollback de comportamento de leitura:

- remover o filtro `isActive=true` na camada de query (não recomendado sem plano de qualidade de dados).
