import { describe, expect, it, vi } from "vitest";
import { createBody, DEFAULT_CONFIG, tryDash } from "../src/sim.js";

vi.mock("@mini-sumo/sim", async () => await import("../src/sim.js"));
const practiceModule = "../../client/src/game/practicePhysics.ts";
const { stepPracticeBodies } = await import(practiceModule);

describe("tutorial collisions", () => {
  it("the practice dash has no cooldown", () => {
    const me = createBody("you", 0, 0);
    expect(tryDash(me, 0, DEFAULT_CONFIG, 0)).toBe(true);
    expect(tryDash(me, 0, DEFAULT_CONFIG, 0)).toBe(true);
  });
  it.each([1 / 120, 1 / 30, 0.1])("a dash hits the visible opponent instead of passing through at dt=%s", (dt) => {
    const me = createBody("you", -1.2, 0);
    const opponent = createBody("coach", 1.2, 0, Math.PI);
    me.inputX = 1;
    expect(tryDash(me, 0, DEFAULT_CONFIG)).toBe(true);
    let time = 0;
    for (let i = 0; i < Math.ceil(0.35 / dt); i++) {
      time = stepPracticeBodies(me, opponent, dt, time);
      expect(me.x).toBeLessThan(opponent.x);
      expect(Math.hypot(opponent.x - me.x, opponent.y - me.y)).toBeGreaterThanOrEqual(DEFAULT_CONFIG.playerRadius * 2 - 0.001);
    }
    expect(opponent.x).toBeGreaterThan(1.2);
  });
  it("separates an existing overlap even when the exercise is already complete", () => {
    const me = createBody("you", 0, 0);
    const opponent = createBody("coach", 0.5, 0);
    stepPracticeBodies(me, opponent, 1 / 30, 0);
    expect(opponent.x - me.x).toBeCloseTo(DEFAULT_CONFIG.playerRadius * 2, 3);
  });
  it("lets the movement-only exercise run without an opponent", () => {
    const me = createBody("you"); me.inputX = 1;
    expect(stepPracticeBodies(me, null, 1 / 30, 0)).toBeCloseTo(1000 / 30);
    expect(me.x).toBeGreaterThan(0);
  });
  it("reports real dash impacts so the tutorial can play the match effects", () => {
    const me = createBody("you", -1.2, 0), opponent = createBody("coach", 1.2, 0, Math.PI);
    const impact = vi.fn(); me.inputX = 1; tryDash(me, 0, DEFAULT_CONFIG);
    let time = 0;
    for (let i = 0; i < 8; i++) time = stepPracticeBodies(me, opponent, 1 / 30, time, DEFAULT_CONFIG, impact);
    expect(impact).toHaveBeenCalled();
    expect(impact.mock.calls[0]![0]).toMatchObject({ a: "you", b: "coach", stunned: "coach" });
    expect(impact.mock.calls[0]![0].strength).toBeGreaterThan(4);
  });
});
