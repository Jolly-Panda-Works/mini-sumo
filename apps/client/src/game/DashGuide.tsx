import { forwardRef, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { DoubleSide, Shape, type Group } from "three";
import { inputController } from "../input/InputController";
import { settingsStore } from "../settings";

/** A translucent floor arrow: its tip is the predicted unblocked dash endpoint. */
export const DashArrow = forwardRef<Group>(function DashArrow(_, ref) {
  const shape = useMemo(() => {
    const s = new Shape();
    s.moveTo(-0.24, 0); s.lineTo(0.24, 0); s.lineTo(0.24, 0.72);
    s.lineTo(0.55, 0.72); s.lineTo(0, 1); s.lineTo(-0.55, 0.72);
    s.lineTo(-0.24, 0.72); s.closePath();
    return s;
  }, []);
  return <group ref={ref} visible={false}>
    <mesh rotation-x={Math.PI / 2} renderOrder={5}>
      <shapeGeometry args={[shape]} />
      <meshBasicMaterial color="#9fffe3" transparent opacity={0.24} depthWrite={false} side={DoubleSide} />
    </mesh>
    <mesh position-z={1} rotation-x={-Math.PI / 2} renderOrder={5}>
      <ringGeometry args={[0.18, 0.23, 24]} />
      <meshBasicMaterial color="#fff1ac" transparent opacity={0.45} depthWrite={false} />
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
