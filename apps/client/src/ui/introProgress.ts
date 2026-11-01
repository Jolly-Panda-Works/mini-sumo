import type { IntroStage } from "../settings";

/** A lost first attempt must never advance to the victory or outfit reward. */
export function afterIntroResult(stage: IntroStage, won: boolean): IntroStage {
  return stage === "firstPlaying" ? won ? "firstWin" : "firstRetry" : "profile";
}
