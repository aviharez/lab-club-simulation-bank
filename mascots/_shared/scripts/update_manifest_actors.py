#!/usr/bin/env python3
"""Adds/refreshes manifest.characters[<name>].actor (3D web actor) from the exported GLBs.
Reads: <name>/model/<name>_actor.glb (via glb_inspect), _shared/build/<name>/actor_report.json.
Usage: update_manifest_actors.py '{"miyu":{"walk":0.381,"run":1.312},...}'"""
import json, os, shutil, sys
sys.path.insert(0, os.path.dirname(__file__))
from glb_inspect import inspect

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EXPR = ["neutral", "happy", "smug", "shocked", "dizzy", "crying", "squint"]
SEAMLESS_ONESHOTS = {"panic_fall"}          # one-shot by spec, but its last frame == first: code may loop it
CLIP_NOTES = {                              # hand-keyed clips (actor_lib.procedural_recipes): what code must add
    "hold_drop": "right arm reaches forward gripping a small object; the hand opens at ~60% (frames 26-30 of 46): release the prop at frame 27",
    "carry": "walk cycle with both hands at chest height in front: parent the object between the hands; travel speed = walk",
    "compare": "right hand on chin, looks to her left, then right (head turn +-26 deg, tilt 7 deg)",
    "spin_overhead": "right arm swings a vertical circle beside the body, 1 turn per loop; attach the bucket rope to R_Hand",
    "pull_rope": "hand-over-hand on a vertical rope in front of the chest, two pulls per loop; rope x ~ arm length in front",
    "push_hands": "two-hand shove (full reach at 30-45%), recoil, then back to neutral at the end",
    "slide": "gliding on ice: arms out, left foot forward, gentle sway; travel comes from code",
    "hold_sign": "hands raised beside the head with a small bounce; chibi arms cannot reach above the head, so the "
                 "sign stands on stick(s) held in the hands",
    "sleep_stand": "standing asleep: head sinks slowly, jerks up at 72-80%, settles; arms hang",
}

speeds = json.loads(sys.argv[1])
mp = os.path.join(ROOT, "manifest.json")
shutil.copyfile(mp, mp + ".bak")
m = json.load(open(mp))
m["actor_conventions"] = {
    "format": "glTF 2.0 binary, Y-up, origin at the feet, height ~1.0 (scale in code), character faces +X: set rotation.y = -Math.PI / 2 to face a camera on +Z",
    "clips": "every clip is in place: horizontal travel and jump height come from code; "
             "loop=true clips have last frame == first frame (play with THREE.LoopRepeat)",
    "speed": "walk/run speed_units_per_s = ground speed that keeps the feet planted at height 1.0 (multiply by your scale)",
    "face": "swap expressions by setting face material .map AND .emissiveMap to the expression texture "
            "(texture.flipY = false, colorSpace = SRGBColorSpace); the face is lit dimly + emissive so it stays bright",
    "material": "MeshStandardMaterial: base color map + roughness, metalness 0; doubleSided",
}
for name in m["characters"]:
    glb = os.path.join(ROOT, name, "model", f"{name}_actor.glb")
    if not os.path.exists(glb):
        continue
    g = inspect(glb)
    rep = json.load(open(os.path.join(ROOT, "_shared", "build", name, "actor_report.json")))
    clips = {}
    for k, dur in sorted(g["animations"].items()):
        c = rep["clips"].get(k, {})
        loop = bool(c.get("loop", False))
        clips[k] = {"duration": dur, "frames": c.get("frames"), "fps": 30, "loop": loop,
                    "seamless": loop or k in SEAMLESS_ONESHOTS}
        if k in CLIP_NOTES: clips[k]["note"] = CLIP_NOTES[k]
    for k, s in (("walk", "walk"), ("run", "run")):
        clips[k]["speed_units_per_s"] = speeds[name][s]
    exprs = EXPR + (["glint"] if name == "lumi" else [])
    actor = {
        "glb": f"{name}/model/{name}_actor.glb",
        "height": g["height"], "tris": g["tris"],
        "rig": f"{name}_rig", "skeleton_joints": g["skins"][0]["joints"],
        "meshes": {k: v["materials"] for k, v in g["meshes"].items()},
        "clips": clips,
        "face": {"mesh": f"{name}_face", "material": f"{name}_face_mat", "swap": ["map", "emissiveMap"],
                 "default": "neutral",
                 "expressions": {e: f"{name}/model/textures/{name}_face_{e}.png" for e in exprs}},
        "body": {"mesh": f"{name}_body", "material": f"{name}_body_mat"},
        "turntable": f"{name}/tests/{name}_turntable.mp4",
    }
    if name == "lumi":
        actor["lenses"] = {"mesh": "lumi_lenses", "material": "lumi_lens_mat", "swap": ["map", "emissiveMap"],
                           "textures": {"clear": "lumi/model/textures/lens_clear.png",
                                        "glint": "lumi/model/textures/lens_glint.png"},
                           "note": "with the 'glint' face expression also set the lens texture to 'glint'"}
        actor["glasses"] = {"mesh": "lumi_glasses", "material": "lumi_glasses_mat"}
    m["characters"][name]["actor"] = actor
json.dump(m, open(mp, "w"), indent=2, ensure_ascii=False)
print("updated", [n for n in m["characters"] if "actor" in m["characters"][n]])
