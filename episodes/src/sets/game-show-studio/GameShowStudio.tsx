// Game-show studio (EP04): the Blender-built GLB (assets/sets/game-show-studio, AO baked to vertex colours) plus the
// live parts: glossy stage reflections, marquee bulbs (chase / flash), the LED wall, moving heads with beams through
// the haze, the three door leaves + six mini door leaves, the prizes in the alcoves, the scoreboard screen, practicals.
// Everything is a pure function of its props (`time` = world seconds; door angles, screen text, bulb levels and
// spotlight targets come from the episode timeline).
//   const set = useSetGLB("game-show-studio");      // outside the canvas
//   <SetStage look={GAME_SHOW_LOOK} …><GameShowStudio set={set} time={t} font={FONT} … /> …actors…</SetStage>
import React, { useEffect, useMemo } from "react";
import * as THREE from "three";
import { Dust, ReflectiveFloor, VolumetricCone, type LoadedSet, type Vec3 } from "../../kit/env";
import { GAME_SHOW } from "./layout";
import { DoorLeaf, Duck, ScoreboardScreen, Trophy, type ScoreCell } from "./props";

export { GAME_SHOW } from "./layout";

const G = GAME_SHOW;
export type Prize = "trophy" | "duck";
export type BulbGroup = "door0" | "door1" | "door2" | "crest0" | "crest1" | "crest2" | "fascia" | "scoreboard" | "mini0" | "mini1";
/** brightness 0..1.5 of bulb i (of n) in a group at world time t */
export type BulbLevel = (group: BulbGroup, i: number, n: number, t: number) => number;

/** Default marquee: a three-step chase, the crests twinkle. */
export const chaseBulbs: BulbLevel = (group, i, _n, t) => {
  const step = Math.floor(t * 7);
  if (group.startsWith("crest")) return 0.65 + 0.35 * Math.sin(t * 3 + i * 1.7);
  return (i + step) % 3 === 0 ? 1.15 : 0.45;
};

export type GameShowParts = { glb?: boolean; floor?: boolean; bulbs?: boolean; led?: boolean; heads?: boolean; dust?: boolean; practicals?: boolean };

export type GameShowProps = {
  set: LoadedSet | null;
  time: number;
  font: string;
  parts?: GameShowParts;
  /** main door leaves, 0 closed .. 1 open */
  doors?: [number, number, number];
  /** glow on each main door leaf (picked highlight), 0..1 */
  doorGlow?: [number, number, number];
  /** what sits on each main pedestal */
  prizes?: [Prize, Prize, Prize];
  /** mini stages: door open amounts and prizes, [stage][door] */
  miniDoors?: [number, number, number][];
  miniPrizes?: [Prize, Prize, Prize][];
  /** trophy shine (win flash), main + mini */
  shine?: number;
  bulbs?: BulbLevel;
  scoreboard?: { title: string; cells: ScoreCell[]; brightness?: number };
  /** moving-head targets (default: slow deterministic sweep) */
  spots?: Vec3[];
  spotColors?: string[];
  /** LED wall energy: 0 calm .. 1 montage */
  ledEnergy?: number;
  /** LED wall colours (deep, mid, accent) */
  ledColors?: [string, string, string];
};

// ---------------------------------------------------------------- marquee bulbs (one instanced mesh)

type Bulb = { g: BulbGroup; i: number; n: number; p: Vec3; r: number };
const line = (a: Vec3, b: Vec3, step: number, skipFirst = false): Vec3[] => {
  const L = Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]);
  const n = Math.max(1, Math.round(L / step));
  const out: Vec3[] = [];
  for (let k = skipFirst ? 1 : 0; k <= n; k++) out.push([a[0] + ((b[0] - a[0]) * k) / n, a[1] + ((b[1] - a[1]) * k) / n, a[2] + ((b[2] - a[2]) * k) / n]);
  return out;
};
const group = (g: BulbGroup, pts: Vec3[], r: number): Bulb[] => pts.map((p, i) => ({ g, i, n: pts.length, p, r }));

