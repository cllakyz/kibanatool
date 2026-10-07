#!/usr/bin/env bash
# Usage: ./docker/obs-view.sh 9 — switches the default space to the Observability solution view (9.x),
# where ECS logs open the flyout on the "Log overview" tab.
set -euo pipefail
cd "$(dirname "$0")"
set -a; source ".env.$1"; set +a
curl -fsS -u "elastic:$ELASTIC_PASSWORD" -X PUT "http://localhost:$KIBANA_PORT/api/spaces/space/default" \
  -H 'kbn-xsrf: kibanatool' -H 'Content-Type: application/json' \
  -d '{"id":"default","name":"Default","solution":"oblt","disabledFeatures":[]}' >/dev/null
echo "default space now uses the Observability view"
