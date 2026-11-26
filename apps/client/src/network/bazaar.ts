import { track, trackRevenue, withActivityContext } from "../analytics";
import { BAZAAR_PRODUCTS, packForBazaarProduct, type BazaarPurchaseRequest, type BazaarPurchaseResponse, type CoinPack } from "@mini-sumo/shared";
import { economyStore, refreshProfile, request } from "./economyClient";
import { localEconomy } from "./localEconomy";
import { networkStore } from "./networkMode";

/**
 * In-app billing of the Iranian store builds: Cafe Bazaar (VITE_STORE=bazaar) or Myket
 * (VITE_STORE=myket), each with its native plugin. Both plugins have the same methods.
 *
 * Online, the purchase token goes to the game server, which checks it with Cafe Bazaar and
 * credits the coins to your account once; only then is the purchase consumed in Bazaar (so
 * it can be bought again). If anything fails in between, the purchase stays unconsumed and
 * is sent again the next time the shop opens: nothing paid is lost.
 * Offline, the coins go to the wallet on this device, as before.
 */
interface Purchase {
  orderId: string;
  purchaseToken: string;
  productId: string;
}

interface BazaarNative {
  connect(): Promise<void>;
  purchase(options: { productId: string; payload?: string }): Promise<Purchase>;
  consume(options: { purchaseToken: string }): Promise<void>;
  purchases(): Promise<{ purchases: Purchase[] }>;
  /** Prices and titles as Bazaar shows them (builds from before this method don't have it). */
  skuDetails?(options: { productIds: string[] }): Promise<{ products: { productId: string; price: string; title: string }[] }>;
}

export type BuyResult = "bought" | "cancelled";

const store = import.meta.env.VITE_STORE === "myket" ? "myket" : "bazaar";
const storeName = store === "myket" ? "Myket" : "Cafe Bazaar";
const pluginName = store === "myket" ? "Myket" : "Bazaar";
const REMOVE_ADS = "remove_ads";
const entitlementKey = `mini-sumo:${store}:remove-ads`;

export function adsRemoved(): boolean {
  try {
    return localStorage.getItem(entitlementKey) === "1";
  } catch {
    return false;
  }
}

let adFree = adsRemoved();
function setAdsRemoved(owned: boolean): boolean {
  adFree = owned;
  try {
    localStorage.setItem(entitlementKey, owned ? "1" : "0");
  } catch {
    // The current session still has the store's answer.
  }
  return owned;
}

export async function refreshRemoveAds(): Promise<boolean> {
  if (!bazaarEnabled()) return false;
  try {
    const { purchases } = await (await connect()).purchases();
    return setAdsRemoved(purchases.some((purchase) => purchase.productId === REMOVE_ADS));
  } catch {
    return adFree;
  }
}

export function buyRemoveAds(): Promise<BuyResult> {
  return measurePurchase(REMOVE_ADS, purchaseRemoveAds);
}

async function purchaseRemoveAds(): Promise<BuyResult> {
  const plugin = await connect();
  try {
    const purchase = await plugin.purchase({ productId: REMOVE_ADS });
    if (purchase.productId !== REMOVE_ADS) throw new Error("Unexpected product in purchase response.");
    void reportRevenue(REMOVE_ADS);
    setAdsRemoved(true);
    return "bought";
  } catch (error) {
    if ((error as { code?: string }).code === "CANCELLED") return "cancelled";
    if (await refreshRemoveAds()) return "bought";
    throw error instanceof Error ? error : new Error("The purchase failed.");
  }
}

function native(): BazaarNative | null {
  const cap = (window as unknown as { Capacitor?: { isPluginAvailable?(name: string): boolean; Plugins?: Record<string, unknown> } }).Capacitor;
  if (!cap?.isPluginAvailable?.(pluginName)) return null;
  return (cap.Plugins?.[pluginName] as BazaarNative | undefined) ?? null;
}

/** True in the Cafe Bazaar build on a device. */
/**
 * Each coin pack's price as Cafe Bazaar shows it (e.g. "۵۰٬۰۰۰ تومان"), by pack id; empty
 * when Bazaar can't be asked (then the shop shows BUY without a price).
 */
let pricesCache: Record<string, string> | null = null;
export async function bazaarPrices(): Promise<Record<string, string>> {
  if (pricesCache) return pricesCache;
  const plugin = native();
  if (!plugin?.skuDetails) return {};
  try {
    await plugin.connect();
    const { products } = await plugin.skuDetails({ productIds: [...Object.values(BAZAAR_PRODUCTS), REMOVE_ADS] });
    const prices: Record<string, string> = {};
    for (const [packId, productId] of Object.entries(BAZAAR_PRODUCTS)) {
      const found = products.find((p) => p.productId === productId);
      if (found?.price) prices[packId] = found.price;
    }
    const removeAds = products.find((product) => product.productId === REMOVE_ADS);
    if (removeAds?.price) prices[REMOVE_ADS] = removeAds.price;
    if (Object.keys(prices).length) pricesCache = prices;
    return prices;
  } catch {
    return {};
  }
}

