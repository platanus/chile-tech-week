#!/bin/bash
# Builds the Photon index production serves (docker-compose.production.yml, the `photon`
# service) and leaves it in $DEST. Run it on the host that serves it; it shares the machine with
# production, so the import is capped (3 CPUs, 5 GB, low disk priority) and a watchdog stops it
# if the load climbs. The first uncapped run took the host down.
#
#   scripts/photon/build-index.sh [DEST=/home/debian/photon]
#
# Then `docker restart tech-week-photon`.
set -euo pipefail

DEST=${1:-/home/debian/photon}
PHOTON_VERSION=1.3.0
HERE=$(cd "$(dirname "$0")" && pwd)
mkdir -p "$DEST"
WORK=$(mktemp -d "$DEST/build.XXXXXX")

curl -sfL -o "$DEST/photon.jar" "https://github.com/komoot/photon/releases/download/$PHOTON_VERSION/photon-$PHOTON_VERSION.jar"
curl -sf https://download1.graphhopper.com/public/photon-dump-planet-1.0-latest.jsonl.zst \
  | zstd -dc | python3 "$HERE/extract.py" > "$WORK/cl.jsonl"

mkdir "$WORK/data"
docker run --rm --name photon-import --cpus 3 --memory 5g --memory-swap 5g --blkio-weight 100 \
  -e JAVA_TOOL_OPTIONS=-Xmx2g -v "$DEST/photon.jar:/photon.jar:ro" -v "$WORK:/w" -w /w \
  eclipse-temurin:21-jre nice -n 19 java -jar /photon.jar import \
  -import-file cl.jsonl -data-dir /w/data -languages es -j 2 &
IMPORT=$!
while kill -0 $IMPORT 2>/dev/null; do
  [ "$(cut -d' ' -f1 /proc/loadavg | cut -d. -f1)" -gt 16 ] && docker stop -t 5 photon-import
  sleep 5
done
wait $IMPORT

# The container wrote as root: swap the new index in with one too.
docker run --rm -v "$DEST:/d" -v "$WORK:/w" alpine sh -c 'rm -rf /d/data && mv /w/data /d/data && rm -rf /w/*'
rmdir "$WORK"
