// Procedural canvas textures for the lab set. Deterministic: all "random" detail uses a seeded PRNG.
import * as THREE from "three";

/** mulberry32: tiny seeded PRNG so craters, stars and dust are identical on every render. */
export const prng = (seed: number) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const cache = new Map<string, THREE.CanvasTexture>();

/** Draw once per key, reuse everywhere. */
export const canvasTexture = (key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D, w: number, h: number) => void, opts: { repeat?: [number, number]; srgb?: boolean } = {}) => {
  const hit = cache.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d")!;
  draw(ctx, w, h);
  const t = new THREE.CanvasTexture(c);
  if (opts.srgb !== false) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (opts.repeat) {
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(...opts.repeat);
  }
  cache.set(key, t);
  return t;
};

const roundRect = (ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

// ---------------------------------------------------------------- lab surfaces

/** Light (≈75-85% white) versions of the four mascot colours: lively but quieter than the mascots themselves. */
export const CANDY = {
  lilac: "#e6dcf5", // miyu
  pink: "#fde0e8", // anna
  sky: "#dcebfd", // lumi
  butter: "#fdf0c8", // zuzu
  mint: "#dcf5ea",
};

export const floorTiles = () =>
  canvasTexture(
    "floor-candy",
    512,
    512,
    (ctx, w, h) => {
      // 4x4 checker cycling through the four light mascot colours, separated by white grout
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, w, h);
      const cols = [CANDY.lilac, CANDY.pink, CANDY.sky, CANDY.butter];
      const n = 4;
      const s = w / n;
      for (let i = 0; i < n; i++)
        for (let j = 0; j < n; j++) {
          ctx.fillStyle = (i + j) % 2 ? "#fffdf8" : cols[(i + 2 * j) % 4];
          roundRect(ctx, i * s + 4, j * s + 4, s - 8, s - 8, 12);
          ctx.fill();
        }
    },
    { repeat: [9, 6] },
  );

export const wallPanels = () =>
  canvasTexture(
    "wall-candy",
    1024,
    512,
    (ctx, w, h) => {
      // vertical candy stripes in the light mascot colours, with soft white seams and a few dots
      const cols = [CANDY.pink, "#fffaf4", CANDY.sky, "#fffaf4", CANDY.butter, "#fffaf4", CANDY.lilac, "#fffaf4"];
      const sw = w / cols.length;
      cols.forEach((c, i) => {
        ctx.fillStyle = c;
        ctx.fillRect(i * sw, 0, sw, h);
      });
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < cols.length; i++) ctx.fillRect(i * sw - 2, 0, 4, h);
      ctx.fillStyle = "rgba(255,255,255,0.55)";
      for (let i = 0; i < cols.length; i += 2)
        for (let y = 40; y < h; y += 96) {
          ctx.beginPath();
          ctx.arc(i * sw + sw / 2, y, 7, 0, Math.PI * 2);
          ctx.fill();
        }
    },
    { repeat: [5, 2] },
  );

// ---------------------------------------------------------------- planet chambers

export const moonFloor = () =>
  canvasTexture("moon-floor-2", 512, 512, (ctx, w, h) => {
    const r = prng(11);
    ctx.fillStyle = "#c9cfe2";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,255,255,0.12)" : "rgba(80,90,140,0.08)";
      ctx.fillRect(r() * w, r() * h, 3, 3);
    }
    for (let i = 0; i < 26; i++) {
      const x = r() * w;
      const y = r() * h;
      const rad = 10 + r() * 46;
      const g = ctx.createRadialGradient(x - rad * 0.2, y - rad * 0.2, rad * 0.1, x, y, rad);
      g.addColorStop(0, "#aab2cf");
      g.addColorStop(0.75, "#b8bfd9");
      g.addColorStop(0.86, "#e6eaf6");
      g.addColorStop(1, "rgba(201,207,226,0)");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, rad, 0, Math.PI * 2);
      ctx.fill();
    }
  });

