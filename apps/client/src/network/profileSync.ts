import { sanitizeAppearance, validateUsername, type UsernamePolicy, type ProfileResponse, type ProfileSyncRequest } from "@mini-sumo/shared";
import { settingsStore } from "../settings";
import { ApiError, applyServerProfile, economyStore, request } from "./economyClient";
import { localEconomy } from "./localEconomy";
import { networkStore } from "./networkMode";

/**
 * The profile lives on the device first: name, picture/look, XP and level work with no
 * server and are saved locally. When the server is reachable, the device's copy is sent and
 * merged (newer name/look wins, higher XP and stats win) and the result is kept on both.
 */
export const usernamePolicy: UsernamePolicy =
  import.meta.env.VITE_STORE === "myket" || import.meta.env.VITE_STORE === "bazaar" ? "persian" : "international";

export const usernameHint = "Use 3 to 16 character";

export async function saveUsername(raw: string): Promise<void> {
  const name = validateUsername(raw, usernamePolicy);
  if (!name) throw new Error(usernameHint);
  let savedName = name;
  if (networkStore.get().mode === "online" && economyStore.get().catalog?.flags.economy !== false) {
    try {
      const saved = await request<{ name: string }>("/profile/username", {
        method: "PUT",
        body: JSON.stringify({ name, policy: usernamePolicy }),
      });
      savedName = saved.name;
    } catch (error) {
      // Older servers accept the name through profile sync.
      if (!(error instanceof ApiError) || error.status !== 404) throw error;
    }
  }
  settingsStore.update({ name: savedName, onboarded: true });
}

const UPDATED_KEY = "mini-sumo:profile-updated-at";

function readUpdatedAt(): string {
  try {
    return window.localStorage.getItem(UPDATED_KEY) ?? "";
  } catch {
    return "";
  }
}

function writeUpdatedAt(value: string): void {
  try {
    window.localStorage.setItem(UPDATED_KEY, value);
  } catch {
    // Without storage the next sync simply sends "now".
  }
}

// Note every change of name or look, so the newer side can win on sync.
let applyingServer = false;
let last = JSON.stringify([settingsStore.get().name, settingsStore.get().appearance]);
settingsStore.subscribe(() => {
  const now = JSON.stringify([settingsStore.get().name, settingsStore.get().appearance]);
  if (now === last) return;
  last = now;
  if (!applyingServer) writeUpdatedAt(new Date().toISOString());
  scheduleSync();
});

let timer = 0;
function scheduleSync(): void {
  window.clearTimeout(timer);
  timer = window.setTimeout(() => void syncProfile(), 1500);
}

let syncing: Promise<void> | null = null;

/** Sends the device's profile and applies the merged result (online only). */
export function syncProfile(): Promise<void> {
  if (networkStore.get().mode !== "online" || economyStore.get().status !== "ready") return Promise.resolve();
  syncing ??= (async () => {
    const settings = settingsStore.get();
    const progress = localEconomy.progress();
    const deviceUpdatedAt = readUpdatedAt();
    const body: ProfileSyncRequest = {
      name: settings.name,
      usernamePolicy,
      appearance: settings.appearance,
      ...progress,
      updatedAt: deviceUpdatedAt || new Date(settings.name && !economyStore.get().profile?.name ? Date.now() : 0).toISOString(),
    };
    try {
      const profile = await request<ProfileResponse>("/profile/sync", { method: "POST", body: JSON.stringify(body) });
      // The server's name/look is newer (changed on another device): take it.
      const current = settingsStore.get();
      const unchanged = current.name === body.name && readUpdatedAt() === deviceUpdatedAt;
      if (unchanged && profile.profileUpdatedAt && profile.profileUpdatedAt >= body.updatedAt) {
        applyingServer = true;
        const serverName = validateUsername(profile.name, usernamePolicy);
        settingsStore.update({
          ...(serverName ? { name: serverName } : body.name ? { onboarded: false } : {}),
          ...(profile.profileUpdatedAt > body.updatedAt ? { appearance: sanitizeAppearance(profile.appearance) } : {}),
        });
        applyingServer = false;
        writeUpdatedAt(profile.profileUpdatedAt);
      }
      applyServerProfile(profile);
    } catch {
      // Server unreachable: everything stays on the device; the next sync sends it.
    }
  })().finally(() => {
    syncing = null;
  });
  return syncing;
}
