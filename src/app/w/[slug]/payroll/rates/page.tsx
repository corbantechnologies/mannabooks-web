"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Button, Card, Field, FormError, Input, PageHeader, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { StatutoryRate } from "@/lib/api/types";
import { fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function RatesPage() {
  const { slug, can } = useWorkspace();
  const rates = useQuery({ queryKey: ["statutory-rates", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/statutory-rates/", wsPath(slug))) });
  const [adding, setAdding] = useState(false);
  const latest = rates.data?.results[0];
  return (
    <div className="space-y-4">
      <Link href={`/w/${slug}/payroll`} className="text-sm text-stone-500 hover:underline">&larr; Payroll</Link>
      <PageHeader title="Statutory rates" description="The rates payroll uses, from each date. When KRA, SHA or NSSF change them, add a new set from the date they apply." guide="payroll"
        actions={can("payroll.manage") && !adding && <Button onClick={() => setAdding(true)}>Add new rates</Button>} />
      <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">Check these against the latest KRA, SHA and NSSF notices before running a real payroll. MannaBooks filled in the rates it knows.</div>
      {adding && latest && <RateForm base={latest} onDone={() => setAdding(false)} />}
      {rates.isLoading ? <Spinner /> : (rates.data?.results ?? []).map((r) => <RateForm key={r.id} existing={r} />)}
    </div>
  );
}

function RateForm({ existing, base, onDone }: { existing?: StatutoryRate; base?: StatutoryRate; onDone?: () => void }) {
  const { slug, can } = useWorkspace();
  const src = existing ?? base!;
  const [form, setForm] = useState({
    effective_from: existing?.effective_from ?? "", personal_relief: String(Number(src.personal_relief)), shif_rate: String(Number(src.shif_rate)),
    shif_minimum: String(Number(src.shif_minimum)), nssf_rate: String(Number(src.nssf_rate)), nssf_lower_limit: String(Number(src.nssf_lower_limit)),
    nssf_upper_limit: String(Number(src.nssf_upper_limit)), housing_levy_rate: String(Number(src.housing_levy_rate)),
    deductions_before_paye: src.deductions_before_paye ?? true, notes: existing?.notes ?? "",
    bands: ((src.paye_bands ?? []) as { upto: number | null; rate: number }[]).map((b) => ({ upto: b.upto == null ? "" : String(b.upto), rate: String(b.rate) })),
  });
  const save = useMutation({
    mutationFn: async () => {
      const body = { ...form, paye_bands: form.bands.map((b, i) => ({ upto: i === form.bands.length - 1 ? null : Number(b.upto), rate: Number(b.rate) })) };
      return existing
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/statutory-rates/{id}/", { params: { path: { workspace: slug, id: existing.id } }, body: body as never }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/statutory-rates/", { ...wsPath(slug), body: body as never }));
    },
    onSuccess: () => { toast.success("Rates saved"); onDone?.(); },
  });
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const editable = can("payroll.manage");
  return (
    <Card className="p-5">
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(); }}>
        <h2 className="font-semibold">{existing ? `From ${fmtDate(existing.effective_from)}` : "New rates"} {existing?.notes && <span className="text-sm font-normal text-stone-500">· {existing.notes}</span>}</h2>
        <fieldset disabled={!editable} className="space-y-4">
          {!existing && <div className="w-48"><Field label="Apply from" error={fieldError(save.error, "effective_from")}><Input type="date" required value={form.effective_from} onChange={set("effective_from")} /></Field></div>}
          <div>
            <p className="mb-1 text-sm font-medium">PAYE bands (monthly)</p>
            <div className="grid gap-2 sm:grid-cols-5">
              {form.bands.map((b, i) => (
                <div key={i} className="rounded border border-stone-200 p-2 text-xs">
                  <p className="text-stone-500">{i === form.bands.length - 1 ? "Above" : "Up to"}</p>
                  {i < form.bands.length - 1 ? <Input inputMode="decimal" value={b.upto} onChange={(e) => setForm((p) => ({ ...p, bands: p.bands.map((x, n) => (n === i ? { ...x, upto: e.target.value } : x)) }))} /> : <p className="py-2">the rest</p>}
                  <p className="mt-1 text-stone-500">Rate %</p>
                  <Input inputMode="decimal" value={b.rate} onChange={(e) => setForm((p) => ({ ...p, bands: p.bands.map((x, n) => (n === i ? { ...x, rate: e.target.value } : x)) }))} />
                </div>
              ))}
            </div>
            {fieldError(save.error, "paye_bands") && <p className="text-sm text-red-600">{fieldError(save.error, "paye_bands")}</p>}
          </div>
          <div className="grid gap-3 sm:grid-cols-4">
            <Field label="Personal relief"><Input inputMode="decimal" value={form.personal_relief} onChange={set("personal_relief")} /></Field>
            <Field label="SHIF %"><Input inputMode="decimal" value={form.shif_rate} onChange={set("shif_rate")} /></Field>
            <Field label="SHIF minimum"><Input inputMode="decimal" value={form.shif_minimum} onChange={set("shif_minimum")} /></Field>
            <Field label="Housing Levy % (each)"><Input inputMode="decimal" value={form.housing_levy_rate} onChange={set("housing_levy_rate")} /></Field>
            <Field label="NSSF % (each)"><Input inputMode="decimal" value={form.nssf_rate} onChange={set("nssf_rate")} /></Field>
            <Field label="NSSF lower limit"><Input inputMode="decimal" value={form.nssf_lower_limit} onChange={set("nssf_lower_limit")} /></Field>
            <Field label="NSSF upper limit"><Input inputMode="decimal" value={form.nssf_upper_limit} onChange={set("nssf_upper_limit")} /></Field>
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.deductions_before_paye} onChange={(e) => setForm((p) => ({ ...p, deductions_before_paye: e.target.checked }))} /> SHIF and Housing Levy reduce taxable pay</label>
        </fieldset>
        <FormError error={save.error} />
        {editable && <Button type="submit" loading={save.isPending}>Save</Button>}
      </form>
    </Card>
  );
}
