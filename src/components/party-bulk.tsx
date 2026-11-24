"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus, Upload, X } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, FormError, PageHeader } from "@/components/ui";
import { ApiError, api, unwrap } from "@/lib/api/client";
import { useWorkspace, wsPath } from "@/lib/workspace";

type Row = { name: string; phone: string; email: string; kra_pin: string; payment_terms_days: string };
type RowErrors = Record<string, string[]>;

const MAX = 100;
const blank = (): Row => ({ name: "", phone: "", email: "", kra_pin: "", payment_terms_days: "" });
const cell = "w-full rounded border border-stone-300 bg-white px-2 py-1.5 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500";

/**
 * Many customers or suppliers at once, typed or pasted from Excel (name, phone, email, KRA PIN, days to pay). Saved
 * together: a wrong row or a duplicate (same name or KRA PIN, here or already on the list) stops the save and is shown.
 */
export function PartyBulk({ kind }: { kind: "customers" | "suppliers" }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const qc = useQueryClient();
  const one = kind === "customers" ? "customer" : "supplier";
  const listPath = kind === "customers" ? "sales/customers" : "purchasing/suppliers";
  const [rows, setRows] = useState<Row[]>(() => Array.from({ length: 10 }, blank));
  const [errors, setErrors] = useState<Record<number, RowErrors>>({});
  const filled = rows.map((r, i) => ({ r, i })).filter(({ r }) => r.name.trim());
  const set = (i: number, patch: Partial<Row>) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  function paste(i: number, e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text");
    if (!text.includes("\n") && !text.includes("\t")) return;
    e.preventDefault();
    const lines = text.replace(/\r/g, "").split("\n").filter((l) => l.trim()).slice(0, MAX - i);
    setRows((rs) => {
      const next = [...rs];
      while (next.length < Math.min(i + lines.length, MAX)) next.push(blank());
      lines.forEach((line, k) => {
        const [name = "", phone = "", email = "", kra_pin = "", days = ""] = line.split("\t").map((x) => x.trim());
        next[i + k] = { name, phone, email, kra_pin, payment_terms_days: days.replace(/[^0-9]/g, "") };
      });
      return next;
    });
    toast.success(`${lines.length} rows pasted`);
  }

  const save = useMutation({
    mutationFn: async () => {
      setErrors({});
      const body = { rows: filled.map(({ r }) => ({ name: r.name.trim(), phone: r.phone.trim(), email: r.email.trim(), kra_pin: r.kra_pin.trim().toUpperCase(),
        ...(r.payment_terms_days ? { payment_terms_days: Number(r.payment_terms_days) } : {}) })) };
      const path = kind === "customers" ? "/api/v1/w/{workspace}/customers/bulk/" : "/api/v1/w/{workspace}/suppliers/bulk/";
      return unwrap(await api.POST(path as "/api/v1/w/{workspace}/customers/bulk/", { ...wsPath(slug), body: body as never })) as unknown[];
    },
    onSuccess: (made) => {
      void qc.invalidateQueries({ queryKey: [kind, slug] });
      toast.success(`${made.length} ${made.length === 1 ? one : kind} added`);
      router.push(`/w/${slug}/${listPath}`);
    },
    onError: (e) => {
      const byRow = (e instanceof ApiError ? (e.fieldErrors as unknown as { rows?: Record<string, RowErrors> }).rows : undefined) ?? {};
      const mapped: Record<number, RowErrors> = {};
      for (const [n, errs] of Object.entries(byRow)) mapped[filled[Number(n)]?.i ?? -1] = errs;
      setErrors(mapped);
    },
  });
  const problems = Object.keys(errors).length;
  const label = (f: string) => ({ kra_pin: "KRA PIN", payment_terms_days: "days to pay", non_field_errors: "" }[f] ?? f.replace(/_/g, " "));

  return (
    <div className="w-full">
      <Link href={`/w/${slug}/${listPath}`} className="text-sm text-stone-500 hover:underline">&larr; {kind === "customers" ? "Customers" : "Suppliers"}</Link>
      <PageHeader title={`Add many ${kind}`} guide={kind}
        description={`Type one ${one} per row, or paste rows from Excel into a Name box (columns: name, phone, email, KRA PIN, days to pay). Rows without a name are left out.`}
        actions={<Link href={`/w/${slug}/data?kind=${kind}`}><Button variant="secondary"><Upload className="h-4 w-4" /> Import a spreadsheet instead</Button></Link>} />
      <Card className="overflow-x-auto">
        <table className="w-full min-w-[56rem] border-collapse text-sm">
          <thead className="border-b border-stone-200 bg-stone-50 text-left text-xs uppercase tracking-wide text-stone-500">
            <tr>{["#", "Name *", "Phone", "Email", "KRA PIN", "Days to pay", ""].map((h) => <th key={h} className="whitespace-nowrap px-2 py-2 font-medium">{h}</th>)}</tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const err = errors[i];
              const bad = (f: string) => Boolean(err?.[f]);
              return (
                <tr key={i} className={clsx("border-b border-stone-100 align-top", err && "bg-red-50/60")}>
                  <td className="px-2 py-2 text-xs text-stone-400">{i + 1}</td>
                  <td className="w-72 px-1 py-1">
                    <input className={clsx(cell, bad("name") && "border-red-500")} value={r.name} onChange={(e) => set(i, { name: e.target.value })} onPaste={(e) => paste(i, e)} aria-label={`Row ${i + 1} name`} />
                    {err && <p className="mt-1 text-xs text-red-700">{Object.entries(err).map(([f, m]) => `${label(f) ? `${label(f)}: ` : ""}${m.join(" ")}`).join(" · ")}</p>}
                  </td>
                  <td className="w-40 px-1 py-1"><input className={clsx(cell, bad("phone") && "border-red-500")} value={r.phone} onChange={(e) => set(i, { phone: e.target.value })} aria-label={`Row ${i + 1} phone`} /></td>
                  <td className="w-56 px-1 py-1"><input className={clsx(cell, bad("email") && "border-red-500")} value={r.email} onChange={(e) => set(i, { email: e.target.value })} aria-label={`Row ${i + 1} email`} /></td>
                  <td className="w-36 px-1 py-1"><input className={clsx(cell, "uppercase", bad("kra_pin") && "border-red-500")} value={r.kra_pin} onChange={(e) => set(i, { kra_pin: e.target.value })} aria-label={`Row ${i + 1} KRA PIN`} /></td>
                  <td className="w-24 px-1 py-1"><input className={clsx(cell, "text-right", bad("payment_terms_days") && "border-red-500")} inputMode="numeric" placeholder="0" value={r.payment_terms_days} onChange={(e) => set(i, { payment_terms_days: e.target.value.replace(/[^0-9]/g, "") })} aria-label={`Row ${i + 1} days to pay`} /></td>
                  <td className="px-1 py-2">
                    <button type="button" className="text-stone-400 hover:text-red-600" aria-label={`Remove row ${i + 1}`}
                      onClick={() => { setRows((rs) => (rs.length > 1 ? rs.filter((_, j) => j !== i) : [blank()])); setErrors({}); }}><X className="h-4 w-4" /></button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </Card>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <Button variant="secondary" disabled={rows.length >= MAX} onClick={() => setRows((rs) => [...rs, ...Array.from({ length: Math.min(10, MAX - rs.length) }, blank)])}><Plus className="h-4 w-4" /> Add 10 rows</Button>
        <div className="flex flex-wrap items-center gap-3">
          {problems > 0 && <span className="text-sm text-red-700">{problems} row{problems === 1 ? "" : "s"} to fix. Nothing was saved.</span>}
          <span className="text-sm text-stone-500">{filled.length} to add</span>
          <Button disabled={!filled.length} loading={save.isPending} onClick={() => save.mutate()}>Save {filled.length || ""} {filled.length === 1 ? one : kind}</Button>
        </div>
      </div>
      {problems === 0 && <div className="mt-2"><FormError error={save.error} /></div>}
      <p className="mt-4 text-xs text-stone-500">Up to {MAX} at a time, each numbered in turn. A name or KRA PIN already on your list, or used twice here, is stopped so nobody is added twice. Days to pay blank: due on receipt.</p>
    </div>
  );
}
