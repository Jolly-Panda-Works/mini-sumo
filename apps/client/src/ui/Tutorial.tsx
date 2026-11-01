import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import type { Group } from "three";
import { createBody, DEFAULT_CONFIG, dashDistance, tryDash, type SimBody } from "@mini-sumo/sim";
import { settingsStore, touchControlsEnabled } from "../settings";
import { DashArrow } from "../game/DashGuide";
import { Arena } from "../game/Arena";
import { CameraRig } from "../game/CameraRig";
import { themeFor } from "../game/arenaThemes";
import { SumoModel, useSumoParts } from "../game/SumoModel";
import { useStore } from "../store";
import { stepPracticeBodies } from "../game/practicePhysics";

const KEYS: Record<string, [number, number]> = { KeyW: [0, -1], ArrowUp: [0, -1], KeyS: [0, 1], ArrowDown: [0, 1], KeyA: [-1, 0], ArrowLeft: [-1, 0], KeyD: [1, 0], ArrowRight: [1, 0] };
interface Practice {
  me: SimBody; opponent: SimBody; keys: Set<string>; touch: { x: number; y: number };
  held: boolean; heldAt: number; time: number; moved: number; aimedDash: boolean; step: number; done: boolean;
}
function reset(p: Practice, step: number) {
  p.me = createBody("you", step === 2 ? 1.5 : -1.5, 0, 0);
  p.opponent = createBody("coach", step === 2 ? 4.5 : 2, 0, Math.PI);
  p.moved = 0; p.aimedDash = false; p.held = false; p.keys.clear(); p.touch = { x: 0, y: 0 }; p.done = false; p.step = step;
}
function vector(p: Practice) {
  let { x, y } = p.touch;
  for (const key of p.keys) { const v = KEYS[key]; if (v) { x += v[0]; y += v[1]; } }
  const len = Math.hypot(x, y);
  return len > 1 ? { x: x / len, y: y / len } : { x, y };
}
function release(p: Practice, cancel = false) {
  const held = p.held; p.held = false;
  if (!held || cancel || p.step === 0 || p.done) return;
  const v = vector(p);
  p.me.inputX = v.x; p.me.inputY = v.y;
  if (tryDash(p.me, p.time, DEFAULT_CONFIG) && performance.now() - p.heldAt >= 120) p.aimedDash = true;
}

function Wrestler({ body, color }: { body: SimBody; color: string }) {
  const parts = useSumoParts();
  useFrame(() => {
    if (!parts.root.current) return;
    parts.root.current.position.set(body.x, 0, body.y);
    parts.root.current.rotation.y = Math.atan2(Math.cos(body.angle), Math.sin(body.angle));
  });
  return <SumoModel parts={parts} color={color} />;
}

function PracticeScene({ p, complete }: { p: Practice; complete: () => void }) {
  const arrow = useRef<Group>(null);
  useFrame((_, delta) => {
    if (document.hidden) return;
    const dt = Math.min(delta, 1 / 30);
    const v = vector(p);
    p.me.inputX = p.done ? 0 : v.x; p.me.inputY = p.done ? 0 : v.y;
    const beforeX = p.me.x, beforeY = p.me.y;
    p.time = stepPracticeBodies(p.me, p.step > 0 ? p.opponent : null, dt, p.time);
    p.moved += Math.hypot(p.me.x - beforeX, p.me.y - beforeY);
    if (!p.done && ((p.step === 0 && p.moved >= 1.5) || (p.step === 1 && p.aimedDash) || (p.step === 2 && Math.hypot(p.opponent.x, p.opponent.y) > DEFAULT_CONFIG.arenaRadius + DEFAULT_CONFIG.eliminationTolerance))) {
      p.done = true; p.held = false; complete();
    }
    if (!p.done && Math.hypot(p.me.x, p.me.y) > DEFAULT_CONFIG.arenaRadius + DEFAULT_CONFIG.eliminationTolerance) {
      // A safe practice ring: falling out restarts this exercise without a fee or reward.
      Object.assign(p.me, createBody("you", p.step === 2 ? 1.5 : -1.5, 0));
      Object.assign(p.opponent, createBody("coach", p.step === 2 ? 4.5 : 2, 0, Math.PI));
    }
    if (arrow.current) {
      arrow.current.visible = p.held && p.step > 0 && !p.done;
      const len = Math.hypot(v.x, v.y);
      const aim = len > 0.01 ? { x: v.x / len, y: v.y / len } : { x: Math.cos(p.me.angle), y: Math.sin(p.me.angle) };
      arrow.current.position.set(p.me.x, 0.055, p.me.y);
      arrow.current.rotation.y = Math.atan2(aim.x, aim.y);
      arrow.current.scale.z = dashDistance(p.me, aim, DEFAULT_CONFIG);
    }
  });
  return <>
    <Arena theme={themeFor("training")} />
    <Wrestler body={p.me} color="#E2443A" />
    {p.step > 0 && <Wrestler body={p.opponent} color="#3D7FE0" />}
    <DashArrow ref={arrow} />
  </>;
}

