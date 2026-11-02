import { afterEach, describe, expect, it, vi } from "vitest";
import { xpForMatch } from "@mini-sumo/shared";
import { Economy } from "../src/economy/Economy.js";
import { silentEventSink } from "../src/economy/events.js";
const cases = [[2, 1, 50], [2, 2, 0], [3, 1, 50], [3, 2, 0], [3, 3, 0], [4, 1, 50], [4, 2, 20], [4, 3, 0], [4, 4, 0]];
afterEach(() => vi.unstubAllGlobals());
describe("ranked XP rewards", () => {
  it.each(cases)("online: %i players, rank %i earns %i XP, including bot seats", (playerCount, placement, expected) => {
    const economy = new Economy(":memory:", { economy: true, shop: true, premiumCurrency: false, realMoneyPurchases: false }, silentEventSink);
    const { accountId } = economy.createGuest();
    const input = { matchId: "ranked", durationMs: 30000, rewarded: false, playerCount, participants: [{ accountId, placement, won: placement === 1, completed: true }] };
    const result = economy.recordMatchDetailed(input);
    expect(result.progress.get(accountId)?.xp).toBe(expected);
    expect(economy.profile(accountId).level.xp).toBe(expected);
    expect(economy.profile(accountId).stats.matches).toBe(1);
    economy.recordMatchDetailed(input);
    expect(economy.profile(accountId).level.xp).toBe(expected);
    economy.close();
  });
  it.each(cases)("offline: %i players, rank %i earns %i XP", async (players, placement, expected) => {
    vi.resetModules();
    const storage = new Map<string, string>();
    vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
    const modulePath = "../../client/src/network/localEconomy.ts";
    const { localEconomy } = await import(modulePath);
    const entry = localEconomy.payEntry("training");
    const result = localEconomy.finish(entry, { matchId: "ranked", players, placement, won: placement === 1, draw: false, completed: true, durationMs: 30000 });
    expect(result.xp).toBe(expected);
    expect(localEconomy.profile().level.xp).toBe(expected);
    expect(localEconomy.profile().stats.matches).toBe(1);
  });
  it("rejects unfinished bouts and missing or invalid standings", () => {
    expect(xpForMatch("training", true, false, 1, 4)).toBe(0);
    for (const [rank, count] of [[0,4], [1,1], [NaN,4], [1,NaN], [1.5,4]]) expect(xpForMatch("training", false, true, rank!, count!)).toBe(0);
  });
});
