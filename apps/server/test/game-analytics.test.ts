import { afterEach, describe, expect, it, vi } from "vitest";

const adsModule = "../../client/src/network/ads.ts";
const economyModule = "../../client/src/network/economyClient.ts";
const modeModule = "../../client/src/network/networkMode.ts";

async function device(rewarded: boolean) {
  vi.resetModules();
  const data = new Map<string, string>();
  const localStorage = {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  };
  const event = vi.fn().mockResolvedValue(undefined);
  const show = vi.fn(async () => {
    window.dispatchEvent(new Event("mini-sumo:ad-opened-rewarded"));
    return { shown: true, rewarded };
  });
  vi.stubGlobal("localStorage", localStorage);
  vi.stubGlobal("window", Object.assign(new EventTarget(), {
    localStorage,
    Capacitor: { isPluginAvailable: () => true, Plugins: {
      Ads: { prepare: vi.fn().mockResolvedValue(undefined), show },
      GameAnalytics: { event },
    } },
  }));
  const { networkStore } = await import(modeModule);
  networkStore.set({ mode: "offline" });
  const economy = await import(economyModule);
  economy.initLocalEconomy();
  event.mockClear();
  return { event, economy, ads: await import(adsModule) };
}
afterEach(() => vi.unstubAllGlobals());

describe("rewarded ad analytics", () => {
  it("reports an impression once and a single credit across profile refreshes", async () => {
    const { event, economy, ads } = await device(true);
    expect(await ads.watchRewardedAd()).toBe(50);
    await economy.refreshProfile();
    expect(event.mock.calls.map(([payload]) => payload.name)).toEqual([
      "ad_requested", "ad_shown", "ad_finished", "currency_earned", "reward_claimed",
    ]);
    expect(event.mock.calls[3]![0].fields).toMatchObject({ amount: 50, source: "ad_reward" });
  });
  it("keeps a skipped ad out of rewards and wallet totals", async () => {
    const { event, ads } = await device(false);
    expect(await ads.watchRewardedAd()).toBe(0);
    expect(event.mock.calls.map(([payload]) => payload.name)).toEqual(["ad_requested", "ad_shown", "ad_finished"]);
    expect(event.mock.calls[2]![0].fields.outcome).toBe("closed_early");
  });
});
