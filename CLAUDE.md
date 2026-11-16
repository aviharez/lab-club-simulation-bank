# Lab Club — project guide for Claude Code

Lab Club is a faceless short-video channel: four chibi anime mascots act out science experiments
(physics, math, probability, computer science) in a colorful 3D lab. Videos are built from code
(Remotion + three.js), never generated video. Vertical 1080×1920, 30 fps, 35–50 s, English on-screen text.

Episode prompts that say "Follow SERIES_RULES.md" mean the **Series rules** section of this file.

## Repository map

| Path | What it is |
| --- | --- |
| `mascots/manifest.json` | Single source of truth for mascots: colors, GLB paths, clips (duration, loop, speed), face material, expression textures, actor conventions |
| `mascots/<name>/model/` | `<name>.blend` (rigged source, never modify), `<name>_actor.blend`, `<name>_actor.glb` |
| `mascots/_shared/scripts/` | Rebuild pipeline (`rebuild.sh`; `run_proc.py` rebuilds/previews only the hand-keyed clips), see its README. Needs Blender 5.2 |
| `assets/sets/<name>/` | Set sources: `<name>.blend`, `<name>.glb` and the Blender build script. Copied to `episodes/public/sets/` by `npm run sync-sets` |
| `assets/sets/_shared/set_lib.py` | Shared Blender helpers for set builds (three.js coordinates, boxes/cylinders/tubes/text, generated textures, AO bake + join + GLB export in `finish()`). New set scripts import it |
| `audio/final/` | Approved audio library: `voices/<name>/<name>_<reaction>.mp3`, `sfx/{ui,body,lab,objects}/<name>.mp3`, `music/<name>.mp3` |
| `audio/audio_manifest.json` | Every final audio file: type, character, reaction, text, duration, loop flag, LUFS |
| `audio/_takes/` | Unused takes (and `unused/placeholders_jump/`, the old EP01 placeholder audio). Never reference from episodes |
| `episodes/` | Remotion project (React + TypeScript, `@remotion/three`) |
| `episodes/src/jump/` | EP01 "Same Jump, Different Planets" (`SameJump` composition) |
| `episodes/src/kit/` | Episode kit: theme, cast (`useCast`), motion, `CountUp`, seeded random, `Soundtrack`/`soundtrackOnly`, report helpers (`createReport`), camera model; `overlays/` (CaptionPills, Countdown, Badge, ResultCards, RevealCard, CtaCard, ChartPanel with log axes, MangaSymbols) |
| `episodes/src/kit/env/` | Environment kit: `LookPreset` (tone mapping, exposure, fog, light rig, post), `SetStage`, `SetPost`, `VolumetricCone`, `Dust`, `Caustics`, `ReflectiveFloor`, `GradientSky`/`ParallaxLayers`, `useSetGLB`, `SetLookdev` (3 lookdev stills), `PostReady` gate |
| `episodes/src/_template/` | Starting point for a new episode (data, timeline, camera, Scene3D, overlays, sound, report). See "New episode checklist" |
| `episodes/src/sets/<name>/` | One folder per set: r3f wrapper (practicals, haze, animated parts), `look.ts` preset, `<Set>Lookdev` composition. `lab/` is the original candy lab (its `GravityChambers` and `ControlPanel` are still used by EP01); `home-lab-v2/` is the upgraded home lab; `gravity-lab/` is EP01's purpose-built set (observatory hall at dusk) |
| `episodes/src/audio/` | Audio for all episodes: `library.ts` (typed `voice()`, `sfx()`, `music()` from the manifest), `voiceCues.ts` (voices from the acting), `mix.ts` (cue model, ducking, headroom) |
| `episodes/public/audio/lib/` | Mirror of `audio/final/` made by `npm run sync-audio`. Never edit by hand |
| `episodes/src/actors/` | `Actor` component (GLB + clip + expression) and actor test compositions. Clips per mascot: idle, walk, run, point, cheer, sad, dizzy, sit, throw, push, foot_tap, float_sleep, panic_fall, land_squash, jump_crouch/air/land, plus hold_drop (prop released at frame 27), carry, compare, spin_overhead, pull_rope, push_hands, slide, hold_sign, sleep_stand |
| `episodes/scripts/master.sh` | Masters a picture + mix WAV to -14 LUFS / -1.5 dBTP (used by every `render:<slug>` script) |
| `episodes/src/components/` | Shared 2D pieces: `MangaSymbol`, remocn components in `remocn/` (edited locally, see file headers) |

