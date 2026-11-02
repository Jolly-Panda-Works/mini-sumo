import { DEFAULT_CONFIG, resolveCollisions, stepMovement, type SimBody, type SimulationConfig } from "@mini-sumo/sim";
import type { ImpactPayload } from "@mini-sumo/shared";

/** All exercises use real collisions. Substeps prevent a dash from skipping contact. */
export function stepPracticeBodies(me: SimBody, opponent: SimBody | null, seconds: number, time: number, cfg: SimulationConfig = DEFAULT_CONFIG, onImpact?: (impact: ImpactPayload) => void): number {
  let remaining = Math.max(0, Math.min(seconds, 0.1));
  while (remaining > 1e-8) {
    const dt = Math.min(remaining, 1 / 120);
    stepMovement(me, dt, cfg, time);
    if (opponent) {
      stepMovement(opponent, dt, cfg, time);
      for (const impact of resolveCollisions([me, opponent], cfg, time)) onImpact?.(impact);
    }
    time += dt * 1000;
    remaining -= dt;
  }
  return time;
}
