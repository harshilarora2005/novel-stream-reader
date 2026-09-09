import { useSyncExternalStore } from "react";

export const themes = [
  { id: "light", label: "Light", swatch: "hsl(39 32% 95%)" },
  { id: "sepia", label: "Sepia", swatch: "hsl(36 44% 86%)" },
  { id: "dark", label: "Dark", swatch: "hsl(30 10% 16%)" },
  { id: "night", label: "Night", swatch: "hsl(0 0% 4%)" },
] as const;

export type ThemeId = (typeof themes)[number]["id"];

export const fonts = [
  { id: "bookish", label: "Bookish", stack: '"Bodoni Moda", Georgia, serif' },
  { id: "serif", label: "Serif", stack: 'Georgia, "Times New Roman", serif' },
  { id: "sans", label: "Sans", stack: '"Inter", ui-sans-serif, system-ui, sans-serif' },
  { id: "mono", label: "Mono", stack: '"JetBrains Mono", ui-monospace, monospace' },
] as const;

export type FontId = (typeof fonts)[number]["id"];

export type Settings = {
  theme: ThemeId;
  autoNight: boolean;
  font: FontId;
  size: number;
  leading: number;
  width: number;
};

const KEY = "marginal.settings.v1";

const defaults: Settings = {
  theme: "light",
  autoNight: false,
  font: "bookish",
  size: 19,
  leading: 1.8,
  width: 64,
};

let state: Settings = defaults;
let hydrated = false;
const listeners = new Set<() => void>();

function read(): Settings {
  if (typeof window === "undefined") return defaults;
  try {
    const raw = window.localStorage.getItem(KEY);
    return raw ? { ...defaults, ...(JSON.parse(raw) as Partial<Settings>) } : defaults;
  } catch {
    return defaults;
  }
}

function emit() {
  listeners.forEach((l) => l());
}

export function applyTheme(theme: ThemeId) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.classList.remove("sepia", "dark", "night");
  if (theme !== "light") root.classList.add(theme);
}

export function hydrateSettings() {
  if (hydrated) return;
  hydrated = true;
  state = read();
  if (state.autoNight) {
    const h = new Date().getHours();
    if (h >= 19 || h < 7) state = { ...state, theme: "night" };
  }
  applyTheme(state.theme);
  emit();
}

export function setSettings(patch: Partial<Settings>) {
  state = { ...state, ...patch };
  if (patch.theme) applyTheme(patch.theme);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }
  emit();
}

export function cycleTheme() {
  const order: ThemeId[] = ["light", "sepia", "dark", "night"];
  const next = order[(order.indexOf(state.theme) + 1) % order.length]!;
  setSettings({ theme: next });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useSettings(): Settings {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => defaults,
  );
}

export function fontStack(id: FontId) {
  return (fonts.find((f) => f.id === id) ?? fonts[0]).stack;
}
