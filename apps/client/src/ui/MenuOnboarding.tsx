import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { OUTFITS, STARTING_COINS } from "@mini-sumo/shared";
import { economyStore, saveAppearanceRemote } from "../network/economyClient";
import { roomManager, sessionStore } from "../network/RoomManager";
import { settingsStore } from "../settings";
import { setProfileOpen, setWardrobeOpen, uiStore } from "../uiStore";
import { useStore } from "../store";
import { Dialog, popupLayer } from "./Dialog";
import { GreenArtButton } from "./ArtButtons";
import { Coins } from "./Coins";
import { PandaCoach } from "./PandaCoach";
import { PreviewSumo } from "./Wardrobe";

const STEPS = [
  { target: "friends", title: "Play with friends", text: "Open Friends to find your friends, create a private room and invite them into your ring." },
  { target: "leaderboard", title: "Climb the leaderboard", text: "See the top wrestlers and compare your progress. Win bouts and work your way up!" },
  { target: "shop", title: "Visit the shop", text: "Use Sumo Coins to unlock new looks and make your wrestler your own. You're ready — enjoy the ring!" },
] as const;

/** First-run journey: home tour, two isolated bot bouts, outfit and real profile. */
export function MenuOnboarding() {
  const settings = useStore(settingsStore);
  const economy = useStore(economyStore);
  const session = useStore(sessionStore);
  const ui = useStore(uiStore);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number; cardAtTop: boolean } | null>(null);
  const inRoom = session.status === "connected";
  const stage = settings.introStage;
  const step = settings.menuTourIndex;
  const reward = !settings.starterRewardPresented;
  const active = !reward && !settings.menuTourCompleted && stage === "menu" && !inRoom;
  useEffect(() => {
    if (!active) return;
    const update = () => {
      const targets = document.querySelectorAll<HTMLElement>(`[data-menu-tour="${STEPS[step]!.target}"]`);
      const element = [...targets].find((el) => el.getClientRects().length > 0);
      if (!element) { setRect(null); return; }
      const box = element.getBoundingClientRect();
      const x = Math.max(4, box.left - 5), y = Math.max(4, box.top - 5);
      setRect({ x, y, width: Math.min(innerWidth - x - 4, box.width + 10), height: Math.min(innerHeight - y - 4, box.height + 10), cardAtTop: box.top > innerHeight * 0.45 });
    };
    update();
    window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [active, step]);
  // Resume safely after a refresh or a connection loss; account history prevents duplicate gifts/XP.
  useEffect(() => {
    if (inRoom || busy || session.status === "connecting" || economy.status !== "ready" || settings.menuTourCompleted) return;
    if (stage === "firstPlaying" || stage === "secondPlaying") {
      const first = stage === "firstPlaying";
      const completed = economy.profile?.introRounds?.includes(first ? 1 : 2);
      settingsStore.update({ introStage: completed ? first ? "firstWin" : "profile" : first ? "first" : "second" });
    }
    if (stage === "customize" && !ui.wardrobeOpen) setWardrobeOpen(true);
    if (stage === "profile" && !ui.profileOpen) setProfileOpen(true);
  }, [stage, inRoom, busy, session.status, economy.status, economy.profile, settings.menuTourCompleted, ui.wardrobeOpen, ui.profileOpen]);
  if (settings.menuTourCompleted || stage === "done" || economy.status !== "ready" || inRoom) return null;
  const start = async (round: 1 | 2) => {
    setBusy(true); setError("");
    settingsStore.update({ introStage: round === 1 ? "firstPlaying" : "secondPlaying" });
    try {
      if (!await roomManager.enterIntroArena(round)) {
        settingsStore.update({ introStage: round === 1 ? "first" : "second" });
        setError(sessionStore.get().error ?? "Couldn't start your bout. Try again.");
      }
    } catch {
      settingsStore.update({ introStage: round === 1 ? "first" : "second" });
      setError("Couldn't start your bout. Try again.");
    } finally { setBusy(false); }
  };
  const nextStage = (introStage: typeof stage) => settingsStore.update({ introStage });
  if (reward) return <Dialog title="Your starter reward!" className="starter-reward" variant="sub" hideClose dismissible={false} onClose={() => undefined}
    footer={<div className="starter-reward__footer"><div className="starter-reward__coins"><Coins amount={STARTING_COINS} signed /></div><GreenArtButton label="LET'S GO!" autoFocus onClick={() => settingsStore.update({ starterRewardPresented: true })} /></div>}>
    <PandaCoach className="intro-panda" pose="celebrate" /><p>A welcome gift for your first match!</p>
  </Dialog>;
  if (stage === "first" || stage === "second") return <Dialog title={stage === "first" ? "Choose your first arena!" : "One more bout!"} className="intro-lesson" variant="sub" hideClose dismissible={false} onClose={() => undefined}
    footer={<GreenArtButton label={busy ? "STARTING…" : "ENTER ROOKIE"} disabled={busy} autoFocus onClick={() => void start(stage === "first" ? 1 : 2)} />}>
    <PandaCoach pose={stage === "first" ? "ready" : "kick"} className="intro-panda" />
    <p>{stage === "first" ? "Arenas have entry fees and level requirements. Start with a free guided bout in Rookie, the first arena, against three easy bots. Your coach has your back!" : "Try your Sakura outfit in another free Rookie bout against easy bots. Use everything you've learned!"}</p>
    {error && <p role="alert">{error}</p>}
  </Dialog>;
  if (stage === "firstWin") return <Dialog title="Your first victory!" className="intro-lesson" variant="sub" hideClose dismissible={false} onClose={() => undefined} footer={<GreenArtButton label="MY GIFT!" autoFocus onClick={() => nextStage("gift")} />}>
    <PandaCoach pose="celebrate" className="intro-panda" /><p>First place! Fantastic work in the ring. Your first win and XP are saved. Let's celebrate with a new outfit for your wrestler!</p>
  </Dialog>;
  if (stage === "gift") return <Dialog title="A new look for you!" className="intro-lesson intro-outfit" variant="sub" hideClose dismissible={false} onClose={() => undefined} footer={<GreenArtButton label="TRY IT ON!" autoFocus onClick={() => {
    settingsStore.update({ appearance: { ...settings.appearance, outfit: OUTFITS.findIndex((o) => o.id === "sakura") }, introStage: "customize" });
    void saveAppearanceRemote(); setWardrobeOpen(true);
  }} />}>
    <div className="intro-outfit__showcase"><PandaCoach pose="present" className="intro-panda" /><div className="intro-outfit__preview" aria-label="Your gift: Sakura outfit"><Canvas camera={{ fov: 34, position: [0, 0.4, 3.4] }}><hemisphereLight args={["#fff5df", "#65482e", 2]} /><directionalLight position={[3, 4, 3]} intensity={2} /><group position-y={-0.8}><PreviewSumo appearance={{ ...settings.appearance, outfit: OUTFITS.findIndex((o) => o.id === "sakura") }} color="#e2443a" /></group></Canvas></div></div>
    <p>The Sakura outfit is yours, free! Customise your wrestler with outfits, hair, colours and faces.</p>
  </Dialog>;
  if (stage === "goodbye") return <Dialog title="See you in the ring!" className="intro-lesson" variant="sub" hideClose dismissible={false} onClose={() => undefined} footer={<GreenArtButton label="LET'S PLAY!" autoFocus onClick={() => settingsStore.update({ introStage: "done", menuTourCompleted: true })} />}>
    <PandaCoach pose="bow" className="intro-panda" /><p>Training complete! Watch your progress, keep practising and challenge new rivals. Good luck in every battle — I'll be cheering for you!</p>
  </Dialog>;
  if (!active) return null;
  const next = () => step === STEPS.length - 1 ? nextStage("first") : settingsStore.update({ menuTourIndex: step + 1 });
  return createPortal(<div className="menu-tour" role="dialog" aria-modal="true" aria-labelledby="menu-tour-title">
    <div className="menu-tour__blocker" />
    {rect ? <div className="menu-tour__spotlight" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} /> : <div className="menu-tour__shade" />}
    <section className={`menu-tour__card${rect?.cardAtTop ? " menu-tour__card--top" : ""}`}>
      <PandaCoach pose={(["reach", "kick", "present"] as const)[step]!} />
      <div><span className="tutorial__step">YOUR HOME · {step + 1} / {STEPS.length}</span><h2 id="menu-tour-title">{STEPS[step]!.title}</h2><p>{STEPS[step]!.text}</p></div>
      <GreenArtButton autoFocus label={step === STEPS.length - 1 ? "FIRST BOUT!" : "NEXT"} onClick={next} />
      <button className="art menu-tour__skip" onClick={() => nextStage("first")} aria-label="Skip menu tips"><img src={`${import.meta.env.BASE_URL}ui/label-empty.webp`} alt="" /><span>SKIP TIPS</span></button>
    </section>
  </div>, popupLayer());
}
