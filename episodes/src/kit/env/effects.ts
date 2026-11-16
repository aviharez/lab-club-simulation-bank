// Small custom post effects (postprocessing Effect subclasses): exposure before tone mapping, and a colour grade
// (lift/gamma/gain + S-curve contrast + saturation) after it. Pure functions of their uniforms: deterministic.
import { Effect } from "postprocessing";
import * as THREE from "three";
import type { GradeSettings, Vec3 } from "./look";

export class ExposureEffect extends Effect {
  constructor(exposure = 1) {
    super(
      "ExposureEffect",
      /* glsl */ `
      uniform float exposure;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        outputColor = vec4(inputColor.rgb * exposure, inputColor.a);
      }`,
      { uniforms: new Map([["exposure", new THREE.Uniform(exposure)]]) },
    );
  }
}

const v3 = (v: Vec3 | undefined, d: number) => new THREE.Vector3(...(v ?? [d, d, d]));

export class GradeEffect extends Effect {
  constructor(g: GradeSettings = {}) {
    super(
      "GradeEffect",
      /* glsl */ `
      uniform vec3 lift;
      uniform vec3 gamma;
      uniform vec3 gain;
      uniform float contrast;
      uniform float saturation;
      void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
        vec3 c = clamp(inputColor.rgb, 0.0, 1.0);
        c = gain * (c + lift * (1.0 - c));
        c = pow(max(c, vec3(0.0)), 1.0 / max(gamma, vec3(1e-3)));
        c = mix(c, c * c * (3.0 - 2.0 * c), contrast);
        float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
        outputColor = vec4(mix(vec3(l), c, saturation), inputColor.a);
      }`,
      {
        uniforms: new Map<string, THREE.Uniform>([
          ["lift", new THREE.Uniform(v3(g.lift, 0))],
          ["gamma", new THREE.Uniform(v3(g.gamma, 1))],
          ["gain", new THREE.Uniform(v3(g.gain, 1))],
          ["contrast", new THREE.Uniform(g.contrast ?? 0)],
          ["saturation", new THREE.Uniform(g.saturation ?? 1)],
        ]),
      },
    );
  }
}
