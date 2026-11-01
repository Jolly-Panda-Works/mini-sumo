import { createBody } from "./SimBody.js";
import { stepMovement, tryDash } from "./MovementSystem.js";
import type { SimulationConfig } from "./SimulationConfig.js";

export interface DashCandidate {
  id: string; x: number; y: number; angle: number; alive: boolean;
  powerUp?: string;
}

/** Unobstructed dash travel, sampled with the same movement and rope resistance as a bout.
 * Collisions, knockback and steering during the dash can change the eventual landing point. */
export function dashDistance(me: DashCandidate, direction: { x: number; y: number }, cfg: SimulationConfig): number {
  const body = createBody(me.id, me.x, me.y, me.angle);
  body.inputX = direction.x; body.inputY = direction.y;
  body.speedScale = me.powerUp === "wind" ? cfg.windSpeedScale : 1;
  tryDash(body, 0, cfg);
  const dt = 1 / cfg.tickRate;
  for (let t = 0; t < cfg.dashDurationMs; t += dt * 1000) {
    stepMovement(body, Math.min(dt, (cfg.dashDurationMs - t) / 1000), cfg, t);
  }
  return Math.hypot(body.x - me.x, body.y - me.y);
}

/** Closest living opponent reachable by a straight dash, including both collision radii. */
export function autoDashTarget(me: DashCandidate, players: Iterable<DashCandidate>, cfg: SimulationConfig) {
  let best: { x: number; y: number; distance: number; targetId: string } | null = null;
  let closest = Infinity;
  for (const other of players) {
    if (other.id === me.id || !other.alive) continue;
    const dx = other.x - me.x, dy = other.y - me.y;
    const gap = Math.hypot(dx, dy);
    if (gap < 0.001 || gap >= closest) continue;
    const direction = { x: dx / gap, y: dy / gap };
    const distance = dashDistance(me, direction, cfg);
    const radius = cfg.playerRadius * ((me.powerUp === "giant" ? cfg.giantScale : 1) + (other.powerUp === "giant" ? cfg.giantScale : 1));
    if (gap > distance + radius) continue;
    closest = gap;
    best = { ...direction, distance, targetId: other.id };
  }
  return best;
}