export const moonSky = () =>
  canvasTexture("moon-sky-2", 1024, 1024, (ctx, w, h) => {
    const r = prng(7);
    // soft grey-blue night, not black
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#4b5a98");
    g.addColorStop(0.6, "#7182bd");
    g.addColorStop(1, "#a4b1dc");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 280; i++) {
      const big = r() < 0.08;
      const s = big ? 4 : r() < 0.3 ? 2.6 : 1.6;
      ctx.fillStyle = `rgba(255,252,235,${0.6 + r() * 0.4})`;
      const x = r() * w;
      const y = r() * h * 0.88;
      ctx.beginPath();
      ctx.arc(x, y, s, 0, Math.PI * 2);
      ctx.fill();
      if (big) {
        ctx.fillRect(x - 10, y - 1, 20, 2);
        ctx.fillRect(x - 1, y - 10, 2, 20);
      }
    }
    // a little Earth on the horizon
    const ex = w * 0.68;
    const ey = h * 0.2;
    ctx.fillStyle = "#6fb6ff";
    ctx.beginPath();
    ctx.arc(ex, ey, 48, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#8fe08a";
    ctx.beginPath();
    ctx.ellipse(ex - 10, ey - 8, 22, 15, 0.4, 0, Math.PI * 2);
    ctx.fill();
    // grey-blue horizon
    ctx.fillStyle = "#c3c9e0";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.94);
    for (let x = 0; x <= w; x += 32) ctx.lineTo(x, h * 0.93 - Math.sin(x / 70) * 10 - r() * 6);
    ctx.lineTo(w, h);
    ctx.fill();
  });

export const marsFloor = () =>
  canvasTexture("mars-floor-2", 512, 512, (ctx, w, h) => {
    const r = prng(23);
    ctx.fillStyle = "#f07a4e";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 1400; i++) {
      ctx.fillStyle = r() > 0.5 ? "rgba(255,215,170,0.2)" : "rgba(170,50,30,0.14)";
      ctx.fillRect(r() * w, r() * h, 2 + r() * 3, 2 + r() * 3);
    }
    for (let i = 0; i < 30; i++) {
      ctx.fillStyle = "#cf5a38";
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 6 + r() * 10, 4 + r() * 6, r() * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  });

export const marsSky = () =>
  canvasTexture("mars-sky-2", 1024, 1024, (ctx, w, h) => {
    const r = prng(29);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#ffb07a");
    g.addColorStop(0.65, "#ff8a5c");
    g.addColorStop(1, "#ee6a45");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      ctx.fillStyle = `rgba(255,220,180,${0.1 + r() * 0.1})`;
      ctx.fillRect(0, r() * h * 0.8, w, 20 + r() * 50);
    }
    ctx.fillStyle = "rgba(255,248,225,0.95)";
    ctx.beginPath();
    ctx.arc(w * 0.3, h * 0.22, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d9552f";
    ctx.beginPath();
    ctx.moveTo(0, h);
    ctx.lineTo(0, h * 0.86);
    ctx.lineTo(w * 0.18, h * 0.86);
    ctx.lineTo(w * 0.22, h * 0.8);
    ctx.lineTo(w * 0.36, h * 0.8);
    ctx.lineTo(w * 0.4, h * 0.88);
    ctx.lineTo(w * 0.7, h * 0.88);
    ctx.lineTo(w * 0.75, h * 0.83);
    ctx.lineTo(w * 0.86, h * 0.83);
    ctx.lineTo(w * 0.9, h * 0.89);
    ctx.lineTo(w, h * 0.89);
    ctx.lineTo(w, h);
    ctx.fill();
  });

