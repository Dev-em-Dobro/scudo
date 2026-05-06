# Runbook de Migrations Prisma (Scudo v2)

## Objetivo

Padronizar como executar migrations no projeto com seguranca, evitando erro de permissao no runtime da app e evitando falhas de parse do shell.

## Contexto importante deste repo

- O runtime da app usa role restrita (ex.: app_runtime) e pode nao ter acesso ao historico `_prisma_migrations`.
- Para migracao em producao, use sempre usuario de migracao/admin (ex.: URL em `DATABASE_URL_ANTIGO`).
- Evite `source .env` no zsh quando a URL tiver `&` sem aspas, pois pode causar parse error.

## Tutorial rapido (producao)

Execute da raiz do projeto:

```bash
cd /Users/pabloviana/Desktop/carrer-quest-v2

# 1) Capturar URL de migracao/admin (sem source .env)
DATABASE_URL_MIGRATION="$(grep -m1 '^DATABASE_URL_ANTIGO=' .env | cut -d= -f2-)"
test -n "$DATABASE_URL_MIGRATION" || { echo "DATABASE_URL_ANTIGO nao encontrada"; exit 1; }

# 2) Ver status antes
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate status

# 3) Aplicar pendentes
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate deploy

# 4) Ver status depois
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate status
```

## Validacao pos-deploy (opcional e recomendada)

```bash
DATABASE_URL_MIGRATION="$(grep -m1 '^DATABASE_URL_ANTIGO=' .env | cut -d= -f2-)"

# Exemplo de validacao de colunas adicionadas na tabela Job
npx prisma db execute --url "$DATABASE_URL_MIGRATION" --stdin <<< "
SELECT \"isActive\", \"inactivatedAt\", \"inactivationReason\"
FROM \"Job\"
LIMIT 1;
"
```

## Diferenca entre migrate dev, migrate local e migrate deploy

| Comando | Onde usar | Cria migration nova | Aplica migration pendente | Shadow DB | Risco de reset/drift flow | Observacao |
|---|---|---|---|---|---|---|
| `npx prisma migrate dev` | Desenvolvimento | Sim | Sim | Sim | Medio | Bom para criar migration durante desenvolvimento. Nao usar em producao. |
| `npm run prisma:migrate:local` | Local | Nao | Sim | Nao | Baixo | Neste repo roda `DATABASE_URL=$LOCAL_DATABASE_URL prisma migrate deploy`. Simula comportamento de deploy em banco local. |
| `npx prisma migrate deploy` ou `npm run prisma:migrate:deploy` | Homologacao/producao | Nao | Sim | Nao | Baixo | Comando certo para pipeline e producao. Use role de migracao/admin. |

## Quando usar cada um

1. Durante desenvolvimento de schema: use `migrate dev` para gerar migration nova.
2. Para validar as migrations ja versionadas localmente: use `npm run prisma:migrate:local`.
3. Para aplicar em homologacao/producao: use `migrate deploy` com URL de migracao/admin.

## Erros comuns e correcao

### Erro: Either --url or --schema must be provided

Em `prisma db execute`, passe `--url` explicitamente:

```bash
npx prisma db execute --url "$DATABASE_URL_MIGRATION" --stdin <<< "select current_user;"
```

### Erro de parse ao rodar source .env (zsh)

Nao use `source .env` para URLs com caracteres especiais sem aspas. Prefira extrair a variavel com `grep`:

```bash
DATABASE_URL_MIGRATION="$(grep -m1 '^DATABASE_URL_ANTIGO=' .env | cut -d= -f2-)"
```

### Erro: permission denied for table _prisma_migrations

Voce esta usando role de runtime da app. Troque para URL de migracao/admin no comando.

## One-liner para proximas execucoes

```bash
DATABASE_URL_MIGRATION="$(grep -m1 '^DATABASE_URL_ANTIGO=' .env | cut -d= -f2-)" && \
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate status && \
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate deploy && \
DATABASE_URL="$DATABASE_URL_MIGRATION" npx prisma migrate status
```