export const BULBS: Bulb[] = (() => {
  const out: Bulb[] = [];
  const Y = G.stageY;
  G.doorX.forEach((cx, d) => {
    const halfW = (G.doorW + 0.06) / 2 + 0.09;
    const topY = Y + G.doorH + 0.03 + 0.09;
    const z = G.doorZ + 0.115;
    const pts = [
      ...line([cx - halfW, Y + 0.22, z], [cx - halfW, topY, z], 0.13),
      ...line([cx - halfW, topY, z], [cx + halfW, topY, z], 0.13, true),
      ...line([cx + halfW, topY, z], [cx + halfW, Y + 0.22, z], 0.13, true),
    ];
    out.push(...group(`door${d}` as BulbGroup, pts, 0.03));
    const cy = Y + G.frameH + 0.12;
    out.push(...group(`crest${d}` as BulbGroup, Array.from({ length: 12 }, (_, k) => {
      const a = (k / 12) * Math.PI * 2;
      return [cx + Math.cos(a) * 0.2, cy + Math.sin(a) * 0.2, G.doorZ + 0.125] as Vec3;
    }), 0.022));
  });
  out.push(...group("fascia", line([G.stageX[0] + 0.1, 0.155, G.stageZ[1] + 0.05], [G.stageX[1] - 0.1, 0.155, G.stageZ[1] + 0.05], 0.2), 0.026));
  {
    const [sx, sy, sz] = G.scoreboard.pos;
    const [sw, sh] = G.scoreboard.size;
    const x = (sw + 0.08) / 2 + 0.05;
    const y0 = sy - sh / 2 - 0.09;
    const y1 = sy - sh / 2 - 0.1 + sh + 0.08 + 0.05;
    const z = sz + 0.05;
    out.push(...group("scoreboard", [
      ...line([sx - x, y0, z], [sx - x, y1, z], 0.14),
      ...line([sx - x, y1, z], [sx + x, y1, z], 0.14, true),
      ...line([sx + x, y1, z], [sx + x, y0, z], 0.14, true),
      ...line([sx + x, y0, z], [sx - x, y0, z], 0.14, true).slice(0, -1),
    ], 0.026));
  }
  G.mini.centers.forEach((c, k) => {
    const bz = c[2] + G.mini.doorDz;
    const pts: Vec3[] = [];
    for (let j = 0; j < 3; j++) {
      const x = c[0] + (j - 1) * G.mini.doorGap;
      const hx = (G.mini.doorW + 0.02) / 2 + 0.025;
      const ty = G.mini.top + G.mini.doorH + 0.01 + 0.025;
      const z = bz + 0.07;
      pts.push(...line([x - hx, G.mini.top + 0.08, z], [x - hx, ty, z], 0.085), ...line([x - hx, ty, z], [x + hx, ty, z], 0.085, true), ...line([x + hx, ty, z], [x + hx, G.mini.top + 0.08, z], 0.085, true));
    }
    out.push(...group(`mini${k}` as BulbGroup, pts, 0.014));
  });
  return out;
})();

const MarqueeBulbs: React.FC<{ time: number; level: BulbLevel }> = ({ time, level }) => {
  const mesh = useMemo(() => {
    const geo = new THREE.SphereGeometry(1, 10, 8);
    const mat = new THREE.MeshBasicMaterial({ color: "#ffffff", toneMapped: false });
    const m = new THREE.InstancedMesh(geo, mat, BULBS.length);
    const o = new THREE.Object3D();
    BULBS.forEach((b, k) => {
      o.position.set(...b.p);
      o.scale.setScalar(b.r);
      o.updateMatrix();
      m.setMatrixAt(k, o.matrix);
      m.setColorAt(k, new THREE.Color(1, 1, 1));
    });
    m.frustumCulled = false;
    return m;
  }, []);
  useEffect(() => () => {
    mesh.geometry.dispose();
    (mesh.material as THREE.Material).dispose();
  }, [mesh]);
  const warm = useMemo(() => new THREE.Color("#ffd9a0"), []);
  const c = useMemo(() => new THREE.Color(), []);
  BULBS.forEach((b, k) => {
    const v = Math.max(0, level(b.g, b.i, b.n, time));
    // dim bulbs read as amber filament, lit ones as warm white pushed over 1 so bloom catches them
    c.copy(warm).multiplyScalar(0.25 + 2.4 * v);
    mesh.setColorAt(k, c);
  });
  if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  return <primitive object={mesh} />;
};

