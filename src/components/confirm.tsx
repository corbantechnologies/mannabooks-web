"use client";

import { AlertTriangle } from "lucide-react";
import { useEffect, useState, useSyncExternalStore } from "react";

import { Button, Input } from "./ui";

/**
 * The app's own confirm dialog, instead of the browser's: `if (await ask("Delete this draft?")) ...`.
 * `ConfirmHost` (in Providers) shows whichever question is waiting. A message starting with a destructive verb
 * (Delete, Remove, Void...) gets a red button labelled with that verb.
 */
type Request = { message: string; title?: string; confirmLabel?: string; danger?: boolean; typeToConfirm?: string; resolve: (ok: boolean) => void };

let current: Request | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

const DESTRUCTIVE = ["delete", "remove", "void", "cancel", "block", "end", "withdraw", "undo", "decline", "close", "reopen", "move", "post", "take"];
const LABEL: Record<string, string> = { take: "Take back" };
const SAFE = new Set(["reopen", "move", "post", "close", "take"]);

export function ask(message: string, options: { title?: string; confirmLabel?: string; danger?: boolean; typeToConfirm?: string } = {}): Promise<boolean> {
  current?.resolve(false); // only one question at a time
  return new Promise((resolve) => {
    const verb = message.split(/[\s?]/)[0].toLowerCase();
    const known = DESTRUCTIVE.includes(verb);
    current = {
      message, ...options, resolve,
      confirmLabel: options.confirmLabel ?? (known ? LABEL[verb] ?? verb[0].toUpperCase() + verb.slice(1) : "Continue"),
      danger: options.danger ?? (known && !SAFE.has(verb)),
    };
    emit();
  });
}

function answer(ok: boolean) {
  const req = current;
  current = null;
  emit();
  req?.resolve(ok);
}

const subscribe = (l: () => void) => { listeners.add(l); return () => { listeners.delete(l); }; };

export function ConfirmHost() {
  const req = useSyncExternalStore(subscribe, () => current, () => null);
  return req ? <Dialog key={req.message} req={req} /> : null;
}

function Dialog({ req }: { req: Request }) {
  const [typed, setTyped] = useState("");
  const ready = !req.typeToConfirm || typed.trim() === req.typeToConfirm;

  useEffect(() => {
    // capture first, so Escape here doesn't also close a form dialog underneath
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") { e.stopImmediatePropagation(); answer(false); }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, []);

  return (
    <div className="fixed inset-0 z-[60] flex items-start justify-center bg-stone-900/40 p-3 pt-[15vh]" onClick={() => answer(false)}>
      <div role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" aria-describedby="confirm-message"
        className="w-full max-w-md rounded-lg bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <form className="p-5" onSubmit={(e) => { e.preventDefault(); if (ready) answer(true); }}>
          <div className="flex gap-3">
            {req.danger && <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-red-50 text-red-600"><AlertTriangle className="h-5 w-5" /></span>}
            <div className="min-w-0">
              <h2 id="confirm-title" className="text-base font-semibold text-stone-900">{req.title ?? "Are you sure?"}</h2>
              <p id="confirm-message" className="mt-1 text-sm text-stone-600">{req.message}</p>
            </div>
          </div>
          {req.typeToConfirm && (
            <label className="mt-4 block text-sm text-stone-700">
              Type <strong>{req.typeToConfirm}</strong> to confirm
              <Input autoFocus className="mt-1" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
            </label>
          )}
          <div className="mt-5 flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => answer(false)}>Go back</Button>
            <Button autoFocus={!req.typeToConfirm} type="submit" variant={req.danger ? "danger" : "primary"} disabled={!ready}>{req.confirmLabel}</Button>
          </div>
        </form>
      </div>
    </div>
  );
}
