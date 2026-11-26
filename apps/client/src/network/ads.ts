import { track, withActivityContext } from "../analytics";
import { AD_RULES, interstitialDue, type AdRewardRequest, type AdRewardResponse } from "@mini-sumo/shared";
import { refreshRemoveAds } from "./bazaar";
import { pushToast } from "../uiStore";
import { economyStore, refreshProfile, request } from "./economyClient";
import { localEconomy } from "./localEconomy";
import { networkStore } from "./networkMode";

/**
 * In-app ads: rewarded video in the coin shop and interstitials between bouts. Rules and
 * network choices: docs/ADS.fa.md.
 *
 * The game only knows the native "Ads" plugin below. A store build that wants ads registers a
 * plugin under that name. The Bazaar and Myket builds register the Tapsell plugin. A dev
 * server can try the UI flows with VITE_ADS=fake.
 */
type Placement = "rewarded" | "interstitial";

interface AdsNative {
  /** Loads an ad so it can show at once; rejects when none is available. */
  prepare(options: { placement: Placement }): Promise<void>;
  /** Shows a prepared ad and resolves when it closes; rewarded: it was watched to the end. */
  show(options: { placement: Placement }): Promise<{ shown: boolean; rewarded: boolean; adId?: string }>;
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
  threshold: number;
}

function loadPace(): Pace {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PACE_KEY) ?? "null") as Partial<Pace> | null;
    if (parsed) return { bouts: Number(parsed.bouts) || 0, at: Number(parsed.at) || 0, threshold: parsed.threshold === 5 ? 5 : 4 };
  } catch {
    // corrupted or unavailable storage: start over
  }
  return { bouts: 0, at: 0, threshold: 4 };
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
  pace.threshold = Math.random() < 0.5 ? 4 : 5;
  pace.at = Date.now();
  savePace();
}

/** A bout finished (guided first bouts don't count). */
export function noteBoutFinished(): void {
  if (!plugin) return;
  pace.bouts += 1;
  savePace();
}

// ---------------------------------------------------------------- interstitial

/**
 * The break between bouts: call it after leaving the room, never during one and never from a
 * rematch (other players are waiting). When an ad is due it says so first, then shows it.
 * Resolves when the game can go on; a missing ad never holds the player up.
 */
let activeBreak: Promise<void> | undefined;
export function adBreak(): Promise<void> {
  activeBreak ??= showInterstitial().finally(() => { activeBreak = undefined; });
  return activeBreak;
}

async function displayAd(ads: AdsNative, placement: Placement) {
  const fields = { ad_type: placement, placement: placement === "rewarded" ? "coin_shop" : "after_match" };
  const start = performance.now();
  track("ad_requested", fields);
  let prepared = false;
  let opened = false;
  const onOpen = () => {
    if (opened) return;
    opened = true;
    track("ad_shown", { ...fields, load_time_ms: Math.round(performance.now() - start) });
  };
  const eventName = "mini-sumo:ad-opened-" + placement;
  window.addEventListener(eventName, onOpen);
  try {
    await ads.prepare({ placement });
    prepared = true;
    if (placement === "interstitial") {
      pushToast("Ad break", "info");
      await new Promise(resolve => window.setTimeout(resolve, AD_RULES.interstitialNoticeMs));
    }
    const result = await withActivityContext("ad", () => ads.show({ placement }));
    if (result.shown) onOpen();
    const outcome = !result.shown ? "error" : placement === "rewarded" && !result.rewarded ? "closed_early" : "completed";
    track("ad_finished", { ...fields, outcome });
    return result;
  } catch (error) {
    track("ad_finished", { ...fields, outcome: prepared ? "error" : "unavailable" });
    throw error;
  } finally {
    window.removeEventListener(eventName, onOpen);
  }
}

async function showInterstitial(): Promise<void> {
  if (!plugin || pace.bouts < pace.threshold) return;
  const totalBouts = economyStore.get().profile?.stats.matches ?? 0;
  if (!interstitialDue({ totalBouts: Math.max(totalBouts, pace.bouts), boutsSinceAd: pace.bouts, msSinceAd: Date.now() - pace.at, payer: false })) return;
  try {
    if (await refreshRemoveAds()) return;
    const { shown } = await displayAd(plugin, "interstitial");
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

/** Shows a rewarded ad and pays it. Returns the coins; 0 when it wasn't watched to the end. */
export async function watchRewardedAd(): Promise<number> {
  if (!plugin) return 0;
  const { rewarded, adId } = await displayAd(plugin, "rewarded");
  if (!rewarded) return 0;
  const networkMode = networkStore.get().mode;
  try {
    const coins = await payReward(adId);
    if (!coins) track("ad_reward_failed", { placement: "coin_shop", network_mode: networkMode, reason: "not_credited" });
    return coins;
  } catch (error) {
    track("ad_reward_failed", { placement: "coin_shop", network_mode: networkMode, reason: "claim_failed" });
    throw error;
  }
}

async function payReward(adId?: string): Promise<number> {
  if (networkStore.get().mode !== "online") {
    const coins = localEconomy.claimAdReward();
    await refreshProfile();
    return coins;
  }
  // One retry with the same id: the server pays an ad once, so a lost answer can't pay twice.
  if (!adId) return 0;
  const body = JSON.stringify({ adId } satisfies AdRewardRequest);
  const pay = () => request<AdRewardResponse>("/ads/reward", { method: "POST", body });
  const { coins } = await pay().catch(pay);
  await refreshProfile();
  return coins;
}
