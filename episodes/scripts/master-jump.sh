#!/usr/bin/env bash
# Mux the episode video with its soundtrack, loudness-normalized for social (-14 LUFS, -1.5 dBTP).
# Usage: scripts/master-jump.sh <video.mp4> <audio.wav> <out.mp4>
set -euo pipefail
V=$1; A=$2; O=$3
J=$(ffmpeg -hide_banner -i "$A" -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
get() { echo "$J" | python3 -c "import json,sys;print(json.load(sys.stdin)['$1'])"; }
LN="loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=$(get input_i):measured_TP=$(get input_tp):measured_LRA=$(get input_lra):measured_thresh=$(get input_thresh):offset=$(get target_offset):linear=false"
ffmpeg -v error -y -i "$V" -i "$A" -map 0:v -map 1:a -c:v copy -af "$LN,aresample=48000,volume=1.6dB,alimiter=limit=0.82:level=false" -c:a aac -b:a 192k -shortest "$O"
