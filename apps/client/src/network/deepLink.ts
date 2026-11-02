import { createStore } from "../store";

/** The room a player was invited to, until the menu joins it. */
export const inviteStore = createStore<{ code: string }>({ code: "" });

interface AppPlugin {
  getLaunchUrl(): Promise<{ url: string } | undefined>;
  addListener(event: "appUrlOpen", listener: (event: { url: string }) => void): Promise<unknown>;
}

interface CapacitorGlobal {
  isNativePlatform?: () => boolean;
  registerPlugin?: <T>(name: string) => T;
}

/** minisumo://join?room=… (the landing page's invite button) or an address with ?room=…. */
function openLink(link: string | undefined): void {
  if (!link) return;
  try {
    const code = new URL(link).searchParams.get("room");
    if (code) inviteStore.update({ code });
  } catch {
    // Not a link of ours.
  }
}

// In a browser (development) the invite is in the address, which is then cleaned up.
openLink(window.location.href);
if (inviteStore.get().code) {
  const url = new URL(window.location.href);
  url.searchParams.delete("room");
  window.history.replaceState(null, "", url);
}

// In the Android app the link either started the app or brought it back.
const cap = (window as unknown as { Capacitor?: CapacitorGlobal }).Capacitor;
if (cap?.isNativePlatform?.() && cap.registerPlugin) {
  const app = cap.registerPlugin<AppPlugin>("App");
  void app.getLaunchUrl().then((launch) => openLink(launch?.url));
  void app.addListener("appUrlOpen", (event) => openLink(event.url));
}
