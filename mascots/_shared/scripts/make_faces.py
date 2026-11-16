#!/usr/bin/env python3
"""Build swappable face decals for one chibi.   usage: make_faces.py ../build/<name>/face.json   (flat skin, numbered expressions)

Reads work/ref_flat.png (front orthographic flat-texture render of the face, 1024px, same
projection as the mesh's "FaceUV" layer) and writes _shared/expressions/<name>/face_<expr>.png (RGBA) plus
work/preview_sheet.png.  Each decal = inpainted skin patch hiding the baked eyes/brows/mouth +
newly drawn features; alpha is removed wherever the reference shows hair (or anything else listed
in "hair_rgb"), so the features stay under the bangs.

face.json keys (pixels are in the 1024 reference image):
  eye_l, eye_r, eye_y   eye centres          k            eye size scale (1 = 190px tall eye)
  mouth [x, y]          mouth centre         hair_rgb     [[r,g,b] 0-1 sRGB, ...] protected tones
  hair_thr              colour distance      skin_rgb     [[r,g,b], ...] skin tones (inpaint source)
  brow_zones            [[x0,y0,x1,y1], ...] baked brow strokes to erase (forced "not hair")
  keep_zones            [[x0,y0,x1,y1], ...] never painted over, never used as skin (bandage...)
  keep_rgb              [{"rgb": [[r,g,b],...], "thr": 0.12, "boxes": [[x0,y0,x1,y1],...]}] same, keyed by colour
  iris_zone_k           widen the "baked iris, not hair" ellipse
  iris [top, mid, low, bottom], lash, brow, line   colours
  neutral               "open" | "sleepy"    glasses      optional {"r":..,"color":..,"w":..}
"""
import json, math, os, subprocess, sys
import numpy as np
from PIL import Image, ImageFilter

cfg_path = os.path.abspath(sys.argv[1])
C = json.load(open(cfg_path))
HERE = os.path.dirname(cfg_path)
OUT = os.path.join(HERE, "..", "..", "expressions", os.path.basename(HERE))
os.makedirs(OUT, exist_ok=True)
N = 1024
EYE_L, EYE_R, EYE_Y, K = C["eye_l"], C["eye_r"], C["eye_y"], C.get("k", 1.0)
MX, MY = C["mouth"]
LASH, LINE, BROW = C.get("lash", "#3a2218"), C.get("line", "#8a4a3a"), C.get("brow", "#c08a22")
IRIS = C.get("iris", ["#4a2a12", "#8a5414", "#e2a21c", "#ffd23c"])
MOUTH_IN, TONGUE = "#742a2c", "#f48a8e"

ref = np.asarray(Image.open(os.path.join(HERE, "ref_flat.png")).convert("RGBA")).astype(np.float32) / 255
rgb, alpha = ref[..., :3], ref[..., 3]
yy, xx = np.mgrid[0:N, 0:N].astype(np.float32)


def ell(cx, cy, rx, ry):
    return ((xx - cx) / rx) ** 2 + ((yy - cy) / ry) ** 2 <= 1


def rects(lst):
    m = np.zeros((N, N), bool)
    for x0, y0, x1, y1 in lst:
        m |= (xx >= x0) & (xx <= x1) & (yy >= y0) & (yy <= y1)
    return m


def near(cols, thr):
    d = np.full((N, N), 9.0, np.float32)
    for c in cols:
        d = np.minimum(d, np.sqrt(((rgb - np.array(c, np.float32)) ** 2).sum(-1)))
    return d < thr


def blur(a, sigma):
    im = Image.fromarray(np.clip(a * 255, 0, 255).astype(np.uint8))
    return np.asarray(im.filter(ImageFilter.GaussianBlur(sigma))).astype(np.float32) / 255


