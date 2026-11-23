import { describe, expect, it } from "vitest";
import { AD_RULES, interstitialDue } from "@mini-sumo/shared";
import { Economy } from "../src/economy/Economy.js";
import { silentEventSink } from "../src/economy/events.js";

const FLAGS = { economy: true, shop: true, premiumCurrency: false, realMoneyPurchases: false, adRewards: true };

function setup(flags = FLAGS) {
  const clock = { now: new Date("2026-10-18T10:00:00Z") };
  const economy = new Economy(":memory:", flags, silentEventSink, () => clock.now, false);
  const { accountId } = economy.createGuest();
  const wait = (ms: number) => {
    clock.now = new Date(clock.now.getTime() + ms);
  };
  return { economy, accountId, clock, wait };
}

describe("rewarded ads", () => {
  it("pay coins through the ledger", () => {
    const { economy, accountId } = setup();
    const before = economy.balance(accountId);
    const result = economy.claimAdReward(accountId, "ad-00000001");
    expect(result).toMatchObject({ credited: true, coins: AD_RULES.rewardedCoins, left: AD_RULES.rewardedDailyLimit - 1 });
    expect(economy.balance(accountId)).toBe(before + AD_RULES.rewardedCoins);
    expect(economy.ledgerSum(accountId)).toBe(economy.balance(accountId));
  });

  it("pay once per ad, even on a retry during the cooldown", () => {
    const { economy, accountId } = setup();
    economy.claimAdReward(accountId, "ad-00000001");
    const balance = economy.balance(accountId);
    expect(economy.claimAdReward(accountId, "ad-00000001").credited).toBe(false);
    expect(economy.balance(accountId)).toBe(balance);
  });

  it("does not let another player redeem the same verified ad", () => {
    const { economy, accountId } = setup();
    const other = economy.createGuest().accountId;
    economy.claimAdReward(accountId, "ad-00000001");
    expect(() => economy.claimAdReward(other, "ad-00000001")).toThrow("already redeemed");
  });

  it("wait for the cooldown", () => {
    const { economy, accountId, wait } = setup();
    economy.claimAdReward(accountId, "ad-00000001");
    expect(economy.profile(accountId).daily.nextAdAt).not.toBe("");
    expect(() => economy.claimAdReward(accountId, "ad-00000002")).toThrow();
    wait(AD_RULES.rewardedCooldownMs);
    expect(economy.profile(accountId).daily.nextAdAt).toBe("");
    expect(economy.claimAdReward(accountId, "ad-00000002").credited).toBe(true);
  });

  it("stop at the daily limit and start again the next day", () => {
    const { economy, accountId, clock, wait } = setup();
    for (let i = 0; i < AD_RULES.rewardedDailyLimit; i++) {
      economy.claimAdReward(accountId, `ad-0000000${i}`);
      wait(AD_RULES.rewardedCooldownMs);
    }
    expect(economy.profile(accountId).daily.adRewardsLeft).toBe(0);
    expect(() => economy.claimAdReward(accountId, "ad-00000009")).toThrow();
    clock.now = new Date("2026-10-19T00:30:00Z");
    expect(economy.profile(accountId).daily.adRewardsLeft).toBe(AD_RULES.rewardedDailyLimit);
    expect(economy.claimAdReward(accountId, "ad-00000009").credited).toBe(true);
  });

  it("are refused while the server flag is off, and without a proper ad id", () => {
    const off = setup({ ...FLAGS, adRewards: false });
    expect(() => off.economy.claimAdReward(off.accountId, "ad-00000001")).toThrow();
    const on = setup();
    expect(() => on.economy.claimAdReward(on.accountId, "x")).toThrow();
    expect(() => on.economy.claimAdReward(on.accountId, 12345678)).toThrow();
  });
});

describe("interstitial pacing", () => {
  const due = { totalBouts: 20, boutsSinceAd: AD_RULES.interstitialEveryBouts, msSinceAd: AD_RULES.interstitialMinGapMs, payer: false };

  it("shows after enough bouts and enough time", () => {
    expect(interstitialDue(due)).toBe(true);
  });

  it("leaves new players and buyers alone", () => {
    expect(interstitialDue({ ...due, totalBouts: AD_RULES.interstitialGraceBouts - 1 })).toBe(false);
    expect(interstitialDue({ ...due, payer: true })).toBe(false);
  });

  it("needs both the bouts and the time gap", () => {
    expect(interstitialDue({ ...due, boutsSinceAd: AD_RULES.interstitialEveryBouts - 1 })).toBe(false);
    expect(interstitialDue({ ...due, msSinceAd: AD_RULES.interstitialMinGapMs - 1 })).toBe(false);
  });
});
