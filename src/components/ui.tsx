"use client";

import clsx from "clsx";
import { BookOpen, Loader2, X } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

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
        "inline-flex items-center justify-center gap-2 rounded-md px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60",
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
  return (
    <input
      {...props}
      onFocus={(e) => {
        // A number box holding 0 gets selected, so typing replaces the 0 instead of adding to it.
        if (numeric && e.currentTarget.value !== "" && Number(e.currentTarget.value) === 0) e.currentTarget.select();
        props.onFocus?.(e);
      }}
      className={clsx(inputClass, props.className)}
    />
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
  description?: string;
  guide?: string;
  actions?: React.ReactNode;
}) {
  const workspace = useParams<{ slug?: string }>()?.slug;
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-stone-600">{description}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {guide && (
          <Link
            href={workspace ? `/w/${workspace}/guide/${guide}` : `/guide/${guide}`}
            className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-2 text-sm text-stone-600 hover:bg-stone-100 hover:text-stone-900"
            title="Open the user guide for this page"
          >
            <BookOpen className="h-4 w-4" aria-hidden /> Guide
          </Link>
        )}
        {actions}
      </div>
    </div>
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

export function Table({ head, children }: { head: string[]; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-stone-200 bg-stone-50 text-xs uppercase tracking-wide text-stone-500">
          <tr>
            {head.map((h) => (
              <th key={h} className="px-4 py-2.5 font-medium">
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

export function Td({ className, children, colSpan }: { className?: string; children?: React.ReactNode; colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={clsx("px-4 py-3 align-middle text-stone-800", className)}>
      {children}
    </td>
  );
}

const MODAL_WIDTH = { md: "max-w-lg", lg: "max-w-3xl", xl: "max-w-5xl" } as const;

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
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-stone-900/40 p-4 sm:p-10" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={clsx("w-full rounded-lg bg-white shadow-xl", MODAL_WIDTH[size])}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-stone-200 px-5 py-3.5">
          <h2 className="text-base font-semibold text-stone-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-stone-500 hover:bg-stone-100" aria-label="Close">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
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
