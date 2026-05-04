#!/usr/bin/env bash
# Tears down everything that run.sh started.
set -euo pipefail

PROFILE="dex"
NAMESPACE="headlamp"
DEX_PID_FILE="/tmp/headlamp-dex.pid"
PF_PID_FILE="/tmp/headlamp-oauth2-proxy-pf.pid"

log() { printf '\033[1;34m==>\033[0m %s\n' "$*"; }

kill_pidfile() {
  local file="$1" name="$2"
  if [[ -f "$file" ]]; then
    local pid
    pid="$(cat "$file")"
    if kill -0 "$pid" 2>/dev/null; then
      log "Stopping $name (PID $pid)"
      kill "$pid" 2>/dev/null || true
      # Give it a moment, then force.
      sleep 1
      if kill -0 "$pid" 2>/dev/null; then kill -9 "$pid" 2>/dev/null || true; fi
    fi
    rm -f "$file"
  fi
}

kill_pidfile "$PF_PID_FILE"  "oauth2-proxy port-forward"
kill_pidfile "$DEX_PID_FILE" "dex"

if helm --kube-context "$PROFILE" -n "$NAMESPACE" status oauth2-proxy >/dev/null 2>&1; then
  log "Uninstalling oauth2-proxy Helm release"
  helm --kube-context "$PROFILE" -n "$NAMESPACE" uninstall oauth2-proxy || true
fi

if helm --kube-context "$PROFILE" -n "$NAMESPACE" status headlamp >/dev/null 2>&1; then
  log "Uninstalling headlamp Helm release"
  helm --kube-context "$PROFILE" -n "$NAMESPACE" uninstall headlamp || true
fi

if minikube status -p "$PROFILE" --format '{{.Host}}' 2>/dev/null | grep -q .; then
  log "Deleting Minikube profile '$PROFILE'"
  minikube delete -p "$PROFILE" || true
fi

# Generated files.
rm -f "$(dirname "$0")/oauth2-proxy-values.yaml" /tmp/dex.db /tmp/headlamp-dex.log /tmp/headlamp-oauth2-proxy-pf.log

log "Done."
