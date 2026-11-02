import { describe, expect, it } from "vitest";
import { MyketVerifier, myketConfigFromEnv } from "../src/economy/myket.js";

const CONFIG = { accessToken: "secret", packageName: "com.jollypanda.mini_sumo" };

/** A fake Myket: purchases by token. */
function fakeMyket(purchases: Record<string, { purchaseState: number; consumptionState: number }>) {
  const reply = (status: number, body: unknown) => ({
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
    text: async () => JSON.stringify(body),
  });
  return async (url: string, init?: { method?: string; headers?: Record<string, string>; body?: string }) => {
    if (init?.headers?.["X-Access-Token"] !== "secret") return reply(403, { code: 403 });
    expect(init.method).toBe("POST");
    expect(url).toContain("/com.jollypanda.mini_sumo/purchases/products/coin-lucky/verify");
    const p = purchases[(JSON.parse(init.body ?? "{}") as { tokenId: string }).tokenId];
    return p ? reply(200, { kind: "androidpublisher#productPurchase", ...p }) : reply(404, { code: 404 });
  };
}

describe("Myket purchase verification", () => {
  it("confirms a bought, unconsumed purchase and refuses the rest (0 is unconsumed here)", async () => {
    const v = new MyketVerifier(
      CONFIG,
      fakeMyket({
        good: { purchaseState: 0, consumptionState: 0 },
        used: { purchaseState: 0, consumptionState: 1 },
        failed: { purchaseState: 1, consumptionState: 0 },
      }),
    );
    expect(await v.check("coin-lucky", "good")).toEqual({ ok: true });
    expect(await v.check("coin-lucky", "used")).toMatchObject({ ok: false, reason: "consumed" });
    expect(await v.check("coin-lucky", "failed")).toMatchObject({ ok: false, reason: "not_purchased" });
    expect(await v.check("coin-lucky", "made-up")).toMatchObject({ ok: false, reason: "not_found" });
  });

  it("reports a refused token and accepts a working one at startup", async () => {
    expect(await new MyketVerifier(CONFIG, fakeMyket({})).selfCheck()).toBe("ok");
    expect(await new MyketVerifier({ ...CONFIG, accessToken: "wrong" }, fakeMyket({})).selfCheck()).toBe("refused");
  });

  it("is off without a token", () => {
    expect(myketConfigFromEnv({})).toBeNull();
    expect(myketConfigFromEnv({ MYKET_ACCESS_TOKEN: " t " })).toEqual({ accessToken: "t", packageName: "com.jollypanda.mini_sumo" });
  });
});
