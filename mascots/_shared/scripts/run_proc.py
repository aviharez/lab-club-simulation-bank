"""Build only the hand-keyed clips (actor_lib.PROC_CLIPS) into an existing <name>_actor.blend, with the
coat-clearance + anti-clip passes, re-export the GLB and update _shared/build/<name>/actor_report.json.
Usage: blender -b --factory-startup --python run_proc.py -- <name> [clip1,clip2,...|all] [--preview=<dir>] [--no-save]
--preview renders Workbench contact frames (front + side) of each clip to <dir> before anything is saved."""
import glob, json, os, sys
import bpy
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import actor_lib as A

args = sys.argv[sys.argv.index("--") + 1:]
name = args[0]
pos = [x for x in args[1:] if not x.startswith("--")]
clips = A.PROC_CLIPS if not pos or pos[0] == "all" else pos[0].split(",")
prev = next((x.split("=", 1)[1] for x in args if x.startswith("--preview=")), None)
save = "--no-save" not in args
P = A.paths(name)
bpy.ops.wm.open_mainfile(filepath=P["blend"])
bpy.context.scene["actor_rig"] = f"{name}_rig"
bpy.context.scene["actor_body"] = f"{name}_body"
glb = glob.glob(A.ROOT + f"_shared/build/{name}/tripo_anim/tripo-out/{name}-anim5-*/model.glb")[0]
tc = A.tripo_clips(glb)
report = P["build"] + "actor_report.json"
rp = json.load(open(report))
for k, (fr, loop) in A.procedural_recipes(tc, only=clips).items():
    fr, cc = A.coat_clearance(fr)
    fr, ac = A.anti_clip(fr, max_deg=85)
    if prev: A.preview_frames(fr, prev, f"{name}_{k}", n=6, res=300, ortho=1.0,
                               views=(("front", (4, 0, 0.5)), ("right", (0.4, -4, 0.5)), ("q34", (3, -2.6, 0.9))))
    info = A.write_action(k, fr, loop); info["anticlip"] = ac; info["coat"] = cc; rp["clips"][k] = info
    print("PROC|", name, k, info["frames"], "loop" if loop else "once", "coat", cc, "anticlip", ac, flush=True)
if save:
    rp["export"] = A.export_glb(name)
    bpy.ops.wm.save_mainfile()
    json.dump(rp, open(report, "w"), indent=1, default=str)
