"use client";

/**
 * Each person's menu: which sections they opened (all start folded) and which pages they pinned, per workspace, kept in this browser.
 * A shared store so the sidebar and the quick search see the same pins.
 */
type Prefs = { opened: string[]; pinned: string[] };

const EMPTY: Prefs = { opened: [], pinned: [] };
const listeners = new Set<() => void>();
const cache = new Map<string, Prefs>();
const key = (slug: string) => `mannabooks.nav.${slug}`;

export function readNavPrefs(slug: string): Prefs {
  const hit = cache.get(slug);
  if (hit) return hit;
  let prefs = EMPTY;
  try {
    const raw = localStorage.getItem(key(slug));
    if (raw) {
      const p = JSON.parse(raw);
      prefs = { opened: Array.isArray(p.opened) ? p.opened : [], pinned: Array.isArray(p.pinned) ? p.pinned : [] };
    }
  } catch { /* private window or bad data: start empty */ }
  cache.set(slug, prefs);
  return prefs;
}

function write(slug: string, prefs: Prefs) {
  cache.set(slug, prefs);
  try { localStorage.setItem(key(slug), JSON.stringify(prefs)); } catch { /* just for this visit */ }
  listeners.forEach((l) => l());
}

export function toggleSection(slug: string, section: string) {
  const p = readNavPrefs(slug);
  write(slug, { ...p, opened: p.opened.includes(section) ? p.opened.filter((s) => s !== section) : [...p.opened, section] });
}

export function togglePin(slug: string, href: string) {
  const p = readNavPrefs(slug);
  write(slug, { ...p, pinned: p.pinned.includes(href) ? p.pinned.filter((h) => h !== href) : [...p.pinned, href] });
}

export function subscribeNavPrefs(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}

export const SERVER_PREFS = EMPTY;
