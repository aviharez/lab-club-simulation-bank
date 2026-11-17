#!/usr/bin/env bash
# Mux the episode video with its soundtrack, loudness-normalized for social (-14 LUFS, -1.5 dBTP).
# Usage: scripts/master.sh <video.mp4> <audio.wav> <out.mp4>   (any episode)
set -euo pipefail
V=$1; A=$2; O=$3
# Two-pass loudnorm, aimed 1.6 LU hot with a -2.6 dBTP ceiling (room for the AAC overshoot). Its dynamic mode lands within ~1 LU of the aim
# depending on the material, so the result is measured and trimmed DOWN onto -14 LUFS: a pure gain cut, which
# can only lower the true peak (no second limiter, so no clipped clicks) and leaves margin for the AAC encoder.
AIM="I=-12.4:TP=-2.6:LRA=11"
J=$(ffmpeg -hide_banner -i "$A" -af loudnorm=$AIM:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
LN="loudnorm=$AIM:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=false"
CHAIN="$LN,aresample=48000"
GOT=$(ffmpeg -hide_banner -nostats -i "$A" -af "$CHAIN,ebur128" -f null - 2>&1 | sed -n '/Summary:/,$p' | awk '/I:/ {print $2; exit}')
TRIM=$(python3 -c "print(min(0.0, round(-14 - ($GOT), 2)))")
echo "master: loudnorm landed on $GOT LUFS, trim ${TRIM} dB -> $O"
# Normalize ONCE into a float WAV, so every encode below starts from the same samples (re-running the dynamic
# loudnorm per attempt made the peaks jump between attempts). Then encode; the AAC encoder can overshoot the
# ceiling by a few tenths: if the encoded true peak is above -1.5 dBTP, cut the gain by the excess (+0.05 dB) and
# encode again. Keep the loudest attempt that passes; never ship an attempt that is worse than the one before.
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
ffmpeg -v error -y -i "$A" -af "$CHAIN" -c:a pcm_f32le "$TMP/norm.wav"
BEST=""
for _ in $(seq 1 20); do
  ffmpeg -v error -y -i "$V" -i "$TMP/norm.wav" -map 0:v -map 1:a -c:v copy -af "volume=${TRIM}dB" -c:a aac -b:a 192k -shortest "$TMP/try.mp4"
  TP=$(ffmpeg -hide_banner -nostats -i "$TMP/try.mp4" -map 0:a -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p' | awk '/Peak:/ {print $2; exit}')
  OVER=$(python3 -c "print(round(max(0.0, ($TP) + 1.5), 2))")
  if [ "$OVER" = "0.0" ]; then BEST="$TMP/try.mp4"; break; fi
  # the AAC overshoot is not monotonic in the gain (a 0.3 dB cut can turn -1.2 into +0.4 dBTP): a large excess
  # is an encoder spike, not a level problem, so it only nudges the gain by 0.05 dB; a small one is cut exactly
  STEP=$(python3 -c "print(0.05 if $OVER > 0.5 else round($OVER + 0.05, 2))")
  TRIM=$(python3 -c "print(round($TRIM - $STEP, 2))")
  echo "master: encoded true peak $TP dBTP, re-encoding with trim ${TRIM} dB"
done
if [ -z "$BEST" ]; then echo "master: could not get the true peak under -1.5 dBTP" >&2; exit 1; fi
mv "$BEST" "$O"
echo "master: final trim ${TRIM} dB, true peak $TP dBTP"
