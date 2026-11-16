// Copies set GLBs from ../assets/sets/<name>/<name>.glb into public/sets/<name>/ so staticFile() can serve them.
// Only the GLB (and an optional textures/ folder) is copied; .blend sources and build scripts stay in assets/.
import fs from "node:fs";
import path from "node:path";

const root = path.resolve(import.meta.dirname, "..");
const src = path.resolve(root, "..", "assets", "sets");
const dst = path.join(root, "public", "sets");
let n = 0;
for (const name of fs.existsSync(src) ? fs.readdirSync(src) : []) {
  const glb = path.join(src, name, `${name}.glb`);
  if (!fs.existsSync(glb)) continue;
  fs.mkdirSync(path.join(dst, name), { recursive: true });
  fs.copyFileSync(glb, path.join(dst, name, `${name}.glb`));
  const tex = path.join(src, name, "textures");
  if (fs.existsSync(tex)) fs.cpSync(tex, path.join(dst, name, "textures"), { recursive: true });
  n++;
}
console.log(`synced ${n} set(s) -> public/sets`);
