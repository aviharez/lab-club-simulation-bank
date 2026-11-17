#!/usr/bin/env bash
# Mux the episode video with its soundtrack, loudness-normalized for social (-14 LUFS, -1.5 dBTP).
# Usage: scripts/master.sh <video.mp4> <audio.wav> <out.mp4>   (any episode)
set -euo pipefail
V=$1; A=$2; O=$3
# Two-pass loudnorm, aimed 1.2 LU hot with a -2 dBTP ceiling. Its dynamic mode lands within ~1 LU of the aim
# depending on the material, so the result is measured and trimmed DOWN onto -14 LUFS: a pure gain cut, which
# can only lower the true peak (no second limiter, so no clipped clicks) and leaves margin for the AAC encoder.
AIM="I=-12.8:TP=-2.0:LRA=11"
J=$(ffmpeg -hide_banner -i "$A" -af loudnorm=$AIM:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
LN="loudnorm=$AIM:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=false"
CHAIN="$LN,aresample=48000"
GOT=$(ffmpeg -hide_banner -nostats -i "$A" -af "$CHAIN,ebur128" -f null - 2>&1 | sed -n '/Summary:/,$p' | awk '/I:/ {print $2; exit}')
TRIM=$(python3 -c "print(min(0.0, round(-14 - ($GOT), 2)))")
echo "master: loudnorm landed on $GOT LUFS, trim ${TRIM} dB -> $O"
# The AAC encoder can overshoot the -2 dBTP ceiling by a few tenths: measure the encoded file and, if its true
# peak is above -1.5 dBTP, cut the gain by the excess (+0.2 dB margin) and encode again (still a pure gain cut).
for _ in 1 2 3; do
  ffmpeg -v error -y -i "$V" -i "$A" -map 0:v -map 1:a -c:v copy -af "$CHAIN,volume=${TRIM}dB" -c:a aac -b:a 192k -shortest "$O"
  TP=$(ffmpeg -hide_banner -nostats -i "$O" -map 0:a -af ebur128=peak=true -f null - 2>&1 | sed -n '/Summary:/,$p' | awk '/Peak:/ {print $2; exit}')
  OVER=$(python3 -c "print(round(max(0.0, ($TP) + 1.5), 2))")
  if [ "$OVER" = "0.0" ]; then break; fi
  TRIM=$(python3 -c "print(round($TRIM - $OVER - 0.2, 2))")
  echo "master: encoded true peak $TP dBTP, re-encoding with trim ${TRIM} dB"
done
