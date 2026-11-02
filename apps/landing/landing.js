// Language: Persian unless the visitor chose or uses another one (remembered on this device).
const root = document.documentElement;
const langButton = document.getElementById("lang");

function savedLang() {
  try {
    return localStorage.getItem("lang");
  } catch {
    return null;
  }
}

function setLang(lang) {
  root.lang = lang;
  root.dir = lang === "fa" ? "rtl" : "ltr";
  root.dataset.lang = lang;
  langButton.textContent = lang === "fa" ? "English" : "فارسی";
}

setLang(savedLang() || (navigator.language.startsWith("fa") ? "fa" : "en"));
langButton.addEventListener("click", () => {
  const lang = root.dataset.lang === "fa" ? "en" : "fa";
  setLang(lang);
  try {
    localStorage.setItem("lang", lang);
  } catch {
    // Private window: only this visit changes.
  }
});

// The loader leaves once the page is ready, or after a moment on a slow connection.
const loader = document.getElementById("loader");
const hideLoader = () => loader.classList.add("is-done");
window.addEventListener("load", () => setTimeout(hideLoader, 500));
setTimeout(hideLoader, 1500);

// Sections rise in as they scroll into view.
const reveals = document.querySelectorAll(".reveal");
if ("IntersectionObserver" in window) {
  const seen = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-in");
        seen.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px" },
  );
  reveals.forEach((el) => seen.observe(el));
} else {
  reveals.forEach((el) => el.classList.add("is-in"));
}

// Hero layers: nearer ones move more with the pointer and the scroll.
const nav = document.getElementById("nav");
const layers = [...document.querySelectorAll(".layer")].map((el) => ({ el, depth: Number(el.dataset.depth) }));
const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let pointerX = 0;
let pointerY = 0;
let queued = false;

function paint() {
  queued = false;
  const scroll = window.scrollY;
  nav.classList.toggle("is-solid", scroll > 40);
  if (still || scroll > window.innerHeight) return;
  for (const { el, depth } of layers) {
    el.style.transform = `translate3d(${-pointerX * depth * 400}px, ${scroll * depth * 3 - pointerY * depth * 200}px, 0)`;
  }
}

function queuePaint() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(paint);
}

window.addEventListener("scroll", queuePaint, { passive: true });
window.addEventListener(
  "pointermove",
  (event) => {
    pointerX = event.clientX / window.innerWidth - 0.5;
    pointerY = event.clientY / window.innerHeight - 0.5;
    queuePaint();
  },
  { passive: true },
);
paint();

// Arena strip: a second copy behind the first makes the loop seamless.
const rail = document.getElementById("rail");
for (const image of [...rail.children]) {
  const copy = image.cloneNode();
  copy.alt = "";
  copy.loading = "eager";
  rail.append(copy);
}

document.querySelectorAll(".notice__close").forEach((button) => {
  button.addEventListener("click", () => {
    button.parentElement.hidden = true;
  });
});

// Links sent by the game: a room invite opens the Android app; an email code is shown to type in.
const params = new URLSearchParams(window.location.search);
const room = params.get("room");
const code = params.get("code");
if (room && /^[A-Za-z0-9_-]+$/.test(room)) {
  document.getElementById("invite-open").href = `minisumo://join?room=${encodeURIComponent(room)}`;
  document.getElementById("invite").hidden = false;
} else if (code && /^\d{6}$/.test(code)) {
  document.getElementById("email-code").textContent = code;
  document.getElementById("email").hidden = false;
}
