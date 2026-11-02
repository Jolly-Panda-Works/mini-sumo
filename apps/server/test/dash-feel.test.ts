import { describe, expect, it } from "vitest";
const feelModule = "../../client/src/game/dashFeel.ts";
const { dashFeel } = await import(feelModule);
describe("cosmetic dash feel", () => {
  it("pulls the torso back, then launches it forward with a mild tint that fades out", () => {
    expect(dashFeel(0.0125).offset).toBeLessThan(0);
    expect(dashFeel(0.0125).lean).toBeLessThan(0);
    expect(dashFeel(0.085).offset).toBeGreaterThan(0);
    expect(dashFeel(0.085).lean).toBeGreaterThan(0);
    expect(dashFeel(0.085).tint).toBe(1);
    expect(dashFeel(0.35).tint).toBeLessThan(0.2);
    expect(dashFeel(0.5)).toEqual({ offset: 0, lean: 0, tint: 0 });
  });
  it.each([-1, Infinity, NaN])("keeps idle or invalid ages neutral: %s", (age) => {
    expect(dashFeel(age)).toEqual({ offset: 0, lean: 0, tint: 0 });
  });
});
