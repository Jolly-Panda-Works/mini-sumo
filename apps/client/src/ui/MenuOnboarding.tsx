import { useStepView, finishStep } from "./onboardingAnalytics";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Canvas } from "@react-three/fiber";
import { OUTFITS, STARTING_COINS } from "@mini-sumo/shared";
import { economyStore, saveAppearanceRemote } from "../network/economyClient";
import { IntroUsernameError, roomManager, sessionStore } from "../network/RoomManager";
import { settingsStore } from "../settings";
import { setProfileOpen, setWardrobeOpen, showError, uiStore } from "../uiStore";
import { useStore } from "../store";
import { UsernameForm } from "./UsernameForm";
import { Dialog, popupLayer } from "./Dialog";
import { GreenArtButton } from "./ArtButtons";
import { Coins } from "./Coins";
import { PandaCoach } from "./PandaCoach";
import { PreviewSumo } from "./Wardrobe";

const STEPS = [
  { target: "friends", title: "Play with friends", text: "Open Friends to find your friends, create a private room and invite them into your ring." },
  { target: "leaderboard", title: "Climb the leaderboard", text: "See the top wrestlers and compare your progress. Win bouts and work your way up!" },
  { target: "shop", title: "Visit the shop", text: "Use Sumo Coins to unlock new looks and make your wrestler your own. You're ready â€” enjoy the ring!" },
] as const;

