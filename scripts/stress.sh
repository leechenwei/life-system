#!/usr/bin/env bash
# Simple latency + concurrency stress test. No deps beyond curl/awk.
# Usage: scripts/stress.sh <base-url> <app-password> [requests] [concurrency]
#   scripts/stress.sh https://life-system-roan.vercel.app Admin123@ 40 10
set -euo pipefail
URL="${1:?base url}"; PW="${2:?app password}"; N="${3:-40}"; C="${4:-10}"

stat() {  # reads times on stdin -> min/median/p95/max (portable: sort then index)
  sort -n | awk '{a[NR]=$1} END{
    n=NR; if(n==0){print "  no samples"; exit}
    p95=int(n*0.95); if(p95<1)p95=1;
    printf "  n=%d  min=%.3fs  median=%.3fs  p95=%.3fs  max=%.3fs\n",
      n, a[1], a[int(n/2)+1], a[p95], a[n]
  }'
}

bench() {  # path
  local path="$1"
  seq "$N" | xargs -P "$C" -I{} curl -s -o /dev/null \
    -b "ls_auth=$PW" -w "%{time_total}\n" "$URL$path"
}

echo "Target: $URL   requests=$N concurrency=$C"
for p in /accounts / /plan; do
  echo "$p"
  bench "$p" | stat
done
