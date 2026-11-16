// Copies manifest.json + sprites from ../mascots into public/mascots so staticFile() can serve them.
// Only the sprites folders are copied (the source tree also holds large work/blend files).
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.resolve(root, "..", "mascots");
const dst = path.join(root, "public", "mascots");
const manifest = JSON.parse(fs.readFileSync(path.join(src, "manifest.json"), "utf8"));
fs.mkdirSync(dst, { recursive: true });
fs.copyFileSync(path.join(src, "manifest.json"), path.join(dst, "manifest.json"));
let n = 0;
let a = 0;
let t = 0;
for (const name of Object.keys(manifest.characters)) {
  const from = path.join(src, name, "sprites");
  const to = path.join(dst, name, "sprites");
  fs.mkdirSync(to, { recursive: true });
  for (const f of fs.readdirSync(from)) {
    if (!f.endsWith(".png")) continue;
    fs.copyFileSync(path.join(from, f), path.join(to, f));
    n++;
  }
  // 3D actor: <name>/model/<name>_actor.glb + model/textures/*.png (expressions, lenses)
  const actor = manifest.characters[name].actor;
  if (actor) {
    fs.mkdirSync(path.join(dst, name, "model", "textures"), { recursive: true });
    fs.copyFileSync(path.join(src, actor.glb), path.join(dst, actor.glb));
    a++;
    const tex = path.join(src, name, "model", "textures");
    for (const f of fs.readdirSync(tex)) {
      if (!f.endsWith(".png")) continue;
      fs.copyFileSync(path.join(tex, f), path.join(dst, name, "model", "textures", f));
      t++;
    }
  }
}
console.log(`synced manifest + ${n} sprites + ${a} actors (${t} textures) -> public/mascots`);
