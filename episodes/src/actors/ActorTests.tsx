import { ThreeCanvas } from "@remotion/three";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig, type CalculateMetadataFunction } from "remotion";
import * as THREE from "three";
import { Actor, useActor, type ActorMeta } from "./Actor";

// Test videos for the 3D actors: every clip with its name, and a face close-up cycling expressions.

const BG = "#f6ecf1";
const FPS = 30;
const ORDER = ["idle", "walk", "run", "push", "sad", "dizzy", "foot_tap", "float_sleep", "jump_crouch", "jump_air",
  "jump_land", "land_squash", "throw", "point", "cheer", "panic_fall", "sit",
  "hold_drop", "carry", "compare", "spin_overhead", "pull_rope", "push_hands", "slide", "hold_sign", "sleep_stand"];

export type ActorTestProps = { name: string; meta?: ActorMeta; color?: string };

type Seg = { clip: string; from: number; len: number };

const segments = (meta: ActorMeta): Seg[] => {
  let from = 0;
  const names = [...ORDER.filter((c) => meta.clips[c]), ...Object.keys(meta.clips).filter((c) => !ORDER.includes(c))];
  return names.map((clip) => {
    const c = meta.clips[clip];
    const sec = c.loop ? Math.min(Math.max(c.duration * 2, 2.5), 4) : c.duration + 0.6; // loops twice (max 4 s), one-shots + hold
    const len = Math.round(sec * FPS);
    const s = { clip, from, len };
    from += len;
    return s;
  });
};

const loadMeta: CalculateMetadataFunction<ActorTestProps> = async ({ props }) => {
  const m = await fetch(staticFile("mascots/manifest.json")).then((r) => r.json());
  const ch = m.characters[props.name];
  return { props: { ...props, meta: ch.actor as ActorMeta, color: ch.signature_color as string } };
};

export const calcClips: CalculateMetadataFunction<ActorTestProps> = async (args) => {
  const r = await loadMeta(args);
  const segs = segments(r.props!.meta!);
  const last = segs[segs.length - 1];
  return { ...r, durationInFrames: last.from + last.len };
};

export const calcFace: CalculateMetadataFunction<ActorTestProps> = async (args) => {
  const r = await loadMeta(args);
  return { ...r, durationInFrames: Object.keys(r.props!.meta!.face.expressions).length * 36 };
};

const Stage: React.FC<{ children: React.ReactNode; camPos: [number, number, number]; target: [number, number, number]; fov: number }> = ({ children, camPos, target, fov }) => {
  const { width, height } = useVideoConfig();
  return (
    <ThreeCanvas
      width={width}
      height={height}
      shadows={{ type: THREE.PCFShadowMap }}
      gl={{ antialias: true, toneMapping: THREE.NeutralToneMapping, toneMappingExposure: 1.0 }}
      camera={{ fov, position: camPos, near: 0.05, far: 50 }}
      onCreated={({ camera }) => camera.lookAt(...target)}
      style={{ backgroundColor: BG }}
    >
      <color attach="background" args={[BG]} />
      <hemisphereLight args={["#fff8fb", "#e6d6de", 1.6]} />
      <directionalLight
        position={[1.6, 3.2, 2.4]}
        intensity={1.9}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-radius={8}
        shadow-bias={-0.0004}
        shadow-camera-left={-1.5}
        shadow-camera-right={1.5}
        shadow-camera-top={2}
        shadow-camera-bottom={-0.5}
      />
      <directionalLight position={[-2, 1.5, -1.5]} intensity={0.7} color="#f3eaff" />
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20, 20]} />
        <meshStandardMaterial color={BG} roughness={0.95} />
      </mesh>
      {children}
    </ThreeCanvas>
  );
};

const Label: React.FC<{ title: string; sub: string; color: string }> = ({ title, sub, color }) => (
  <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: 70, fontFamily: "system-ui, sans-serif" }}>
    <div style={{ background: "rgba(255,255,255,0.85)", borderRadius: 24, padding: "14px 34px", textAlign: "center", boxShadow: "0 6px 24px rgba(80,40,70,0.12)" }}>
      <div style={{ fontSize: 54, fontWeight: 800, color, letterSpacing: 1 }}>{title}</div>
      <div style={{ fontSize: 26, color: "#6a5a66", marginTop: 4 }}>{sub}</div>
    </div>
  </AbsoluteFill>
);

// code-driven height for the airborne clips, so the test shows how they are meant to be used
const lift = (clip: string, t: number, len: number) => {
  const env = interpolate(t, [0, 0.25, len - 0.25, len], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  if (clip === "jump_air") return 0.35 * env;
  if (clip === "float_sleep") return (0.22 + 0.03 * Math.sin(t * 2.2)) * env;
  if (clip === "panic_fall") return 0.3 * env;
  return 0;
};

export const ActorClipsTest: React.FC<ActorTestProps> = (p) => (p.meta ? <ClipsInner {...p} meta={p.meta} /> : null);

const ClipsInner: React.FC<ActorTestProps & { meta: ActorMeta }> = ({ name, meta, color = "#555" }) => {
  const frame = useCurrentFrame();
  const actor = useActor(meta);
  const segs = segments(meta);
  const s = segs.find((x) => frame >= x.from && frame < x.from + x.len) ?? segs[segs.length - 1];
  const t = (frame - s.from) / FPS;
  const c = meta.clips[s.clip];
  const sub = `${c.loop ? "loop" : "one-shot"} · ${c.duration.toFixed(2)} s${c.speed_units_per_s ? ` · ${c.speed_units_per_s} u/s` : ""}`;
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Stage camPos={[0.9, 1.0, 3.4]} target={[0, 0.55, 0]} fov={30}>
        <Actor meta={meta} actor={actor} clip={s.clip} time={t} position={[0, lift(s.clip, t, s.len / FPS), 0]} yaw={0.35} />
      </Stage>
      <Label title={s.clip} sub={`${name} · ${sub}`} color={color} />
    </AbsoluteFill>
  );
};

export const ActorFaceTest: React.FC<ActorTestProps> = (p) => (p.meta ? <FaceInner {...p} meta={p.meta} /> : null);

const FaceInner: React.FC<ActorTestProps & { meta: ActorMeta }> = ({ name, meta, color = "#555" }) => {
  const frame = useCurrentFrame();
  const actor = useActor(meta);
  const exprs = Object.keys(meta.face.expressions);
  const i = Math.min(exprs.length - 1, Math.floor(frame / 36));
  const yaw = Math.sin(frame / 22) * 0.35; // slow head-on sway: checks the face from a few angles
  return (
    <AbsoluteFill style={{ backgroundColor: BG }}>
      <Stage camPos={[0, 0.78, 2.0]} target={[0, 0.66, 0]} fov={30}>
        <Actor meta={meta} actor={actor} clip="idle" time={frame / FPS} expression={exprs[i]} yaw={yaw} />
      </Stage>
      <Label title={exprs[i]} sub={`${name} · ${meta.face.material}`} color={color} />
    </AbsoluteFill>
  );
};
