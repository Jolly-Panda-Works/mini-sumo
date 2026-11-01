import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Mesh } from "three";
import { lerpAngle } from "@mini-sumo/shared";
import { createBody, DEFAULT_CONFIG, tryDash, type SimBody } from "@mini-sumo/sim";
import { settingsStore, touchControlsEnabled } from "../settings";
import { Arena } from "../game/Arena";
import { CameraRig } from "../game/CameraRig";
import { themeFor } from "../game/arenaThemes";
import { SumoModel, useSumoParts } from "../game/SumoModel";
import { Effects } from "../game/Effects";
import { Callouts } from "../game/Callouts";
import { dustBus, hitStop, lastDashAt, lastHitAt, lastHit, pulseBus, slowMo, timeScale } from "../game/effectsBus";
import { practiceDash, practiceImpact, practiceSuccess } from "../game/practiceEffects";
import { useStore } from "../store";
import { stepPracticeBodies } from "../game/practicePhysics";
import { Dialog } from "./Dialog";
import { DashModeChoice } from "./DashModeChoice";
import { dashFeel } from "../game/dashFeel";

const KEYS: Record<string, [number, number]> = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
interface Practice {
  me: SimBody; opponent: SimBody; keys: Set<string>; touch: { x: number; y: number };
  time: number; moved: number; aimedDash: boolean; hitTarget: boolean; step: number; done: boolean;
}
function reset(p: Practice, step: number) {
  p.me = createBody("tutorial-you", step === 2 ? 1.5 : -1.5, 0, 0);
  p.opponent = createBody("tutorial-coach", step === 2 ? 4.5 : 1.5, 0, Math.PI);
  p.moved = 0; p.aimedDash = false; p.hitTarget = false; p.keys.clear(); p.touch = { x: 0, y: 0 }; p.done = false; p.step = step;
  for (const id of [p.me.id, p.opponent.id]) { lastDashAt.delete(id); lastHitAt.delete(id); lastHit.delete(id); }
}
function vector(p: Practice) {
  let { x, y } = p.touch;
  for (const key of p.keys) { const v = KEYS[key]; if (v) { x += v[0]; y += v[1]; } }
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}
function requestPracticeDash(p: Practice) {
  if (p.step === 0 || p.step >= 3 || p.done) return;
  const v = vector(p);
  p.me.inputX = v.x; p.me.inputY = v.y;
  if (tryDash(p.me, p.time, DEFAULT_CONFIG)) {
    p.aimedDash = true;
    practiceDash(p.me.id, p.me.x, p.me.y);
  }
}

function Wrestler({ body, color, p }: { body: SimBody; color: string; p: Practice }) {
  const parts = useSumoParts();
  const fall = useRef(0);
  useFrame(({ clock }, delta) => {
    const root = parts.root.current, torso = parts.torso.current;
    if (!root || !torso) return;
    const dt = Math.min(delta, 0.05), now = performance.now();
    const outside = Math.hypot(body.x, body.y) > DEFAULT_CONFIG.arenaRadius + DEFAULT_CONFIG.eliminationTolerance;
    fall.current += ((outside ? 1 : 0) - fall.current) * (1 - Math.exp(-8 * dt));
    root.position.set(body.x, -fall.current * 1.6, body.y);
    root.rotation.y = lerpAngle(root.rotation.y, Math.atan2(Math.cos(body.angle), Math.sin(body.angle)), 1 - Math.exp(-18 * dt));
    root.rotation.z = fall.current * 0.8;
    if (parts.ring.current) parts.ring.current.visible = !outside;
    const speed = Math.hypot(body.vx, body.vy);
    const walking = Math.min(1, speed / 4);
    const sinceDash = (now - (lastDashAt.get(body.id) ?? -1e9)) / 1000;
    const feel = dashFeel(sinceDash);
    parts.dashStrength.current = feel.tint;
    torso.position.z = feel.offset;
    const sinceHit = (now - (lastHitAt.get(body.id) ?? -1e9)) / 1000;
    const strength = Math.min(1, (lastHit.get(body.id)?.strength ?? 0) / 10);
    const squash = sinceHit < 0.65 ? Math.exp(-6 * sinceHit) * Math.cos(sinceHit * 24) * strength * 0.4 : 0;
    const dash = p.time < body.dashEndsAt;
    const windup = sinceDash < 0.025 ? (1 - sinceDash / 0.025) * 0.2 : 0;
    torso.scale.set(1 + squash + windup, 1 - squash * 0.65 - windup, dash ? 1.2 : 1);
    const stunned = p.time < (body.stunnedUntil ?? 0);
    torso.rotation.x = (dash ? 0.28 : walking * 0.1) + feel.lean;
    torso.rotation.z = stunned ? Math.sin(clock.elapsedTime * 20) * 0.15 : 0;
    torso.position.y = 0.3 + Math.abs(Math.sin(clock.elapsedTime * 14)) * walking * 0.06;
    if (parts.armL.current) parts.armL.current.rotation.x = Math.sin(clock.elapsedTime * 14) * walking * 0.25 - (dash ? 0.5 : 0);
    if (parts.armR.current) parts.armR.current.rotation.x = -Math.sin(clock.elapsedTime * 14) * walking * 0.25 - (dash ? 0.5 : 0);
  });
  return <SumoModel parts={parts} color={color} />;
}

