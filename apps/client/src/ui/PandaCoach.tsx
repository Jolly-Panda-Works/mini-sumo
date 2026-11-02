import type { CSSProperties } from "react";
export type PandaPose = "ready" | "kick" | "reach" | "present" | "celebrate" | "bow";
const POSES: PandaPose[] = ["ready", "kick", "reach", "present", "celebrate", "bow"];
/** Equal 3 × 2 cells, preserving the six supplied coach poses. */
export function PandaCoach({ pose, className = "" }: { pose: PandaPose; className?: string }) {
  const index = POSES.indexOf(pose);
  return <span role="img" aria-label={`Panda coach: ${pose}`} className={`panda-coach panda-coach--${pose} ${className}`} style={{ backgroundImage: `url(${import.meta.env.BASE_URL}tutorial/panda-six-poses.webp)`, "--panda-x": `${index % 3 * 50}%`, "--panda-y": `${Math.floor(index / 3) * 100}%` } as CSSProperties} />;
}
