"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { JournalForm } from "@/components/journal-form";
import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, fmtNonZero, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const TONE = { draft: "amber", posted: "green", reversed: "stone" } as const;

export default function JournalDetailPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [reversing, setReversing] = useState(false);
  const [rev, setRev] = useState({ entry_date: todayIso(), reason: "" });
  const path = { params: { path: { workspace: slug, id } } };

  const entry = useQuery({ queryKey: ["journal", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/journals/{id}/", path)) });
  const post = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/journals/{id}/post/", path)),
    onSuccess: (e) => toast.success(`Posted as ${e.number}`),
    onError: (e) => toast.error(e.message),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/journals/{id}/", path)),
    onSuccess: () => { toast.success("Draft deleted"); router.replace(`/w/${slug}/accounting/journals`); },
    onError: (e) => toast.error(e.message),
  });
  const reverse = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/journals/{id}/reverse/", { ...path, body: rev })),
    onSuccess: (r) => { toast.success(`Reversed by ${r.number}`); setReversing(false); router.push(`/w/${slug}/accounting/journals/${r.id}`); },
  });

  if (entry.isLoading) return <Spinner />;
  if (entry.error) return <ErrorState error={entry.error} />;
  const e = entry.data!;
  if (editing) {
    return (
      <div className="max-w-5xl">
        <PageHeader title="Edit draft entry" guide="journal-entries" />
        <JournalForm entry={e} />
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/accounting/journals`} className="text-sm text-stone-500 hover:underline">&larr; Journal entries</Link>
      <PageHeader
        title={e.number || "Draft entry"}
        description={e.description}
        guide="journal-entries"
        actions={
          <div className="flex gap-2">
            {e.status === "draft" && can("journals.create") && (
              <>
                <Button variant="ghost" className="text-red-600" loading={remove.isPending} onClick={() => confirm("Delete this draft?") && remove.mutate()}>Delete</Button>
                <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
              </>
            )}
            {e.status === "draft" && can("journals.post") && <Button loading={post.isPending} onClick={() => post.mutate()}>Post</Button>}
            {e.status === "posted" && e.source === "manual" && !e.reversal_of_number && can("journals.reverse") && (
              <Button variant="secondary" onClick={() => { reverse.reset(); setReversing(true); }}>Reverse</Button>
            )}
          </div>
        }
      />
      <Card className="mb-4 grid gap-4 p-4 text-sm sm:grid-cols-4">
        <div><p className="text-stone-500">Date</p><p className="font-medium">{fmtDate(e.entry_date)}</p></div>
        <div><p className="text-stone-500">Status</p><Badge tone={TONE[e.status]}>{e.status}</Badge></div>
        <div><p className="text-stone-500">Source</p><p className="font-medium capitalize">{e.source.replace("_", " ")}</p></div>
        <div><p className="text-stone-500">Reference</p><p className="font-medium">{e.reference || "-"}</p></div>
        {e.posted_by_name && <div className="sm:col-span-2"><p className="text-stone-500">Posted</p><p>{e.posted_by_name}, {new Date(e.posted_at!).toLocaleString("en-KE")}</p></div>}
        {e.reversal_of_number && <div className="sm:col-span-2"><p className="text-stone-500">Reverses</p><p className="font-mono">{e.reversal_of_number}</p></div>}
        {e.reversed_by_number && <div className="sm:col-span-2"><p className="text-stone-500">Reversed by</p><p className="font-mono">{e.reversed_by_number}</p></div>}
      </Card>
      <Card>
        <Table head={["Account", "Description", "Debit", "Credit"]}>
          {e.lines.map((l) => (
            <tr key={l.id}>
              <Td><span className="font-mono text-xs text-stone-500">{l.account_code}</span> {l.account_name}</Td>
              <Td className="text-stone-600">{l.description}</Td>
              <Td className="text-right font-mono">{fmtNonZero(l.debit)}</Td>
              <Td className="text-right font-mono">{fmtNonZero(l.credit)}</Td>
            </tr>
          ))}
          <tr className="bg-stone-50 font-semibold">
            <Td colSpan={2}>Totals</Td>
            <Td className="text-right font-mono">{fmt(e.lines.reduce((s, l) => s + Number(l.debit), 0))}</Td>
            <Td className="text-right font-mono">{fmt(e.lines.reduce((s, l) => s + Number(l.credit), 0))}</Td>
          </tr>
        </Table>
      </Card>

      <Modal open={reversing} title={`Reverse ${e.number}`} onClose={() => setReversing(false)}>
        <form className="space-y-4" onSubmit={(ev) => { ev.preventDefault(); reverse.mutate(); }}>
          <p className="text-sm text-stone-600">A reversal posts the same lines with debits and credits swapped, cancelling this entry. Both stay on record.</p>
          <Field label="Reversal date"><Input type="date" required value={rev.entry_date} onChange={(ev) => setRev((prev) => ({ ...prev, entry_date: ev.target.value }))} /></Field>
          <Field label="Reason"><Input value={rev.reason} onChange={(ev) => setRev((prev) => ({ ...prev, reason: ev.target.value }))} /></Field>
          <FormError error={reverse.error} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setReversing(false)}>Cancel</Button>
            <Button type="submit" loading={reverse.isPending}>Reverse entry</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
