#!/usr/bin/env bash
set -Eeuo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$REPO_ROOT"

# 這支腳本只允許本機 Supabase runtime；任何 cloud 連線變數都直接中止。
if [[ -n "${SUPABASE_PROJECT_REF:-}" || -n "${SUPABASE_DB_URL:-}" || -n "${SUPABASE_ACCESS_TOKEN:-}" || -n "${SUPABASE_AUTH_TOKEN:-}" ]]; then
  echo "拒絕執行：偵測到 Supabase cloud 連線環境變數；本腳本只允許 local runtime。" >&2
  exit 2
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "無法執行：找不到 Docker。請先安裝免費本機 Docker Engine／Docker Desktop。" >&2
  exit 3
fi

if ! docker info >/dev/null 2>&1; then
  echo "無法執行：Docker daemon 尚未可用。請先啟動 Docker，再重試。" >&2
  exit 4
fi

if [[ ! -f "$REPO_ROOT/supabase/config.toml" ]]; then
  echo "無法執行：缺少 supabase/config.toml；請先執行 npx --yes supabase init。" >&2
  exit 5
fi

LOG_DIR="${TMPDIR:-/tmp}/kinkflow-local-pgtap-$(date +%Y%m%d-%H%M%S)"
mkdir -p "$LOG_DIR"
RUNNING=0

cleanup() {
  status=$?
  if [[ "$RUNNING" -eq 1 ]]; then
    npx --yes supabase stop >"$LOG_DIR/stop.log" 2>&1 || true
  fi
  echo "本機 pgTAP logs: $LOG_DIR"
  exit "$status"
}
trap cleanup EXIT

run() {
  local name="$1"
  shift
  echo "[RUN] $*"
  "$@" 2>&1 | tee "$LOG_DIR/${name}.log"
}

run start npx --yes supabase start
RUNNING=1
run status npx --yes supabase status
run reset npx --yes supabase db reset --local --no-seed --yes
run lint npx --yes supabase db lint --local --fail-on error
run pgtap npx --yes supabase test db --local \
  supabase/tests/community_roles_profile_moderation.test.sql \
  supabase/tests/p1_rls_performance.test.sql \
  supabase/tests/article_videos_private.test.sql

echo "PASS：local migration、db lint 與 community／P1／private-video pgTAP 測試完成（54 assertions）。"