function PracticeScene({ p, complete, feedback }: { p: Practice; complete: () => void; feedback: (text: string) => void }) {
  const marker = useRef<Mesh>(null);
  const lastImpact = useRef(-Infinity);
  const lastTrail = useRef(0);
  const lastReady = useRef(true);
  useFrame(({ clock }, delta) => {
    if (document.hidden) return;
    if (marker.current) marker.current.scale.setScalar(1 + Math.sin(clock.elapsedTime * 4) * 0.1);
    if (performance.now() < hitStop.until) return;
    const dt = Math.min(delta, 1 / 30) * timeScale();
    const v = vector(p);
    p.me.inputX = p.done ? 0 : v.x; p.me.inputY = p.done ? 0 : v.y;
    const beforeX = p.me.x, beforeY = p.me.y;
    p.time = stepPracticeBodies(p.me, p.step > 0 ? p.opponent : null, dt, p.time, DEFAULT_CONFIG, (hit) => {
      if (p.aimedDash && p.time < p.me.dashEndsAt + 100 && hit.strength > 2) p.hitTarget = true;
      if (performance.now() - lastImpact.current < 180) return;
      lastImpact.current = performance.now();
      practiceImpact(hit, p.step === 1);
      if (!p.done) feedback(p.step === 1 ? "Nice hit! That's how a dash lands." : "Good push! Keep the blue wrestler moving toward the rope.");
    });
    p.moved += Math.hypot(p.me.x - beforeX, p.me.y - beforeY);
    const ready = p.time >= p.me.dashReadyAt;
    if (ready && !lastReady.current) {
      pulseBus.emit({ x: p.me.x, y: p.me.y, color: "#ffc52f", size: 1 });
      if (!p.done) feedback("Dash is ready again. Press DASH or Space!");
    }
    lastReady.current = ready;
    if (p.time < p.me.dashEndsAt && p.time - lastTrail.current > 45) {
      lastTrail.current = p.time;
      dustBus.emit({ x: p.me.x, y: p.me.y, count: 3, speed: 0.8 });
    }
    const goal = p.step === 0 ? Math.hypot(p.me.x - 1, p.me.y - 1.5) < 0.85 : p.step === 1 ? p.hitTarget : Math.hypot(p.opponent.x, p.opponent.y) > DEFAULT_CONFIG.arenaRadius + DEFAULT_CONFIG.eliminationTolerance;
    if (!p.done && goal) {
      p.done = true;
      practiceSuccess(p.step === 2 ? p.opponent.x : p.me.x, p.step === 2 ? p.opponent.y : p.me.y, p.step === 2);
      complete();
    }
    if (!p.done && Math.hypot(p.me.x, p.me.y) > DEFAULT_CONFIG.arenaRadius + DEFAULT_CONFIG.eliminationTolerance) {
      Object.assign(p.me, createBody("tutorial-you", p.step === 2 ? 1.5 : -1.5, 0));
      Object.assign(p.opponent, createBody("tutorial-coach", p.step === 2 ? 4.5 : 1.5, 0, Math.PI));
      p.hitTarget = false; p.aimedDash = false;
      feedback("Stay inside the straw rope! No penalty here — try again.");
    }
  });
  return <>
    <Arena theme={themeFor("training")} />
    {p.step === 0 && <mesh ref={marker} position={[1, 0.06, 1.5]} rotation-x={-Math.PI / 2}><ringGeometry args={[0.55, 0.72, 32]} /><meshBasicMaterial color="#ffb52e" transparent opacity={0.85} depthWrite={false} /></mesh>}
    <Wrestler body={p.me} color="#E2443A" p={p} />
    {p.step > 0 && <Wrestler body={p.opponent} color="#3D7FE0" p={p} />}
    <Effects /><Callouts />
  </>;
}