## Commands (run in `episodes/`)

```bash
npm run dev            # Remotion Studio
npm run sync-mascots   # copy mascots/manifest.json + GLBs/textures into public/mascots
npm run sync-audio     # copy audio/final + manifest into public/audio/lib, regenerate src/audio/library.generated.ts
npm run sync-sets      # copy assets/sets/<name>/<name>.glb into public/sets
npm run lookdev:home-lab-v2  # 3 lookdev stills → out/lookdev/home-lab-v2
npm run lookdev:gravity-lab  # same for EP01's set
npm run report:jump    # EP01 physics table, cue sheet, checks, loudness of the rendered files
npm run render:jump    # EP01 picture + both masters → out/same-jump-different-planets{,_nomusic}.mp4
npm run render:jump:full     # re-mix + re-master the full version only (reuses the rendered picture)
npm run render:jump:nomusic  # same for the no-music version (SFX + voices)
npm run lint           # eslint + tsc
```

Render with `--gl=angle-egl` (already in the scripts); the 3D scenes need it headless.

## Cast

| Name | Color | Look | Personality → typical role |
| --- | --- | --- | --- |
| Lumi | blue | bob hair, thin round glasses | calm genius → lab operator, delivers the reveal card with the `glint` expression |
| Zuzu | yellow | twin tails, ahoge, cheek bandage | clumsy, energetic underdog → gets launched, dizzy, or makes the comeback |
| Anna | pink | high ponytail, lab goggles, star clip | overconfident leader → bets loudly, usually wrong |
| Miyu | purple | cat-ear hoodie, sleepy eyes | quiet, sleepy → wins quietly, falls asleep at the worst moment |

Never use the old names (kiri, momo, nova, sora) in code, files or on screen. Never use characters, logos or music
owned by others.

## Series rules

1. **Mascots are actors, not decorations.** They move, act and react inside the scene. During key moments each
   mascot is at least ~1/5 of the frame height or shown in a close-up.
2. **Determinism.** Everything is driven by `useCurrentFrame()`. GLB animation uses `THREE.AnimationMixer` with
   `mixer.setTime(...)` computed from the frame, never a real-time clock. Randomness is always seeded.
   Simulations are pure functions precomputed before rendering.
3. **Honesty.** Every number on screen comes from a formula or the simulation, never from sampled frames or
   hand-typed values. Same rounding everywhere; count-ups end exactly on the final value. Simplifications are
   labelled on screen ("2x SLOW-MO", "no friction", "simplified air drag"). Each episode has a report script that
   prints the data table and PASS/FAIL checks.
4. **Look.** Mascots: soft 3D figurine style, no outlines, matte MeshStandardMaterial, faces always bright (see actor_conventions.face). Environments: every episode gets a purpose-built set designed for its topic, following the ENVIRONMENT brief in its prompt. Sets do not have to be colorful, but they must meet the Environment quality bar.
5. **Layout.** Safe areas: top 150 px, bottom 300 px. Readable text ≥ ~28 px. Top caption pill per beat; optional
   bottom notebook panel for live charts/counters.
6. **Episode structure.** Hook question + "Guess first!" (0–3 s) → setup → experiment → twist at ~60% → results →
   reveal card by Lumi (glint) → CTA question for comments. At least two mascots bet on opposite outcomes; always
   a moving counter, timer or live chart; escalation.
7. **Tooling.** Remotion skills (`/remotion-best-practices`, `/remotion-render`), motion-design skill for timing,
   easing, choreography and acting, remocn only for 2D text/caption animations and transitions (never the
   `/remocn:video` workflow), blender-skills + Blender MCP only for new props, clips or expressions.
