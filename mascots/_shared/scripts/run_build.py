"""Full actor pipeline for one character: <name>.blend -> <name>_actor.blend + <name>_actor.glb.
Usage: blender -b --factory-startup --python run_build.py -- <name>"""
import os, sys
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import actor_lib as A

name = sys.argv[sys.argv.index("--") + 1]
r = A.build(name, log=lambda s: print("BUILD|", s, flush=True))
print("BUILD| DONE", r["seconds"], "s", r["export"], flush=True)