export function Tutorial() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [coachMessage, setCoachMessage] = useState("");
  const [completionOpen, setCompletionOpen] = useState(false);
  const settings = useStore(settingsStore);
  const touch = touchControlsEnabled(settings.touchControls);
  const p = useMemo<Practice>(() => ({ me: createBody("tutorial-you", -1.5, 0), opponent: createBody("tutorial-coach", 1.5, 0, Math.PI), keys: new Set(), touch: { x: 0, y: 0 }, time: 0, moved: 0, aimedDash: false, hitTarget: false, step: 0, done: false }), []);
  const stick = useRef<number | null>(null);
  const dashPointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const timer = window.setInterval(() => setCooldown(Math.max(0, p.me.dashReadyAt - p.time)), 100);
    return () => window.clearInterval(timer);
  }, [p]);
  useEffect(() => () => {
    for (const id of [p.me.id, p.opponent.id]) { lastDashAt.delete(id); lastHitAt.delete(id); lastHit.delete(id); }
    hitStop.until = 0;
    slowMo.until = 0;
  }, [p]);
  useEffect(() => {
    if (!done || step !== 2) return;
    const timer = window.setTimeout(() => setCompletionOpen(true), 1800);
    return () => window.clearTimeout(timer);
  }, [done, step]);
  const begin = () => requestPracticeDash(p);
  const changeStep = (next: number) => { reset(p, next); setCoachMessage(""); setDone(false); setStep(next); setKnob({ x: 0, y: 0 }); };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code in KEYS) { e.preventDefault(); p.keys.add(e.code); }
      if (e.code === "Space") { e.preventDefault(); if (!e.repeat) begin(); }
    };
    const up = (e: KeyboardEvent) => { p.keys.delete(e.code); };
    const clear = () => { p.keys.clear(); p.touch = { x: 0, y: 0 }; stick.current = null; dashPointer.current = null; setKnob({ x: 0, y: 0 }); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear); document.addEventListener("visibilitychange", clear);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", clear); };
  }, [p]);
  const moveStick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - rect.left - rect.width / 2) / 40, y = (e.clientY - rect.top - rect.height / 2) / 40;
    const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
    p.touch = { x, y }; setKnob({ x: x * 35, y: y * 35 });
  };
  const finish = (dashMode: "manual" | "auto") => settingsStore.update({ dashMode, dashModeChosen: true, tutorialCompleted: true });
  const chooseOrFinish = () => {
    setCompletionOpen(false);
    if (settingsStore.get().dashModeChosen) finish(settingsStore.get().dashMode);
    else changeStep(3);
  };
  const skipPractice = () => {
    if (settingsStore.get().dashModeChosen) finish(settingsStore.get().dashMode);
    else changeStep(3);
  };
  const titles = ["Follow the golden marker", "Land your first dash", "Push them out!", "Choose your dash style"];
  const descriptions = [touch ? "Hi! I'm your panda coach. Drag the joystick and bring the red wrestler to the golden circle!" : "Hi! I'm your panda coach. Use WASD or arrows to bring the red wrestler to the golden circle!", touch ? "Face our blue partner with the joystick, then tap DASH to hit them!" : "Face our blue partner with WASD or arrows, then press Space to hit them!", "Now finish the move! Push or dash the blue wrestler past the straw rope. Stay inside yourself!", "Nice work! How would you like to dash? You can change this anytime in Settings."];
  const pose = done || step === 3 ? "cheer" : step === 0 ? "welcome" : "aim";
  const successMessage = ["Perfect footwork! Let's try a dash.", "Great hit! Feel that impact? Now let's win a bout.", "Ring out! You're ready for your first match."][step];
  return <section className="tutorial" aria-label="Learn to play Mini Sumo">
    {step < 3 && <div className="tutorial__arena">
      <Canvas camera={{ fov: 48, position: [0, 16, 15] }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)} dpr={[1, 1.5]}>
        <color attach="background" args={["#90cce9"]} /><hemisphereLight args={["#fff5df", "#6d4c2f", 2]} /><directionalLight position={[4, 10, 5]} intensity={2} />
        <PracticeScene key={step} p={p} complete={() => setDone(true)} feedback={setCoachMessage} />
        <CameraRig orbit={false} />
      </Canvas>
    </div>}
    {step < 3 && <div className="tutorial__card">
      <div className="tutorial__guides"><img key={pose} className={`tutorial__panda tutorial__panda--${pose}`} src={`${import.meta.env.BASE_URL}tutorial/panda-${pose}.webp`} alt={`Panda coach: ${pose === "cheer" ? "celebrating" : pose === "aim" ? "pointing" : "welcoming"}`} /></div>
      <div className="tutorial__copy"><span className="tutorial__step">{step < 3 ? `PANDA COACH · ${step + 1} / 3` : "READY TO PLAY"}</span><h2>{titles[step]}</h2><p aria-live="polite">{done ? successMessage : coachMessage || descriptions[step]}</p></div>
    </div>}
    {completionOpen && <Dialog title="Training complete!" className="tutorial-success" variant="sub" hideClose dismissible={false} onClose={chooseOrFinish} footer={<button className="art art--great" autoFocus onClick={chooseOrFinish} aria-label="Great! Let's play"><img src={`${import.meta.env.BASE_URL}ui/btn-great.webp`} alt="" draggable={false} /></button>}>
      <img className="tutorial-success__panda" src={`${import.meta.env.BASE_URL}tutorial/panda-cheer.webp`} alt="Panda coach celebrating" />
      <p>You've mastered the basics! Step into the ring and put your skills to the test against real opponents.</p>
    </Dialog>}
    {step === 3 && <Dialog title="Choose your dash" className="tutorial-dash-choice" variant="sub" hideClose dismissible={false} onClose={() => undefined}>
      <img className="tutorial-success__panda" src={`${import.meta.env.BASE_URL}tutorial/panda-aim.webp`} alt="Panda coach explaining dash modes" />
      <p>How would you like to dash? You can change this later in Settings.</p>
      <DashModeChoice value={settings.dashMode} onChange={finish} />
      <p className="hint"><strong>Auto:</strong> dash toward nearby opponents when ready.<br /><strong>Manual:</strong> press the dash button or Space to dash.</p>
    </Dialog>}
    {step < 3 && <>
      <div className="tutorial__actions" aria-live="polite">
        {done && step < 2 ? <button className="tutorial__art-button tutorial__next" aria-label="Great! Continue" onClick={() => changeStep(step + 1)}><img src={`${import.meta.env.BASE_URL}ui/btn-start-blank.webp`} alt="" draggable={false} /><span>CONTINUE</span></button> : !done && <span>Try it in the ring</span>}
        {!done && <button className="tutorial__art-button tutorial__skip" aria-label="Skip practice" onClick={skipPractice}><img src={`${import.meta.env.BASE_URL}ui/label-empty.webp`} alt="" draggable={false} /><span>SKIP PRACTICE</span></button>}
      </div>
      {touch && !done && <div className="tutorial__stick" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hud/joy-base.webp)` }} role="application" aria-label="Practice joystick: drag to move"
        onPointerDown={(e) => { if (stick.current !== null) return; stick.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); moveStick(e); }}
        onPointerMove={(e) => { if (e.pointerId === stick.current) moveStick(e); }}
        onPointerUp={(e) => { if (e.pointerId !== stick.current) return; stick.current = null; p.touch = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); }}
        onLostPointerCapture={() => { stick.current = null; p.touch = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); }}
        onPointerCancel={() => { stick.current = null; p.touch = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); }}>
        <img src={`${import.meta.env.BASE_URL}hud/joy-knob.webp`} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} alt="" draggable={false} />
      </div>}
      {step > 0 && !done && <button className="tutorial__dash" aria-label="Press to dash"
        onPointerDown={(e) => { if (dashPointer.current !== null) return; dashPointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); begin(); }}
        onPointerUp={(e) => { if (e.pointerId !== dashPointer.current) return; dashPointer.current = null; }}
        onPointerCancel={() => { dashPointer.current = null; }}
        onLostPointerCapture={() => { dashPointer.current = null; }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.repeat) begin(); }}><img src={`${import.meta.env.BASE_URL}hud/dash.webp`} alt="" draggable={false} /><span>{cooldown > 0 ? `RECHARGE ${(cooldown / 1000).toFixed(1)}s` : "DASH"}</span></button>}
    </>}
  </section>;
}
