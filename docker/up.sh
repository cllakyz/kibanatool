#!/usr/bin/env bash
# Usage: ./docker/up.sh 8|9 — starts the dev stack for that major and seeds synthetic logs and data views.
# Secrets are generated into docker/.env.<major> (mode 600, gitignored) and never printed.
set -euo pipefail
cd "$(dirname "$0")"
case "${1:-}" in
  8) VERSION=8.19.23; ES_PORT=18200; KB_PORT=18601 ;;
  9) VERSION=9.5.5; ES_PORT=19200; KB_PORT=19601 ;;
  *) echo "usage: $0 8|9" >&2; exit 1 ;;
esac
ENV_FILE=".env.$1"
if [ ! -f "$ENV_FILE" ]; then
  (umask 077; cat > "$ENV_FILE" <<EOF
STACK_NAME=kibanatool-dev-$1
STACK_VERSION=$VERSION
ES_PORT=$ES_PORT
KIBANA_PORT=$KB_PORT
ELASTIC_PASSWORD=$(openssl rand -hex 16)
KIBANA_SYSTEM_PASSWORD=$(openssl rand -hex 16)
ENC_KEY=$(openssl rand -hex 32)
EOF
  )
fi
set -a; source "$ENV_FILE"; set +a

docker compose --env-file "$ENV_FILE" -f compose.yml up -d --wait es
curl -fs -u "elastic:$ELASTIC_PASSWORD" -X POST "http://localhost:$ES_PORT/_security/user/kibana_system/_password" \
  -H 'Content-Type: application/json' -d "{\"password\":\"$KIBANA_SYSTEM_PASSWORD\"}" >/dev/null
docker compose --env-file "$ENV_FILE" -f compose.yml up -d kibana

level=""
for _ in $(seq 1 120); do
  level=$(curl -s "http://localhost:$KB_PORT/api/status" | jq -r '.status.overall.level // .status.overall.state // empty' 2>/dev/null || true)
  if [ "$level" = "available" ] || [ "$level" = "green" ]; then break; fi
  sleep 5
done
echo "kibana $VERSION status: ${level:-unknown} -> http://localhost:$KB_PORT"

ES_AUTH="elastic:$ELASTIC_PASSWORD" node seed.mjs "http://localhost:$ES_PORT" "http://localhost:$KB_PORT"
