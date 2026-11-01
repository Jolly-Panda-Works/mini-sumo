import { forwardRef, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, type Group } from "three";
import { inputController } from "../input/InputController";
import { settingsStore } from "../settings";

/** A translucent floor arrow: its tip is the predicted unblocked dash endpoint. */
export const DashArrow = forwardRef<Group>(function DashArrow(_, ref) {
  const uniforms = useMemo(() => ({ time: { value: 0 } }), []);
  const reducedMotion = useRef(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotion.current = media.matches; };
    update(); media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  useFrame(({ clock }) => { uniforms.time.value = reducedMotion.current ? 0 : clock.elapsedTime; });
  return <group ref={ref} visible={false}>
    <mesh position-z={0.5} rotation-x={Math.PI / 2} renderOrder={5}>
      <planeGeometry args={[1.5, 1]} />
      <shaderMaterial uniforms={uniforms} transparent depthWrite={false} side={DoubleSide} toneMapped={false}
        vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform float time;
          varying vec2 vUv;
          void main() {
            float x = abs((vUv.x - 0.5) * 1.5);
            float reach = vUv.y;
            float halfWidth = reach < 0.70 ? 0.22 : 0.62 * (1.0 - reach) / 0.30;
            float silhouette = 1.0 - smoothstep(halfWidth - 0.035, halfWidth + 0.015, x);
            float edgeFade = 1.0 - smoothstep(0.0, halfWidth, x);
            float outwardFade = 1.0 - smoothstep(0.55, 1.14, reach);
            float startFade = smoothstep(0.04, 0.20, reach);
            // Red chevrons flow away from the wrestler and disappear toward the endpoint.
            float wave = fract(reach * 3.2 - x * 0.65 - time * 1.1);
            float stripe = smoothstep(0.58, 0.74, wave) * (1.0 - smoothstep(0.84, 0.99, wave));
            float pulse = 0.92 + 0.08 * sin(time * 4.0);
            float alpha = silhouette * startFade * (0.42 + 0.35 * edgeFade + 0.18 * stripe) * outwardFade * pulse;
            vec3 red = mix(vec3(0.88, 0.12, 0.08), vec3(1.0, 0.45, 0.22), stripe * 0.6);
            gl_FragColor = vec4(red, alpha);
          }
        `} />
    </mesh>
  </group>;
});

export function DashGuide() {
  const ref = useRef<Group>(null);
  useFrame(() => {
    const root = ref.current;
    if (!root) return;
    const aim = inputController.getDashAim();
    root.visible = Boolean(aim && (inputController.aiming || settingsStore.get().dashMode === "auto"));
    if (!aim || !root.visible) return;
    root.position.set(aim.px, 0.055, aim.py);
    root.rotation.y = Math.atan2(aim.x, aim.y);
    root.scale.z = aim.distance;
  });
  return <DashArrow ref={ref} />;
}
