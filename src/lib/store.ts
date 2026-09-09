import { useSyncExternalStore } from "react";
import { books as seed, type Book, type Chapter } from "./library";

const KEY = "marginal.library.v1";

let state: Book[] = seed;
let hydrated = false;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* ignore */
  }
}

export function hydrateLibrary() {
  if (hydrated) return;
  hydrated = true;
  if (typeof window === "undefined") return;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) state = JSON.parse(raw) as Book[];
  } catch {
    /* ignore */
  }
  emit();
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function useLibrary(): Book[] {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => seed,
  );
}

export function useBook(slug: string): Book | undefined {
  return useLibrary().find((b) => b.slug === slug);
}

export function updateBook(slug: string, patch: Partial<Book>) {
  state = state.map((b) => (b.slug === slug ? { ...b, ...patch } : b));
  persist();
  emit();
}

export function updateChapter(slug: string, n: number, patch: Partial<Chapter>) {
  state = state.map((b) =>
    b.slug === slug
      ? { ...b, chapters: b.chapters.map((c) => (c.n === n ? { ...c, ...patch } : c)) }
      : b,
  );
  persist();
  emit();
}

export function removeChapter(slug: string, n: number) {
  state = state.map((b) =>
    b.slug === slug ? { ...b, chapters: b.chapters.filter((c) => c.n !== n) } : b,
  );
  persist();
  emit();
}

export function resetLibrary() {
  state = seed;
  persist();
  emit();
}
