import React from "react";
import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { createPortal, useThree } from "@react-three/fiber";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone as cloneSkinned } from "three/examples/jsm/utils/SkeletonUtils.js";

// 3D mascot actor: mascots/<name>/model/<name>_actor.glb (see manifest.actor_conventions).
// Everything is driven by props (clip + time in seconds), never by r3f's useFrame, so renders are deterministic.

export type ActorClip = { duration: number; frames: number; fps: number; loop: boolean; seamless: boolean; speed_units_per_s?: number; note?: string };
export type ActorMeta = {
  glb: string;
  height: number;
  clips: Record<string, ActorClip>;
  face: { mesh: string; material: string; swap: string[]; default: string; expressions: Record<string, string> };
  lenses?: { mesh: string; material: string; textures: Record<string, string> };
};

const gltfCache = new Map<string, Promise<GLTF>>();
const texCache = new Map<string, Promise<THREE.Texture>>();

const loadGltf = (url: string) => {
  if (!gltfCache.has(url)) gltfCache.set(url, new GLTFLoader().loadAsync(url));
  return gltfCache.get(url)!;
};

const loadTex = (url: string) => {
  if (!texCache.has(url)) {
    texCache.set(
      url,
      new THREE.TextureLoader().loadAsync(url).then((t) => {
        t.flipY = false; // glTF UV convention
        t.colorSpace = THREE.SRGBColorSpace;
        return t;
      }),
    );
  }
  return texCache.get(url)!;
};

export type LoadedActor = { release: () => void; scene: THREE.Object3D; mixer: THREE.AnimationMixer; clips: Map<string, THREE.AnimationClip>; tex: Record<string, THREE.Texture>; lens: Record<string, THREE.Texture> };
type Loaded = LoadedActor;

/** Call this OUTSIDE <ThreeCanvas> (in the normal component tree): its delayRender must be registered
 *  before the frame is captured, which is not guaranteed for components mounted inside the r3f canvas. */
