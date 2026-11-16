// Load a set GLB (public/sets/<name>/<name>.glb, copied by `npm run sync-sets`) OUTSIDE <ThreeCanvas>, so its
// delayRender is pending before capture. Meshes cast + receive shadows unless their name contains "_noshadow".
// `nodes` gives named objects for animated parts (clock hands, fans, screens).
import { useEffect, useState } from "react";
import { continueRender, delayRender, staticFile } from "remotion";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export type LoadedSet = { scene: THREE.Object3D; nodes: Record<string, THREE.Object3D> };

export const useSetGLB = (name: string): LoadedSet | null => {
  const [set, setSet] = useState<LoadedSet | null>(null);
  const [handle] = useState(() => delayRender(`set ${name}`));
  useEffect(() => {
    let alive = true;
    new GLTFLoader()
      .loadAsync(staticFile(`sets/${name}/${name}.glb`))
      .then((gltf) => {
        if (!alive) return;
        const nodes: Record<string, THREE.Object3D> = {};
        gltf.scene.traverse((o) => {
          nodes[o.name] = o;
          const m = o as THREE.Mesh;
          if (!m.isMesh) return;
          const shadow = !o.name.includes("_noshadow");
          m.castShadow = shadow;
          m.receiveShadow = true;
        });
        setSet({ scene: gltf.scene, nodes });
        continueRender(handle);
      })
      .catch((e) => {
        console.error(e);
        continueRender(handle);
      });
    return () => {
      alive = false;
    };
  }, [name, handle]);
  return set;
};
