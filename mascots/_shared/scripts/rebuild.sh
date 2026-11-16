#!/usr/bin/env bash
# Rebuild 3D actors end to end: build -> turntable -> speeds -> manifest -> episodes/public sync.
# Usage: rebuild.sh [--no-turntable] [--tests] [name ...]     (no names = all four)
#   --no-turntable  skip the ~4 min EEVEE turntable per character
#   --tests         also render the Remotion r3f clip + face test videos
# Env: BLENDER (default: blender on PATH)
set -euo pipefail
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MASCOTS="$(cd "$HERE/../.." && pwd)"
EPISODES="$(cd "$MASCOTS/../episodes" 2>/dev/null && pwd || true)"
BLENDER="${BLENDER:-blender}"
LOGS="$MASCOTS/_shared/build/logs"; mkdir -p "$LOGS"

TURN=1; TESTS=0; NAMES=()
for a in "$@"; do
  case "$a" in
    --no-turntable) TURN=0 ;;
    --tests) TESTS=1 ;;
    -h|--help) sed -n 2,6p "$0"; exit 0 ;;
    *) NAMES+=("$a") ;;
  esac
done
[ ${#NAMES[@]} -eq 0 ] && NAMES=(zuzu anna lumi miyu)

bl() { "$BLENDER" -b --factory-startup --python "$HERE/$1" -- "${@:2}"; }

for n in "${NAMES[@]}"; do
  echo "== $n: build (log: $LOGS/${n}_build.log)"
  bl run_build.py "$n" > "$LOGS/${n}_build.log" 2>&1 || { tail -20 "$LOGS/${n}_build.log"; exit 1; }
  grep 'BUILD| DONE' "$LOGS/${n}_build.log"
  if [ "$TURN" = 1 ]; then
    echo "== $n: turntable"
    bl run_turn.py "$n" > "$LOGS/${n}_turn.log" 2>&1 || { tail -20 "$LOGS/${n}_turn.log"; exit 1; }
  fi
done

# speeds for every character that has an actor (manifest needs all of them)
echo "== speeds + manifest"
SPEEDS="{"
for n in zuzu anna lumi miyu; do
  [ -f "$MASCOTS/$n/model/${n}_actor.blend" ] || continue
  s=$(bl run_speed.py "$n" 2>/dev/null | sed -n 's/^SPEED|//p')
  SPEEDS+="\"$n\":$s,"
done
SPEEDS="${SPEEDS%,}}"
python3 "$HERE/update_manifest_actors.py" "$SPEEDS"

if [ -n "$EPISODES" ]; then
  echo "== sync into episodes/public"
  (cd "$EPISODES" && node scripts/sync-mascots.mjs)
  if [ "$TESTS" = 1 ]; then
    for n in "${NAMES[@]}"; do
      echo "== $n: r3f test videos"
      (cd "$EPISODES" && npx remotion render "ActorFace-$n" "$MASCOTS/$n/tests/${n}_faces.mp4" --gl=angle-egl --log=error \
        && npx remotion render "ActorClips-$n" "$MASCOTS/$n/tests/${n}_clips.mp4" --gl=angle-egl --log=error)
    done
  fi
fi
echo "== done: ${NAMES[*]}"
