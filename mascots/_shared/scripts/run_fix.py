"""Rebuild only some Mixamo clips of an existing <name>_actor.blend (anti-clip included), re-export the GLB
and update _shared/build/<name>/actor_report.json.
Usage: blender -b --factory-startup --python run_fix.py -- <name> <clip1,clip2,...>
Clips: push sad dizzy float_sleep foot_tap throw point cheer panic_fall sit"""
import json, os, sys
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import actor_lib as A

args = sys.argv[sys.argv.index("--") + 1:]
name, clips = args[0], args[1].split(",")
P = A.paths(name)
bpy.ops.wm.open_mainfile(filepath=P["blend"])
bpy.context.scene["actor_rig"] = f"{name}_rig"
bpy.context.scene["actor_body"] = f"{name}_body"
report = P["build"] + "actor_report.json"
rp = json.load(open(report))
for k, (fr, loop) in A.mixamo_recipes(only=clips).items():
    fr, ac = A.anti_clip(fr, max_deg=85)
    info = A.write_action(k, fr, loop); info["anticlip"] = ac; rp["clips"][k] = info
    print("FIX|", name, k, ac, flush=True)
rp["export"] = A.export_glb(name)
bpy.ops.wm.save_mainfile()
json.dump(rp, open(report, "w"), indent=1, default=str)