export const earthFloor = () =>
  canvasTexture("earth-floor-2", 512, 512, (ctx, w, h) => {
    const r = prng(31);
    ctx.fillStyle = "#6fd66a";
    ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 2200; i++) {
      ctx.strokeStyle = r() > 0.5 ? "rgba(40,150,60,0.4)" : "rgba(200,255,160,0.45)";
      ctx.lineWidth = 2;
      const x = r() * w;
      const y = r() * h;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + (r() - 0.5) * 6, y - 6 - r() * 6);
      ctx.stroke();
    }
    for (let i = 0; i < 16; i++) {
      const x = r() * w;
      const y = r() * h;
      ctx.fillStyle = ["#ffffff", "#ffe066", "#ff9ec0"][i % 3];
      for (let p = 0; p < 5; p++) {
        ctx.beginPath();
        ctx.arc(x + Math.cos((p / 5) * Math.PI * 2) * 5, y + Math.sin((p / 5) * Math.PI * 2) * 5, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });

export const earthSky = () =>
  canvasTexture("earth-sky-2", 1024, 1024, (ctx, w, h) => {
    const r = prng(37);
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, "#4fb0ff");
    g.addColorStop(1, "#bfe5ff");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
    const cloud = (x: number, y: number, s: number) => {
      ctx.fillStyle = "#ffffff";
      for (const [dx, dy, rr] of [
        [0, 0, 1],
        [0.9, -0.3, 0.8],
        [1.7, 0.05, 0.7],
        [-0.8, 0.1, 0.65],
      ]) {
        ctx.beginPath();
        ctx.arc(x + dx * s, y + dy * s, rr * s, 0, Math.PI * 2);
        ctx.fill();
      }
    };
    for (let i = 0; i < 7; i++) cloud(r() * w, 80 + r() * h * 0.6, 26 + r() * 26);
    ctx.fillStyle = "#5fcf63";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * 0.86 - Math.sin(x / 120) * 26);
    ctx.lineTo(w, h);
    ctx.fill();
    ctx.fillStyle = "#86e07a";
    ctx.beginPath();
    ctx.moveTo(0, h);
    for (let x = 0; x <= w; x += 16) ctx.lineTo(x, h * 0.92 - Math.sin(x / 90 + 2) * 18);
    ctx.lineTo(w, h);
    ctx.fill();
  });

