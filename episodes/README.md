# Math Race episodes (Remotion)

```bash
npm run sync-mascots   # copy ../mascots/manifest.json + sprites into public/mascots
npm run dev            # Remotion Studio  → http://localhost:3000/MathRace
npm run report         # round log + SFX cue sheet + PASS/FAIL checks (same sim the video uses)
npm run render         # out/math-race-ep01.mp4
```

## Layout

- `src/mathrace/sim.ts` is the pure, deterministic simulation (seeded PRNG, no React). It returns the event timeline: rounds, hit windows, wall breaks, overtake, finish, SFX cues and duration.
- `src/episodes/ep01-math-race.ts` holds everything specific to one episode: rules, walls, timing, expression cues, captions, ending text, audio paths and expected results.
- `src/mathrace/components/` holds the reusable components: `Lane`, `HeaderCards`/`RoundPill`, `Mascot`, `MangaSymbol`, `Captions`, `RevealCard`, plus effects.
- `src/components/remocn/` holds the remocn presentation pieces (spring-scale-in, number-wheel odometer, warp-cream background, iris-wipe). Two were edited locally; see the comments at the top of those files.

## New episode

1. Copy `src/episodes/ep01-math-race.ts`, then change `id`, the `rule`s, `walls`, `roundSeconds`, cues and texts.
2. Register the new file in `src/episodes/index.ts`.
3. Pass `{"episodeId": "ep02"}` as props, or add a second `<Composition>` in `src/Root.tsx`.
4. Run `npm run report` and check that the `expect` block passes.

## Audio

Audio slots are empty placeholders. To fill one, put the files in `public/audio/` and set `audio.music` / `audio.sfx.{hit,crack,whoosh,win}` in the episode config. They then play at the frames in the cue sheet.

The background is a WebGL shader. `remotion.config.ts` sets `swangle` so it renders headless.