def boxblur(a, r):
    for ax in (0, 1):
        p = np.pad(a, [(r + 1, r) if i == ax else (0, 0) for i in range(a.ndim)], mode="edge")
        c = np.cumsum(p, axis=ax, dtype=np.float64)
        n = a.shape[ax]
        a = ((np.take(c, np.arange(2 * r + 1, 2 * r + 1 + n), axis=ax) - np.take(c, np.arange(0, n), axis=ax)) / (2 * r + 1)).astype(np.float32)
    return a


# ---- masks ---------------------------------------------------------------
IZ = C.get("iris_zone_k", 1.0)   # widen when the baked iris is broader than the drawn one
iris_zone = ell(EYE_L, EYE_Y + 6 * K, 74 * K * IZ, 96 * K) | ell(EYE_R, EYE_Y + 6 * K, 74 * K * IZ, 96 * K)
brow_zone = rects(C.get("brow_zones", []))
keep_zone = rects(C.get("keep_zones", []))
for kz in C.get("keep_rgb", []):      # colour-keyed keep areas, e.g. a white hair streak beside the eye
    keep_zone |= near(kz["rgb"], kz.get("thr", 0.12)) & rects(kz["boxes"])
hair = near(C["hair_rgb"], C.get("hair_thr", 0.17)) & ~iris_zone & ~brow_zone
op = C.get("hair_open", 13)       # opening: drop thin strokes (baked brows) from the hair mask
_h = Image.fromarray((hair * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(op)).filter(ImageFilter.MaxFilter(op))
hair = (np.asarray(_h) > 127) & hair
hair |= (alpha < 0.5) | keep_zone
hair_soft = np.asarray(Image.fromarray((hair * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))).astype(np.float32) / 255
hair_soft = blur(hair_soft, 1.2)

PK = C.get("patch_k", K)          # size of the skin patch that hides the baked eyes
EXL, EXR = EYE_L - 24 * PK, EYE_R + 24 * PK
eye_zone = ell(EXL, EYE_Y - 6 * K, 165 * PK, 135 * PK) | ell(EXR, EYE_Y - 6 * K, 165 * PK, 135 * PK)
mouth_zone = ell(MX, MY, 95, 55)
browz = np.zeros((N, N), bool); brow_patch = np.zeros((N, N), bool)
for x0, y0, x1, y1 in C.get("brow_zones", []):
    cx, cy, rx, ry = (x0 + x1) / 2, (y0 + y1) / 2, (x1 - x0) / 2, (y1 - y0) / 2
    browz |= ell(cx, cy, rx + 14, ry + 10); brow_patch |= ell(cx, cy, rx + 6, ry + 2)
skin_src = near(C["skin_rgb"], C.get("skin_thr", 0.10)) & ~hair & ~eye_zone & ~mouth_zone & ~browz

m = skin_src.astype(np.float32)
fill = np.zeros_like(rgb); done = np.zeros((N, N), bool)
for r in (12, 30, 70, 160):
    w = boxblur(boxblur(m, r), r)
    c = boxblur(boxblur(rgb * m[..., None], r), r)
    ok = (w > 0.08) & ~done
    fill[ok] = c[ok] / w[ok][:, None]; done |= ok
fill[~done] = rgb[skin_src].mean(axis=0)
for ch in range(3):
    fill[..., ch] = boxblur(fill[..., ch], 6)
if C.get("skin_flat"):          # v3: same flat colour as the cleaned base texture
    fill = np.broadcast_to(np.array(C["skin_flat"], np.float32), rgb.shape).copy()

patch = ell(EXL, EYE_Y - 6 * K, 150 * PK, 122 * PK) | ell(EXR, EYE_Y - 6 * K, 150 * PK, 122 * PK) | brow_patch | ell(MX, MY, 82, 48)
patch |= rects(C.get("extra_patch", []))
# v3: the patch also covers every skin-like pixel of the face (incl. baked brown shadows), so the
# whole face is one flat skin colour
_mx, _mn = rgb.max(-1), rgb.min(-1); _d = np.maximum(_mx - _mn, 1e-6)
_h = np.where(_mx == rgb[..., 0], ((rgb[..., 1] - rgb[..., 2]) / _d) % 6, np.where(_mx == rgb[..., 1], (rgb[..., 2] - rgb[..., 0]) / _d + 2, (rgb[..., 0] - rgb[..., 1]) / _d + 4)) * 60
_s = (_mx - _mn) / np.maximum(_mx, 1e-6)
skinlike = ((_h < 48) | (_h > 345)) & (_s > 0.08) & (_s < 0.85) & (_mx > 0.25) & ~hair & (alpha > 0.5)
_sk = Image.fromarray((skinlike * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9)).filter(ImageFilter.MinFilter(9))
patch |= (np.asarray(_sk) > 127) & ~rects(C.get("no_patch", []))
patch_a = blur(patch.astype(np.float32), 6)


# ---- SVG feature drawing (eye-local units, +x toward the nose) ------------
def eye_group(cx, mirror, inner):
    return f'<g transform="translate({cx},{EYE_Y}) scale({-K if mirror else K},{K})">{inner}</g>'


def both(inner):
    return eye_group(EYE_L, False, inner) + eye_group(EYE_R, True, inner)


DEFS = f'''<defs>
<linearGradient id="iris" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="{IRIS[0]}"/><stop offset="0.45" stop-color="{IRIS[1]}"/>
 <stop offset="0.75" stop-color="{IRIS[2]}"/><stop offset="1" stop-color="{IRIS[3]}"/></linearGradient>
<linearGradient id="tear" x1="0" y1="0" x2="0" y2="1">
 <stop offset="0" stop-color="#bfe8ff"/><stop offset="1" stop-color="#7cc4f4"/></linearGradient>
<clipPath id="scl"><ellipse cx="-12" cy="2" rx="86" ry="94"/></clipPath>
<clipPath id="half"><rect x="-140" y="-22" width="280" height="200"/></clipPath>
</defs>'''

UPPER_LASH = (f'<path d="M -106,-18 C -92,-80 -42,-110 10,-108 C 46,-106 70,-82 80,-50 '
              f'C 60,-74 38,-88 8,-90 C -36,-92 -70,-70 -90,-26 Z" fill="{LASH}"/>'
              f'<path d="M -88,-52 L -126,-58 L -100,-24 Z" fill="{LASH}"/>'
              f'<path d="M -70,-78 L -100,-98 L -84,-60 Z" fill="{LASH}"/>')
LOWER_LID = f'<path d="M -78,62 Q -30,98 44,90" fill="none" stroke="{LASH}" stroke-width="3.5" stroke-linecap="round"/>'
PUPIL = C.get("pupil", "#2a160c")
DARK = C.get("dark", "#2b1712")


def open_eye(iris_rx=60, iris_ry=84, pupil=(20, 36), look=0, wide=False):
    scl = '<ellipse cx="-12" cy="2" rx="86" ry="94" fill="#ffffff"/>'
    shade = '<ellipse cx="-12" cy="-70" rx="92" ry="50" fill="#d9cfd6" opacity="0.55" clip-path="url(#scl)"/>'
    cy = 8 if not wide else 4
    iris = (f'<g clip-path="url(#scl)"><ellipse cx="{look}" cy="{cy}" rx="{iris_rx}" ry="{iris_ry}" fill="url(#iris)" stroke="{LASH}" stroke-width="5"/>'
            f'<ellipse cx="{look}" cy="{cy - 4}" rx="{pupil[0]}" ry="{pupil[1]}" fill="{PUPIL}"/>')
    if not wide:
        iris += f'<ellipse cx="{look}" cy="{cy + 52}" rx="36" ry="22" fill="{IRIS[3]}" opacity="0.75"/>'
    iris += '</g>'
    k = iris_rx / 60
    hl = (f'<ellipse cx="{look + 17 * k}" cy="{cy - 50 * k}" rx="{15 * k}" ry="{19 * k}" fill="#ffffff"/>'
          f'<ellipse cx="{look - 30 * k}" cy="{cy - 30 * k}" rx="{6 * k}" ry="{7 * k}" fill="#ffffff"/>')
    return scl + shade + iris + hl + UPPER_LASH + LOWER_LID


def brow(y1, y2, x1=-72, x2=34, w=8):
    return (f'<path d="M {x1},{y1} Q {(x1 + x2) / 2},{min(y1, y2) - 9} {x2},{y2}" fill="none" '
            f'stroke="{BROW}" stroke-width="{w}" stroke-linecap="round"/>')


def spiral(turns=2.2, r0=6, r1=72):
    pts = []
    for i in range(141):
        t = i / 140; a = t * turns * 2 * math.pi; r = r0 + (r1 - r0) * t
        pts.append(f"{r * math.cos(a):.1f},{r * math.sin(a) + 4:.1f}")
    return f'<polyline points="{" ".join(pts)}" fill="none" stroke="{DARK}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round"/>'


def mouth(inner):
    """mouth shapes are authored around (512, 812)."""
    return f'<g transform="translate({MX - 512},{MY - 812})">{inner}</g>'


def mouth_line(d, w=5):
    return mouth(f'<path d="{d}" fill="none" stroke="{LINE}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>')


def mouth_open(d, tongue):
    return mouth(f'<clipPath id="mo"><path d="{d}"/></clipPath><path d="{d}" fill="{MOUTH_IN}"/>'
                 f'<g clip-path="url(#mo)">{tongue}</g>'
                 f'<path d="{d}" fill="none" stroke="#4a1c1c" stroke-width="4.5" stroke-linejoin="round"/>')


BY = C.get("brow_y", -150)        # resting brow height for the drawn expressions (eye-local)
half_lid = (f'<path d="M -112,-34 L 84,-20 L 82,-4 L -108,-16 Z" fill="{LASH}"/>'
            f'<path d="M -100,-30 L -130,-44 L -108,-14 Z" fill="{LASH}"/>')


def lidded(look=0, drop=0):
    """half-closed eye; drop > 0 lowers the lid further (narrower eye)."""
    eye = open_eye(look=look, iris_rx=56, iris_ry=80).replace(UPPER_LASH, "")
    if not drop: return f'<g clip-path="url(#half)">{eye}</g>' + half_lid
    return (f'<clipPath id="half{drop}"><rect x="-140" y="{-22 + drop}" width="280" height="200"/></clipPath>'
            f'<g clip-path="url(#half{drop})">{eye}</g><g transform="translate(0,{drop})">{half_lid}</g>')


EXPR = {}
nb = C.get("neutral_brow", [-212, -216, -70, 0])
if C.get("neutral", "open") == "sleepy":
    EXPR["neutral"] = both(lidded() + brow(*nb)) + mouth_line("M 458,799 Q 485,815 512,812 Q 539,815 566,799", 4.5)
else:
    EXPR["neutral"] = both(open_eye() + brow(*nb)) + mouth_line("M 458,799 Q 485,815 512,812 Q 539,815 566,799", 4.5)

happy_eye = (f'<path d="M -88,14 Q -4,-92 82,14" fill="none" stroke="{LASH}" stroke-width="15" stroke-linecap="round"/>'
             f'<path d="M -84,4 L -116,-10" fill="none" stroke="{LASH}" stroke-width="9" stroke-linecap="round"/>')
blush = "".join(f'<ellipse cx="{cx}" cy="{EYE_Y + 100 * K}" rx="{42 * K}" ry="{16 * K}" fill="#ff8f86" opacity="0.45"/>'
                for cx in (EYE_L - 55 * K, EYE_R + 55 * K))
EXPR["happy"] = (both(happy_eye + brow(BY, BY - 8, -64, 20)) + blush
                 + mouth_open("M 458,790 Q 512,802 566,790 Q 562,852 512,854 Q 462,852 458,790 Z",
                              f'<ellipse cx="512" cy="850" rx="34" ry="20" fill="{TONGUE}"/>'))

if C.get("neutral", "open") == "sleepy":      # must read differently from the sleepy neutral
    EXPR["smug"] = (eye_group(EYE_L, False, lidded(18, 34) + brow(BY + 34, BY + 52, -66, 26))
                    + eye_group(EYE_R, True, lidded(-18) + brow(BY - 44, BY - 18, -66, 26))
                    + "".join(f'<ellipse cx="{cx}" cy="{EYE_Y + 104 * K}" rx="{38 * K}" ry="{14 * K}" fill="#ff8f86" opacity="0.4"/>' for cx in (EYE_L - 50 * K, EYE_R + 50 * K))
                    + mouth(f'<path d="M 452,800 Q 492,830 536,812 Q 566,800 584,764 Q 566,822 520,830 Q 480,834 452,800 Z" fill="{MOUTH_IN}" stroke="#4a1c1c" stroke-width="4" stroke-linejoin="round"/>'
                            f'<path d="M 556,798 L 566,812 L 572,790 Z" fill="#ffffff"/>'))
else:
    EXPR["smug"] = (eye_group(EYE_L, False, lidded(16) + brow(BY + 10, BY + 22, -66, 26))
                    + eye_group(EYE_R, True, lidded(-16) + brow(BY - 26, BY, -66, 26))
                    + mouth_line("M 462,806 Q 496,826 532,814 Q 556,804 572,780", 5.5))

shock_lash = (f'<path d="M -104,-24 C -92,-88 -42,-116 10,-114 C 46,-112 70,-88 80,-54" fill="none" stroke="{LASH}" '
              f'stroke-width="9" stroke-linecap="round"/>')
shock_eye = (open_eye(iris_rx=30, iris_ry=38, pupil=(9, 13), wide=True).replace(UPPER_LASH, shock_lash)
             .replace('rx="86" ry="94" fill="#ffffff"', f'rx="88" ry="98" fill="#ffffff" stroke="{LASH}" stroke-width="4"'))
EXPR["shocked"] = (both(shock_eye + brow(BY - 18, BY - 32, -60, 24))
                   + mouth_open("M 512,782 C 540,782 544,812 544,822 C 544,846 530,858 512,858 C 494,858 480,846 480,822 C 480,812 484,782 512,782 Z",
                                f'<ellipse cx="512" cy="858" rx="24" ry="14" fill="{TONGUE}"/>'))

EXPR["dizzy"] = both(spiral() + brow(BY, BY + 8, -64, 20)) + mouth_line("M 456,808 q 14,-16 28,0 t 28,0 t 28,0 t 28,0", 5)

cry_eye = (f'<path d="M -78,-46 L 58,6 L -78,58" fill="none" stroke="{LASH}" stroke-width="15" '
           f'stroke-linecap="round" stroke-linejoin="round"/>')
tear = ('<path d="M -34,44 C -44,80 -30,110 -36,140 C -40,164 -8,170 -6,144 C -4,112 4,84 -2,46 Z" '
        'fill="url(#tear)" stroke="#4a9fe0" stroke-width="3.5" stroke-linejoin="round"/>'
        '<ellipse cx="-24" cy="78" rx="5" ry="12" fill="#ffffff" opacity="0.8"/>')
EXPR["crying"] = (both(tear + cry_eye + brow(BY + 22, BY - 10, -62, 28))
                  + mouth_open("M 466,806 Q 512,776 558,806 Q 566,856 512,856 Q 458,856 466,806 Z",
                               f'<ellipse cx="512" cy="856" rx="30" ry="16" fill="{TONGUE}"/>'))

sq_eye = (f'<path d="M -74,-50 L 50,4 L -74,58" fill="none" stroke="{LASH}" stroke-width="16" '
          f'stroke-linecap="round" stroke-linejoin="round"/>')
EXPR["squint"] = (both(sq_eye + brow(BY - 6, BY - 22, -62, 24)) + blush
                  + mouth_open("M 462,792 Q 512,800 562,792 Q 552,850 512,852 Q 472,850 462,792 Z",
                               f'<ellipse cx="512" cy="852" rx="30" ry="16" fill="{TONGUE}"/>'))
if C.get("glint"):       # eyes are hidden behind the white lenses; confident brows + smirk
    EXPR["glint"] = (eye_group(EYE_L, False, lidded(16) + brow(BY + 14, BY + 34, -66, 26))
                     + eye_group(EYE_R, True, lidded(-16) + brow(BY + 14, BY + 34, -66, 26))
                     + mouth_line("M 458,808 Q 496,830 536,814 Q 562,802 578,772", 6.5))
ORDER = ["neutral", "happy", "smug", "shocked", "dizzy", "crying", "squint"] + (["glint"] if C.get("glint") else [])

GL = ""
if C.get("bandage"):     # clean flat sticking plaster (replaces the blurry baked one)
    bd = C["bandage"]; w, h = bd.get("w", 150), bd.get("h", 58)
    GL = (f'<g transform="translate({bd["x"]},{bd["y"]}) rotate({bd.get("rot", -20)})">'
          f'<rect x="{-w / 2}" y="{-h / 2}" width="{w}" height="{h}" rx="{h * 0.36}" fill="#f6d3a4" stroke="#b9824e" stroke-width="5"/>'
          f'<rect x="{-w * 0.2}" y="{-h * 0.36}" width="{w * 0.4}" height="{h * 0.72}" rx="6" fill="#fff4dc" stroke="#d9a873" stroke-width="3.5"/>'
          + "".join(f'<circle cx="{sx * w * 0.34}" cy="{sy * h * 0.18}" r="3.2" fill="#c99560"/>' for sx in (-1, 1) for sy in (-1, 1))
          + '</g>')


def render_svg(body, name):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{N}" height="{N}" viewBox="0 0 {N} {N}">{DEFS}{body}{GL}</svg>'
    p = os.path.join(HERE, f"feat_{name}.svg")
    open(p, "w").write(svg)
    png = os.path.join(HERE, f"feat_{name}.png")
    subprocess.run(["rsvg-convert", "-w", str(N), "-h", str(N), p, "-o", png], check=True)
    a = np.asarray(Image.open(png).convert("RGBA")).astype(np.float32) / 255
    os.remove(png)
    return a


previews = []
for i, name in enumerate(ORDER):
    name_out = f"{i + 1:02d}_{name}"
    f = render_svg(EXPR[name], name)
    fa = f[..., 3:4]
    a = fa[..., 0] + patch_a * (1 - fa[..., 0])
    col = np.where(a[..., None] > 1e-4, (f[..., :3] * fa + fill * patch_a[..., None] * (1 - fa)) / np.maximum(a[..., None], 1e-4), fill)
    a = a * (1 - hair_soft)
    Image.fromarray(np.clip(np.dstack([col, a]) * 255 + 0.5, 0, 255).astype(np.uint8), "RGBA").save(os.path.join(OUT, f"face_{name_out}.png"))
    comp = rgb * (1 - a[..., None]) + col * a[..., None]
    previews.append(Image.fromarray(np.clip(comp * 255, 0, 255).astype(np.uint8)).resize((512, 512), Image.LANCZOS))
sheet = Image.new("RGB", (512 * 4, 1024), "#606060")
for i, pv in enumerate(previews):
    sheet.paste(pv, (512 * (i % 4), 512 * (i // 4)))
sheet.save(os.path.join(HERE, "preview_sheet.png"))
dbg = rgb.copy(); dbg[hair] = dbg[hair] * 0.4 + np.array([1, 0, 1]) * 0.6; dbg[skin_src] = dbg[skin_src] * 0.5 + np.array([0, 1, 0]) * 0.5
Image.fromarray((dbg * 255).astype(np.uint8)).resize((512, 512)).save(os.path.join(HERE, "mask_debug.png"))
print("ok", ORDER)
