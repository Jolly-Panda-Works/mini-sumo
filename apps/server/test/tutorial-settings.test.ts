import { afterEach, describe, expect, it, vi } from "vitest";

const modulePath = "../../client/src/settings.ts";
async function loadSettings(saved: object | null) {
  vi.resetModules();
  const storage = new Map<string, string>();
  if (saved) storage.set("mini-sumo:settings", JSON.stringify(saved));
  vi.stubGlobal("window", { localStorage: { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => storage.set(key, value) } });
  const { settingsStore } = await import(modulePath);
  return { settingsStore, storage };
}
afterEach(() => vi.unstubAllGlobals());
describe("first-time dash choice", () => {
  it("asks a new player once, then preserves the choice during replay and reload", async () => {
    const { settingsStore, storage } = await loadSettings(null);
    expect(settingsStore.get().dashModeChosen).toBe(false);
    expect(settingsStore.get().starterRewardPresented).toBe(false);
    expect(settingsStore.get().menuTourCompleted).toBe(false);
    settingsStore.update({ tutorialCompleted: true, dashMode: "auto", dashModeChosen: true });
    settingsStore.update({ tutorialCompleted: false });
    expect(settingsStore.get().dashModeChosen).toBe(true);
    settingsStore.update({ starterRewardPresented: true, menuTourCompleted: true });
    const next = await loadSettings(JSON.parse(storage.get("mini-sumo:settings")!));
    expect(next.settingsStore.get().dashModeChosen).toBe(true);
    expect(next.settingsStore.get().dashMode).toBe("auto");
    expect(next.settingsStore.get().starterRewardPresented).toBe(true);
    expect(next.settingsStore.get().menuTourCompleted).toBe(true);
  });
  it("migrates a previous completed tutorial without asking for dash mode again", async () => {
    const { settingsStore } = await loadSettings({ tutorialCompleted: true, dashMode: "manual" });
    expect(settingsStore.get().dashModeChosen).toBe(true);
    expect(settingsStore.get().menuTourCompleted).toBe(true);
    expect(settingsStore.get().starterRewardPresented).toBe(true);
  });
});
