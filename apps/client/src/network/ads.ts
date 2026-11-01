import { AD_RULES, interstitialDue, type AdRewardRequest, type AdRewardResponse } from "@mini-sumo/shared";
import { pushToast } from "../uiStore";
import { economyStore, refreshProfile, request } from "./economyClient";
import { localEconomy } from "./localEconomy";
import { networkStore } from "./networkMode";

/**
 * In-app ads: rewarded video in the coin shop and interstitials between bouts. Rules and
 * network choices: docs/ADS.fa.md.
 *
 * The game only knows the native "Ads" plugin below. A store build that wants ads registers a
 * plugin for its ad network under that name (Tapsell for Cafe Bazaar, AdMob for Google Play), so
 * the game code never changes with the network. Without a plugin (web, desktop, every build
 * today) nothing shows and nothing loads. A dev server can try the flows with VITE_ADS=fake.
 */
type Placement = "rewarded" | "interstitial";

interface AdsNative {
  /** Loads an ad so it can show at once; rejects when none is available. */
  prepare(options: { placement: Placement }): Promise<void>;
  /** Shows a prepared ad and resolves when it closes; rewarded: it was watched to the end. */
  show(options: { placement: Placement }): Promise<{ shown: boolean; rewarded: boolean }>;
}

const fakeAds: AdsNative = {
  prepare: async () => undefined,
  show: async ({ placement }) => {
    pushToast(`Sample ad (${placement})`, "info");
    await new Promise((resolve) => window.setTimeout(resolve, 1500));
    return { shown: true, rewarded: placement === "rewarded" };
  },
};

function findPlugin(): AdsNative | null {
  if (import.meta.env.DEV && import.meta.env.VITE_ADS === "fake") return fakeAds;
  const cap = (window as unknown as { Capacitor?: { isPluginAvailable?(name: string): boolean; Plugins?: Record<string, unknown> } }).Capacitor;
  if (!cap?.isPluginAvailable?.("Ads")) return null;
  return (cap.Plugins?.Ads as AdsNative | undefined) ?? null;
}

const plugin = findPlugin();

// ---------------------------------------------------------------- interstitial pacing

const PACE_KEY = "mini-sumo:ads";

interface Pace {
  /** Bouts since the last ad, and when the last ad of any kind closed (ms). */
  bouts: number;
  at: number;
  /** Bought coins: no interstitials any more. */
  payer: boolean;
}

function loadPace(): Pace {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PACE_KEY) ?? "null") as Partial<Pace> | null;
    if (parsed) return { bouts: Number(parsed.bouts) || 0, at: Number(parsed.at) || 0, payer: parsed.payer === true };
  } catch {
    // corrupted or unavailable storage: start over
  }
  return { bouts: 0, at: 0, payer: false };
}

const pace = loadPace();

function savePace(): void {
  try {
    window.localStorage.setItem(PACE_KEY, JSON.stringify(pace));
  } catch {
    // storage full or unavailable: pacing lasts for this session
  }
}

function adClosed(): void {
  pace.bouts = 0;
  pace.at = Date.now();
  savePace();
}

/** A bout finished (guided first bouts don't count). */
export function noteBoutFinished(): void {
  if (!plugin) return;
  pace.bouts += 1;
  savePace();
}

/** The player bought coins. */
export function notePayer(): void {
  pace.payer = true;
  savePace();
}

// ---------------------------------------------------------------- interstitial

/**
 * The break between bouts: call it after leaving the room, never during one and never from a
 * rematch (other players are waiting). When an ad is due it says so first, then shows it.
 * Resolves when the game can go on; a missing ad never holds the player up.
 */
export async function adBreak(): Promise<void> {
  if (!plugin) return;
  const totalBouts = economyStore.get().profile?.stats.matches ?? 0;
  if (!interstitialDue({ totalBouts, boutsSinceAd: pace.bouts, msSinceAd: Date.now() - pace.at, payer: pace.payer })) return;
  try {
    await plugin.prepare({ placement: "interstitial" });
    pushToast("Ad break", "info");
    await new Promise((resolve) => window.setTimeout(resolve, AD_RULES.interstitialNoticeMs));
    const { shown } = await plugin.show({ placement: "interstitial" });
    if (shown) adClosed();
  } catch {
    // No ad right now: play on.
  }
}

// ---------------------------------------------------------------- rewarded

/**
 * The shop can offer a rewarded ad: a build with ads, and offline or a server that pays them.
 * What's left today comes from profile.daily (server online, device offline).
 */
export function rewardedAdsAvailable(): boolean {
  if (!plugin) return false;
  return networkStore.get().mode !== "online" || Boolean(economyStore.get().catalog?.adRewards);
}

const uid = () => (crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Shows a rewarded ad and pays it. Returns the coins; 0 when it wasn't watched to the end. */
export async function watchRewardedAd(): Promise<number> {
  if (!plugin) return 0;
  await plugin.prepare({ placement: "rewarded" });
  const { shown, rewarded } = await plugin.show({ placement: "rewarded" });
  if (shown) adClosed();
  if (!rewarded) return 0;
  if (networkStore.get().mode !== "online") {
    const coins = localEconomy.claimAdReward();
    await refreshProfile();
    return coins;
  }
  // One retry with the same id: the server pays an ad once, so a lost answer can't pay twice.
  const body = JSON.stringify({ adId: uid() } satisfies AdRewardRequest);
  const pay = () => request<AdRewardResponse>("/ads/reward", { method: "POST", body });
  const { coins } = await pay().catch(pay);
  await refreshProfile();
  return coins;
}
