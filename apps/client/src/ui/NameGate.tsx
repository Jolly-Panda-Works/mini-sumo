import { settingsStore } from "../settings";
import { Dialog } from "./Dialog";
import { UsernameForm } from "./UsernameForm";

/** First launch: ask for a username before entering the game. */
export function NameGate() {
  return (
    <Dialog title="Welcome!" onClose={() => undefined} hideClose className="name-gate" variant="welcome">
      <p className="name-gate__title">What should we call you?</p>
      <UsernameForm initial={settingsStore.get().name} className="name-gate__form" />
    </Dialog>
  );
}
