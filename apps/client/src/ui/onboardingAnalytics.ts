import { useEffect, useRef } from "react";
import { track } from "../analytics";

const started = new Map<string, number>();
export function useStepView(step: string | null) {
  const previous = useRef<string | null>(null);
  useEffect(() => {
    if (step && step !== previous.current) {
      started.set(step, performance.now());
      track("onboarding_step_viewed", { step_id: step });
    }
    previous.current = step;
  }, [step]);
}
export function finishStep(step: string, outcome = "completed") {
  const time = started.get(step);
  if (time === undefined) return;
  started.delete(step);
  track("onboarding_step_finished", { step_id: step, outcome, duration_sec: Math.round((performance.now() - time) / 1000) });
}