// ---------------------------------------------------------------- LED wall

const ledVert = /* glsl */ `
  varying vec2 vUv;
  void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`;
const ledFrag = /* glsl */ `
  uniform float time; uniform float energy; uniform vec2 size; uniform vec3 cA; uniform vec3 cB; uniform vec3 cC; uniform vec2 focus;
  varying vec2 vUv;
  float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
  void main() {
    vec2 p = vUv * size;
    float pitch = 0.075;
    vec2 id = floor(p / pitch);
    vec2 cell = fract(p / pitch) - 0.5;
    float led = smoothstep(0.46, 0.22, length(cell));
    vec2 q = (id + 0.5) * pitch;
    float sp = 0.35 + 1.6 * energy;
    float w = sin(q.x * 0.55 + q.y * 0.8 - time * sp) * 0.5 + 0.5;
    vec2 d = q - focus;
    float ang = atan(d.y, d.x);
    float burst = pow(cos(ang * 9.0 + time * (0.15 + 0.9 * energy)) * 0.5 + 0.5, 3.0) * smoothstep(9.0, 1.0, length(d));
    float ring = smoothstep(0.35, 0.0, abs(fract(length(d) * 0.45 - time * (0.08 + 0.5 * energy)) - 0.5) - 0.2);
    vec3 col = mix(cA, cB, w);
    col = mix(col, cC, burst * 0.45 + ring * 0.15);
    float sparkle = step(0.992 - 0.01 * energy, hash(id + floor(time * (3.0 + 6.0 * energy))));
    col += vec3(1.0, 0.82, 0.45) * sparkle * 0.9;
    float level = 0.32 + 0.25 * energy;
    gl_FragColor = vec4(col * led * level + col * 0.025, 1.0);
  }`;

const LedWall: React.FC<{ time: number; energy: number; colors: [string, string, string] }> = ({ time, energy, colors }) => {
  const w = G.ledX[1] - G.ledX[0];
  const h = G.ledY[1] - G.ledY[0];
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: ledVert,
        fragmentShader: ledFrag,
        uniforms: {
          time: { value: 0 },
          energy: { value: 0 },
          size: { value: new THREE.Vector2(w, h) },
          cA: { value: new THREE.Color() },
          cB: { value: new THREE.Color() },
          cC: { value: new THREE.Color() },
          focus: { value: new THREE.Vector2(-G.ledX[0], 3.2 - G.ledY[0]) },
        },
        toneMapped: false,
        fog: false,
      }),
    [w, h],
  );
  useEffect(() => () => mat.dispose(), [mat]);
  mat.uniforms.time.value = time;
  mat.uniforms.energy.value = energy;
  (mat.uniforms.cA.value as THREE.Color).set(colors[0]);
  (mat.uniforms.cB.value as THREE.Color).set(colors[1]);
  (mat.uniforms.cC.value as THREE.Color).set(colors[2]);
  return (
    <mesh position={[(G.ledX[0] + G.ledX[1]) / 2, (G.ledY[0] + G.ledY[1]) / 2, G.ledZ + 0.02]} material={mat}>
      <planeGeometry args={[w, h]} />
    </mesh>
  );
};

// ---------------------------------------------------------------- moving heads

