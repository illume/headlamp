#!/bin/bash
# Run the full benchmark suite. Produces results/<timestamp>/.
#
# Usage (from repo root):
#   ./benchmarks/rsbuild-vs-vite/run.sh
#
# Prereqs:
#   - frontend deps installed (`cd frontend && npm ci`)
#   - chromium at /usr/bin/chromium
#   - sudo not required; runs entirely as the current user
set -eu
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
TS="$(date -u +%Y%m%dT%H%M%SZ)"
OUT="$HERE/results/$TS"
mkdir -p "$OUT"
cd "$ROOT/frontend"

export WS_PATH="$ROOT/frontend/node_modules/ws"

# 1) Cold + warm production builds (bundler-only timings, postbuild excluded)
for tool in rsbuild vite; do
  for run in 1 2; do
    rm -rf build node_modules/.cache node_modules/.rspack-cache node_modules/.vite 2>/dev/null || true
    sync
    npm run make-version >/dev/null 2>&1
    cmd="rsbuild build"
    [ "$tool" = vite ] && cmd="vite build"
    /usr/bin/time -f "$tool,$run,wall=%es,cpu=%P,maxRSS=%MkB" -o "$OUT/build_${tool}_${run}.time" \
      npx --no-install cross-env PUBLIC_URL=./ NODE_OPTIONS=--max-old-space-size=8096 $cmd \
      > "$OUT/build_${tool}_${run}.log" 2>&1
  done
done

# 2) Dist-size stats
python3 "$HERE/dist_stats.py" build > "$OUT/dist_stats_last.json" || true

# 3) Browser/dev-server measurements
"$HERE/measure.sh" rsbuild "npx --no-install rsbuild dev" 14001 "ready|built in" \
  > "$OUT/dev_rsbuild.txt" 2>&1
"$HERE/measure.sh" vite    "npx --no-install vite"        14002 "ready in|VITE" \
  > "$OUT/dev_vite.txt"    2>&1

# 4) Storybook dev server (rsbuild vs vite, same metrics as the headlamp dev
#    server). The vite-builder Storybook config lives under
#    benchmarks/rsbuild-vs-vite/storybook-vite/ and resolves packages via a
#    symlink to frontend/node_modules so it doesn't need its own install.
ln -sfn ../../../frontend/node_modules "$HERE/storybook-vite/node_modules"

"$HERE/measure.sh" sb-rsbuild \
  "npx --no-install storybook dev --no-open --no-version-updates -c $ROOT/frontend/.storybook" \
  14003 "Storybook .* started|Local:" \
  > "$OUT/dev_sb_rsbuild.txt" 2>&1
"$HERE/measure.sh" sb-vite \
  "npx --no-install storybook dev --no-open --no-version-updates -c $HERE/storybook-vite" \
  14004 "Storybook .* started|Local:" \
  > "$OUT/dev_sb_vite.txt" 2>&1

echo "Results in $OUT"
