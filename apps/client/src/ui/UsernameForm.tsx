import { track } from "../analytics";
import { useStepView, finishStep } from "./onboardingAnalytics";
import { useState, type FormEvent } from "react";
import { validateUsername } from "@mini-sumo/shared";
import { saveUsername, usernameHint, usernamePolicy } from "../network/profileSync";
import { networkStore } from "../network/networkMode";
import { useStore } from "../store";

export function UsernameForm({ initial, className, onSaved, entryPoint = "profile" }: { initial: string; entryPoint?: "signup" | "rookie_recovery" | "profile"; className: string; onSaved?: () => void }) {
  const [name, setName] = useState(initial);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const checking = useStore(networkStore).mode === "checking";
  const valid = validateUsername(name, usernamePolicy);

  const step = entryPoint === "profile" ? null : "username_" + entryPoint;
  useStepView(step);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!valid || saving || checking) return;
    setSaving(true);
    setError("");
    try {
      await saveUsername(valid);
      track("username_edit_finished", { entry_point: entryPoint, outcome: "success" });
      if (step) finishStep(step);
      onSaved?.();
    } catch (cause) {
      track("username_edit_finished", { entry_point: entryPoint, outcome: "failed", reason: "save_rejected" });
      setError(cause instanceof Error ? cause.message : "Couldn't save the username.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className={className} onSubmit={submit}>
      <label className="field">
        <span className="field__label">Username</span>
        <input
          className="input input--art"
          value={name}
          onChange={(event) => { setName(event.target.value); setError(""); }}
          aria-invalid={Boolean(name && !valid) || Boolean(error)}
          aria-describedby="username-hint"
          maxLength={64}
          autoComplete="nickname"
          autoCapitalize="none"
          dir="auto"
          enterKeyHint="done"
          disabled={saving}
          autoFocus
        />
      </label>
      <p id="username-hint" className="hint" aria-live="polite">{error || usernameHint}</p>
      <button type="submit" className="art art--save" aria-label="Save username" disabled={!valid || saving || checking}>
        <img src={`${import.meta.env.BASE_URL}ui/btn-save.webp`} alt="" width={329} height={119} draggable={false} />
      </button>
    </form>
  );
}