export const jupiterFloor = () =>
  canvasTexture("jupiter-floor-2", 512, 512, (ctx, w, h) => {
    const r = prng(41);
    const bands = ["#ff9f45", "#ffe2b8", "#ff8a3d", "#fff0d6", "#ffb35c"];
    for (let i = 0; i < 16; i++) {
      ctx.fillStyle = bands[i % bands.length];
      ctx.fillRect(0, (i * h) / 16, w, h / 16 + 1);
    }
    for (let i = 0; i < 40; i++) {
      ctx.fillStyle = "rgba(255,248,232,0.3)";
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 20 + r() * 40, 5 + r() * 8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  });

export const jupiterSky = () =>
  canvasTexture("jupiter-sky-2", 1024, 1024, (ctx, w, h) => {
    const r = prng(43);
    // vivid orange / cream bands
    const bands = ["#ffd9a8", "#ff9a45", "#fff1dc", "#ff8236", "#ffc685", "#f2733a", "#ffe6c4"];
    let y = 0;
    let i = 0;
    while (y < h) {
      const bh = 50 + r() * 90;
      ctx.fillStyle = bands[i++ % bands.length];
      ctx.beginPath();
      ctx.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) ctx.lineTo(x, y + Math.sin(x / 90 + i) * 8);
      ctx.lineTo(w, y + bh + 10);
      ctx.lineTo(0, y + bh + 10);
      ctx.fill();
      y += bh;
    }
    for (let k = 0; k < 18; k++) {
      ctx.strokeStyle = "rgba(255,250,236,0.45)";
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.ellipse(r() * w, r() * h, 30 + r() * 50, 8 + r() * 10, 0, 0, Math.PI * 1.6);
      ctx.stroke();
    }
    ctx.fillStyle = "#e0532f";
    ctx.beginPath();
    ctx.ellipse(w * 0.62, h * 0.46, 110, 58, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#ff8a5c";
    ctx.beginPath();
    ctx.ellipse(w * 0.62, h * 0.46, 70, 34, 0, 0, Math.PI * 2);
    ctx.fill();
  });

// ---------------------------------------------------------------- text plates

export type LabelSpec = { title: string; sub: string; color: string; font: string };

/** Big label plaque on top of a chamber. */
export const labelTexture = ({ title, sub, color, font }: LabelSpec) =>
  canvasTexture(`label-${title}-${sub}`, 1024, 512, (ctx, w, h) => {
    ctx.fillStyle = "#fffaf3";
    roundRect(ctx, 8, 8, w - 16, h - 16, 70);
    ctx.fill();
    ctx.lineWidth = 16;
    ctx.strokeStyle = color;
    ctx.stroke();
    ctx.fillStyle = color;
    roundRect(ctx, 8, h - 150, w - 16, 142, 0);
    ctx.save();
    roundRect(ctx, 8, 8, w - 16, h - 16, 70);
    ctx.clip();
    ctx.fillRect(8, h - 170, w - 16, 170);
    ctx.restore();
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillStyle = "#3a2c24";
    // shrink long titles until they fit
    let size = 190;
    ctx.font = `700 ${size}px ${font}`;
    while (ctx.measureText(title).width > w - 90 && size > 60) {
      size -= 6;
      ctx.font = `700 ${size}px ${font}`;
    }
    ctx.fillText(title, w / 2, 190);
    ctx.font = `700 110px ${font}`;
    ctx.fillStyle = "#ffffff";
    ctx.fillText(sub, w / 2, h - 88);
  });

/** Height ruler strip: marks every 0.5 m, labels every 0.5 m, from 0 to `max` metres. */
export const rulerTexture = (max: number, font: string, accent: string) => {
  const pxPerM = 256;
  const H = Math.round(max * pxPerM);
  return canvasTexture(`ruler-${max}-${accent}`, 128, H, (ctx, w, h) => {
    ctx.fillStyle = "rgba(255,252,246,0.92)";
    roundRect(ctx, 0, 0, w, h, 18);
    ctx.fill();
    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 10, h);
    for (let cm = 0; cm <= max * 100; cm += 10) {
      const y = h - (cm / 100) * pxPerM;
      const major = cm % 50 === 0;
      ctx.fillStyle = "#3a2c24";
      ctx.fillRect(10, y - (major ? 3 : 1.5), major ? 52 : 22, major ? 6 : 3);
      if (major && cm > 0) {
        ctx.font = `700 34px ${font}`;
        ctx.textAlign = "left";
        ctx.textBaseline = "middle";
        ctx.fillText((cm / 100).toFixed(1), 66, Math.max(20, y));
      }
    }
  });
};

/** Whiteboard doodle: the parabola + the formula. */
export const whiteboardTexture = (font: string) =>
  canvasTexture("whiteboard", 1024, 640, (ctx, w, h) => {
    ctx.fillStyle = "#fdfdfb";
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = "#9cb7d8";
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(80, h - 90);
    ctx.lineTo(w - 60, h - 90);
    ctx.moveTo(80, h - 90);
    ctx.lineTo(80, 60);
    ctx.stroke();
    const arcs: [string, number][] = [
      ["#6e4a8f", 1],
      ["#f27096", 0.44],
      ["#80adf2", 0.17],
      ["#f2bf3b", 0.07],
    ];
    arcs.forEach(([c, k]) => {
      ctx.strokeStyle = c;
      ctx.lineWidth = 9;
      ctx.lineCap = "round";
      ctx.beginPath();
      const span = 560 * Math.sqrt(k);
      for (let i = 0; i <= 40; i++) {
        const u = i / 40;
        const x = 100 + u * span;
        const y = h - 90 - 4 * u * (1 - u) * 420 * k;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    });
    ctx.fillStyle = "#3a2c24";
    ctx.font = `600 64px ${font}`;
    ctx.fillText("h = v² / 2g", 640, 150);
    ctx.font = `600 46px ${font}`;
    ctx.fillText("T = 2v / g", 660, 240);
    ctx.fillStyle = "#e07a8f";
    ctx.font = `600 40px ${font}`;
    ctx.fillText("v = 3.13 m/s", 660, 320);
  });

/** Control panel screen. Not cached: the text changes with the beat. */
export const screenCanvas = () => {
  const c = document.createElement("canvas");
  c.width = 768;
  c.height = 384;
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return { canvas: c, texture: t };
};

export const drawScreen = (canvas: HTMLCanvasElement, font: string, lines: { text: string; size: number; color: string }[], cursor: boolean) => {
  const ctx = canvas.getContext("2d")!;
  const { width: w, height: h } = canvas;
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, "#28324a");
  g.addColorStop(1, "#1c2438");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(140,190,255,0.12)";
  ctx.lineWidth = 2;
  for (let y = 0; y < h; y += 24) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  let y = 70;
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  lines.forEach((l, i) => {
    ctx.font = `700 ${l.size}px ${font}`;
    ctx.fillStyle = l.color;
    ctx.fillText(l.text, 40, y);
    if (cursor && i === lines.length - 1) {
      const m = ctx.measureText(l.text).width;
      ctx.fillRect(48 + m, y - l.size * 0.4, l.size * 0.45, l.size * 0.8);
    }
    y += l.size * 1.5;
  });
};

