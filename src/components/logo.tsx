import clsx from "clsx";

/** The MannaBooks mark: an M on a green square with a ledger line. Same drawing as app/icon.svg. */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={clsx("shrink-0", className)} aria-hidden>
      <rect width="32" height="32" rx="7" fill="#065f46" />
      <path d="M8 21.5V8.5h3.2L16 15.4l4.8-6.9H24v13h-3.2v-7.8L16 20l-4.8-6.3v7.8z" fill="#fff" />
      <rect x="8" y="23.6" width="16" height="1.8" rx="0.9" fill="#6ee7b7" />
    </svg>
  );
}

/** Mark and wordmark. `size` sets the height of the mark; the name follows it. */
export function Logo({ size = "md", className }: { size?: "sm" | "md" | "lg"; className?: string }) {
  return (
    <span className={clsx("inline-flex items-center gap-2 font-bold tracking-tight text-stone-900", size === "sm" && "text-base", size === "md" && "text-lg",
      size === "lg" && "text-2xl", className)}>
      <LogoMark className={size === "sm" ? "h-6 w-6" : size === "md" ? "h-7 w-7" : "h-9 w-9"} />
      <span>Manna<span className="text-brand-700">Books</span></span>
    </span>
  );
}
