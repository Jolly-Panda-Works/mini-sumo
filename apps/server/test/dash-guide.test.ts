import { describe, expect, it } from "vitest";
import { QUICK_MATCH_WAIT_MS } from "@mini-sumo/shared";
import { autoDashTarget, dashDistance } from "../src/simulation/DashGuide.js";
import { ECONOMY } from "../src/economy/config.js";
import { cfg, playingSession } from "./helpers.js";

const me = { id: "a", x: 0, y: 0, angle: 0, alive: true };
const opponent = (id: string, x: number, y = 0, alive = true) => ({ id, x, y, angle: 0, alive });

describe("dash targeting and range", () => {
  it("selects the nearest living opponent in reach, including behind the player", () => {
    const aim = autoDashTarget(me, [me, opponent("dead", 0.1, 0, false), opponent("far", 20), opponent("b", 3), opponent("c", -2)], cfg);
    expect(aim?.targetId).toBe("c");
    expect(aim?.x).toBe(-1);
    expect(aim?.y).toBe(0);
  });
  it("does not target a distant, eliminated, or coincident opponent", () => {
    expect(autoDashTarget(me, [me, opponent("far", 20), opponent("dead", 1, 0, false), opponent("same", 0)], cfg)).toBeNull();
  });
  it("uses the collision radii at the exact reach boundary, including Giant", () => {
    const distance = dashDistance(me, { x: 1, y: 0 }, cfg);
    const reach = distance + cfg.playerRadius * 2;
    expect(autoDashTarget(me, [opponent("b", reach - 0.001)], cfg)).not.toBeNull();
    expect(autoDashTarget(me, [opponent("b", reach + 0.001)], cfg)).toBeNull();
    expect(autoDashTarget({ ...me, powerUp: "giant" }, [opponent("b", reach + 0.1)], cfg)).not.toBeNull();
  });
  it("models the shorter outward dash by the rope and a changing ring radius", () => {
    const center = dashDistance(me, { x: 1, y: 0 }, cfg);
    const edge = dashDistance({ ...me, x: cfg.arenaRadius - 0.5 }, { x: 1, y: 0 }, cfg);
    expect(center).toBeGreaterThan(1.5);
    expect(center).toBeLessThan(3);
    expect(edge).toBeLessThan(center);
    expect(dashDistance({ ...me, x: 3 }, { x: 1, y: 0 }, { ...cfg, arenaRadius: 3.5 })).toBeLessThan(center);
  });
});

describe("directed dash authority", () => {
  it("aims independently of movement while preserving movement input", () => {
    const s = playingSession();
    s.handleInput("a", { x: -1, y: 0 });
    expect(s.handleDash("a", { x: 0, y: 1 }).ok).toBe(true);
    const p = s.players.get("a")!;
    expect(p.vx).toBeCloseTo(0);
    expect(p.vy).toBe(cfg.dashSpeed);
    expect(p.inputX).toBe(-1);
    expect(p.inputY).toBe(0);
    expect(s.handleDash("a", { x: 1, y: 0 }).ok).toBe(false);
    expect(p.vy).toBe(cfg.dashSpeed);
    expect(p.inputX).toBe(-1);
  });
  it.each([null, {}, { x: NaN, y: 1 }, { x: Infinity, y: 0 }, { x: 0, y: 0 }, { x: "1", y: 0 }])("rejects malformed aim without consuming the dash: %j", (aim) => {
    const s = playingSession();
    expect(s.handleDash("a", aim).ok).toBe(false);
    expect(s.players.get("a")!.dashReadyAt).toBe(0);
    expect(s.handleDash("a").ok).toBe(true);
  });
  it("still enforces stun, elimination and phase restrictions", () => {
    const s = playingSession();
    const p = s.players.get("a")!;
    p.stunnedUntil = s.time + 1000;
    expect(s.handleDash("a", { x: 1, y: 0 }).ok).toBe(false);
    p.stunnedUntil = 0; p.alive = false;
    expect(s.handleDash("a", { x: 1, y: 0 }).ok).toBe(false);
  });
});

it("uses three seconds for free, offline and paid matchmaking configuration", () => {
  expect(QUICK_MATCH_WAIT_MS).toBe(3000);
  expect(cfg.quickMatchWaitMs).toBe(3000);
  expect(ECONOMY.paidStartDelayMs).toBe(3000);
  expect(ECONOMY.paidCancelAfterMs).toBe(3000);
});
