#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
REPOSITORY_ROOT="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
MASTER_APP_DIR="$REPOSITORY_ROOT/master-app"
ARTIFACT_ROOT="$MASTER_APP_DIR/.artifacts/telegram-stage"

SSH_TARGET="${TELEGRAM_STAGE_SSH_TARGET:-root@tg.stage.soldatov.dev}"
REMOTE_ROOT="${TELEGRAM_STAGE_REMOTE_ROOT:-/var/www/tg.stage.soldatov.dev}"
STAGE_URL="${TELEGRAM_STAGE_URL:-https://tg.stage.soldatov.dev}"
REQUESTED_RELEASE=""

usage() {
  printf 'Usage: %s [--release <sha256>]\n' "$0"
}

fail() {
  printf 'Telegram stage deploy failed: %s\n' "$1" >&2
  exit 1
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --release)
      [[ $# -ge 2 ]] || fail '--release requires a value'
      REQUESTED_RELEASE="$2"
      shift 2
      ;;
    --help|-h)
      usage
      exit 0
      ;;
    *)
      usage >&2
      fail "unknown argument: $1"
      ;;
  esac
done

[[ "$SSH_TARGET" =~ ^[A-Za-z0-9._-]+@[A-Za-z0-9.-]+$ ]] || fail 'unsafe SSH target'
[[ "$REMOTE_ROOT" == '/var/www/tg.stage.soldatov.dev' ]] || fail 'unexpected remote root'
[[ "$STAGE_URL" == 'https://tg.stage.soldatov.dev' ]] || fail 'unexpected stage URL'

for command in node npm rsync ssh; do
  command -v "$command" >/dev/null 2>&1 || fail "required command is unavailable: $command"
done

ssh "$SSH_TARGET" "test -d '$REMOTE_ROOT' && test \"\$(realpath '$REMOTE_ROOT')\" = '$REMOTE_ROOT' && caddy validate --config /etc/caddy/Caddyfile >/dev/null"
node "$MASTER_APP_DIR/scripts/telegram-stage-smoke.mjs" --url "$STAGE_URL" --routing-only

if [[ -z "$REQUESTED_RELEASE" ]]; then
  npm run build:telegram-stage --prefix "$MASTER_APP_DIR"
  MANIFEST="$ARTIFACT_ROOT/current.json"
  [[ -f "$MANIFEST" ]] || fail 'build did not produce current.json'
  REQUESTED_RELEASE="$(node -e 'const value = JSON.parse(require("node:fs").readFileSync(process.argv[1], "utf8")); process.stdout.write(value.releaseId)' "$MANIFEST")"
fi

[[ "$REQUESTED_RELEASE" =~ ^[a-f0-9]{64}$ ]] || fail 'release must be a full sha256 artifact ID'
ARTIFACT_DIR="$ARTIFACT_ROOT/releases/$REQUESTED_RELEASE"
[[ -f "$ARTIFACT_DIR/index.html" ]] || fail "artifact does not exist: $REQUESTED_RELEASE"

ACTUAL_RELEASE="$(node "$MASTER_APP_DIR/scripts/telegram-artifact.mjs" --hash "$ARTIFACT_DIR")"
[[ "$ACTUAL_RELEASE" == "$REQUESTED_RELEASE" ]] || fail 'artifact hash does not match release ID'

rsync -az --delete "$ARTIFACT_DIR/" "$SSH_TARGET:$REMOTE_ROOT/"
ssh "$SSH_TARGET" "chown -R caddy:caddy '$REMOTE_ROOT'"
node "$MASTER_APP_DIR/scripts/telegram-stage-smoke.mjs" --url "$STAGE_URL" --release "$REQUESTED_RELEASE"

printf 'Telegram stage deployed: %s?v=%s\n' "$STAGE_URL/" "${REQUESTED_RELEASE:0:16}"