const MovingHead: React.FC<{ position: Vec3; target: Vec3; color: string; time: number; index: number }> = ({ position, target, color, time, index }) => {
  const { light, tgt } = useMemo(() => {
    const l = new THREE.SpotLight(color, 55, 16, 0.22, 0.6, 1.4);
    const t = new THREE.Object3D();
    l.target = t;
    return { light: l, tgt: t };
  }, [color]);
  const dir = new THREE.Vector3(target[0] - position[0], target[1] - position[1], target[2] - position[2]);
  const L = dir.length();
  dir.normalize();
  const pan = Math.atan2(dir.x, dir.z);
  const tilt = Math.asin(Math.min(1, Math.max(-1, -dir.y)));
  // lens sits 0.16 m from the tilt axis along the beam
  const lens: Vec3 = [position[0] + dir.x * 0.16, position[1] - 0.18 + dir.y * 0.16, position[2] + dir.z * 0.16];
  light.position.set(...lens);
  tgt.position.set(...target);
  light.color.set(color);
  const body = <meshStandardMaterial color="#1b1822" roughness={0.45} metalness={0.4} />;
  return (
    <>
      <primitive object={light} />
      <primitive object={tgt} />
      <group position={position}>
        <mesh position={[0, 0.02, 0]}>
          <cylinderGeometry args={[0.12, 0.14, 0.1, 20]} />
          {body}
        </mesh>
        <group rotation={[0, pan, 0]}>
          {[-1, 1].map((s) => (
            <mesh key={s} position={[s * 0.13, -0.1, 0]}>
              <boxGeometry args={[0.03, 0.22, 0.08]} />
              {body}
            </mesh>
          ))}
          <group position={[0, -0.18, 0]} rotation={[tilt, 0, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} position={[0, 0, -0.02]}>
              <cylinderGeometry args={[0.085, 0.1, 0.26, 20]} />
              {body}
            </mesh>
            <mesh position={[0, 0, 0.112]}>
              <circleGeometry args={[0.07, 20]} />
              <meshBasicMaterial color={new THREE.Color(color).multiplyScalar(3)} toneMapped={false} />
            </mesh>
          </group>
        </group>
      </group>
      <VolumetricCone position={lens} target={target} length={L} radius={0.75} apexRadius={0.05} color={color} intensity={0.4} time={time + index * 1.7} noise={0.4} />
    </>
  );
};

/** Default spot sweep: slow figure-eights over the stage (deterministic). */
export const sweepSpots = (t: number): Vec3[] =>
  G.heads.map((h, i) => {
    const cx = i === 4 ? 6.3 : h[0] * 0.55;
    const cz = i === 4 ? -0.8 : 0.0;
    return [cx + Math.sin(t * 0.45 + i * 1.9) * 1.2, i === 4 ? 0.18 : G.stageY, cz + Math.sin(t * 0.31 + i * 2.7) * 0.9] as Vec3;
  });
const SPOT_COLORS = ["#ffe8c8", "#ff7ac0", "#c9b2ff", "#ffe8c8", "#ffd08a"];

// ---------------------------------------------------------------- floor marks (gold star discs)

const StarMark: React.FC<{ position: Vec3; radius: number }> = ({ position, radius }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 512;
    const ctx = c.getContext("2d")!;
    const star = (r0: number, r1: number) => {
      ctx.beginPath();
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2 - Math.PI / 2;
        const r = k % 2 ? r1 : r0;
        ctx.lineTo(256 + Math.cos(a) * r, 256 + Math.sin(a) * r);
      }
      ctx.closePath();
    };
    ctx.fillStyle = "#2b1a48";
    ctx.beginPath();
    ctx.arc(256, 256, 250, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = 16;
    ctx.strokeStyle = "#d8a84a";
    ctx.beginPath();
    ctx.arc(256, 256, 228, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#f0cf7a";
    star(200, 84);
    ctx.fill();
    ctx.fillStyle = "#ffe7a8";
    star(120, 50);
    ctx.fill();
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, []);
  useEffect(() => () => tex.dispose(), [tex]);
  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <circleGeometry args={[radius, 64]} />
      <meshStandardMaterial map={tex} roughness={0.35} metalness={0.2} transparent emissive="#ffcf6a" emissiveMap={tex} emissiveIntensity={0.15} />
    </mesh>
  );
};

