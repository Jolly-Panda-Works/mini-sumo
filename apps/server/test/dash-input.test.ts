import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mock = vi.hoisted(() => ({
  settings: { dashMode: "manual" }, ui: { settingsOpen: false }, game: { phase: "playing" },
  me: { x: 0, y: 0, angle: 0, alive: true, powerUp: "", dashCooldownMs: 0, stunned: false, dashing: false },
  opponent: { x: 2, y: 0, angle: 0, alive: true, powerUp: "" },
  dash: vi.fn(), input: vi.fn(),
}));
vi.mock("../../client/src/settings", () => ({ settingsStore: { get: () => mock.settings } }));
vi.mock("../../client/src/uiStore", () => ({ uiStore: { get: () => mock.ui } }));
vi.mock("@mini-sumo/sim", async () => await import("../src/sim.js"));
vi.mock("../../client/src/network/RoomManager", () => ({
  gameStore: { get: () => mock.game },
  roomManager: { room: {}, sessionId: "a", get state() { return { phase: mock.game.phase, ringRadius: 7, players: new Map([["a", mock.me], ["b", mock.opponent]]) }; }, dash: mock.dash, sendInput: mock.input },
}));

describe("manual and automatic dash input", () => {
  let controller: {
    start(): void; stop(): void; aiming: boolean;
    setTouchVector(x: number, y: number): void;
    beginDashAim(): void; endDashAim(cancel?: boolean): void;
    getDashAim(): { x: number; y: number } | null;
  };
  let windowTarget: EventTarget;
  beforeEach(async () => {
    vi.resetModules(); vi.useFakeTimers();
    windowTarget = new EventTarget();
    vi.stubGlobal("window", Object.assign(windowTarget, { setInterval, clearInterval }));
    vi.stubGlobal("document", new EventTarget());
    vi.stubGlobal("HTMLElement", class {});
    mock.settings.dashMode = "manual"; mock.ui.settingsOpen = false; mock.game.phase = "playing";
    Object.assign(mock.me, { alive: true, dashCooldownMs: 0, stunned: false, dashing: false });
    mock.opponent.x = 2; mock.opponent.alive = true; mock.dash.mockClear(); mock.input.mockClear();
    // A browser module, loaded by Vitest with its browser dependencies mocked above.
    const clientModule = "../../client/src/input/InputController.ts";
    controller = (await import(clientModule)).inputController;
    controller.start();
  });
  afterEach(() => { controller.stop(); vi.useRealTimers(); vi.unstubAllGlobals(); });
  it("previews while held and sends exactly one directed dash on release", () => {
    controller.setTouchVector(0, -1); controller.beginDashAim();
    expect(controller.aiming).toBe(true);
    expect(mock.dash).not.toHaveBeenCalled();
    expect(controller.getDashAim()?.y).toBe(-1);
    controller.endDashAim(); controller.endDashAim();
    expect(mock.dash).toHaveBeenCalledExactlyOnceWith({ x: 0, y: -1 });
  });
  it("cancels on pointer cancellation or loss of focus", () => {
    controller.beginDashAim(); controller.endDashAim(true);
    controller.beginDashAim(); windowTarget.dispatchEvent(new Event("blur")); controller.endDashAim();
    expect(mock.dash).not.toHaveBeenCalled(); expect(controller.aiming).toBe(false);
  });
  it("auto dashes while idle when an opponent enters range, without button presses", () => {
    mock.settings.dashMode = "auto"; mock.opponent.x = 20;
    vi.advanceTimersByTime(100); expect(mock.dash).not.toHaveBeenCalled();
    mock.opponent.x = 2;
    vi.advanceTimersByTime(40); expect(mock.dash).toHaveBeenCalledExactlyOnceWith({ x: 1, y: 0 });
    mock.me.dashCooldownMs = 3000;
    vi.advanceTimersByTime(1000); expect(mock.dash).toHaveBeenCalledTimes(1);
    controller.beginDashAim(); expect(controller.aiming).toBe(false);
  });
  it("never auto dashes while stunned, eliminated, in settings or outside a bout", () => {
    mock.settings.dashMode = "auto";
    mock.me.stunned = true; vi.advanceTimersByTime(400);
    mock.me.stunned = false; mock.me.alive = false; vi.advanceTimersByTime(400);
    mock.me.alive = true; mock.ui.settingsOpen = true; vi.advanceTimersByTime(400);
    mock.ui.settingsOpen = false; mock.game.phase = "countdown"; vi.advanceTimersByTime(400);
    expect(mock.dash).not.toHaveBeenCalled();
  });
});