export const bazaarEnabled = (): boolean => (import.meta.env.VITE_STORE === "bazaar" || import.meta.env.VITE_STORE === "myket") && native() !== null;

/** The store selling the packs, for the shop's texts. */
export const coinStoreName = storeName;

/**
 * Coin packs can be bought right now: the Bazaar build on a device, and either offline (the
 * coins go to this device) or online with a server that can verify Bazaar purchases.
 */
export function bazaarBuyable(): boolean {
  if (!bazaarEnabled()) return false;
  if (networkStore.get().mode !== "online") return true;
  return Boolean(economyStore.get().catalog?.stores?.[store]);
}


let connecting: Promise<void> | null = null;
async function connect(): Promise<BazaarNative> {
  const plugin = native();
  if (!plugin) throw new Error(`Buying coins needs the ${storeName} version of the game.`);
  connecting ??= plugin.connect().catch((error: unknown) => {
    connecting = null;
    throw new Error(
      error instanceof Error && error.message ? error.message : `Couldn't reach ${storeName}. Check that it's installed and you're signed in.`,
    );
  });
  await connecting;
  return plugin;
}

/** Credits (once) and consumes a paid purchase. */
/** Credits one paid purchase (server online, device offline), then consumes it. */
async function finish(plugin: BazaarNative, purchase: Purchase): Promise<boolean> {
  const pack = packForBazaarProduct(purchase.productId);
  if (!pack) return false;
  let credited: boolean;
  if (networkStore.get().mode === "online") {
    // Throws when the server can't confirm it yet: the purchase then stays unconsumed.
    const result = await request<BazaarPurchaseResponse>(`/purchases/${store}`, {
      method: "POST",
      body: JSON.stringify({ productId: purchase.productId, purchaseToken: purchase.purchaseToken } satisfies BazaarPurchaseRequest),
    });
    credited = result.credited;
  } else {
    credited = localEconomy.creditCoinPurchase(purchase.purchaseToken, pack.coins, pack.name);
  }
  try {
    await plugin.consume({ purchaseToken: purchase.purchaseToken });
  } catch {
    // Credited already; consuming is retried on the next restore (crediting is once per token).
  }
  if (credited) { void reportRevenue(purchase.productId); await refreshProfile(); }
  return credited;
}

async function reportRevenue(productId: string) {
  const prices = await bazaarPrices();
  const pack = packForBazaarProduct(productId);
  const raw = prices[pack?.id ?? productId];
  if (!raw) return;
  const price = raw.replace(/[۰-۹]/g, d => String(d.charCodeAt(0) - 0x6f0))
    .replace(/[٠-٩]/g, d => String(d.charCodeAt(0) - 0x660));
  const match = price.match(/^\s*(?:IRR\s*)?([\d,٬\s]+)\s*(تومان|ریال|ريال|﷼|IRR|tomans?|rials?)?\s*$/i);
  if (!match || (!match[2] && !/^\s*IRR/i.test(price))) return;
  const amount = Number(match[1]!.replace(/[,٬\s]/g, ""));
  trackRevenue(/تومان|toman/i.test(price) ? amount * 10 : amount);
}

async function measurePurchase(productId: string, buy: () => Promise<BuyResult>) {
  track("store_purchase_started", { product_id: productId });
  try {
    const result = await withActivityContext("store", buy);
    track("store_purchase_finished", { product_id: productId, outcome: result === "bought" ? "success" : "cancelled" });
    return result;
  } catch (error) {
    track("store_purchase_finished", { product_id: productId, outcome: "failed", reason: "store_or_verification" });
    throw error;
  }
}

export function buyCoinPack(pack: CoinPack): Promise<BuyResult> {
  return measurePurchase(BAZAAR_PRODUCTS[pack.id] ?? pack.id, () => purchaseCoinPack(pack));
}

async function purchaseCoinPack(pack: CoinPack): Promise<BuyResult> {
  const productId = BAZAAR_PRODUCTS[pack.id];
  if (!productId) throw new Error(`This pack isn't sold in ${storeName}.`);
  const plugin = await connect();
  let purchase: Purchase;
  try {
    purchase = await plugin.purchase({ productId, payload: pack.id });
  } catch (error) {
    const code = (error as { code?: string }).code;
    if (code === "CANCELLED") return "cancelled";
    throw error instanceof Error ? error : new Error("The purchase failed.");
  }
  await finish(plugin, purchase);
  return "bought";
}

/** Finishes purchases that were paid but not credited/consumed. Returns the coins credited. */
export async function restoreBazaarPurchases(): Promise<number> {
  if (!bazaarEnabled()) return 0;
  try {
    const plugin = await connect();
    const { purchases } = await plugin.purchases();
    setAdsRemoved(purchases.some((purchase) => purchase.productId === REMOVE_ADS));
    let coins = 0;
    for (const purchase of purchases) {
      try {
        if (await finish(plugin, purchase)) coins += packForBazaarProduct(purchase.productId)?.coins ?? 0;
      } catch {
        // This one couldn't be confirmed yet: it stays unconsumed and is tried again later.
      }
    }
    return coins;
  } catch {
    return 0;
  }
}
