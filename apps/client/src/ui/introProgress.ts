import type { IntroStage } from "../settings";

/** The first bout is always won in the ring; the victory only follows a real win. */
export function afterIntroResult(stage: IntroStage, won: boolean): IntroStage {
  return stage === "firstPlaying" ? won ? "firstWin" : "first" : "profile";
}
