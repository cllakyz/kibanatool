#!/usr/bin/env bash
# Usage: ./docker/down.sh 8|9 — stops the dev stack and deletes its data.
set -euo pipefail
cd "$(dirname "$0")"
docker compose --env-file ".env.$1" -f compose.yml down -v
