import type { ImpactPayload } from "@mini-sumo/shared";
import { audio } from "../audio/AudioManager";
import { vibrate } from "../haptics";
import { calloutBus, dustBus, hitStop, impactBus, lastDashAt, lastHit, lastHitAt, pulseBus, punchBus, shakeBus } from "./effectsBus";

export function practiceDash(id: string, x: number, y: number) {
  lastDashAt.set(id, performance.now());
  dustBus.emit({ x, y, count: 8, speed: 1.3 });
  audio.dash(); vibrate(18);
}

export function practiceImpact(hit: ImpactPayload, showCallout = true) {
  const now = performance.now();
  for (const id of [hit.a, hit.b]) {
    lastHitAt.set(id, now);
    lastHit.set(id, { at: now, strength: hit.strength, x: hit.x, y: hit.y });
  }
  impactBus.emit(hit);
  dustBus.emit({ x: hit.x, y: hit.y, count: 12, speed: 1.8 });
  shakeBus.emit(Math.min(0.4, hit.strength / 24));
  punchBus.emit(Math.min(0.45, hit.strength / 24));
  if (hit.strength > 4) hitStop.until = now + 45;
  if (showCallout) calloutBus.emit({ text: hit.counter ? "COUNTER!" : hit.clash ? "CLASH!" : "NICE HIT!", x: hit.x, y: hit.y, color: "#ffd166" });
  audio.impact(hit.strength); vibrate(Math.min(55, 15 + hit.strength * 3));
}

export function practiceSuccess(x: number, y: number, ringOut: boolean) {
  pulseBus.emit({ x, y, color: "#ffc52f", size: 1.8 });
  dustBus.emit({ x, y, count: 18, speed: 2 });
  calloutBus.emit({ text: ringOut ? "RING OUT!" : "GREAT!", x, y, color: "#ffd166", size: 1 });
  if (ringOut) { audio.eliminated(); audio.crowdCheer(); } else audio.sample("thud", 1.1);
}
