import { afterEach, describe, expect, it, vi } from "vitest";
import { INTRO_OUTFIT_ID, Phase } from "@mini-sumo/shared";
import { GameSession } from "../src/game/GameSession.js";
import { createConfig } from "../src/simulation/SimulationConfig.js";
import { Economy } from "../src/economy/Economy.js";
import { silentEventSink } from "../src/economy/events.js";
import { advance } from "./helpers.js";
vi.mock("@mini-sumo/sim", async () => await import("../src/sim.js"));
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("first guided bout", () => {
  it.each([1, 42, 999])("guarantees first place for an idle or outward-moving learner (seed %i)", (seed) => {
    const s = new GameSession(createConfig(), 2, { coached: true, botLevel: "easy", seed });
    s.addPlayer("you", "Learner");
    s.addBot("you");
    expect(s.humans).toHaveLength(1); expect(s.bots).toHaveLength(1);
    s.requestStart("you");
    advance(s, s.cfg.entranceMs + s.cfg.countdownMs + 100);
    for (let i = 0; i < 1200 && s.phase === Phase.Playing; i++) {
      const p = s.players.get("you")!;
      if (seed !== 1) { p.x = 100; p.y = 100; s.handleInput("you", { x: 1, y: 1 }); s.handleDash("you"); }
      advance(s, s.stepMs);
      expect(p.alive).toBe(true);
    }
    expect(s.phase).toBe(Phase.RoundOver);
    expect(s.winnerId).toBe("you"); expect(s.players.get("you")?.placement).toBe(1);
  });
  it("keeps ordinary bouts unprotected", () => {
    const s = new GameSession(createConfig(), 4, { botLevel: "easy" });
    s.addPlayer("you", "Learner"); s.addBot("you"); s.requestStart("you");
    advance(s, s.cfg.entranceMs + s.cfg.countdownMs + 100);
    s.players.get("you")!.x = 100;
    advance(s, s.stepMs);
    expect(s.players.get("you")?.alive).toBe(false);
  });
});

describe("one-time guided progression", () => {
  it("online: records real placements once, grants the outfit free and unlocks the second bout", () => {
    const e = new Economy(":memory:", { economy: true, shop: true, premiumCurrency: false, realMoneyPurchases: false }, silentEventSink);
    const { accountId } = e.createGuest(); const before = e.balance(accountId);
    expect(e.canStartIntro(accountId, 2)).toBe(false);
    expect(() => e.recordIntroBout(accountId, 2, 1, 30000)).toThrow();
    e.recordIntroBout(accountId, 1, 1, 23000);
    const first = e.profile(accountId);
    expect(first.stats.matches).toBe(1); expect(first.stats.wins).toBe(1);
    expect(first.level.xp).toBe(75); expect(first.owned).toContain(INTRO_OUTFIT_ID);
    expect(e.balance(accountId)).toBe(before);
    expect(e.canStartIntro(accountId, 1)).toBe(false); expect(e.canStartIntro(accountId, 2)).toBe(true);
    e.recordIntroBout(accountId, 1, 1, 23000);
    expect(e.profile(accountId)).toEqual(first);
    e.recordIntroBout(accountId, 2, 4, 30000);
    expect(e.profile(accountId).stats.matches).toBe(2);
    expect(e.profile(accountId).level.xp).toBe(75);
    expect(e.profile(accountId).introRounds).toEqual([1, 2]);
    expect(e.canStartIntro(accountId, 2)).toBe(false);
    e.close();
  });
  it("offline: plays the complete first bot bout, preserves the reward on reload and cannot farm it", async () => {
    vi.resetModules(); vi.useFakeTimers({ toFake: ["setInterval", "clearInterval", "performance"] });
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { setInterval, clearInterval, localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
    const path = "../../client/src/network/LocalConnection.ts";
    const { LocalConnection } = await import(path);
    const room = new LocalConnection({ introRound: 1, name: "Learner", appearance: {}, isPrivate: false, maxPlayers: 4, botLevel: "hard", arenaId: "rookie" });
    vi.advanceTimersByTime(40000);
    expect(room.state.players.size).toBe(2);
    expect(room.state.maxPlayers).toBe(2);
    expect(room.state.phase).toBe("roundOver"); expect(room.state.winnerId).toBe(room.sessionId);
    const economyPath = "../../client/src/network/localEconomy.ts";
    const { localEconomy } = await import(economyPath);
    const first = localEconomy.profile();
    expect(first.stats.matches).toBe(1); expect(first.stats.wins).toBe(1);
    expect(first.balances.coins).toBe(200); expect(first.owned).toContain(INTRO_OUTFIT_ID);
    vi.advanceTimersByTime(20000); expect(room.state.phase).toBe("roundOver");
    await room.leave();
    vi.resetModules();
    const reloaded = (await import(economyPath)).localEconomy;
    expect(reloaded.profile().introRounds).toEqual([1]);
    reloaded.finish({ id: "retry", arenaId: "rookie", fee: 0, status: "paid" }, { introRound: 1, matchId: "retry", placement: 1, won: true, completed: true, players: 2, draw: false, durationMs: 30000 });
    expect(reloaded.profile()).toEqual(first);
  });
  it("a lost first attempt gives no XP or gift and remains retryable", async () => {
    const e = new Economy(":memory:", { economy: true, shop: true, premiumCurrency: false, realMoneyPurchases: false }, silentEventSink);
    const { accountId } = e.createGuest();
    e.recordIntroBout(accountId, 1, 2, 30000, "lost-attempt", false);
    e.recordIntroBout(accountId, 1, 2, 30000, "lost-attempt", false);
    expect(e.profile(accountId).stats.matches).toBe(1);
    expect(e.profile(accountId).level.xp).toBe(0);
    expect(e.profile(accountId).owned).not.toContain(INTRO_OUTFIT_ID);
    expect(e.canStartIntro(accountId, 1)).toBe(true);
    expect(e.canStartIntro(accountId, 2)).toBe(false);
    e.recordIntroBout(accountId, 1, 1, 30000, "won-attempt", true);
    expect(e.profile(accountId).stats.matches).toBe(2);
    expect(e.profile(accountId).owned).toContain(INTRO_OUTFIT_ID);
    e.close();

    vi.resetModules();
    vi.stubGlobal("window", { localStorage: { getItem: () => null, setItem: () => undefined } });
    const path = "../../client/src/network/localEconomy.ts";
    const { localEconomy } = await import(path);
    localEconomy.finish({ id: "lost", arenaId: "rookie", fee: 0, status: "paid" }, { introRound: 1, matchId: "lost", placement: 2, won: false, completed: true, players: 2, draw: false, durationMs: 30000 });
    expect(localEconomy.profile().introRounds).toEqual([]);
    expect(localEconomy.profile().level.xp).toBe(0);
    expect(localEconomy.profile().owned).not.toContain(INTRO_OUTFIT_ID);
    const progressPath = "../../client/src/ui/introProgress.ts";
    const { afterIntroResult } = await import(progressPath);
    expect(afterIntroResult("firstPlaying", false)).toBe("firstRetry");
    expect(afterIntroResult("firstPlaying", true)).toBe("firstWin");
    expect(afterIntroResult("secondPlaying", false)).toBe("profile");
  });
});