/** First-run journey: bot bouts first; the home tour follows the real profile. */
export function MenuOnboarding() {
  const settings = useStore(settingsStore);
  const economy = useStore(economyStore);
  const session = useStore(sessionStore);
  const ui = useStore(uiStore);
  const [busy, setBusy] = useState(false);
  const [renameRound, setRenameRound] = useState<1 | 2 | null>(null);
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
    if (stage === "menu" && !economy.profile?.introRounds?.includes(2)) settingsStore.update({ introStage: "first" });
    if (stage === "firstPlaying" || stage === "secondPlaying") {
      const first = stage === "firstPlaying";
      const completed = economy.profile?.introRounds?.includes(first ? 1 : 2);
      settingsStore.update({ introStage: completed ? first ? "firstWin" : "profile" : first ? "first" : "second" });
    }
    if (stage === "customize" && !ui.wardrobeOpen) setWardrobeOpen(true);
    if (stage === "profile" && !ui.profileOpen) setProfileOpen(true);
  }, [stage, inRoom, busy, session.status, economy.status, economy.profile, settings.menuTourCompleted, ui.wardrobeOpen, ui.profileOpen]);
  const visible = !settings.menuTourCompleted && economy.status === "ready" && !inRoom && !renameRound;
  const stepId = reward ? "starter_reward" : active ? "menu_tip_" + step : stage;
  useStepView(visible && !stage.endsWith("Playing") && stage !== "done" ? stepId : null);
  if (settings.menuTourCompleted || stage === "done" || economy.status !== "ready" || inRoom) return null;
  const start = async (round: 1 | 2) => {
    setBusy(true); setError("");
    settingsStore.update({ introStage: round === 1 ? "firstPlaying" : "secondPlaying" });
    try {
      if (!await roomManager.enterIntroArena(round)) {
        settingsStore.update({ introStage: round === 1 ? "first" : "second" });
        setError(sessionStore.get().error ?? "Couldn't start your bout. Try again.");
      } else { finishStep(round === 1 ? "first" : "second"); }
    } catch (cause) {
      settingsStore.update({ introStage: round === 1 ? "first" : "second" });
      if (cause instanceof IntroUsernameError) {
        await showError("Choose a username", cause.message);
        setRenameRound(round);
      } else {
        setError("Couldn't start your bout. Try again.");
      }
    } finally { setBusy(false); }
  };
  const nextStage = (introStage: typeof stage) => { finishStep(stepId); settingsStore.update({ introStage }); };
  if (renameRound) return (
    <Dialog title="Edit name" className="edit-name" variant="editname" hideClose dismissible={false} onClose={() => undefined}>
      <UsernameForm entryPoint="rookie_recovery" initial={settings.name} className="edit-name__form" onSaved={() => {
        setRenameRound(null);
        void start(renameRound);
      }} />
    </Dialog>
  );
  if (reward) return <Dialog title="Your starter reward!" className="starter-reward" variant="sub" hideClose dismissible={false} onClose={() => undefined}
    footer={<div className="starter-reward__footer"><div className="starter-reward__coins"><Coins amount={STARTING_COINS} signed /></div><GreenArtButton label="LET'S GO!" autoFocus onClick={() => { finishStep("starter_reward"); settingsStore.update({ starterRewardPresented: true }); }} /></div>}>
    <PandaCoach className="intro-panda" pose="celebrate" /><p>A welcome gift for your first match!</p>
  </Dialog>;
  if (stage === "first" || stage === "second") return <Dialog title={stage === "first" ? "Choose your first arena!" : "One more bout!"} className="intro-lesson" variant="sub" hideClose dismissible={false} onClose={() => undefined}
    footer={<GreenArtButton label={busy ? "STARTINGâ€¦" : "ENTER ROOKIE"} disabled={busy} autoFocus onClick={() => void start(stage === "first" ? 1 : 2)} />}>
    <PandaCoach pose={stage === "first" ? "ready" : "kick"} className="intro-panda" />
    <p>{stage === "first" ? "Let's play! Your first Rookie bout is a free one-on-one against a gentle bot. Your coach has your back â€” push your partner out!" : "Try your Sakura outfit in another free Rookie bout against easy bots. Use everything you've learned!"}</p>
    {error && <p role="alert">{error}</p>}
  </Dialog>;
  if (stage === "firstWin") return <Dialog title="Your first victory!" className="intro-lesson" variant="sub" hideClose dismissible={false} onClose={() => undefined} footer={<GreenArtButton label="MY GIFT!" autoFocus onClick={() => nextStage("gift")} />}>
    <PandaCoach pose="celebrate" className="intro-panda" /><p>First place! Fantastic work in the ring. Your first win and XP are saved. Let's celebrate with a new outfit for your wrestler!</p>
  </Dialog>;
  if (stage === "gift") return <Dialog title="A new look for you!" className="intro-lesson intro-outfit" variant="sub" hideClose dismissible={false} onClose={() => undefined} footer={<GreenArtButton label="TRY IT ON!" autoFocus onClick={() => {
    finishStep("gift");
    settingsStore.update({ appearance: { ...settings.appearance, outfit: OUTFITS.findIndex((o) => o.id === "sakura") }, introStage: "customize" });
    void saveAppearanceRemote(); setWardrobeOpen(true);
  }} />}>
    <div className="intro-outfit__showcase"><PandaCoach pose="present" className="intro-panda" /><div className="intro-outfit__preview" aria-label="Your gift: Sakura outfit"><Canvas camera={{ fov: 34, position: [0, 0.4, 3.4] }}><hemisphereLight args={["#fff5df", "#65482e", 2]} /><directionalLight position={[3, 4, 3]} intensity={2} /><group position-y={-0.8}><PreviewSumo appearance={{ ...settings.appearance, outfit: OUTFITS.findIndex((o) => o.id === "sakura") }} color="#e2443a" /></group></Canvas></div></div>
    <p>The Sakura outfit is yours, free! Customise your wrestler with outfits, hair, colours and faces.</p>
  </Dialog>;
  if (stage === "goodbye") return <Dialog title="See you in the ring!" className="intro-lesson" variant="sub" hideClose dismissible={false} onClose={() => undefined} footer={<GreenArtButton label="LET'S PLAY!" autoFocus onClick={() => { finishStep("goodbye"); settingsStore.update({ introStage: "done", menuTourCompleted: true }); }} />}>
    <PandaCoach pose="bow" className="intro-panda" /><p>Training complete! Watch your progress, keep practising and challenge new rivals. Good luck in every battle â€” I'll be cheering for you!</p>
  </Dialog>;
  if (!active) return null;
  const next = () => { finishStep(stepId); if (step === STEPS.length - 1) nextStage("goodbye"); else settingsStore.update({ menuTourIndex: step + 1 }); };
  return createPortal(<div className="menu-tour" role="dialog" aria-modal="true" aria-labelledby="menu-tour-title">
    <div className="menu-tour__blocker" />
    {rect ? <div className="menu-tour__spotlight" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} /> : <div className="menu-tour__shade" />}
    <section className={`menu-tour__card${rect?.cardAtTop ? " menu-tour__card--top" : ""}`}>
      <PandaCoach pose={(["reach", "kick", "present"] as const)[step]!} />
      <div><span className="tutorial__step">YOUR HOME Â· {step + 1} / {STEPS.length}</span><h2 id="menu-tour-title">{STEPS[step]!.title}</h2><p>{STEPS[step]!.text}</p></div>
      <GreenArtButton autoFocus label={step === STEPS.length - 1 ? "FINISH" : "NEXT"} onClick={next} />
      <button className="art menu-tour__skip" onClick={() => { finishStep(stepId, "skipped"); nextStage("goodbye"); }} aria-label="Skip menu tips"><img src={`${import.meta.env.BASE_URL}ui/label-empty.webp`} alt="" /><span>SKIP TIPS</span></button>
    </section>
  </div>, popupLayer());
}
