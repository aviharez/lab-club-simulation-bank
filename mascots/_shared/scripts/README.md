# Mascot 3D actors: rebuild

These scripts turn `mascots/<name>/model/<name>.blend` (the rigged source, never modified) into
`<name>_actor.blend` and `<name>_actor.glb`. The GLB holds the mesh, the armature and 17 in-place clips.
All paths are resolved from this folder, so the project can live anywhere.

## One command

```bash
mascots/_shared/scripts/rebuild.sh                 # all four characters
mascots/_shared/scripts/rebuild.sh lumi            # one character
mascots/_shared/scripts/rebuild.sh --no-turntable zuzu anna   # skip the ~4 min turntable render
mascots/_shared/scripts/rebuild.sh --tests miyu    # also render the Remotion clip/face test videos
```

For each character, the script does these steps in order:

1. **Build** (`run_build.py`, ~70 s): mesh cleanup, face split and expression bakes, PBR materials, then:
   - Tripo and Mixamo clips are retargeted and get the coat-clearance + anti-clip passes.
   - The GLB is exported.
   - The report is written to `_shared/build/<name>/actor_report.json`.
2. **Turntable** (`run_turn.py`): writes `<name>/tests/<name>_turntable.mp4`.
3. **Speeds** (`run_speed.py`) feed `update_manifest_actors.py`, which refreshes `characters.<name>.actor` in
   `manifest.json` and backs up the previous file as `manifest.json.bak`.
4. **Sync** with `episodes/scripts/sync-mascots.mjs`: copies the GLBs and textures into `episodes/public/mascots`.

Logs go to `_shared/build/logs/`. Use the `BLENDER=/path/to/blender` environment variable for a Blender that is not on PATH (built with 5.2).

## Single steps

```bash
B="blender -b --factory-startup --python"
S=mascots/_shared/scripts
$B $S/run_build.py -- miyu                   # full rebuild of one character
$B $S/run_fix.py   -- zuzu throw,panic_fall  # redo only some Mixamo clips + re-export (faster)
$B $S/run_turn.py  -- miyu                   # turntable only
$B $S/run_speed.py -- miyu                   # prints SPEED|{"walk":..,"run":..}
```

`run_fix.py` accepts these clips: push, sad, dizzy, float_sleep, foot_tap, throw, point, cheer, panic_fall, sit.
To change a clip, edit its recipe in `actor_lib.py` (`tripo_recipes`, `mixamo_recipes`, `land_squash_from_jump`).
After `run_fix.py`, re-run `rebuild.sh --no-turntable <name>` or `update_manifest_actors.py`
so the manifest durations stay in sync.

## Inputs it needs

| What | Where |
|---|---|
| Rigged source | `<name>/model/<name>.blend` |
| Clean base texture | `_shared/textures/<name>/<name>_base_clean.png` (lumi also `lens_clear/glint.png`) |
| Expression decals | `_shared/expressions/<name>/` |
| Tripo animation export | `_shared/build/<name>/tripo_anim/tripo-out/<name>-anim5-*/model.glb` |
| Mixamo FBX (in place, 30 fps) | `_shared/mixamo/*.fbx` |

## Other tools

- `glb_inspect.py file.glb` reports tris, height, clips, materials and texture sizes without opening Blender.
- `lookdev.py` holds the turntable studio setup (lights, backdrop, camera).
