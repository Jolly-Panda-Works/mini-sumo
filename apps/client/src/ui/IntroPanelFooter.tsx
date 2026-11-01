import { settingsStore } from "../settings";
import { setProfileOpen, setWardrobeOpen } from "../uiStore";
import { GreenArtButton } from "./ArtButtons";
import { PandaCoach } from "./PandaCoach";
export function finishIntroCustomize() { settingsStore.update({ introStage: "second" }); setWardrobeOpen(false); }
export function finishIntroProfile() { settingsStore.update({ introStage: "goodbye" }); setProfileOpen(false); }
export function IntroPanelFooter({ panel }: { panel: "customize" | "profile" }) {
  return <div className="intro-panel-footer"><PandaCoach pose={panel === "customize" ? "present" : "ready"} /><div><p>{panel === "customize" ? "Your gift is equipped! Explore outfits, hair, colours and faces." : "Your bouts, wins and XP show your real progress. Come back to watch it grow!"}</p><GreenArtButton label={panel === "customize" ? "NEXT BOUT" : "GOT IT!"} onClick={panel === "customize" ? finishIntroCustomize : finishIntroProfile} /></div></div>;
}
