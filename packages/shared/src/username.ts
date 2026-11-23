import { NAME_MAX_LENGTH } from "./constants.js";

export const NAME_MIN_LENGTH = 3;
export type UsernamePolicy = "international" | "persian";

const international = /^\p{L}[\p{L}\p{M}\p{Nd}]*(?:[ _\-\u200c][\p{L}\p{Nd}][\p{L}\p{M}\p{Nd}]*)*$/u;
const persianLetters = "آأؤئءابتثجچحخدذرزژسشصضطظعغفقکگلمنوهیۀ";
const persian = new RegExp(`^[${persianLetters}]+(?:[ \\u200c][${persianLetters}]+)*$`, "u");

/** Normalizes the common Arabic keyboard forms before checking and reserving a name. */
export function validateUsername(raw: unknown, policy: UsernamePolicy = "international"): string | null {
  if (typeof raw !== "string") return null;
  const name = raw.normalize("NFKC").replace(/[يى]/g, "ی").replace(/ك/g, "ک").replace(/^ +| +$/g, "");
  const length = Array.from(name).length;
  if (length < NAME_MIN_LENGTH || length > NAME_MAX_LENGTH) return null;
  return (policy === "persian" ? persian : international).test(name) ? name : null;
}

/** Match case, compatibility forms and optional Persian half-spaces consistently. */
export function usernameKey(name: string): string {
  return name.normalize("NFKC").toLowerCase().replace(/\u200c/g, "");
}
