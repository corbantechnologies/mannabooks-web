"use client";

/**
 * Each person's menu: the pages and whole sections they pinned to the top, per workspace, in order. Kept on their
 * membership so it follows them to every device, with a copy in this browser so the menu draws at once.
 * A shared store so the sidebar and the quick search see the same pins.
 * A pin is a page ("/tasks") or a section ("#Work").
 */
import { api } from "@/lib/api/client";

type Prefs = { pinned: string[] };

const EMPTY: Prefs = { pinned: [] };
const listeners = new Set<() => void>();
const cache = new Map<string, Prefs>();
const seeded = new Set<string>();
const key = (slug: string) => `mannabooks.nav.${slug}`;

export function readNavPrefs(slug: string): Prefs {
  const hit = cache.get(slug);
  if (hit) return hit;
  let prefs = EMPTY;
  try {
    const raw = localStorage.getItem(key(slug));
    if (raw) {
      const p = JSON.parse(raw);
      prefs = { pinned: Array.isArray(p.pinned) ? p.pinned.filter((x: unknown) => typeof x === "string") : [] };
    }
  } catch { /* private window or bad data: start empty */ }
  cache.set(slug, prefs);
  return prefs;
}

function write(slug: string, prefs: Prefs, save = true) {
  cache.set(slug, prefs);
  try { localStorage.setItem(key(slug), JSON.stringify(prefs)); } catch { /* just for this visit */ }
  listeners.forEach((l) => l());
  if (save) void api.PUT("/api/v1/w/{workspace}/menu-pins/", { params: { path: { workspace: slug } }, body: { pins: prefs.pinned.slice(0, 20) } });
}

/** When the workspace loads: the pins saved on the server win. Pins made in this browser before they were saved move up once. */
export function seedNavPrefs(slug: string, server: string[]) {
  if (seeded.has(slug)) return;
  seeded.add(slug);
  const local = readNavPrefs(slug).pinned;
  if (server.length) write(slug, { pinned: server }, false);
  else if (local.length) write(slug, { pinned: local });
}

export function togglePin(slug: string, pin: string) {
  const p = readNavPrefs(slug);
  write(slug, { ...p, pinned: p.pinned.includes(pin) ? p.pinned.filter((h) => h !== pin) : [...p.pinned, pin] });
}

/** Move a pin up (-1) or down (+1) among the pins. */
export function movePin(slug: string, pin: string, by: -1 | 1) {
  const list = [...readNavPrefs(slug).pinned];
  const i = list.indexOf(pin);
  const j = i + by;
  if (i < 0 || j < 0 || j >= list.length) return;
  [list[i], list[j]] = [list[j], list[i]];
  write(slug, { pinned: list });
}

export function subscribeNavPrefs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const SERVER_PREFS = EMPTY;
