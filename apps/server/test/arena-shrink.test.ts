import { describe, expect, it } from "vitest";
import { ARENA_DEFS, Phase } from "@mini-sumo/shared";
import { createArenaConfig, DEFAULT_CONFIG } from "../src/simulation/SimulationConfig.js";
import { playingSession } from "./helpers.js";

describe("arena-specific shrinking rings", () => {
  it("starts earlier and ends smaller at every successive arena tier", () => {
    let previous = createArenaConfig("training");
    for (const arena of ARENA_DEFS.filter((a) => a.entryFee > 0)) {
      const config = createArenaConfig(arena.id);
      expect(config.shrinkMs).toBeGreaterThan(previous.shrinkMs);
      expect(config.shrinkMs).toBeLessThan(config.matchDurationMs);
      expect(config.shrinkTo).toBeLessThan(previous.shrinkTo);
      expect(config.shrinkTo).toBeGreaterThan(0);
      previous = config;
    }
  });

  it.each(ARENA_DEFS.map((arena) => arena.id))("%s keeps full size until its own start time, then reaches its own final radius", (id) => {
    const config = createArenaConfig(id);
    const session = playingSession(["a", "b"], config);
    Object.assign(session.players.get("a")!, { x: -1, y: 0 });
    Object.assign(session.players.get("b")!, { x: 1, y: 0 });
    while (session.phaseRemainingMs > config.shrinkMs + 100) session.update(session.stepMs);
    expect(session.ringRadius).toBe(config.arenaRadius);
    while (session.phase === Phase.Playing && session.phaseRemainingMs > config.shrinkMs / 2) session.update(session.stepMs);
    expect(session.ringRadius).toBeCloseTo(config.arenaRadius * (1 + config.shrinkTo) / 2, 1);
    while (session.phase === Phase.Playing) session.update(session.stepMs);
    expect(session.ringRadius).toBeCloseTo(config.arenaRadius * config.shrinkTo, 3);
    session.requestRematch("a");
    expect(session.ringRadius).toBe(config.arenaRadius);
  });

  it.each(["training", "private", "unknown"])("%s uses the baseline shrink rules", (id) => {
    const config = createArenaConfig(id);
    expect(config.shrinkMs).toBe(DEFAULT_CONFIG.shrinkMs);
    expect(config.shrinkTo).toBe(DEFAULT_CONFIG.shrinkTo);
  });
});
