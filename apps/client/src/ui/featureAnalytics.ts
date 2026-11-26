import { useEffect, useRef } from "react";
import { track } from "../analytics";
import { sessionStore } from "../network/RoomManager";
import { settingsStore } from "../settings";

export function featureSource(feature: string) {
  const stage = settingsStore.get().introStage;
  if ((stage === "profile" && feature === "profile") || (stage === "customize" && feature === "wardrobe")) return "onboarding";
  return sessionStore.get().roomId ? "room" : "menu";
}
export function useFeatureOpened(feature: string) {
  const reported = useRef(false);
  useEffect(() => {
    if (reported.current) return;
    reported.current = true;
    track("feature_opened", { feature, entry_point: featureSource(feature) });
  }, [feature]);
}
