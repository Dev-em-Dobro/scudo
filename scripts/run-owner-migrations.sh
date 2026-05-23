#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ROOT_DIR}/.env"
ENV_KEY="${1:-DATABASE_URL_ANTIGO}"
MAX_RETRIES="${MIGRATION_MAX_RETRIES:-4}"
RETRY_DELAY_SECONDS="${MIGRATION_RETRY_DELAY_SECONDS:-15}"

if [[ ! -f "${ENV_FILE}" ]]; then
  echo "Erro: arquivo .env não encontrado em ${ROOT_DIR}" >&2
  exit 1
fi

DATABASE_URL_MIGRATION="$(grep -m1 "^${ENV_KEY}=" "${ENV_FILE}" | cut -d= -f2-)"

if [[ -z "${DATABASE_URL_MIGRATION}" ]]; then
  echo "Erro: variável ${ENV_KEY} não encontrada no .env" >&2
  echo "Dica: rode com outra chave, por exemplo: $0 DATABASE_URL_OWNER" >&2
  exit 1
fi

DATABASE_HOST="$(node -e "const raw = process.argv[1]; const normalized = raw.replace(/^['\"]|['\"]$/g, ''); console.log(new URL(normalized).hostname);" "${DATABASE_URL_MIGRATION}")"

if [[ "${DATABASE_HOST}" == *"pooler"* ]]; then
  echo "Erro: a URL de migração (${ENV_KEY}) aponta para um host com pooler: ${DATABASE_HOST}" >&2
  echo "Prisma Migrate precisa de uma URL owner direta, sem pooler, para conseguir advisory lock." >&2
  echo "Ajuste ${ENV_KEY} no .env para a connection string direta do Neon owner/admin e tente novamente." >&2
  exit 1
fi

echo "Usando chave de migração: ${ENV_KEY}"
echo "Projeto: ${ROOT_DIR}"
echo "Host da migração: ${DATABASE_HOST}"

run_migrate_deploy() {
  local attempt=1

  while (( attempt <= MAX_RETRIES )); do
    echo "[2/3] Aplicando migrations pendentes (tentativa ${attempt}/${MAX_RETRIES})"

    set +e
    local output
    output="$(DATABASE_URL="${DATABASE_URL_MIGRATION}" npx prisma migrate deploy 2>&1)"
    local exit_code=$?
    set -e

    echo "${output}"

    if [[ ${exit_code} -eq 0 ]]; then
      return 0
    fi

    if [[ "${output}" != *"Error: P1002"* && "${output}" != *"pg_advisory_lock"* ]]; then
      echo "Falha ao aplicar migration por um erro diferente de advisory lock. Abortando." >&2
      return ${exit_code}
    fi

    if (( attempt == MAX_RETRIES )); then
      echo "Falha ao adquirir advisory lock após ${MAX_RETRIES} tentativas." >&2
      echo "Verifique se outra execução de Prisma Migrate está rodando ou ficou presa no banco." >&2
      return ${exit_code}
    fi

    echo "Aviso: advisory lock ocupado. Nova tentativa em ${RETRY_DELAY_SECONDS}s..." >&2
    sleep "${RETRY_DELAY_SECONDS}"
    attempt=$((attempt + 1))
  done
}

pushd "${ROOT_DIR}" >/dev/null

echo "[1/3] Verificando status antes"
set +e
DATABASE_URL="${DATABASE_URL_MIGRATION}" npx prisma migrate status
STATUS_BEFORE_EXIT_CODE=$?
set -e

if [[ ${STATUS_BEFORE_EXIT_CODE} -ne 0 ]]; then
  echo "Aviso: status inicial retornou código ${STATUS_BEFORE_EXIT_CODE}."
  echo "Se houver migrations pendentes, isso é esperado; seguindo para o deploy."
fi

run_migrate_deploy

echo "[3/3] Verificando status depois"
DATABASE_URL="${DATABASE_URL_MIGRATION}" npx prisma migrate status

popd >/dev/null

echo "Concluído."