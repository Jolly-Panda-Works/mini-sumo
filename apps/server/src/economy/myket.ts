/**
 * Myket purchase verification (developer panel API, MYKET_ACCESS_TOKEN).
 *
 * A purchase is only credited when Myket confirms it: bought (purchaseState 0) and not consumed
 * yet. Myket's consumptionState is the opposite of Cafe Bazaar's: 0 is unconsumed, 1 consumed.
 * MYKET_PACKAGE_NAME is the app's package name.
 */
import type { BazaarCheck } from "./bazaar.js";

const API = "https://developer.myket.ir/api/partners/applications";

export interface MyketConfig {
  accessToken: string;
  packageName: string;
}

type Fetch = (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
  text(): Promise<string>;
}>;

export function myketConfigFromEnv(env: Record<string, string | undefined> = process.env): MyketConfig | null {
  const accessToken = env.MYKET_ACCESS_TOKEN?.trim();
  if (!accessToken) return null;
  return { accessToken, packageName: env.MYKET_PACKAGE_NAME?.trim() || "com.jollypanda.mini_sumo" };
}

export class MyketVerifier {
  constructor(
    private readonly config: MyketConfig,
    private readonly fetchImpl: Fetch = fetch as unknown as Fetch,
  ) {}

  /**
   * At startup: does Myket accept this token from this server? Asks about a made-up purchase, so
   * "not found" means the token works.
   */
  async selfCheck(): Promise<"ok" | "refused" | "unreachable"> {
    const result = await this.check("coin-lucky", "startup-check");
    if (result.ok || result.reason === "not_found") return "ok";
    if (result.reason === "unavailable" && /HTTP 40[13]/.test(result.detail ?? "")) return "refused";
    return result.reason === "unavailable" ? "unreachable" : "ok";
  }

  /** Checks one purchase with Myket. */
  async check(productId: string, purchaseToken: string): Promise<BazaarCheck> {
    const url = `${API}/${encodeURIComponent(this.config.packageName)}/purchases/products/${encodeURIComponent(productId)}/verify`;
    let res;
    try {
      res = await this.fetchImpl(url, {
        method: "POST",
        headers: { "X-Access-Token": this.config.accessToken, "Content-Type": "application/json" },
        body: JSON.stringify({ tokenId: purchaseToken }),
      });
    } catch (error) {
      return { ok: false, reason: "unavailable", detail: error instanceof Error ? error.message : String(error) };
    }
    if (res.status === 404) return { ok: false, reason: "not_found" };
    if (!res.ok) return { ok: false, reason: "unavailable", detail: `HTTP ${res.status}: ${await res.text()}` };
    const data = (await res.json()) as { purchaseState?: number; consumptionState?: number };
    if (data.purchaseState !== 0) return { ok: false, reason: "not_purchased" };
    if (data.consumptionState !== 0) return { ok: false, reason: "consumed" };
    return { ok: true };
  }
}
