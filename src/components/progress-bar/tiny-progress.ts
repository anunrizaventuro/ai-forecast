// Pengganti nprogress (tak dirawat sejak 2015): bar loading tipis di atas
// halaman, digerakkan CSS transition — start → trickle menuju 95%, done →
// 100% lalu fade & dilepas dari DOM. API sengaja minimal (start/done) karena
// hanya dipakai progress-bar.tsx.

const BAR_ID = 'app-progress-bar';

let trickleTimer: ReturnType<typeof setInterval> | null = null;
let cleanupTimer: ReturnType<typeof setTimeout> | null = null;
let value = 0;

function getBar(): HTMLDivElement {
  let el = document.getElementById(BAR_ID) as HTMLDivElement | null;

  if (!el) {
    el = document.createElement('div');
    el.id = BAR_ID;
    document.body.appendChild(el);
  }

  return el;
}

function setWidth(el: HTMLElement, next: number) {
  value = next;
  el.style.width = `${next * 100}%`;
}

export function startProgress() {
  if (cleanupTimer) {
    clearTimeout(cleanupTimer);
    cleanupTimer = null;
  }
  if (trickleTimer) {
    clearInterval(trickleTimer);
  }

  const el = getBar();
  el.style.opacity = '1';
  setWidth(el, 0.08);

  // Mendekati 95% secara asimtotik selama menunggu halaman berikutnya.
  trickleTimer = setInterval(() => {
    const el2 = document.getElementById(BAR_ID);
    if (el2) setWidth(el2, Math.min(value + (0.95 - value) * 0.12, 0.95));
  }, 250);
}

export function doneProgress() {
  const el = document.getElementById(BAR_ID) as HTMLDivElement | null;

  if (trickleTimer) {
    clearInterval(trickleTimer);
    trickleTimer = null;
  }

  if (!el) return;

  setWidth(el, 1);
  cleanupTimer = setTimeout(() => {
    el.style.opacity = '0';
    cleanupTimer = setTimeout(() => {
      el.remove();
      cleanupTimer = null;
    }, 300);
  }, 150);
}
