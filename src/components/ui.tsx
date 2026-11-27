"use client";

import clsx from "clsx";
import { BookOpen, ChevronDown, Eye, EyeOff, Loader2, X } from "lucide-react";
import React from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";

export function Button({
  variant = "primary",
  loading,
  className,
  children,
  disabled,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; loading?: boolean }) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={clsx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
        variant === "primary" && "bg-brand-700 text-white hover:bg-brand-600",
        variant === "secondary" && "border border-stone-300 bg-white text-stone-800 hover:bg-stone-50",
        variant === "danger" && "bg-red-600 text-white hover:bg-red-700",
        variant === "ghost" && "text-stone-600 hover:bg-stone-100 hover:text-stone-900",
        className,
      )}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}

export function Field({
  label,
  error,
  hint,
  children,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1.5">
      <span className="text-sm font-medium text-stone-700">{label}</span>
      {children}
      {error ? <span className="block text-xs text-red-600">{error}</span> : hint ? <span className="block text-xs text-stone-500">{hint}</span> : null}
    </label>
  );
}

const inputClass =
  "block w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-brand-600 focus:outline-none focus:ring-2 focus:ring-brand-100";

const NUMERIC = new Set(["number", "decimal", "numeric"]);

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const numeric = NUMERIC.has(String(props.type ?? "")) || NUMERIC.has(String(props.inputMode ?? ""));
  // While someone types in a number box, show what they typed. Forms often turn "" into 0 straight away, which made
  // the box impossible to clear; the form's own value shows again when they leave the box.
  const [draft, setDraft] = useState<string | null>(null);
  const shown = numeric && draft !== null && props.value !== undefined && Number(draft || 0) === Number(props.value || 0) ? draft : props.value;
  return (
    <input
      {...props}
      value={shown}
      onChange={(e) => {
        if (numeric) setDraft(e.target.value);
        props.onChange?.(e);
      }}
      onBlur={(e) => {
        if (numeric) setDraft(null);
        props.onBlur?.(e);
      }}
      onFocus={(e) => {
        // A number box holding 0 gets selected, so typing replaces the 0 instead of adding to it.
        if (numeric && e.currentTarget.value !== "" && Number(e.currentTarget.value) === 0) e.currentTarget.select();
        props.onFocus?.(e);
      }}
      className={clsx(inputClass, props.className)}
    />
  );
}

/** A password box with a button to show or hide what was typed. */
export function PasswordInput(props: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">) {
  const [shown, setShown] = useState(false);
  return (
    <div className="relative">
      <input {...props} type={shown ? "text" : "password"} className={clsx(inputClass, "pr-10", props.className)} />
      <button type="button" onClick={() => setShown((v) => !v)} aria-label={shown ? "Hide password" : "Show password"} aria-pressed={shown}
        className="absolute inset-y-0 right-0 flex w-10 items-center justify-center rounded-r-md text-stone-500 hover:text-stone-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-100">
        {shown ? <EyeOff className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
      </button>
    </div>
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea rows={3} {...props} className={clsx(inputClass, props.className)} />;
}

export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} className={clsx(inputClass, props.className)} />;
}

