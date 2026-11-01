import { lerpAngle } from "@mini-sumo/shared";

export interface DashLineAim { px: number; py: number; x: number; y: number; distance: number; ready: boolean }
export interface DashLineMotion { opacity: number; reveal: number; angle: number; distance: number; showing: boolean }

export function advanceDashLine(s: DashLineMotion, aim: DashLineAim | null, delta: number, instant = false): void {
  const dt = Math.max(0, Math.min(delta, 0.1));
  const active = Boolean(aim?.ready);
  if (active && aim) {
    const angle = Math.atan2(aim.x, aim.y);
    if (s.opacity < 0.01) { s.angle = angle; s.distance = aim.distance; }
    s.angle = lerpAngle(s.angle, angle, instant ? 1 : 1 - Math.exp(-10 * dt));
    s.distance += (aim.distance - s.distance) * (instant ? 1 : 1 - Math.exp(-12 * dt));
    if (!s.showing) s.reveal = 0;
    s.reveal = instant ? 1 : Math.min(1, s.reveal + dt / 0.28);
    s.opacity += (1 - s.opacity) * (instant ? 1 : 1 - Math.exp(-16 * dt));
  } else {
    s.opacity *= instant ? 0 : Math.exp(-28 * dt);
  }
  s.showing = active;
}
