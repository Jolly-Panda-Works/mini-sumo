import { Phase } from "@mini-sumo/shared";
import { gameStore, roomManager } from "../network/RoomManager";
import { uiStore } from "../uiStore";
import { settingsStore } from "../settings";
import { autoDashTarget, dashDistance, DEFAULT_CONFIG, type DashCandidate } from "@mini-sumo/sim";

const KEY_VECTORS: Record<string, [number, number]> = {
  KeyW: [0, -1],
  ArrowUp: [0, -1],
  KeyS: [0, 1],
  ArrowDown: [0, 1],
  KeyA: [-1, 0],
  ArrowLeft: [-1, 0],
  KeyD: [1, 0],
  ArrowRight: [1, 0],
};

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  return target.isContentEditable || target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT";
}

/**
 * Collects keyboard + touch input and sends a normalized direction to the server.
 * Only direction and dash requests leave the client; never positions.
 * Screen up (W) is -y in world space, which the camera shows as "away from you".
 */
class InputController {
  private keys = new Set<string>();
  private touch = { x: 0, y: 0 };
  private last = { x: 0, y: 0 };
  private lastSentAt = 0;
  private lastDashAt = -Infinity;
  private dashHeld = false;

  get aiming(): boolean { return this.dashHeld; }

  beginDashAim(): void {
    if (settingsStore.get().dashMode === "manual" && !uiStore.get().settingsOpen && gameStore.get().phase === Phase.Playing) this.dashHeld = true;
  }

  endDashAim(cancel = false): void {
    const held = this.dashHeld;
    this.dashHeld = false;
    if (held && !cancel && settingsStore.get().dashMode === "manual") this.requestDash();
  }

  getDashAim() {
    const state = roomManager.state;
    const p = state?.players.get(roomManager.sessionId);
    if (!state || !p?.alive || state.phase !== Phase.Playing || uiStore.get().settingsOpen) return null;
    const me = { id: roomManager.sessionId, x: p.x, y: p.y, angle: p.angle, alive: p.alive, powerUp: p.powerUp };
    const cfg = { ...DEFAULT_CONFIG, arenaRadius: state.ringRadius };
    if (settingsStore.get().dashMode === "auto") {
      const players: DashCandidate[] = [];
      state.players.forEach((other, id) => players.push({ id, x: other.x, y: other.y, angle: other.angle, alive: other.alive, powerUp: other.powerUp }));
      const target = autoDashTarget(me, players, cfg);
      // Show the facing range even when no opponent is within reach.
      if (target) return { ...target, px: p.x, py: p.y, ready: p.dashCooldownMs <= 0 && !p.stunned && !p.dashing };
    }
    const v = this.movementVector();
    const len = Math.hypot(v.x, v.y);
    const direction = len > 0.01 ? { x: v.x / len, y: v.y / len } : { x: Math.cos(p.angle), y: Math.sin(p.angle) };
    return { ...direction, distance: dashDistance(me, direction, cfg), targetId: "", px: p.x, py: p.y, ready: p.dashCooldownMs <= 0 && !p.stunned && !p.dashing };
  }
  private timer = 0;
  private running = false;

  start(): void {
    if (this.running) return;
    this.running = true;
    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("blur", this.clear);
    document.addEventListener("visibilitychange", this.clear);
    this.timer = window.setInterval(this.tick, 1000 / 30);
  }

  stop(): void {
    if (!this.running) return;
    this.running = false;
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("blur", this.clear);
    document.removeEventListener("visibilitychange", this.clear);
    window.clearInterval(this.timer);
    this.clear();
  }

  setTouchVector(x: number, y: number): void {
    this.touch.x = x;
    this.touch.y = y;
  }

  requestDash(): void {
    const now = performance.now();
    if (now - this.lastDashAt < 350) return; // wait for the authoritative cooldown patch
    if (gameStore.get().phase !== Phase.Playing || uiStore.get().settingsOpen) return;
    const aim = this.getDashAim();
    if (!aim?.ready) return;
    if (settingsStore.get().dashMode === "auto" && !aim.targetId) return;
    this.lastDashAt = now;
    roomManager.dash({ x: aim.x, y: aim.y });
  }

  private onKeyDown = (event: KeyboardEvent): void => {
    if (isTypingTarget(event.target)) return;
    if (event.code in KEY_VECTORS) {
      this.keys.add(event.code);
      event.preventDefault();
    } else if (event.code === "Space") {
      event.preventDefault();
      if (!event.repeat) this.beginDashAim();
    }
  };

  private onKeyUp = (event: KeyboardEvent): void => {
    this.keys.delete(event.code);
    if (event.code === "Space") this.endDashAim();
  };

  private clear = (): void => {
    this.dashHeld = false;
    this.keys.clear();
    this.touch.x = 0;
    this.touch.y = 0;
  };

  private movementVector(): { x: number; y: number } {
    let x = 0, y = 0;
    for (const code of this.keys) {
      const v = KEY_VECTORS[code];
      if (v) { x += v[0]; y += v[1]; }
    }
    x = Math.max(-1, Math.min(1, x)) + this.touch.x;
    y = Math.max(-1, Math.min(1, y)) + this.touch.y;
    const len = Math.hypot(x, y);
    return len > 1 ? { x: x / len, y: y / len } : { x, y };
  }

  private tick = (): void => {
    if (!roomManager.room) return;
    const phase = gameStore.get().phase;
    const active = (phase === Phase.Countdown || phase === Phase.Playing) && !uiStore.get().settingsOpen;
    if (!active) this.dashHeld = false;
    if (active && settingsStore.get().dashMode === "auto") {
      this.dashHeld = false;
      this.requestDash();
    }

    let x = 0;
    let y = 0;
    if (active) {
      ({ x, y } = this.movementVector());
    }

    const now = performance.now();
    const changed = Math.abs(x - this.last.x) > 0.02 || Math.abs(y - this.last.y) > 0.02;
    const keepAlive = (x !== 0 || y !== 0) && now - this.lastSentAt > 500;
    if (!changed && !keepAlive) return;
    // Only talk to the server while a bout is starting or running (plus one final zero).
    if (!active && this.last.x === 0 && this.last.y === 0) return;

    this.last.x = x;
    this.last.y = y;
    this.lastSentAt = now;
    roomManager.sendInput(Math.round(x * 1000) / 1000, Math.round(y * 1000) / 1000);
  };
}

export const inputController = new InputController();
