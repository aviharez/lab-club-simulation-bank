#!/usr/bin/env python3
"""Pixel-diff two folders of stills (same file names).
Usage: scripts/pixel-diff.py <dirA> <dirB> [--mean=0.25] [--big=16] [--pct=0.5]
PASS per image when the mean channel diff <= --mean and at most --pct % of pixels differ by more than --big levels.
The defaults sit above the noise floor of two renders of the SAME code (GPU float/MSAA grain, max mean ~0.14),
so PASS means "visually identical". Exit 1 if any image fails or is missing."""
import sys, pathlib
import numpy as np
from PIL import Image

a, b = map(pathlib.Path, sys.argv[1:3])
opt = {k: float(v) for k, v in (x[2:].split("=") for x in sys.argv[3:] if x.startswith("--"))}
MEAN, BIG, PCT = opt.get("mean", 0.25), opt.get("big", 16), opt.get("pct", 0.5)
bad = 0
print(f"{'file':<12}{'max':>6}{'mean':>9}{'>'+str(int(BIG))+' %':>9}  result (PASS: mean<={MEAN}, >{int(BIG)} levels on <={PCT}% px)")
for fa in sorted(a.glob("*.png"), key=lambda p: (len(p.name), p.name)):
    fb = b / fa.name
    if not fb.exists():
        print(f"{fa.name:<12} missing in {b}"); bad += 1; continue
    A = np.asarray(Image.open(fa).convert("RGB"), np.int16); B = np.asarray(Image.open(fb).convert("RGB"), np.int16)
    if A.shape != B.shape:
        print(f"{fa.name:<12} size {A.shape} vs {B.shape}"); bad += 1; continue
    d = np.abs(A - B); px = d.max(axis=2)
    big = 100 * (px > BIG).mean()
    ok = d.mean() <= MEAN and big <= PCT
    bad += not ok
    print(f"{fa.name:<12}{px.max():>6}{d.mean():>9.4f}{big:>9.4f}  {'IDENTICAL' if px.max() == 0 else 'PASS' if ok else 'FAIL'}")
print("all stills visually identical" if not bad else f"{bad} still(s) differ")
sys.exit(1 if bad else 0)
