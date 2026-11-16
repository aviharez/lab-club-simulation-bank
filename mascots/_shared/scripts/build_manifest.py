#!/usr/bin/env python3
"""Write mascots/manifest.json from the final sprites and textures.   usage: build_manifest.py
- signature colour: most frequent colour of the hair texels in _shared/textures/<name>/<name>_base_clean.png
- feet baseline / bounding box: alpha of <name>/sprites/<name>_idle_01_neutral.png
- face points: face-decal layout (_shared/build/<name>/face.json) projected through the sprite camera
  (_shared/build/<name>/camera.json), i.e. the exact pixel positions in the idle sprite
"""
import json, os
import numpy as np
from PIL import Image

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
NAMES = ["zuzu", "anna", "lumi", "miyu"]
POSES = ["idle", "happy", "panic"]
EXPR = ["01_neutral", "02_happy", "03_smug", "04_shocked", "05_dizzy", "06_crying", "07_squint"]
man = {"sprite_size": [1024, 1024], "sprite_pattern": "{name}/sprites/{name}_{pose}_{expression}.png",
       "coordinates": "pixels, origin top-left, measured on {name}_idle_01_neutral.png; same camera and scale for every character",
       "poses": POSES, "characters": {}}
for n in NAMES:
    ex = EXPR + (["08_glint"] if n == "lumi" else [])
    missing = [f"{n}_{p}_{e}.png" for p in POSES for e in ex if not os.path.exists(f"{ROOT}/{n}/sprites/{n}_{p}_{e}.png")]
    assert not missing, missing
    tex = np.asarray(Image.open(f"{ROOT}/_shared/textures/{n}/{n}_base_clean.png").convert("RGB"))
    hair = np.asarray(Image.open(f"{ROOT}/_shared/textures/{n}/{n}_masks.png").convert("RGB").resize(tex.shape[1::-1], Image.NEAREST))[..., 2] > 127
    cols, cnt = np.unique(tex[hair], axis=0, return_counts=True)
    r, g, b = (int(v) for v in cols[cnt.argmax()])
    spr = Image.open(f"{ROOT}/{n}/sprites/{n}_idle_01_neutral.png")
    a = np.asarray(spr.convert("RGBA"))[..., 3] > 127
    ys, xs = np.where(a)
    F = json.load(open(f"{ROOT}/_shared/build/{n}/face.json")); C = json.load(open(f"{ROOT}/_shared/build/{n}/camera.json"))
    y0, z0, S = C["face_window_y0_z0_size"]; k = C["sprite_px"] / C["ortho_scale"]; ty, tz = C["target"][1], C["target"][2]
    px = lambda dx, dy: [round(512 + (y0 + dx / 1024 * S - ty) * k), round(512 - (z0 + (1 - dy / 1024) * S - tz) * k)]
    el, er, mo = px(F["eye_l"], F["eye_y"]), px(F["eye_r"], F["eye_y"]), px(*F["mouth"])
    man["characters"][n] = {
        "name": n, "signature_color": "#%02x%02x%02x" % (r, g, b),
        "poses": POSES, "expressions": ex,
        "sprite_pattern": f"{n}/sprites/{n}_{{pose}}_{{expression}}.png",
        "contact_sheet": f"{n}/sheets/{n}_contact_sheet.png",
        "sprite_size": list(spr.size),
        "feet_baseline_y": int(ys.max()),
        "bbox": [int(xs.min()), int(ys.min()), int(xs.max()), int(ys.max())],
        "face_center_x": round((el[0] + er[0]) / 2), "face_center_y": round((el[1] + mo[1]) / 2),
        "eye_left": el, "eye_right": er, "mouth": mo,
    }
json.dump(man, open(f"{ROOT}/manifest.json", "w"), indent=2)
print(open(f"{ROOT}/manifest.json").read())
