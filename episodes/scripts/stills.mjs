// Render several stills of one composition with a single bundle (much faster than repeated `remotion still`).
// Usage: node scripts/stills.mjs <CompositionId> <outDir> <frame,frame,...> [--props='{"k":1}'] [--scale=0.5]
// Writes <outDir>/f<frame>.png. Uses the angle-egl GL backend the 3D scenes need headless.
import { bundle } from "@remotion/bundler";
import { renderStill, selectComposition } from "@remotion/renderer";
import fs from "node:fs";
import path from "node:path";

const [id, outDir, framesArg, ...rest] = process.argv.slice(2);
if (!id || !outDir || !framesArg) {
  console.error(
    "usage: node scripts/stills.mjs <CompositionId> <outDir> <f1,f2,...> [--props=json] [--scale=s]",
  );
  process.exit(2);
}
const opt = (k) =>
  rest.find((a) => a.startsWith(`--${k}=`))?.slice(k.length + 3);
const inputProps = opt("props") ? JSON.parse(opt("props")) : {};
const scale = Number(opt("scale") ?? 1);
const frames = framesArg.split(",").map(Number);
const root = path.resolve(import.meta.dirname, "..");

// same "@" alias as remotion.config.ts (the Node APIs don't read the config file)
const withAlias = (config) => ({
  ...config,
  resolve: {
    ...config.resolve,
    alias: { ...(config.resolve?.alias ?? {}), "@": path.join(root, "src") },
  },
});

const serveUrl = await bundle({
  entryPoint: path.join(root, "src/index.ts"),
  publicDir: path.join(root, "public"),
  webpackOverride: withAlias,
  rspackOverride: withAlias,
  bundlerOverride: withAlias,
  rspack: true,
});
const chromiumOptions = { gl: "angle-egl" };
const composition = await selectComposition({
  serveUrl,
  id,
  inputProps,
  chromiumOptions,
});
fs.mkdirSync(outDir, { recursive: true });
const seen = {};
for (const frame of frames) {
  seen[frame] = (seen[frame] ?? 0) + 1; // repeated frames (determinism tests) get a suffix
  const output = path.join(
    outDir,
    `f${frame}${seen[frame] > 1 ? `_${seen[frame]}` : ""}.png`,
  );
  await renderStill({
    serveUrl,
    composition,
    frame,
    output,
    inputProps,
    chromiumOptions,
    scale,
    imageFormat: "png",
    overwrite: true,
    onBrowserLog: rest.includes("--log")
      ? (l) => console.log(`[browser ${l.type}] ${l.text}`)
      : undefined,
  });
  console.log(`still ${id} f${frame} -> ${path.relative(root, output)}`);
}
