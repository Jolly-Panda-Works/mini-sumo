import { describe, expect, it } from "vitest";
const motionModule = "../../client/src/game/dashLineMotion.ts";
const { advanceDashLine } = await import(motionModule);
const fresh = () => ({ opacity: 0, reveal: 0, angle: 0, distance: 1, showing: false });
const aim = { px: 0, py: 0, x: 0, y: 1, distance: 2, ready: true };
describe("dash line motion", () => {
  it("draws in progressively, hides during recharge and draws in again when ready", () => {
    const s = fresh(); advanceDashLine(s, aim, 1 / 60);
    expect(s.reveal).toBeGreaterThan(0); expect(s.reveal).toBeLessThan(0.1);
    expect(s.opacity).toBeLessThan(1);
    for (let i = 0; i < 30; i++) advanceDashLine(s, aim, 1 / 60);
    expect(s.reveal).toBe(1);
    for (let i = 0; i < 15; i++) advanceDashLine(s, { ...aim, ready: false }, 1 / 60);
    expect(s.opacity).toBeLessThan(0.005); expect(s.showing).toBe(false);
    advanceDashLine(s, aim, 1 / 60); expect(s.reveal).toBeLessThan(0.1);
  });
  it("eases toward a new target instead of snapping and takes the shortest angular path", () => {
    const s = { ...fresh(), opacity: 1, reveal: 1, showing: true };
    advanceDashLine(s, { ...aim, x: 1, y: 0, distance: 4 }, 1 / 60);
    expect(s.angle).toBeGreaterThan(0); expect(s.angle).toBeLessThan(Math.PI / 2);
    expect(s.distance).toBeLessThan(4);
    s.angle = Math.PI - 0.05;
    advanceDashLine(s, { ...aim, x: -0.05, y: -1 }, 1 / 60);
    expect(s.angle).toBeGreaterThan(Math.PI - 0.05);
    expect(s.angle).toBeLessThan(Math.PI + 0.05);
  });
  it("honors reduced motion and immediately dismisses an inactive guide", () => {
    const s = fresh(); advanceDashLine(s, aim, 1 / 60, true);
    expect(s.reveal).toBe(1); expect(s.opacity).toBe(1);
    advanceDashLine(s, null, 1 / 60, true); expect(s.opacity).toBe(0);
  });
});
