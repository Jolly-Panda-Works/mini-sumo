import { describe, expect, it, vi } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

const state = vi.hoisted(() => ({ players: [] as object[], standings: [] as string[] }));
vi.mock("../../client/src/network/RoomManager", () => ({
  gameStore: { get: () => ({ ...state, arenaId: "training", remainingMs: 10000, winnerId: "a", isDraw: false }), subscribe: () => () => {} },
  roomManager: {},
}));
vi.mock("../../client/src/network/economyClient", () => ({ economyStore: { get: () => ({ lastResult: { xp: 0, prize: 0, rewards: 0, kind: "rewarded" }, catalog: null }), subscribe: () => () => {} } }));
vi.mock("../../client/src/settings", () => ({ settingsStore: { get: () => ({ introStage: "done" }), subscribe: () => () => {} } }));
vi.mock("../../client/src/network/friendsClient", () => ({ friendsAvailable: () => false }));
vi.mock("../../client/src/network/ads", () => ({ adBreak: async () => {}, noteBoutFinished: () => {} }));
vi.mock("../../client/src/uiStore", () => ({}));
vi.mock("../../client/src/audio/AudioManager", () => ({ audio: {} }));
vi.mock("../../client/src/ui/Avatar", () => ({ avatarSrc: () => "avatar.webp" }));
vi.mock("../../client/src/ui/Hotkey", () => ({ useHotkey: () => {}, useKeyboardUi: () => false, KeyCap: () => null }));

describe("results match the actual roster", () => {
  it.each([2, 3, 4])("renders exactly %i rows with the matching board art", async (count) => {
    state.standings = ["a", "b", "c", "d"].slice(0, count);
    state.players = state.standings.map((id, i) => ({ id, name: id, appearance: { avatar: 0 }, isYou: i === 0, isHost: i === 0, connected: true, alive: i === 0 }));
    const path = "../../client/src/ui/Results.tsx";
    const { Results } = await import(path);
    const html = renderToStaticMarkup(createElement(Results));
    expect(html.match(/class="results-board__row(?: |")/g)).toHaveLength(count);
    if (count < 4) expect(html).toContain(`results-board-${count}.webp`);
    else expect(html).not.toContain("background-image");
    expect(html).not.toContain("reward-frame--xp");
  });
});
