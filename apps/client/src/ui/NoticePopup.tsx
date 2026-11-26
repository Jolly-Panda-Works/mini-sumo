import { track } from "../analytics";
import { gameStore, sessionStore } from "../network/RoomManager";
import { useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { BuyButton } from "./ArtButtons";
import { audio } from "../audio/AudioManager";
import { useStore } from "../store";
import { uiStore, type Notice } from "../uiStore";

const BASE = import.meta.env.BASE_URL;

/** Actions drawn with their own button art (by id, or id:label). */
// One matching set (public/ui/notice-*.webp). Actions not listed use the plank with text.
const ART: Record<string, string> = {
  "ok:update": "btn-update",
  "leave:update": "btn-update",
  ok: "notice-ok",
  leave: "notice-leave",
  "cancel:stay": "notice-stay",
  shop: "notice-shop",
  "cancel:not now": "notice-not-now",
  retry: "notice-retry",
  close: "notice-close",
};

/**
 * Message / warning / error popup (public/ui/popup-<kind>.webp): the kind's plaque on top,
 * the title in the upper box, the message and the buttons in the lower box.
 * Shows the first notice in the queue; the next one follows when it's answered.
 */
export function NoticePopup() {
  const ui = useStore(uiStore);
  const notice = ui.notices[0];
  if (!notice) return null;
  return createPortal(<NoticeView key={notice.id} notice={notice} />, document.body);
}

function NoticeView({ notice }: { notice: Notice }) {
  const types: Record<string, string> = {
    "Update available": "update_available", "Update required": "update_required",
    "Connection lost": "server_unavailable", "Couldn't connect": "connection_failed",
    "Choose a username": "invalid_username",
  };
  const noticeType = types[notice.title] || notice.kind;
  const screen = sessionStore.get().roomId ? gameStore.get().phase : "menu";
  const reported = useRef(false);
  const answered = useRef(false);
  const answer = (id: string) => {
    if (answered.current) return;
    answered.current = true;
    const label = notice.actions.find(a => a.id === id)?.label.toLowerCase();
    const action = label && ["update", "later", "ok", "retry"].includes(label) ? label :
      ["cancel", "close", "ok", "retry", "leave"].includes(id) ? id : "other";
    track("blocking_notice_action", { notice_type: noticeType, screen, action });
    notice.resolve(id);
  };
  const dialogRef = useRef<HTMLDialogElement>(null);
  useLayoutEffect(() => {
    const dialog = dialogRef.current!;
    dialog.showModal();
    if (!reported.current) {
      reported.current = true;
      track("blocking_notice_shown", { notice_type: noticeType, screen });
    }
    return () => dialog.close();
  }, []);

  useEffect(() => {
    audio.sample(notice.kind === "message" ? "menu-open" : "reject");
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
        answer(notice.actions.some((a) => a.id === "cancel") ? "cancel" : "close");
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [notice]);

  const actions = [...notice.actions].sort((a, b) => Number(Boolean(b.primary)) - Number(Boolean(a.primary)));
  return (
    <dialog
      ref={dialogRef}
      className="overlay overlay--notice"
      role={notice.kind === "message" ? "dialog" : "alertdialog"}
      aria-label={notice.title}
      onCancel={(event) => {
        event.preventDefault();
        answer(notice.actions.some((action) => action.id === "cancel") ? "cancel" : "close");
      }}
    >
      <section
        className={`notice-popup notice-popup--${notice.kind}`}
        style={{ backgroundImage: `url("${BASE}ui/popup-${notice.kind}.webp")` }}
      >
        {notice.closable && (
          <button type="button" className="notice-popup__close" onClick={() => answer("cancel")} aria-label="Close" data-sfx="none">
            <img src={`${BASE}ui/close.webp`} alt="" draggable={false} />
          </button>
        )}
        <h2 className={`notice-popup__title${notice.titleExtra ? " notice-popup__title--with-extra" : ""}`}>{notice.title}</h2>
        {notice.titleExtra && <div className="notice-popup__title-extra">{notice.titleExtra}</div>}
        <div className="notice-popup__body">
          {notice.body ? <div className="notice-popup__custom">{notice.body}</div> : <p className="notice-popup__message">{notice.message}</p>}
          <div className="notice-popup__actions">
            {actions.map((action, i) => {
              if (action.price !== undefined) {
                return (
                  <BuyButton
                    key={action.id}
                    className="notice-popup__buy"
                    price={action.price}
                    label={`${action.label} for ${action.price} Sumo Coins`}
                    sfx="none"
                    onClick={() => answer(action.id)}
                  />
                );
              }
              const art = ART[`${action.id}:${action.label}`.toLowerCase()] ?? ART[action.id];
              return art ? (
                <button
                  key={action.id}
                  type="button"
                  className="art art--notice"
                  onClick={() => answer(action.id)}
                  autoFocus={i === 0}
                  aria-label={action.label}
                >
                  <img src={`${BASE}ui/${art}.webp`} alt="" draggable={false} />
                </button>
              ) : (
                <button
                  key={action.id}
                  type="button"
                  className={`plank-btn${action.primary ? " plank-btn--primary" : ""}`}
                  onClick={() => answer(action.id)}
                  autoFocus={i === 0}
                >
                  {action.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>
    </dialog>
  );
}
