#!/bin/sh
set -eu
# Run from club-website. All containers/volumes created here are disposable.
run_id="bimclub-qa-$(date +%s)-$$"
qa_db="$run_id-db"
qa_app="$run_id-app"
qa_env=$(mktemp)
chmod 600 "$qa_env"
cleanup() {
  docker rm -fv "$qa_app" "$qa_db" >/dev/null 2>&1 || true
  docker network rm "$run_id" >/dev/null 2>&1 || true
  rm -f "$qa_env"
}
trap cleanup EXIT INT TERM
QA_DB_HOST="$qa_db" node - > "$qa_env" <<'JS'
const crypto=require('crypto'),password=crypto.randomBytes(32).toString('hex');
process.stdout.write(`MARIADB_ROOT_PASSWORD=${password}\nMARIADB_DATABASE=bimclub_hardening\nMARIADB_USER=qa_app\nMARIADB_PASSWORD=${password}\nDB_HOST=${process.env.QA_DB_HOST}\nDB_USER=qa_app\nDB_PASSWORD=${password}\nDB_NAME=bimclub_hardening\nAPP_URL=http://localhost:3000\nSESSION_SECRET=${crypto.randomBytes(32).toString('hex')}\n`);
JS
docker network create "$run_id" >/dev/null
docker run -d --name "$qa_db" --network "$run_id" --env-file "$qa_env" --mount "type=bind,src=$(pwd)/database/schema.sql,dst=/docker-entrypoint-initdb.d/init.sql,readonly" mariadb:10.11 >/dev/null
ready=0
for attempt in $(seq 1 40); do
  if docker exec "$qa_db" healthcheck.sh --connect --innodb_initialized >/dev/null 2>&1; then ready=1; break; fi
  sleep 2
done
[ "$ready" = 1 ] || { echo 'QA database did not initialize'; exit 1; }
docker run --rm --name "$qa_app" --network "$run_id" --env-file "$qa_env" "${QA_IMAGE:-bimclub:verify}" node scripts/qa/production-hardening.cjs
# Exercise the actual entrypoint and shutdown handler as a separate process.
docker run -d --name "$qa_app" --network "$run_id" --env-file "$qa_env" "${QA_IMAGE:-bimclub:verify}" node server.js >/dev/null
ready=0
for attempt in $(seq 1 20); do
  if docker exec "$qa_app" node -e 'Promise.all(["/livez", "/healthz"].map(async path => { const response = await fetch("http://localhost:3000" + path); if (!response.ok) throw Error("Not ready"); })).catch(() => process.exit(1))' >/dev/null 2>&1; then ready=1; break; fi
  sleep 1
done
[ "$ready" = 1 ] || { echo 'QA application did not become ready'; exit 1; }
docker stop --time 30 "$qa_app" >/dev/null
[ "$(docker inspect --format '{{.State.ExitCode}}' "$qa_app")" = 0 ] || { echo 'QA application did not shut down cleanly'; exit 1; }
echo 'PASS actual server liveness/readiness and SIGTERM shutdown'