// ---------------------------------------------------------------- posters

const posterFrame = (ctx: CanvasRenderingContext2D, w: number, h: number, bg: string, edge: string) => {
  ctx.fillStyle = edge;
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = bg;
  roundRect(ctx, 18, 18, w - 36, h - 36, 22);
  ctx.fill();
};

/** "Our planets" poster: the four chamber planets with their g values. */
export const planetsPoster = (font: string) =>
  canvasTexture("poster-planets", 512, 704, (ctx, w, h) => {
    posterFrame(ctx, w, h, "#3d3a78", "#fdf0c8");
    const r = prng(5);
    for (let i = 0; i < 70; i++) {
      ctx.fillStyle = `rgba(255,250,230,${0.4 + r() * 0.5})`;
      ctx.fillRect(30 + r() * (w - 60), 30 + r() * (h - 60), 3, 3);
    }
    ctx.fillStyle = "#fff6dc";
    ctx.font = `700 50px ${font}`;
    ctx.textAlign = "center";
    ctx.fillText("PLANETS", w / 2, 92);
    const ps: [string, string, number, string][] = [
      ["#c9cfe2", "Moon", 34, "1.62"],
      ["#f07a4e", "Mars", 44, "3.71"],
      ["#4fb0ff", "Earth", 56, "9.81"],
      ["#ff9f45", "Jupiter", 92, "24.79"],
    ];
    ps.forEach(([c, name, rad, g], i) => {
      const y = 170 + i * 135;
      ctx.fillStyle = c;
      ctx.beginPath();
      ctx.arc(140, y + 10, Math.min(rad, 58), 0, Math.PI * 2);
      ctx.fill();
      if (name === "Jupiter") {
        ctx.fillStyle = "rgba(255,240,214,0.85)";
        ctx.fillRect(84, y - 4, 112, 10);
        ctx.fillRect(90, y + 24, 100, 9);
      }
      if (name === "Earth") {
        ctx.fillStyle = "#6fd66a";
        ctx.beginPath();
        ctx.ellipse(126, y, 22, 16, 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.textAlign = "left";
      ctx.fillStyle = "#fff6dc";
      ctx.font = `700 40px ${font}`;
      ctx.fillText(name, 230, y + 4);
      ctx.fillStyle = "#ffd36b";
      ctx.font = `600 30px ${font}`;
      ctx.fillText(`g = ${g}`, 230, y + 42);
    });
  });

/** Atom poster on mint. */
export const atomPoster = (font: string) =>
  canvasTexture("poster-atom", 512, 704, (ctx, w, h) => {
    posterFrame(ctx, w, h, "#dcf5ea", "#f27096");
    const cx = w / 2;
    const cy = 330;
    ctx.lineWidth = 12;
    ["#6e4a8f", "#80adf2", "#f27096"].forEach((c, i) => {
      ctx.strokeStyle = c;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate((i * Math.PI) / 3);
      ctx.beginPath();
      ctx.ellipse(0, 0, 190, 70, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    });
    ctx.fillStyle = "#f2bf3b";
    ctx.beginPath();
    ctx.arc(cx, cy, 42, 0, Math.PI * 2);
    ctx.fill();
    [
      [190, 0],
      [-95, 165],
      [-95, -165],
    ].forEach(([dx, dy], i) => {
      ctx.fillStyle = ["#6e4a8f", "#80adf2", "#f27096"][i];
      ctx.beginPath();
      ctx.arc(cx + dx * 0.98, cy + dy * 0.42, 18, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.fillStyle = "#3a2c24";
    ctx.textAlign = "center";
    ctx.font = `700 64px ${font}`;
    ctx.fillText("ATOMS!", cx, 590);
    ctx.font = `600 30px ${font}`;
    ctx.fillStyle = "#6a7f76";
    ctx.fillText("tiny but mighty", cx, 636);
  });

/** Formula poster: F = ma and W = mg on butter yellow. */
export const formulaPoster = (font: string) =>
  canvasTexture("poster-formula", 512, 512, (ctx, w, h) => {
    posterFrame(ctx, w, h, "#fdf0c8", "#80adf2");
    ctx.textAlign = "center";
    ctx.fillStyle = "#3a2c24";
    ctx.font = `700 92px ${font}`;
    ctx.fillText("F = ma", w / 2, 190);
    ctx.fillStyle = "#e0577c";
    ctx.font = `700 76px ${font}`;
    ctx.fillText("W = mg", w / 2, 320);
    ctx.fillStyle = "#6e4a8f";
    ctx.font = `600 40px ${font}`;
    ctx.fillText("weight = mass × g", w / 2, 410);
  });

/** Periodic-table-style poster: a pastel grid with element symbols. */
export const periodicPoster = (font: string) =>
  canvasTexture("poster-periodic", 1024, 640, (ctx, w, h) => {
    posterFrame(ctx, w, h, "#fffaf2", "#6e4a8f");
    ctx.fillStyle = "#3a2c24";
    ctx.textAlign = "center";
    ctx.font = `700 46px ${font}`;
    ctx.fillText("PERIODIC TABLE", w / 2, 84);
    const groups = ["#fde0e8", "#dcebfd", "#fdf0c8", "#e6dcf5", "#dcf5ea", "#ffe3cf"];
    const syms = "H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se Br Kr".split(" ");
    // simplified layout: 18 columns, 4 rows, gaps where the real table has them
    const slots: [number, number][] = [];
    slots.push([0, 0], [17, 0]);
    for (const c of [0, 1, 12, 13, 14, 15, 16, 17]) slots.push([c, 1]);
    for (const c of [0, 1, 12, 13, 14, 15, 16, 17]) slots.push([c, 2]);
    for (let c = 0; c < 18; c++) slots.push([c, 3]);
    const cw = (w - 80) / 18;
    const chh = 112;
    slots.forEach(([c, rI], i) => {
      const x = 40 + c * cw;
      const y = 120 + rI * (chh + 8);
      const grp = c < 2 ? 0 : c < 12 ? 1 : c < 16 ? 2 : c === 16 ? 3 : 4;
      ctx.fillStyle = syms[i] === "H" ? groups[5] : groups[grp];
      roundRect(ctx, x + 3, y, cw - 6, chh, 8);
      ctx.fill();
      ctx.fillStyle = "#3a2c24";
      ctx.font = `700 ${syms[i]?.length > 1 ? 24 : 28}px ${font}`;
      ctx.fillText(syms[i] ?? "", x + cw / 2, y + 66);
      ctx.fillStyle = "#9a8d84";
      ctx.font = `600 14px ${font}`;
      ctx.fillText(String(i + 1), x + cw / 2, y + 26);
    });
  });
