"""Lookdev turntable (EEVEE, 120 frames, 720px, actor plays idle) -> <name>/tests/<name>_turntable.mp4.
Usage: blender -b --factory-startup --python run_turn.py -- <name> [frames_tmpdir]"""
import os, sys, tempfile
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import actor_lib as A
import lookdev as LD

args = sys.argv[sys.argv.index("--") + 1:]
name = args[0]
tmp = args[1] if len(args) > 1 else tempfile.mkdtemp(prefix=f"turn_{name}_")
P = A.paths(name)
bpy.ops.wm.open_mainfile(filepath=P["blend"])
out = LD.render_turntable(P["tests"] + f"{name}_turntable.mp4", frames=120, res=720, tmpdir=tmp)
print("TURN| done", out, flush=True)
