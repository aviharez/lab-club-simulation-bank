# Lab Club episodes (Remotion)

```bash
npm run sync-mascots   # copy ../mascots/manifest.json + GLBs/textures into public/mascots
npm run dev            # Remotion Studio → SameJump, ActorTests/*
npm run report:jump    # EP01 physics table + cue sheet + PASS/FAIL checks (same code the video uses)
npm run render:jump    # EP01 render + mastering → out/same-jump-different-planets.mp4
```

## Layout

- `src/jump/` is EP01 "Same Jump, Different Planets": `timeline.ts` (beats, physics, per-frame acting for each
  mascot), `physics.ts`, `camera.ts`, `Scene3D.tsx`, `Overlays.tsx` (captions, readouts, result and reveal cards),
  `sound.ts` + `Soundtrack.tsx` (cue sheet and audio).
- `src/sets/lab/` is the reusable 3D lab set (room, props, control panel, gravity chambers).
- `src/actors/` holds the `Actor` component (mascot GLB + clip + expression) and the actor test compositions.
- `src/components/` holds shared 2D pieces: `MangaSymbol` and the remocn components in `remocn/`
  (`spring-scale-in`, edited locally; see its header).

## New episode

Create `src/<episode>/` next to `src/jump/` with its own timeline, scene, overlays and cue sheet, reuse
`src/sets/lab/`, `src/actors/` and `src/components/`, register a `<Composition>` in `src/Root.tsx`, and add
`report:<episode>` / `render:<episode>` scripts. See the root `CLAUDE.md` for the series rules.

`remotion.config.ts` sets the GL backend so the 3D scenes render headless.
