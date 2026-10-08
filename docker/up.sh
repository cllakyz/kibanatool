#!/usr/bin/env bash
# Usage: ./docker/up.sh 7|8|9 — starts the stack for that major, then seeds synthetic logs, data views, spaces
# and users (docker/seed.mjs). Safe to re-run. Secrets live in docker/.env.<major> (mode 600, gitignored) and
# are never printed; versions, ports and the base path always come from the table below.
set -euo pipefail
cd "$(dirname "$0")"
ENV_FILE=".env.${1:-}"
ELASTIC_PASSWORD="" KIBANA_SYSTEM_PASSWORD="" ANON_PASSWORD="" READER_PASSWORD="" ENC_KEY=""
if [ -f "$ENV_FILE" ]; then set -a; source "$ENV_FILE"; set +a; fi
case "${1:-}" in
  7) STACK_VERSION=7.17.29; ES_PORT=17200; KIBANA_PORT=17601; BASE_PATH=/kibana ;;
  8) STACK_VERSION=8.19.23; ES_PORT=18200; KIBANA_PORT=18601; BASE_PATH= ;;
  9) STACK_VERSION=9.5.5; ES_PORT=19200; KIBANA_PORT=19601; BASE_PATH= ;;
  *) echo "usage: $0 7|8|9" >&2; exit 1 ;;
esac
(umask 077; cat > "$ENV_FILE" <<EOF
STACK_NAME=kibanatool-dev-$1
STACK_VERSION=$STACK_VERSION
ES_PORT=$ES_PORT
KIBANA_PORT=$KIBANA_PORT
BASE_PATH=$BASE_PATH
ELASTIC_PASSWORD=${ELASTIC_PASSWORD:-$(openssl rand -hex 16)}
KIBANA_SYSTEM_PASSWORD=${KIBANA_SYSTEM_PASSWORD:-$(openssl rand -hex 16)}
ANON_PASSWORD=${ANON_PASSWORD:-$(openssl rand -hex 16)}
READER_PASSWORD=${READER_PASSWORD:-$(openssl rand -hex 16)}
ENC_KEY=${ENC_KEY:-$(openssl rand -hex 32)}
EOF
)
set -a; source "$ENV_FILE"; set +a

docker compose --env-file "$ENV_FILE" -f compose.yml up -d --wait es
es() { curl -fsS -u "elastic:$ELASTIC_PASSWORD" -H 'Content-Type: application/json' "$@" >/dev/null; }
es -X POST "http://localhost:$ES_PORT/_security/user/kibana_system/_password" -d "{\"password\":\"$KIBANA_SYSTEM_PASSWORD\"}"
es -X POST "http://localhost:$ES_PORT/_security/user/kt_anon" -d "{\"password\":\"$ANON_PASSWORD\",\"roles\":[\"superuser\"]}"
docker compose --env-file "$ENV_FILE" -f compose.yml up -d kibana

KB_URL="http://localhost:$KIBANA_PORT$BASE_PATH"
level=""
for _ in $(seq 1 120); do
  level=$(curl -s "$KB_URL/api/status" | jq -r '.status.overall.level // .status.overall.state // empty' 2>/dev/null || true)
  if [ "$level" = "available" ] || [ "$level" = "green" ]; then break; fi
  sleep 5
done
if [ "$level" != "available" ] && [ "$level" != "green" ]; then
  echo "kibana $STACK_VERSION did not become ready at $KB_URL (status: ${level:-none})" >&2
  exit 1
fi
echo "kibana $STACK_VERSION ready -> $KB_URL"

ES_AUTH="elastic:$ELASTIC_PASSWORD" READER_PASSWORD="$READER_PASSWORD" node seed.mjs "http://localhost:$ES_PORT" "$KB_URL"
