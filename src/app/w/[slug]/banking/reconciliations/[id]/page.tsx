"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, FormError, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function ReconciliationPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const rec = useQuery({ queryKey: ["reconciliation", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reconciliations/{id}/", path)) });
  const lines = useQuery({ queryKey: ["reconciliation-lines", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/reconciliations/{id}/lines/", path)) });
  const tick = useMutation({
    mutationFn: async ({ ids, cleared }: { ids: string[]; cleared: boolean }) => unwrap(await api.POST("/api/v1/w/{workspace}/reconciliations/{id}/lines/", { ...path, body: { journal_line_ids: ids, cleared } })),
  });
  const act = useMutation({
    mutationFn: async (action: "complete" | "reopen") => unwrap(await api.POST("/api/v1/w/{workspace}/reconciliations/{id}/action/", { ...path, body: { action } })),
    onSuccess: (r) => toast.success(r.status === "completed" ? "Reconciled: the books agree with the statement" : "Reopened"),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/reconciliations/{id}/", path)),
    onSuccess: () => { toast.success("Reconciliation deleted"); router.back(); },
  });
  if (rec.isLoading) return <Spinner />;
  if (rec.error) return <ErrorState error={rec.error} />;
  const r = rec.data!;
  const editable = r.status === "in_progress" && can("banking.reconcile");
  const all = lines.data ?? [];
  const diff = Number(r.difference);
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/banking/accounts/${r.bank_account_id}`} className="text-sm text-stone-500 hover:underline">&larr; {r.bank_account_name}</Link>
      <PageHeader title={`Reconcile ${r.bank_account_name}`} description={`Statement of ${fmtDate(r.statement_date)}. Tick each transaction that appears on the statement.`} guide="bank-reconciliation"
        actions={
          <div className="flex flex-wrap gap-2">
            {editable && <Button variant="ghost" className="text-red-600" onClick={() => confirm("Delete this reconciliation?") && remove.mutate()}>Delete</Button>}
            {editable && <Button disabled={diff !== 0} loading={act.isPending} onClick={() => act.mutate("complete")}>Finish</Button>}
            {r.status === "completed" && can("banking.reconcile") && <Button variant="secondary" onClick={() => confirm("Reopen? Its transactions can be changed again.") && act.mutate("reopen")}>Reopen</Button>}
          </div>
        } />
      <Card className="sticky top-14 z-10 mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <div><p className="text-xs uppercase text-stone-500">Last reconciled balance</p><p className="font-mono text-lg">{fmt(r.opening_balance)}</p></div>
        <div><p className="text-xs uppercase text-stone-500">Cleared per the books</p><p className="font-mono text-lg">{fmt(r.cleared_balance)}</p></div>
        <div><p className="text-xs uppercase text-stone-500">Statement balance</p><p className="font-mono text-lg">{fmt(r.statement_balance)}</p></div>
        <div><p className="text-xs uppercase text-stone-500">Difference</p><p className={`font-mono text-lg font-semibold ${diff === 0 ? "text-green-700" : "text-red-600"}`}>{fmt(r.difference)}</p>
          {r.status === "completed" && <Badge tone="green">Completed</Badge>}</div>
      </Card>
      <FormError error={act.error ?? tick.error} />
      <Card>
        <Table head={["", "Date", "Description", "Reference", "Money in", "Money out"]}>
          {all.map((l) => (
            <tr key={l.journal_line_id} className={l.cleared ? "bg-green-50/60" : ""}>
              <Td><input type="checkbox" aria-label="Cleared" disabled={!editable || tick.isPending} checked={l.cleared} onChange={(e) => tick.mutate({ ids: [l.journal_line_id], cleared: e.target.checked })} /></Td>
              <Td className="whitespace-nowrap">{fmtDate(l.date)}</Td>
              <Td>{l.description}</Td>
              <Td className="font-mono text-xs">{l.reference}</Td>
              <Td className="text-right font-mono">{Number(l.money_in) ? fmt(l.money_in) : ""}</Td>
              <Td className="text-right font-mono">{Number(l.money_out) ? fmt(l.money_out) : ""}</Td>
            </tr>
          ))}
        </Table>
        {editable && all.length > 0 && (
          <div className="flex gap-2 px-3 py-2">
            <Button variant="ghost" className="px-2 py-1" onClick={() => tick.mutate({ ids: all.map((l) => l.journal_line_id), cleared: true })}>Tick all</Button>
            <Button variant="ghost" className="px-2 py-1" onClick={() => tick.mutate({ ids: all.map((l) => l.journal_line_id), cleared: false })}>Untick all</Button>
          </div>
        )}
      </Card>
      {diff !== 0 && editable && <p className="mt-3 text-sm text-stone-600">Still different? Look for bank charges, interest or deposits on the statement that aren&apos;t in the books: record them from <Link className="text-brand-700 underline" href={`/w/${slug}/banking/accounts/${r.bank_account_id}`}>the statement lines</Link>, or with Spend / Receive money.</p>}
    </div>
  );
}
