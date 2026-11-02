import { createBody } from "./SimBody.js";
import { stepMovement, tryDash } from "./MovementSystem.js";
import type { SimulationConfig } from "./SimulationConfig.js";

export interface DashCandidate {
  id: string; x: number; y: number; angle: number; alive: boolean;
  powerUp?: string;
}

/** Unobstructed dash travel, sampled with the same movement and rope resistance as a bout.
 * Collisions, knockback and steering during the dash can change the eventual landing point. */
export function dashProjection(me: DashCandidate, direction: { x: number; y: number }, cfg: SimulationConfig, steering = { x: 0, y: 0 }) {
  const body = createBody(me.id, me.x, me.y, me.angle);
  body.inputX = direction.x; body.inputY = direction.y;
  body.speedScale = me.powerUp === "wind" ? cfg.windSpeedScale : 1;
  tryDash(body, 0, cfg);
  // A directed dash changes the launch velocity, but does not change steering.
  body.inputX = steering.x; body.inputY = steering.y;
  const dt = 1 / cfg.tickRate;
  const steps = Math.ceil(cfg.dashDurationMs / (dt * 1000));
  for (let step = 1; step <= steps; step++) {
    stepMovement(body, dt, cfg, step * dt * 1000);
  }
  const dx = body.x - me.x, dy = body.y - me.y;
  return { dx, dy, distance: Math.hypot(dx, dy) };
}

export function dashDistance(me: DashCandidate, direction: { x: number; y: number }, cfg: SimulationConfig, steering = { x: 0, y: 0 }): number {
  return dashProjection(me, direction, cfg, steering).distance;
}

/** Closest living opponent reachable by a straight dash, including both collision radii. */
export function autoDashTarget(me: DashCandidate, players: Iterable<DashCandidate>, cfg: SimulationConfig, steering = { x: 0, y: 0 }) {
  let best: { x: number; y: number; distance: number; targetId: string } | null = null;
  let closest = Infinity;
  for (const other of players) {
    if (other.id === me.id || !other.alive) continue;
    const dx = other.x - me.x, dy = other.y - me.y;
    const gap = Math.hypot(dx, dy);
    if (gap < 0.001 || gap >= closest) continue;
    const direction = { x: dx / gap, y: dy / gap };
    const distance = dashDistance(me, direction, cfg, steering);
    const radius = cfg.playerRadius * ((me.powerUp === "giant" ? cfg.giantScale : 1) + (other.powerUp === "giant" ? cfg.giantScale : 1));
    if (gap > distance + radius) continue;
    closest = gap;
    best = { ...direction, distance, targetId: other.id };
  }
  return best;
}
