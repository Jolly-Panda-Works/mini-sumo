import { useCallback, useEffect, useState } from "react";
import { settingsStore } from "../settings";
import { GreenArtButton } from "./ArtButtons";

/** How long a panel waits before the next one on its page appears by itself (ms). */
const PANEL_MS = 2600;

interface Panel {
  art: string;
  caption: string;
  /** The part of the picture in view when the panel crops it (object-position). */
  at?: string;
  /** For pictures whose subject stands low in the frame. */
  captionTop?: boolean;
  /** Share of the page's height. */
  size?: number;
}

const PAGES: Panel[][] = [
  [
    { art: "1-1", at: "50% 0%", size: 3, caption: "They say there is a ring above the clouds." },
    { art: "1-2", at: "50% 0%", size: 2, caption: "Only the very best ever set foot on it." },
    { art: "1-3", at: "50% 30%", size: 3, caption: "You're still small and round. But the panda coach has seen something in you." },
  ],
  [
    { art: "2-1", at: "50% 80%", size: 3, caption: "The panda hands you a scroll." },
    { art: "2-2", at: "50% 40%", size: 2, caption: "One rule is written on it: stay in the ring." },
  ],
  [
    { art: "3-1", at: "50% 80%", size: 3, caption: "Your first bow in front of a real crowd." },
    { art: "3-2", at: "50% 40%", size: 2, caption: "Every win brings Sumo Coins, and the next arena closer." },
  ],
  [
    { art: "4-1", at: "50% 40%", size: 2, caption: "The taiko drums shake the ground." },
    { art: "4-2", at: "50% 60%", size: 3, caption: "Rivals hit harder. Only a well-timed dash will move them." },
  ],
  [
    { art: "5-1", at: "50% 100%", size: 2, captionTop: true, caption: "The palace gates open only for true winners." },
    { art: "5-2", at: "50% 100%", size: 3, captionTop: true, caption: "Here your name reaches the banners." },
  ],
  [
    { art: "6-1", at: "50% 50%", size: 3, caption: "Clouds below. One last rival ahead." },
    { art: "6-2", at: "50% 40%", size: 2, caption: "The rule hasn't changed: stay in the ring." },
  ],
];

const artUrl = (art: string) => `${import.meta.env.BASE_URL}story/${art}.webp`;

/** The story as a comic, once, before a new player's first screen: panels appear one by one. */
export function StoryCutscene() {
  const [page, setPage] = useState(0);
  const [shown, setShown] = useState(1);
  const panels = PAGES[page]!;
  const pageDone = shown >= panels.length;
  const last = page === PAGES.length - 1;

  const finish = useCallback(() => settingsStore.update({ storySeen: true }), []);
  const advance = useCallback(() => {
    if (!pageDone) setShown(shown + 1);
    else if (!last) {
      setPage(page + 1);
      setShown(1);
    }
  }, [last, page, pageDone, shown]);

  // The comic starts when the loading screen has gone.
  const [ready, setReady] = useState(() => !document.getElementById("boot"));
  useEffect(() => {
    if (ready) return;
    const start = () => setReady(true);
    window.addEventListener("boot:done", start, { once: true });
    return () => window.removeEventListener("boot:done", start);
  }, [ready]);

  useEffect(() => {
    if (pageDone || !ready) return;
    const timer = window.setTimeout(() => setShown((n) => n + 1), PANEL_MS);
    return () => window.clearTimeout(timer);
  }, [pageDone, ready, shown]);

  useEffect(() => {
    const next = PAGES[page + 1];
    next?.forEach((panel) => {
      new Image().src = artUrl(panel.art);
    });
  }, [page]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") advance();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [advance]);

  return (
    <div className="story" onClick={advance}>
      <button className="story__skip" onClick={(e) => { e.stopPropagation(); finish(); }}>Skip</button>
      <div className="story__page" key={page}>
        {panels.map((panel, i) => (
          <figure key={i} className={`story__panel${i < shown ? " story__panel--on" : ""}`} style={{ flexGrow: panel.size ?? 1 }}>
            <img
              src={artUrl(panel.art)}
              alt=""
              draggable={false}
              style={{ objectPosition: panel.at }}
            />
            <figcaption className={panel.captionTop ? "story__caption--top" : undefined}>{panel.caption}</figcaption>
          </figure>
        ))}
      </div>
      <div className="story__foot" onClick={(e) => e.stopPropagation()}>
        {pageDone && last ? (
          <GreenArtButton label="BEGIN" onClick={finish} />
        ) : (
          pageDone && <span className="story__hint">Tap to continue</span>
        )}
      </div>
    </div>
  );
}
