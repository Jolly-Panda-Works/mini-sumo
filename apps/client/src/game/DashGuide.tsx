import { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Group } from "three";
import { inputController } from "../input/InputController";
import { settingsStore } from "../settings";
import { advanceDashLine, type DashLineAim } from "./dashLineMotion";

/** A soft floor line that draws outward, fades at its end and follows aim smoothly. */
export function DashLine({ sample }: { sample: () => DashLineAim | null }) {
  const root = useRef<Group>(null);
  const motion = useRef({ opacity: 0, reveal: 0, angle: 0, distance: 1, showing: false });
  const uniforms = useMemo(() => ({ time: { value: 0 }, opacity: { value: 0 }, reveal: { value: 0 } }), []);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotion.current = media.matches; };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useFrame(({ clock }, delta) => {
    if (!root.current) return;
    const aim = sample();
    const active = Boolean(aim?.ready);
    const s = motion.current;
    const instant = reducedMotion.current;
    advanceDashLine(s, aim, delta, instant);
    if (active && aim) {
      root.current.position.set(aim.px, 0.06, aim.py);
    }
    root.current.visible = s.opacity > 0.005;
    root.current.rotation.y = s.angle;
    root.current.scale.z = s.distance;
    uniforms.time.value = instant ? 0 : clock.elapsedTime;
    uniforms.opacity.value = s.opacity;
    uniforms.reveal.value = s.reveal;
  });
  return <group ref={root} visible={false}>
    <mesh position-z={0.5} rotation-x={Math.PI / 2} renderOrder={5}>
      <planeGeometry args={[1.2, 1]} />
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} toneMapped={false}
        vertexShader={`varying vec2 vUv;
          void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`}
        fragmentShader={`
          uniform float time; uniform float opacity; uniform float reveal;
          varying vec2 vUv;
          void main() {
            float side = abs((vUv.x - 0.5) * 1.2);
            float reach = vUv.y;
            float core = 1.0 - smoothstep(0.025, 0.13, side);
            float glow = (1.0 - smoothstep(0.08, 0.32, side)) * 0.22;
            float endFade = 1.0 - smoothstep(0.40, 1.0, reach);
            float startFade = smoothstep(0.06, 0.24, reach);
            float draw = 1.0 - smoothstep(reveal - 0.10, reveal + 0.01, reach);
            float flow = 0.92 + 0.08 * sin(reach * 18.0 - time * 5.0);
            float alpha = (core * 0.64 + glow) * endFade * startFade * draw * opacity * flow;
            gl_FragColor = vec4(mix(vec3(0.90, 0.12, 0.08), vec3(1.0, 0.35, 0.18), core), alpha);
          }
        `} />
    </mesh>
  </group>;
}

export function DashGuide() {
  return <DashLine sample={() => {
    if (!inputController.aiming && settingsStore.get().dashMode !== "auto") return null;
    return inputController.getDashAim();
  }} />;
}