export function Card({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={clsx("rounded-lg border border-stone-200 bg-white shadow-sm", className)}>{children}</div>;
}

export function PageHeader({
  title,
  description,
  guide,
  actions,
}: {
  title: string;
  description?: React.ReactNode;
  guide?: string;
  actions?: React.ReactNode;
}) {
  const workspace = useParams<{ slug?: string }>()?.slug;
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-stone-900 break-words">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-stone-600">{description}</p>}
      </div>
      {/* buttons wrap onto a new line instead of pushing the page sideways */}
      <div className="flex min-w-0 flex-wrap items-center gap-2 sm:max-w-[65%] sm:justify-end">
        {guide && (
          <Link
            href={workspace ? `/w/${workspace}/guide/${guide}` : `/guide/${guide}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            title="Open the user guide for this page"
          >
            <BookOpen className="h-4 w-4" aria-hidden /> Guide
          </Link>
        )}
        <HeaderActions>{actions}</HeaderActions>
      </div>
    </div>
  );
}

/** The buttons in `actions`, opened out of wrapping divs and fragments; null when something isn't a plain button or link. */
function headerButtons(node: React.ReactNode): React.ReactElement[] | null {
  const out: React.ReactElement[] = [];
  let ok = true;
  const walk = (n: React.ReactNode) => {
    React.Children.forEach(n, (child) => {
      if (!ok || child === null || child === undefined || child === false || child === "") return;
      if (!React.isValidElement(child)) { ok = false; return; }
      const el = child as React.ReactElement<{ children?: React.ReactNode; className?: string; variant?: string }>;
      if (el.type === React.Fragment || el.type === "div") { walk(el.props.children); return; }
      const inner = el.type === Link ? (React.Children.only(el.props.children) as React.ReactElement<{ variant?: string }>) : el;
      if (inner && React.isValidElement(inner) && inner.type === Button) out.push(el);
      else ok = false;  // a select, a menu or anything else: leave the header as it is
    });
  };
  walk(node);
  return ok ? out : null;
}

const isPrimary = (el: React.ReactElement) => {
  const b = (el.type === Link ? React.Children.only((el.props as { children: React.ReactNode }).children) : el) as React.ReactElement<{ variant?: string }>;
  return !b.props.variant || b.props.variant === "primary";
};

/**
 * Page header buttons: with three or more, the main one stays and the rest go into a "More" popover, so the header
 * stays calm. The buttons themselves are untouched, so what they do doesn't change.
 */
function HeaderActions({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const outside = (e: MouseEvent) => { if (!box.current?.contains(e.target as Node)) setOpen(false); };
    const esc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("mousedown", outside);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", outside); document.removeEventListener("keydown", esc); };
  }, [open]);
  const buttons = headerButtons(children);
  if (!buttons || buttons.length < 3) return <>{children}</>;
  let main = -1;
  buttons.forEach((b, i) => { if (isPrimary(b)) main = i; });
  if (main < 0) main = buttons.length - 1;
  const rest = buttons.filter((_, i) => i !== main);
  const wide = (el: React.ReactElement): React.ReactElement => {
    if (el.type === Link) {
      const inner = React.Children.only((el.props as { children: React.ReactNode }).children) as React.ReactElement<{ className?: string }>;
      return React.cloneElement(el as React.ReactElement<{ className?: string; children?: React.ReactNode }>, { className: "block" },
        React.cloneElement(inner, { className: clsx(inner.props.className, "w-full justify-start border-0 shadow-none") }));
    }
    return React.cloneElement(el as React.ReactElement<{ className?: string }>, { className: clsx((el.props as { className?: string }).className, "w-full justify-start border-0 shadow-none") });
  };
  return (
    <>
      <div className="relative" ref={box}>
        <Button type="button" variant="secondary" onClick={() => setOpen((v) => !v)} aria-haspopup="menu" aria-expanded={open}>
          More <ChevronDown className="h-4 w-4" />
        </Button>
        {open && (
          <div role="menu" onClickCapture={() => window.setTimeout(() => setOpen(false), 0)}
            className="absolute right-0 z-30 mt-1 flex w-60 flex-col gap-0.5 rounded-md border border-stone-200 bg-white p-1 shadow-lg max-sm:fixed max-sm:inset-x-3 max-sm:bottom-3 max-sm:top-auto max-sm:mt-0 max-sm:w-auto max-sm:rounded-xl max-sm:shadow-2xl">
            {rest.map((el, i) => <React.Fragment key={i}>{wide(el)}</React.Fragment>)}
          </div>
        )}
      </div>
      {buttons[main]}
    </>
  );
}

export function Badge({ tone = "stone", children }: { tone?: "stone" | "green" | "amber" | "red" | "blue"; children: React.ReactNode }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
        tone === "stone" && "bg-stone-100 text-stone-700",
        tone === "green" && "bg-emerald-50 text-emerald-700",
        tone === "amber" && "bg-amber-50 text-amber-700",
        tone === "red" && "bg-red-50 text-red-700",
        tone === "blue" && "bg-sky-50 text-sky-700",
      )}
    >
      {children}
    </span>
  );
}

/** Clicking anywhere on a row opens the row's first link (Ctrl or Cmd click: a new tab). Buttons and fields keep their own clicks. */
function openRowLink(e: React.MouseEvent<HTMLTableSectionElement>, push: (href: string) => void) {
  const target = e.target as HTMLElement;
  if (target.closest("a, button, input, select, textarea, label, [role=button]")) return;
  if (window.getSelection()?.toString()) return; // selecting text, not clicking
  const link = target.closest("tr")?.querySelector<HTMLAnchorElement>("a[href]");
  if (!link) return;
  if (e.ctrlKey || e.metaKey) window.open(link.href, "_blank");
  else push(link.getAttribute("href")!);
}

export function Table({ head, children }: { head: React.ReactNode[]; children: React.ReactNode }) {
  const router = useRouter();
  const ref = useRef<HTMLTableElement>(null);
  // Each heading lines up with its column: a column of amounts (right-aligned cells) gets a right-aligned heading.
  useLayoutEffect(() => {
    const table = ref.current;
    const row = table?.tBodies[0]?.rows[0];
    if (!table || !row) return;
    const heads = table.tHead?.rows[0]?.cells ?? [];
    let col = 0;
    for (const cell of Array.from(row.cells)) {
      const th = heads[col];
      if (th && cell.colSpan === 1) {
        const align = cell.classList.contains("text-right") ? "right" : cell.classList.contains("text-center") ? "center" : "";
        th.style.textAlign = align;
      }
      col += cell.colSpan;
    }
  });
  return (
    <div className="overflow-x-auto">
      {/* soft lines between columns as well as rows, so a value is easy to follow to its heading */}
      <table ref={ref} className="w-full text-left text-sm [&_td:not(:first-child)]:border-l [&_td]:border-stone-100 [&_th:not(:first-child)]:border-l [&_th]:border-stone-200">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            {head.map((h, i) => (
              <th key={typeof h === "string" && h ? h : i} className="whitespace-nowrap px-4 py-2.5 font-medium">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-stone-100 [&_tr:has(a[href])]:cursor-pointer" onClick={(e) => openRowLink(e, router.push)}>{children}</tbody>
      </table>
    </div>
  );
}

export function Td({ className, children, colSpan, onClick }: { className?: string; children?: React.ReactNode; colSpan?: number; onClick?: React.MouseEventHandler<HTMLTableCellElement> }) {
  return (
    <td colSpan={colSpan} onClick={onClick} className={clsx("px-4 py-3 align-middle text-stone-800", className)}>
      {children}
    </td>
  );
}

const MODAL_WIDTH = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" } as const;

/**
 * Forms with more than six fields are pages, not pop-ups. A form component wrapped in <AsPage> draws its Modal as a page:
 * the title as the page's heading, the fields in a card, full width. The same component, on its own address.
 */
const PageMode = React.createContext<{ description?: React.ReactNode; guide?: string } | null>(null);

export function AsPage({ children, description, guide }: { children: React.ReactNode; description?: React.ReactNode; guide?: string }) {
  return <PageMode.Provider value={{ description, guide }}>{children}</PageMode.Provider>;
}

export function Modal({
  open,
  title,
  onClose,
  children,
  size = "md",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** md for short forms; lg for long forms (two or three columns); xl for wide tables. */
  size?: keyof typeof MODAL_WIDTH;
}) {
  // Something typed: closing by tapping outside, Escape or the X asks first, so a stray tap doesn't lose the work.
  // A press that starts inside (selecting text, say) and ends outside never closes it.
  const asPage = React.useContext(PageMode);
  const dirty = useRef(false);
  const pressedOutside = useRef(false);
  const closeRef = useRef(onClose);
  useEffect(() => { closeRef.current = onClose; }, [onClose]);
  const tryClose = useCallback(async () => {
    if (dirty.current) {
      const { ask } = await import("./confirm");
      if (!(await ask("Discard what you typed?", { confirmLabel: "Discard", danger: true }))) return;
    }
    closeRef.current();
  }, []);
  useEffect(() => {
    if (!open || asPage) return;
    dirty.current = false;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") void tryClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, tryClose, asPage]);
  if (!open) return null;
  if (asPage) {
    return (
      <div className="w-full">
        <PageHeader title={title} description={asPage.description} guide={asPage.guide} />
        <Card className="p-4 sm:p-5">{children}</Card>
      </div>
    );
  }
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/40 p-2 pt-6 sm:p-10"
      onMouseDown={(e) => { pressedOutside.current = e.target === e.currentTarget; }}
      onClick={(e) => { if (e.target === e.currentTarget && pressedOutside.current) void tryClose(); }}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx("w-full rounded-lg bg-white shadow-xl", MODAL_WIDTH[size])}
        onInputCapture={() => { dirty.current = true; }}
        onChangeCapture={() => { dirty.current = true; }}
      >
        <div className="flex items-center justify-between gap-3 border-b border-stone-200 px-4 py-3.5 sm:px-5">
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <button type="button" onClick={() => void tryClose()} className="rounded p-1 text-stone-500 hover:bg-stone-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label = "Loading" }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-10 text-sm text-stone-500" role="status">
      <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> {label}...
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{message}</div>;
}

export function EmptyState({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="px-6 py-12 text-center">
      <p className="font-medium text-stone-800">{title}</p>
      {children && <div className="mt-1 text-sm text-stone-500">{children}</div>}
    </div>
  );
}

export function FormError({ error }: { error: unknown }) {
  if (!error) return null;
  const message = error instanceof Error ? error.message : "Something went wrong.";
  return <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{message}</p>;
}
