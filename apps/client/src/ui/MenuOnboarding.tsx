import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { STARTING_COINS } from "@mini-sumo/shared";
import { economyStore } from "../network/economyClient";
import { settingsStore } from "../settings";
import { useStore } from "../store";
import { Dialog, popupLayer } from "./Dialog";
import { GreenArtButton } from "./ArtButtons";
import { Coins } from "./Coins";

const STEPS = [
  { target: "arenas", title: "Choose your arena", text: "Start in Training for free, or enter an arena to challenge opponents. Check its entry fee and level before joining." },
  { target: "friends", title: "Play with friends", text: "Open Friends to find your friends, create a private room and invite them into your ring." },
  { target: "leaderboard", title: "Climb the leaderboard", text: "See the top wrestlers and compare your progress. Win bouts and work your way up!" },
  { target: "shop", title: "Visit the shop", text: "Use Sumo Coins to unlock new looks and make your wrestler your own. You're ready — enjoy the ring!" },
] as const;

/** Presents the existing welcome grant, never grants another 200 coins. */
export function MenuOnboarding() {
  const settings = useStore(settingsStore);
  const economy = useStore(economyStore);
  const [step, setStep] = useState(0);
  const [rect, setRect] = useState<{ x: number; y: number; width: number; height: number; cardAtTop: boolean } | null>(null);
  const reward = !settings.starterRewardPresented;
  const active = !reward && !settings.menuTourCompleted;
  useEffect(() => {
    if (!active) return;
    const update = () => {
      const targets = document.querySelectorAll<HTMLElement>(`[data-menu-tour="${STEPS[step]!.target}"]`);
      const element = [...targets].find((el) => el.getClientRects().length > 0);
      if (!element) { setRect(null); return; }
      const box = element.getBoundingClientRect();
      const x = Math.max(4, box.left - 5), y = Math.max(4, box.top - 5);
      setRect({ x, y, width: Math.min(innerWidth - x - 4, box.width + 10), height: Math.min(innerHeight - y - 4, box.height + 10), cardAtTop: STEPS[step]!.target === "arenas" || box.top > innerHeight * 0.45 });
    };
    update();
    window.addEventListener("resize", update); window.addEventListener("scroll", update, true);
    return () => { window.removeEventListener("resize", update); window.removeEventListener("scroll", update, true); };
  }, [active, step]);
  if (settings.menuTourCompleted || economy.status !== "ready") return null;
  if (reward) return <Dialog title="Your starter reward!" className="starter-reward" variant="sub" hideClose dismissible={false} onClose={() => undefined}
    footer={<div className="starter-reward__footer"><div className="starter-reward__coins"><Coins amount={STARTING_COINS} signed /></div><GreenArtButton label="LET'S GO!" autoFocus onClick={() => settingsStore.update({ starterRewardPresented: true })} /></div>}>
    <img className="tutorial-success__panda" src={`${import.meta.env.BASE_URL}tutorial/panda-cheer.webp`} alt="Panda coach celebrating" />
    <p>A welcome gift for your first match!</p>
  </Dialog>;
  const finish = () => settingsStore.update({ menuTourCompleted: true });
  return createPortal(<div className="menu-tour" role="dialog" aria-modal="true" aria-labelledby="menu-tour-title">
    <div className="menu-tour__blocker" />
    {rect && <div className="menu-tour__spotlight" style={{ left: rect.x, top: rect.y, width: rect.width, height: rect.height }} />}
    {!rect && <div className="menu-tour__shade" />}
    <section className={`menu-tour__card${rect?.cardAtTop ? " menu-tour__card--top" : ""}`}>
      <img src={`${import.meta.env.BASE_URL}tutorial/panda-${step === 3 ? "cheer" : "aim"}.webp`} alt="Panda guide" />
      <div><span className="tutorial__step">YOUR HOME · {step + 1} / 4</span><h2 id="menu-tour-title">{STEPS[step]!.title}</h2><p>{STEPS[step]!.text}</p></div>
      <GreenArtButton autoFocus label={step === 3 ? "LET'S PLAY!" : "NEXT"} onClick={() => step === 3 ? finish() : setStep(step + 1)} />
      <button className="art menu-tour__skip" onClick={finish} aria-label="Skip menu tour"><img src={`${import.meta.env.BASE_URL}ui/label-empty.webp`} alt="" /><span>SKIP TOUR</span></button>
    </section>
  </div>, popupLayer());
}