8. **Outputs per episode.** Preview MP4, 8 stills at the main beats, the report (data table + checks), and the
   cue sheet (audio).

## Audio rules

- Use only files from `audio/final/` (ElevenLabs, commercial license). Do not use `audio/_takes/` or any placeholder
  audio in a final render.
- Voices are short non-verbal/Japanese interjections (see `text`/`romaji` in the audio manifest). Each character
  only uses her own voice folder. Voices play at normal speed even during slow-mo.
- One voice at a time by default; allow overlaps only for group moments (e.g. CTA cheer), staggered 3–6 frames.
- Voice reactions follow the acting: when an actor's expression or clip changes to a reaction-worthy state, the
  matching reaction plays (with a cooldown so the same reaction does not repeat within ~1.5 s).
- Mix hierarchy: voices > key SFX > ambient SFX > music. Music sits around 15–25% and ducks under voices, the
  countdown, big impacts and the reveal line. Loops (`loop: true` in the manifest) crossfade at bar lines.
- Mastering: `scripts/master.sh` normalizes to -14 LUFS / -1.5 dBTP for social platforms.
- Export two versions of each episode: full (music + SFX + voices) and no-music (SFX + voices) for IG/TikTok.
- Every cue is pure data derived from the same timeline as the picture, and the report prints the cue sheet and
  fails if a referenced file is missing.

## Environment quality bar
1. Concept and mood: a named location, a 3-5 color palette and a light story (time of day, practical lights) that fit the topic.
2. Lighting design: key + fill + rim, at least one practical light source in frame, soft shadows, haze or atmosphere where it fits.
3. Depth: foreground framing elements, midground action, a detailed background; camera moves reveal parallax.
4. Detail and materials: no flat empty walls or floors. Bevels, trims, panel lines, decals, cables, posters, wear; varied materials (wood, metal, glass, fabric, tile) with roughness variation.
5. A hero set piece the episode is built around, readable at phone size.
6. Mascots stay the focal point: the background has slightly lower contrast and saturation, and rim light separates the mascots from it.
7. Original designs only: no real brands, logos or copyrighted characters on posters, screens or decals.
8. Lookdev first: render 3 stills (wide, 3/4, close-up with a mascot) and get approval before animating.
9. Budget: about 300k triangles per set at most, textures up to 2048 px, bake AO/lighting in Blender when it helps.

## New episode checklist
1. Copy src/_template/ to src/<slug>/. Register <Pascal> and <Pascal>Audio in Root.tsx. Add npm scripts report:<slug> and render:<slug> (:video, :full, :nomusic) using scripts/master.sh.
2. Data first: pure, seeded functions in <slug>/data.ts (formulas or simulation). The report prints the data table and PASS/FAIL checks against the numbers in the episode prompt.
3. Environment: build the episode's set from its ENVIRONMENT brief and the Environment quality bar. Render the lookdev stills and wait for approval before animating.
4. timeline.ts: BEAT frames, ACTING per mascot (clip, expression, symbols) and CAPTIONS, all derived from data.ts.
5. Scene3D: the episode set + Actor. Props reused by later episodes go to src/sets/<set>/props/ or a shared props folder.
6. Overlays: only src/kit components.
7. sound.ts: music plan, SFX cues and voice rules (src/audio/voiceCues) using only library names. The report prints the cue sheet and fails on missing files, voice overlaps outside a group, or repeats inside the cooldown.
8. Render both versions and 8 stills to out/<slug>/. Check: each mascot readable (>= ~1/5 frame height or close-up at key beats), text >= ~28 px inside safe areas, on-screen numbers equal the report, 35-50 s.

## Working agreements

- Never delete assets; move old or unused files to an `_archive/` or `_takes/` folder.
- Do not modify `mascots/<name>/model/<name>.blend`; rebuild actors with the scripts.
- After changing mascots, run `npm run sync-mascots`. After changing audio, run `npm run sync-audio`. After
  changing a set GLB, run `npm run sync-sets`.
- Show a plan before large renames or moves. Keep renders out of git (`episodes/out/` is ignored).