export const useActor = (meta: ActorMeta) => {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [handle] = useState(() => delayRender(`actor ${meta.glb}`));
  useEffect(() => {
    let alive = true;
    const base = "mascots/";
    Promise.all([
      loadGltf(staticFile(base + meta.glb)),
      Promise.all(Object.entries(meta.face.expressions).map(async ([k, p]) => [k, await loadTex(staticFile(base + p))] as const)),
      Promise.all(Object.entries(meta.lenses?.textures ?? {}).map(async ([k, p]) => [k, await loadTex(staticFile(base + p))] as const)),
    ])
      .then(([gltf, tex, lens]) => {
        if (!alive) return;
        const scene = cloneSkinned(gltf.scene);
        scene.traverse((o) => {
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          m.castShadow = true;
          m.receiveShadow = true;
          m.frustumCulled = false; // skinned bounds don't follow the pose
          m.material = (m.material as THREE.Material).clone(); // per-instance face swaps
        });
        setLoaded({
          scene,
          mixer: new THREE.AnimationMixer(scene),
          clips: new Map(gltf.animations.map((c) => [c.name, c])),
          tex: Object.fromEntries(tex),
          lens: Object.fromEntries(lens),
          release: () => continueRender(handle),
        });
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
    return () => {
      alive = false;
    };
  }, [meta, handle]);
  return loaded;
};

export type ActorProps = {
  meta: ActorMeta;
  /** from useActor(meta), called outside the canvas */
  actor: LoadedActor | null;
  clip: string;
  /** seconds into the clip; loops wrap, one-shots hold their last frame */
  time: number;
  expression?: string;
  position?: [number, number, number];
  /** extra yaw in radians; 0 = facing the camera on +Z */
  yaw?: number;
  scale?: number | [number, number, number];
  /** optional crossfade: pose of `blend.clip` at `blend.time` mixed in with `blend.weight` (0..1) */
  blend?: { clip: string; time: number; weight: number };
  /** props parented to a bone (e.g. "L_Hand"), so they follow the clip; children are in the bone's local frame */
  attach?: { bone: string; children: React.ReactNode }[];
  /** face (and lens) self-glow, 0..1 = share of the GLB's emissive level. 1 (default) suits daylight sets;
   *  dark sets lower it so the face sits in the same light as the body instead of glowing on its own */
  faceGlow?: number;
  /** face base-color level (the GLB keeps it at 0.35: lit dimly, the glow does the rest). Dark sets set it to 1,
   *  the body's level, with a small faceGlow, so the face takes the same light and colour as the hands and legs */
  faceLit?: number;
};

export const Actor: React.FC<ActorProps> = ({ meta, actor: a, clip, time, expression, position = [0, 0, 0], yaw = 0, scale = 1, blend, attach, faceGlow = 1, faceLit }) => {

  const fromClip = blend?.clip;
  const fromTime = blend?.time;
  const fromWeight = blend?.weight ?? 0;
  // pose + face are applied synchronously during render so the frame Remotion captures is complete
  useMemo(() => {
    if (!a) return;
    a.mixer.stopAllAction();
    // local clip time from the frame-driven `time`: loops wrap, one-shots clamp to their last pose
    const localTime = (name: string, t: number) => {
      const c = a.clips.get(name);
      const info = meta.clips[name];
      if (!c || !info) return null;
      return info.loop ? ((t % c.duration) + c.duration) % c.duration : Math.min(Math.max(t, 0), c.duration - 1e-4);
    };
    const start = (name: string, weight: number) => {
      const c = a.clips.get(name);
      const info = meta.clips[name];
      if (!c || !info) return null;
      const act = a.mixer.clipAction(c);
      act.setLoop(info.loop ? THREE.LoopRepeat : THREE.LoopOnce, Infinity);
      act.clampWhenFinished = true;
      act.play();
      act.setEffectiveWeight(weight);
      return act;
    };
    const w = fromClip && fromClip !== clip ? Math.min(1, Math.max(0, fromWeight)) : 0;
    const main = start(clip, 1 - w);
    const tMain = localTime(clip, time);
    if (main && tMain !== null) {
      // the mixer clock is set from the frame (never the wall clock)
      a.mixer.setTime(tMain);
      if (w > 0 && fromClip && fromTime !== undefined) {
        const src = start(fromClip, w);
        const tSrc = localTime(fromClip, fromTime);
        if (src && tSrc !== null) {
          src.time = tSrc;
          main.time = tMain;
          a.mixer.update(0);
        }
      }
    }
    const expr = expression ?? meta.face.default;
    const face = a.scene.getObjectByName(meta.face.mesh) as THREE.Mesh | undefined;
    const t = a.tex[expr];
    if (face && t) {
      const m = face.material as THREE.MeshStandardMaterial;
      if (m.map !== t) {
        m.map = t;
        m.emissiveMap = t;
        m.needsUpdate = true;
      }
      m.emissiveIntensity = faceGlow;
      if (faceLit !== undefined) m.color.setScalar(faceLit);
    }
    if (meta.lenses) {
      const lens = a.scene.getObjectByName(meta.lenses.mesh) as THREE.Mesh | undefined;
      const lt = a.lens[expr === "glint" ? "glint" : "clear"];
      if (lens && lt) {
        const m = lens.material as THREE.MeshStandardMaterial;
        if (m.map !== lt) {
          m.map = lt;
          m.emissiveMap = lt;
          m.needsUpdate = true;
        }
        m.emissiveIntensity = faceGlow;
      }
    }
  }, [a, clip, time, expression, meta, fromClip, fromTime, fromWeight, faceGlow, faceLit]);

  // ThreeCanvas only advances on frame changes while rendering: draw again once the actor is mounted/posed,
  // then release the load hold so the captured frame contains it.
  const advance = useThree((st) => st.advance);
  useLayoutEffect(() => {
    if (!a) return;
    advance(performance.now());
    a.release();
  }, [a, clip, time, expression, position, yaw, scale, advance, fromClip, fromTime, fromWeight]);

  if (!a) return null;
  return (
    <group position={position} rotation={[0, -Math.PI / 2 + yaw, 0]} scale={scale}>
      <primitive object={a.scene} />
      {attach?.map((x) => {
        const bone = a.scene.getObjectByName(x.bone);
        return bone ? <React.Fragment key={x.bone}>{createPortal(<group>{x.children}</group>, bone)}</React.Fragment> : null;
      })}
    </group>
  );
};
