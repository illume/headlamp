#!/bin/bash
set -u
NAME=$1
CMD=$2
PORT=$3
READY=$4
URLPATH=${5:-/}
LOG=/tmp/${NAME}dev.log
SAMPLES=/tmp/${NAME}_samples.csv

cd /home/runner/work/headlamp/headlamp/frontend
export WS_PATH=/home/runner/work/headlamp/headlamp/frontend/node_modules/ws
: > $LOG
( $CMD --port $PORT > $LOG 2>&1 ) &
SERVER_PID=$!
echo "[$NAME] server pid=$SERVER_PID"
T0=$(date +%s%N)
for i in $(seq 1 240); do
  grep -qE "$READY" $LOG 2>/dev/null && break
  sleep 0.5
done
T1=$(date +%s%N)
READY_MS=$(( (T1 - T0) / 1000000 ))
echo "[$NAME] server ready in ${READY_MS} ms"
sleep 2
echo "[$NAME] dev server idle:"
ps -p $SERVER_PID -o pid,rss=,%cpu= 2>/dev/null

echo "ts_ms,role,pid,rss_kb,cpu_pct" > $SAMPLES
( for j in $(seq 1 280); do
    server_rss=$(ps -o rss= --ppid $SERVER_PID -p $SERVER_PID 2>/dev/null | awk '{s+=$1}END{print s}')
    server_cpu=$(ps -o %cpu= --ppid $SERVER_PID -p $SERVER_PID 2>/dev/null | awk '{s+=$1}END{print s}')
    chr_rss=$(ps -eo rss=,comm= 2>/dev/null | awk '/chromium|chrome/{s+=$1}END{print s}')
    chr_cpu=$(ps -eo %cpu=,comm= 2>/dev/null | awk '/chromium|chrome/{s+=$1}END{print s}')
    ts=$(date +%s%N | cut -c1-13)
    [ -n "$server_rss" ] && echo "$ts,server,$SERVER_PID,${server_rss:-0},${server_cpu:-0}" >> $SAMPLES
    [ -n "$chr_rss" ] && echo "$ts,chromium,0,${chr_rss:-0},${chr_cpu:-0}" >> $SAMPLES
    sleep 0.1
  done ) &
SAMPLER_PID=$!

node /tmp/cdp_bench.mjs http://localhost:$PORT$URLPATH /usr/bin/chromium > /tmp/${NAME}_browser.json 2>/tmp/${NAME}_browser.err

wait $SAMPLER_PID 2>/dev/null

echo "[$NAME] browser metrics (summary):"
node -e "
  const j=JSON.parse(require('fs').readFileSync('/tmp/${NAME}_browser.json'));
  const k=v=>v==null?'n/a':v;
  console.log('  cold load=', k(j.cold.load_ms),'ms; DCL=', k(j.cold.domContentLoaded_ms),'ms; netIdle=', k(j.cold.networkIdle_ms),'ms');
  console.log('  cold reqs=', j.cold.requests,'; bytes=', (j.cold.bytesReceived/1e6).toFixed(2),'MB');
  console.log('  reload load=', k(j.reload.load_ms),'ms; reqs=', j.reload.requests,'; bytes=', (j.reload.bytesReceived/1e6).toFixed(2),'MB');
  console.log('  fcp=', k(j.heap?.fcp?.toFixed(0)), 'ms; lcp=', k(j.heap?.lcp?.toFixed(0)), 'ms; jsHeap=', ((j.heap?.used||0)/1e6).toFixed(1),'MB; domNodes=', j.heap?.domNodes);
  const m=j.performance;
  console.log('  scriptDuration=', m.ScriptDuration?.toFixed(3), 's; layoutDuration=', m.LayoutDuration?.toFixed(3),'s; v8CompileDuration=', m.V8CompileDuration?.toFixed(3),'s');
"

python3 - <<PYEOF
import csv, statistics
rows=list(csv.DictReader(open('$SAMPLES')))
def stats(role):
    rs=[int(r['rss_kb']) for r in rows if r['role']==role and r['rss_kb'] and r['rss_kb']!='0']
    cs=[float(r['cpu_pct']) for r in rows if r['role']==role and r['cpu_pct'] and r['cpu_pct']!='0']
    if not rs: return f"  {role}: no samples"
    return f"  {role}: RSS peak={max(rs)/1024:.0f}MB  mean={statistics.mean(rs)/1024:.0f}MB | CPU peak={max(cs):.0f}%  mean={statistics.mean(cs):.0f}%"
print(f"[$NAME] resource sampling during navigation+reload:")
print(stats('server'))
print(stats('chromium'))
PYEOF

# Tear down
[ -n "${SERVER_PID:-}" ] && /bin/kill -TERM "$SERVER_PID" 2>/dev/null
sleep 1
[ -n "${SERVER_PID:-}" ] && /bin/kill -KILL "$SERVER_PID" 2>/dev/null
ps -ef | awk '/headless/ && /chromium/ {print $2}' | while read p; do /bin/kill -KILL $p 2>/dev/null; done
wait 2>/dev/null
sleep 2
