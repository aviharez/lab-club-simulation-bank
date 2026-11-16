"""Print walk/run ground speed (units/s at height 1) of an exported actor as one JSON line: SPEED|{...}
Usage: blender -b --factory-startup --python run_speed.py -- <name>"""
import json, os, sys
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import actor_lib as A

name = sys.argv[sys.argv.index("--") + 1]
bpy.ops.wm.open_mainfile(filepath=A.paths(name)["blend"])
bpy.context.scene["actor_rig"] = f"{name}_rig"
bpy.context.scene["actor_body"] = f"{name}_body"
print("SPEED|" + json.dumps({"name": name, "walk": A.locomotion_speed("walk"), "run": A.locomotion_speed("run")}), flush=True)
