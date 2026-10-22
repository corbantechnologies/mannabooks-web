"use client";

import { useMutation } from "@tanstack/react-query";
import { Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { AccountOptions, useAccounts } from "@/lib/api/accounting";
import { api, fieldError, unwrap } from "@/lib/api/client";
import type { JournalEntry } from "@/lib/api/types";
import { fmt, todayIso } from "@/lib/format";
import { stack } from "@/lib/stack";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Card, Field, FormError, Input, Select } from "./ui";

interface Line {
  account_id: string;
  description: string;
  debit: string;
  credit: string;
}

const blankLine = (): Line => ({ account_id: "", description: "", debit: "", credit: "" });

export function JournalForm({ entry }: { entry?: JournalEntry }) {
  const { slug } = useWorkspace();
  const router = useRouter();
  const accounts = useAccounts(slug);
  const [head, setHead] = useState({
    entry_date: entry?.entry_date ?? todayIso(),
    description: entry?.description ?? "",
    reference: entry?.reference ?? "",
  });
  const [lines, setLines] = useState<Line[]>(
    entry?.lines.map((l) => ({ account_id: l.account_id, description: l.description ?? "", debit: Number(l.debit) ? String(l.debit) : "", credit: Number(l.credit) ? String(l.credit) : "" })) ?? [blankLine(), blankLine()],
  );

  const totalDebit = lines.reduce((s, l) => s + (Number(l.debit) || 0), 0);
  const totalCredit = lines.reduce((s, l) => s + (Number(l.credit) || 0), 0);
  const difference = Math.round((totalDebit - totalCredit) * 100) / 100;

  const save = useMutation({
    mutationFn: async (andPost: boolean) => {
      const body = {
        ...head,
        lines: lines
          .filter((l) => l.account_id)
          .map((l) => ({ account_id: l.account_id, description: l.description, debit: l.debit || "0", credit: l.credit || "0" })),
      };
      const saved = entry
        ? unwrap(await api.PATCH("/api/v1/w/{workspace}/journals/{id}/", { params: { path: { workspace: slug, id: entry.id } }, body }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/journals/", { ...wsPath(slug), body }));
      if (andPost) unwrap(await api.POST("/api/v1/w/{workspace}/journals/{id}/post/", { params: { path: { workspace: slug, id: saved.id } } }));
      return { saved, andPost };
    },
    onSuccess: ({ saved, andPost }) => {
      toast.success(andPost ? "Entry posted" : "Draft saved");
      router.push(`/w/${slug}/accounting/journals/${saved.id}`);
    },
  });

  function setLine(i: number, patch: Partial<Line>) {
    setLines(lines.map((l, n) => (n === i ? { ...l, ...patch } : l)));
  }

  return (
    <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(false); }}>
      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        <Field label="Date" error={fieldError(save.error, "entry_date")}><Input type="date" required value={head.entry_date} onChange={(e) => setHead((prev) => ({ ...prev, entry_date: e.target.value }))} /></Field>
        <div className="sm:col-span-2"><Field label="Description" error={fieldError(save.error, "description")}><Input required value={head.description} onChange={(e) => setHead((prev) => ({ ...prev, description: e.target.value }))} placeholder="What this entry records" /></Field></div>
        <Field label="Reference" error={fieldError(save.error, "reference")}><Input value={head.reference} onChange={(e) => setHead((prev) => ({ ...prev, reference: e.target.value }))} placeholder="Receipt or bank ref" /></Field>
      </Card>
      <Card className="overflow-x-auto">
        <table className={stack.table}>
          <thead className={stack.head}>
            <tr><th className="px-3 py-2 text-left">Account</th><th className="px-3 py-2 text-left">Line description</th><th className="w-36 px-3 py-2 text-right">Debit</th><th className="w-36 px-3 py-2 text-right">Credit</th><th className="w-10" /></tr>
          </thead>
          <tbody className={stack.body}>
            {lines.map((l, i) => (
              <tr key={i} className={stack.row}>
                <td data-label="Account" className={`${stack.cell} ${stack.wide}`}>
                  <Select value={l.account_id} onChange={(e) => setLine(i, { account_id: e.target.value })}>
                    <option value="">Choose an account</option>
                    <AccountOptions accounts={accounts.data ?? []} />
                  </Select>
                </td>
                <td data-label="Line description" className={`${stack.cell} ${stack.wide}`}><Input value={l.description} onChange={(e) => setLine(i, { description: e.target.value })} /></td>
                <td data-label="Debit" className={stack.cell}><Input inputMode="decimal" className="text-right" value={l.debit} onChange={(e) => setLine(i, { debit: e.target.value, credit: e.target.value ? "" : l.credit })} /></td>
                <td data-label="Credit" className={stack.cell}><Input inputMode="decimal" className="text-right" value={l.credit} onChange={(e) => setLine(i, { credit: e.target.value, debit: e.target.value ? "" : l.debit })} /></td>
                <td className={`${stack.remove} ${stack.wide}`}><button type="button" className="rounded p-1.5 text-stone-400 hover:bg-stone-100 hover:text-red-600 disabled:opacity-30" disabled={lines.length <= 2} onClick={() => setLines(lines.filter((_, n) => n !== i))} aria-label="Remove line"><Trash2 className="h-4 w-4" /></button></td>
              </tr>
            ))}
          </tbody>
          <tfoot className="border-t border-stone-200 font-semibold max-md:block">
            <tr className={stack.row}>
              <td className={`px-3 py-2 max-md:block max-md:p-0 ${stack.wide}`}><Button type="button" variant="ghost" className="px-2 py-1" onClick={() => setLines([...lines, blankLine()])}><Plus className="h-4 w-4" /> Add line</Button></td>
              <td className="px-3 py-2 text-right text-stone-600 max-md:hidden">Totals</td>
              <td data-label="Total debit" className={stack.amount}>{fmt(totalDebit)}</td>
              <td data-label="Total credit" className={stack.amount}>{fmt(totalCredit)}</td>
              <td className="max-md:hidden" />
            </tr>
            {difference !== 0 && (
              <tr className="max-md:block"><td colSpan={5} className="px-3 pb-3 text-right text-sm font-normal text-amber-700 max-md:block max-md:text-left">Out of balance by {fmt(Math.abs(difference))}. You can save a draft, but it can only be posted once debits equal credits.</td></tr>
            )}
          </tfoot>
        </table>
      </Card>
      {fieldError(save.error, "lines") && <p className="text-sm text-red-600">{fieldError(save.error, "lines")}</p>}
      <FormError error={save.error} />
      <div className="flex justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => router.back()}>Cancel</Button>
        <Button type="submit" variant="secondary" loading={save.isPending && !save.variables}>Save draft</Button>
        <Button type="button" disabled={difference !== 0 || totalDebit === 0} loading={save.isPending && save.variables} onClick={() => save.mutate(true)}>Save and post</Button>
      </div>
    </form>
  );
}
