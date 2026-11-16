#!/usr/bin/env python3
"""Remove baked shading from a Tripo texture: skin and hair become flat base colours.
usage: clean_texture.py <name>      (reads chars.json, _shared/build/<name>/tex_orig.png + mesh.npz)
writes _shared/textures/<name>/<name>_base_clean.png and <name>_masks.png (R = face skin, G = all skin, B = hair)
"""
import json, os, sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
name = sys.argv[1]
C = json.load(open(os.path.join(HERE, "chars.json")))[name]["tex"]
B = os.path.join(HERE, "..", "build", name); T = os.path.join(HERE, "..", "textures", name)
os.makedirs(T, exist_ok=True)
N = 2048
rgb = np.asarray(Image.open(os.path.join(B, "tex_orig.png")).convert("RGB").resize((N, N), Image.LANCZOS)).astype(np.float32) / 255
M = np.load(os.path.join(B, "mesh.npz"))
uv, pos = M["uv"], M["pos"]; T = len(uv)

# ---- triangle id per texel (0 = none), dilated a few texels into the padding
im = Image.new("I", (N, N), 0); dr = ImageDraw.Draw(im)
for i in range(T):
    p = [(float(u * N), float((1 - v) * N)) for u, v in uv[i]]
    dr.polygon(p, fill=i + 1, outline=i + 1)
ids = np.asarray(im).astype(np.int32)
for _ in range(4):
    for ax, sh in ((0, 1), (0, -1), (1, 1), (1, -1)):
        r = np.roll(ids, sh, axis=ax); m = (ids == 0) & (r > 0); ids[m] = r[m]

# ---- HSV
mx, mn = rgb.max(-1), rgb.min(-1); dl = mx - mn
V = mx; S = np.where(mx > 0, dl / np.maximum(mx, 1e-6), 0)
R, G, B = rgb[..., 0], rgb[..., 1], rgb[..., 2]
dd = np.maximum(dl, 1e-6)
Hh = np.where(mx == R, ((G - B) / dd) % 6, np.where(mx == G, (B - R) / dd + 2, (R - G) / dd + 4)) * 60
Hh = np.where(dl < 1e-6, 0, Hh)


def hue_in(lo, hi):
    return ((Hh >= lo) & (Hh <= hi)) if lo <= hi else ((Hh >= lo) | (Hh <= hi))


hl, hh = C["hair_hue"]
hairc = hue_in(hl, hh) & (S >= C.get("hair_smin", 0.3)) & (V > 0.12)
sl, sh_ = C.get("skin_hue", [8, 36])
skinc = hue_in(sl, sh_) & (S >= C.get("skin_smin", 0.25)) & (S <= C.get("skin_smax", 0.62)) & (V >= C.get("skin_vmin", 0.6)) & ~hairc
warm = hue_in(345, 52) & (S >= 0.25) & (V > 0.12) & ~skinc & ~hairc

# ---- per-triangle votes
flat = ids.ravel()
cnt = lambda m: np.bincount(flat, weights=m.ravel().astype(np.float64), minlength=T + 1)[1:]
tot, ns, nh, nw = cnt(np.ones_like(hairc)), cnt(skinc), cnt(hairc), cnt(warm)
cen = pos.mean(1)
hair_region = (M["head_max"] >= 0.3) | (cen[:, 2] > float(M["head_z"]))
dec = np.maximum(tot - nw, 1)
lab = np.zeros(T, np.int8)                       # 0 unknown, 1 skin, 2 hair, 3 other
lab[(ns / dec >= 0.5) & (ns > 0)] = 1
lab[(nh / dec >= 0.5) & (nh > 0) & hair_region] = 2
lab[(lab == 0) & ((tot - nw) > 0.3 * tot)] = 3
# adjacency through shared (welded) edges
key = {}
vid = np.zeros((T, 3), np.int64)
for i in range(T):
    for k in range(3):
        vid[i, k] = key.setdefault(tuple(np.round(pos[i, k], 5)), len(key))
edges = {}
for i in range(T):
    for k in range(3):
        e = tuple(sorted((vid[i, k], vid[i, (k + 1) % 3]))); edges.setdefault(e, []).append(i)
nb = [[] for _ in range(T)]
for e, ts in edges.items():
    for a in ts:
        for b_ in ts:
            if a != b_: nb[a].append(b_)
for _ in range(6):
    new = lab.copy()
    for i in np.where(lab == 0)[0]:
        v = [lab[j] for j in nb[i] if lab[j]]
        if v: new[i] = max(set(v), key=v.count)
    lab = new

labp = np.concatenate([[0], lab])[ids]
regp = np.concatenate([[False], hair_region])[ids]
skin = skinc | (warm & (labp == 1))
hair = (hairc | (warm & (labp == 2))) & regp
skin &= ~hair

# ---- hair tones (one flat colour per tone; triangles pick the nearest tone, smoothed over neighbours)
tones = np.array(C["hair_tones"], np.float32)
if len(tones) > 1:
    w = hair.ravel().astype(np.float64)
    n = np.maximum(np.bincount(flat, weights=w, minlength=T + 1)[1:], 1e-6)
    mean = np.stack([np.bincount(flat, weights=w * rgb[..., c].ravel(), minlength=T + 1)[1:] / n for c in range(3)], 1)
    has = n > 4
    tl = np.argmin(((mean[:, None, :] - tones[None]) ** 2).sum(-1), 1)
    tl[~has] = -1
    for _ in range(C.get("tone_smooth", 2)):
        new = tl.copy()
        for i in range(T):
            v = [tl[j] for j in nb[i] if tl[j] >= 0] + ([tl[i]] if tl[i] >= 0 else [])
            if v: new[i] = max(set(v), key=v.count)
        tl = new
    tl[tl < 0] = 0
    tonep = np.concatenate([[0], tl])[ids]
    hair_col = tones[tonep]
else:
    hair_col = np.broadcast_to(tones[0], rgb.shape)


def soft(m, s=0.7):
    return np.asarray(Image.fromarray((m * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(s))).astype(np.float32)[..., None] / 255


out = rgb.copy()
a = soft(hair); out = out * (1 - a) + hair_col * a
a = soft(skin); out = out * (1 - a) + np.array(C["skin"], np.float32) * a
Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8)).save(os.path.join(T, f"{name}_base_clean.png"))
facep = np.concatenate([[False], M["head_min"] >= 0.5])[ids]
mk = np.dstack([soft(skin & facep, 1.0)[..., 0], soft(skin, 1.0)[..., 0], soft(hair, 1.0)[..., 0]])
Image.fromarray((mk * 255).astype(np.uint8)).save(os.path.join(T, f"{name}_masks.png"))
pv = np.concatenate([rgb, out], 1)
Image.fromarray((pv * 255).astype(np.uint8)).resize((2048, 1024), Image.LANCZOS).save(os.path.join(B, "tex_compare.png"))
print(name, "tris", T, "labels skin/hair/other/unknown", [(lab == k).sum() for k in (1, 2, 3, 0)],
      "texels skin %.1f%% hair %.1f%%" % (skin.mean() * 100, hair.mean() * 100))