export function Tutorial() {
  const [step, setStep] = useState(0);
  const [done, setDone] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const settings = useStore(settingsStore);
  const touch = touchControlsEnabled(settings.touchControls);
  const p = useMemo<Practice>(() => ({ me: createBody("you", -1.5, 0), opponent: createBody("coach", 2, 0, Math.PI), keys: new Set(), touch: { x: 0, y: 0 }, held: false, heldAt: 0, time: 0, moved: 0, aimedDash: false, step: 0, done: false }), []);
  const stick = useRef<number | null>(null);
  const dashPointer = useRef<number | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  useEffect(() => {
    const timer = window.setInterval(() => setCooldown(Math.max(0, p.me.dashReadyAt - p.time)), 100);
    return () => window.clearInterval(timer);
  }, [p]);
  const begin = () => { if (!p.held && !p.done && p.step > 0 && p.step < 3) { p.held = true; p.heldAt = performance.now(); } };
  const changeStep = (next: number) => { reset(p, next); setDone(false); setStep(next); setKnob({ x: 0, y: 0 }); };
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLElement && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
      if (e.code in KEYS) { e.preventDefault(); p.keys.add(e.code); }
      if (e.code === "Space") { e.preventDefault(); if (!e.repeat) begin(); }
    };
    const up = (e: KeyboardEvent) => { p.keys.delete(e.code); if (e.code === "Space") release(p); };
    const clear = () => { p.keys.clear(); p.touch = { x: 0, y: 0 }; release(p, true); stick.current = null; dashPointer.current = null; setKnob({ x: 0, y: 0 }); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", clear); document.addEventListener("visibilitychange", clear);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", clear); document.removeEventListener("visibilitychange", clear); };
  }, [p]);
  const moveStick = (e: PointerEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    let x = (e.clientX - rect.left - rect.width / 2) / 40, y = (e.clientY - rect.top - rect.height / 2) / 40;
    const len = Math.hypot(x, y); if (len > 1) { x /= len; y /= len; }
    p.touch = { x, y }; setKnob({ x: x * 35, y: y * 35 });
  };
  const finish = (dashMode: "manual" | "auto") => settingsStore.update({ dashMode, tutorialCompleted: true });
  const titles = ["Move your wrestler", "Aim your dash", "Push them out!", "Choose your dash style"];
  const descriptions = [touch ? "Drag the joystick to move the red wrestler around the ring." : "Use WASD or the arrow keys to move the red wrestler.", touch ? "Hold DASH to see your direction and distance. Steer with the joystick, then release to dash." : "Hold Space to see your direction and distance. Aim with WASD or arrows, then release Space.", "Move toward the blue wrestler and push or dash them past the straw rope. Stay inside the ring yourself!", "How would you like to dash? You can change this anytime in Settings."];
  return <section className="tutorial" aria-label="Learn to play Mini Sumo">
    {step < 3 && <div className="tutorial__arena">
      <Canvas camera={{ fov: 48, position: [0, 16, 15] }} onCreated={({ camera }) => camera.lookAt(0, 0, 0)} dpr={[1, 1.5]}>
        <color attach="background" args={["#90cce9"]} /><hemisphereLight args={["#fff5df", "#6d4c2f", 2]} /><directionalLight position={[4, 10, 5]} intensity={2} />
        <PracticeScene key={step} p={p} complete={() => setDone(true)} />
        <CameraRig orbit={false} />
      </Canvas>
    </div>}
    <div className={`tutorial__card${step === 3 ? " tutorial__card--choice" : ""}`}>
      <img className="tutorial__coach" src={`${import.meta.env.BASE_URL}tutorial/coach.webp`} alt="Your sumo coach" />
      <div className="tutorial__copy"><span className="tutorial__step">{step < 3 ? `PRACTICE ${step + 1} / 3` : "READY TO PLAY"}</span><h2>{titles[step]}</h2><p>{descriptions[step]}</p></div>
      {step === 3 && <div className="tutorial__choices">
        <button onClick={() => finish("auto")}><strong>Auto dash</strong><span>Dash toward the nearest opponent in range when charged. The dash drum only shows the timer.</span></button>
        <button onClick={() => finish("manual")}><strong>Manual dash</strong><span>You decide when. Hold to preview your path; release to dash.</span></button>
      </div>}
    </div>
    {step < 3 && <>
      <div className="tutorial__actions" aria-live="polite">
        {done ? <button className="tutorial__art-button tutorial__next" aria-label="Great! Continue" onClick={() => changeStep(step + 1)}><img src={`${import.meta.env.BASE_URL}ui/btn-start-blank.webp`} alt="" draggable={false} /><span>CONTINUE</span></button> : <span>Try it in the ring</span>}
        <button className="tutorial__art-button tutorial__skip" aria-label="Skip practice" onClick={() => changeStep(3)}><img src={`${import.meta.env.BASE_URL}ui/label-empty.webp`} alt="" draggable={false} /><span>SKIP PRACTICE</span></button>
      </div>
      {touch && !done && <div className="tutorial__stick" style={{ backgroundImage: `url(${import.meta.env.BASE_URL}hud/joy-base.webp)` }} role="application" aria-label="Practice joystick: drag to move"
        onPointerDown={(e) => { if (stick.current !== null) return; stick.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); moveStick(e); }}
        onPointerMove={(e) => { if (e.pointerId === stick.current) moveStick(e); }}
        onPointerUp={(e) => { if (e.pointerId !== stick.current) return; stick.current = null; p.touch = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); }}
        onLostPointerCapture={() => { stick.current = null; p.touch = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); }}
        onPointerCancel={() => { stick.current = null; p.touch = { x: 0, y: 0 }; setKnob({ x: 0, y: 0 }); }}>
        <img src={`${import.meta.env.BASE_URL}hud/joy-knob.webp`} style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }} alt="" draggable={false} />
      </div>}
      {step > 0 && !done && <button className="tutorial__dash" aria-label="Hold to aim, release to dash"
        onPointerDown={(e) => { if (dashPointer.current !== null) return; dashPointer.current = e.pointerId; e.currentTarget.setPointerCapture(e.pointerId); begin(); }}
        onPointerUp={(e) => { if (e.pointerId !== dashPointer.current) return; dashPointer.current = null; release(p); }}
        onPointerCancel={() => { dashPointer.current = null; release(p, true); }}
        onLostPointerCapture={() => { dashPointer.current = null; release(p, true); }}
        onKeyDown={(e) => { if (e.key === "Enter" && !e.repeat) begin(); }} onKeyUp={(e) => { if (e.key === "Enter") release(p); }}><img src={`${import.meta.env.BASE_URL}hud/dash.webp`} alt="" draggable={false} /><span>{cooldown > 0 ? `RECHARGE ${(cooldown / 1000).toFixed(1)}s` : "HOLD · RELEASE"}</span></button>}
    </>}
  </section>;
}