// ---------------------------------------------------------------- crest numerals

const CrestNumeral: React.FC<{ label: string; font: string; position: Vec3 }> = ({ label, font, position }) => {
  const tex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return { c, t };
  }, []);
  useEffect(() => () => tex.t.dispose(), [tex]);
  {
    const ctx = tex.c.getContext("2d")!;
    ctx.fillStyle = "#2c1748";
    ctx.fillRect(0, 0, 128, 128);
    ctx.fillStyle = "#ffe08a";
    ctx.shadowColor = "#ffb43a";
    ctx.shadowBlur = 10;
    ctx.font = `700 100px ${font}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(label, 64, 72);
    tex.t.needsUpdate = true;
  }
  return (
    <mesh position={position}>
      <circleGeometry args={[0.155, 36]} />
      <meshBasicMaterial map={tex.t} toneMapped={false} color={new THREE.Color(1.6, 1.6, 1.6)} />
    </mesh>
  );
};

// ---------------------------------------------------------------- the set

export const GameShowStudio: React.FC<GameShowProps> = ({
  set,
  time,
  font,
  parts = {},
  doors = [0, 0, 0],
  doorGlow = [0, 0, 0],
  prizes,
  miniDoors = [
    [0, 0, 0],
    [0, 0, 0],
  ],
  miniPrizes,
  shine = 0,
  bulbs = chaseBulbs,
  scoreboard = { title: "THREE DOORS", cells: [] },
  spots,
  spotColors = SPOT_COLORS,
  ledEnergy = 0,
  ledColors = ["#2a0f52", "#5a1f8a", "#d8418f"],
}) => {
  const on = { glb: true, floor: true, bulbs: true, led: true, heads: true, dust: true, practicals: true, ...parts };
  const targets = spots ?? sweepSpots(time);
  const Y = G.stageY;
  const [sx0, sx1] = G.stageX;
  const [sz0, sz1] = G.stageZ;
  return (
    <>
      {set && on.glb ? <primitive object={set.scene} /> : null}
      {on.floor ? (
        <ReflectiveFloor position={[(sx0 + sx1) / 2, Y + 0.002, (sz0 + sz1) / 2]} size={[sx1 - sx0, sz1 - sz0]} color="#3a2462" roughness={0.32} mirror={0.6} blur={[300, 90]} resolution={1024} />
      ) : null}
      <StarMark position={[G.playerMark[0], Y + 0.006, G.playerMark[2]]} radius={0.45} />
      <StarMark position={[G.zuzuSpot[0], Y + 0.006, G.zuzuSpot[2]]} radius={0.34} />
      {on.led ? <LedWall time={time} energy={ledEnergy} colors={ledColors} /> : null}
      {on.bulbs ? <MarqueeBulbs time={time} level={bulbs} /> : null}
      {/* scoreboard screen */}
      <group position={[G.scoreboard.pos[0], G.scoreboard.pos[1], G.scoreboard.pos[2] + 0.035]}>
        <ScoreboardScreen size={G.scoreboard.size} font={font} title={scoreboard.title} cells={scoreboard.cells} brightness={scoreboard.brightness ?? 1} />
      </group>
      {/* the three doors: leaves on their hinges, numerals in the crests, prizes on the pedestals */}
      {G.doorX.map((cx, d) => (
        <React.Fragment key={d}>
          <group position={[cx - G.doorW / 2, Y + 0.005, G.doorZ - 0.03]}>
            <DoorLeaf width={G.doorW} height={G.doorH} color={G.doorColors[d]} label={String(d + 1)} font={font} open={doors[d]} glow={doorGlow[d]} />
          </group>
          <CrestNumeral label={String(d + 1)} font={font} position={[cx, Y + G.frameH + 0.12, G.doorZ + 0.118]} />
          {prizes ? (
            prizes[d] === "trophy" ? (
              <Trophy position={[cx, G.pedestal.top + 0.1, G.pedestal.z]} scale={0.95} shine={shine} />
            ) : (
              <Duck position={[cx, G.pedestal.top, G.pedestal.z]} scale={1.05} yaw={-Math.PI / 2 + 0.35} />
            )
          ) : null}
          {on.practicals ? (
            <pointLight position={[cx, Y + G.doorH - 0.25, G.pedestal.z + 0.2]} color={prizes?.[d] === "trophy" ? "#ffd08a" : "#ff9ad0"} intensity={0.4 + 2.2 * doors[d]} distance={2.2} decay={1.6} />
          ) : null}
        </React.Fragment>
      ))}
      {/* mini stages: door leaves + prizes */}
      {G.mini.centers.map((c, k) =>
        [0, 1, 2].map((j) => {
          const x = c[0] + (j - 1) * G.mini.doorGap;
          const bz = c[2] + G.mini.doorDz;
          const p = miniPrizes?.[k]?.[j];
          return (
            <React.Fragment key={`${k}${j}`}>
              <group position={[x - G.mini.doorW / 2, G.mini.top + 0.003, bz - 0.02]}>
                <DoorLeaf width={G.mini.doorW} height={G.mini.doorH} color={G.doorColors[j]} label={String(j + 1)} font={font} open={miniDoors[k]?.[j] ?? 0} thickness={0.03} />
              </group>
              {p === "trophy" ? <Trophy position={[x, G.mini.top + 0.035, bz - 0.15]} scale={0.42} shine={shine} /> : null}
              {p === "duck" ? <Duck position={[x, G.mini.top, bz - 0.15]} scale={0.5} yaw={-Math.PI / 2 + 0.3} /> : null}
            </React.Fragment>
          );
        }),
      )}
      {on.heads ? G.heads.map((h, i) => <MovingHead key={i} index={i} position={h} target={targets[i]} color={spotColors[i % spotColors.length]} time={time} />) : null}
      {on.practicals ? (
        <>
          {/* marquee glow on the stage + door wall */}
          {G.doorX.map((cx) => (
            <pointLight key={cx} position={[cx, Y + 1.3, G.doorZ + 0.55]} color="#ffcf8f" intensity={0.9} distance={2.4} decay={1.8} />
          ))}
          {/* scoreboard spill */}
          <pointLight position={[0, G.scoreboard.pos[1] - 0.2, G.scoreboard.pos[2] + 0.8]} color="#c9a0ff" intensity={1.2} distance={3.5} decay={1.6} />
          {/* LED wall spill on the wings + mini stages */}
          <pointLight position={[6.3, 2.2, G.ledZ + 1.2]} color="#b05cff" intensity={1.6} distance={5} decay={1.5} />
          <pointLight position={[-5.0, 2.2, G.ledZ + 1.2]} color="#ff5fb4" intensity={1.2} distance={5} decay={1.5} />
          {/* mini stage marquee glow */}
          {G.mini.centers.map((c, k) => (
            <pointLight key={k} position={[c[0], 0.8, c[2] + 0.2]} color="#ffcf8f" intensity={0.7} distance={1.8} decay={1.8} />
          ))}
          {/* tally lights on the studio cameras */}
          {G.cameras.map((cam, k) => (
            <mesh key={k} position={[cam.pos[0] + Math.sin(cam.rotY) * 0.18, 1.52, cam.pos[2] + Math.cos(cam.rotY) * 0.18]}>
              <sphereGeometry args={[0.025, 12, 10]} />
              <meshBasicMaterial color={new THREE.Color(3, 0.3, 0.45)} toneMapped={false} />
            </mesh>
          ))}
        </>
      ) : null}
      {on.dust ? (
        <>
          <Dust center={[0, 2.4, -0.2]} size={[8, 4.5, 4]} count={420} seed={404} time={time} pointSize={7} opacity={0.3} speed={0.25} color="#ffe6c8" />
          <Dust center={[6.3, 2.0, -0.8]} size={[4, 4, 3]} count={160} seed={405} time={time} pointSize={7} opacity={0.25} speed={0.25} color="#ffd9f0" />
        </>
      ) : null}
    </>
  );
};
