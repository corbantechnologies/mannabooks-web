"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { YearCoverage } from "@/components/year-coverage";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";
import { ask } from "@/components/confirm";

export default function FinancialYearsPage() {
  const { slug, can } = useWorkspace();
  const p = wsPath(slug);
  const [selected, setSelected] = useState<string | null>(null);
  const years = useQuery({ queryKey: ["fiscal-years", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fiscal-years/", p)) });
  const yearId = selected ?? years.data?.find((y) => y.status === "open")?.id ?? years.data?.[0]?.id;
  const periods = useQuery({
    queryKey: ["periods", slug, yearId],
    enabled: Boolean(yearId),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/periods/", { params: { path: { workspace: slug }, query: { fiscal_year: yearId } } })),
  });

  const addYear = useMutation({
    mutationFn: async (position: "next" | "previous") => unwrap(await api.POST("/api/v1/w/{workspace}/fiscal-years/", { ...p, body: { position } })),
    onSuccess: (y) => toast.success(`${y.name} added`),
    onError: (e) => toast.error(e.message),
  });
  const yearAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "close" | "reopen" }) =>
      action === "close"
        ? unwrap(await api.POST("/api/v1/w/{workspace}/fiscal-years/{id}/close/", { params: { path: { workspace: slug, id } } }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/fiscal-years/{id}/reopen/", { params: { path: { workspace: slug, id } } })),
    onSuccess: (y) => toast.success(`${y.name} is ${y.status}`),
    onError: (e) => toast.error(e.message),
  });
  const periodAction = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "close" | "reopen" }) =>
      action === "close"
        ? unwrap(await api.POST("/api/v1/w/{workspace}/periods/{id}/close/", { params: { path: { workspace: slug, id } } }))
        : unwrap(await api.POST("/api/v1/w/{workspace}/periods/{id}/reopen/", { params: { path: { workspace: slug, id } } })),
    onSuccess: (pr) => toast.success(`${pr.name} is ${pr.status}`),
    onError: (e) => toast.error(e.message),
  });
  const [closing, setClosing] = useState<string | null>(null);
  const manageYears = can("fiscalyears.manage");
  const managePeriods = can("periods.manage");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Financial years and periods"
        description="Each year has 12 monthly periods. Close a month once its books are final, so nothing can change in it. Closing a year moves its profit to retained earnings."
        guide="financial-years"
        actions={manageYears && (
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" loading={addYear.isPending && addYear.variables === "previous"} onClick={() => addYear.mutate("previous")}>Add earlier year</Button>
            <Button loading={addYear.isPending && addYear.variables === "next"} onClick={() => addYear.mutate("next")}>Add next year</Button>
          </div>
        )}
      />
      <YearCoverage />
      {years.isLoading ? <Spinner /> : years.error ? <ErrorState error={years.error} /> : (
        <Card>
          <Table head={["Year", "From", "To", "Open months", "Status", ""]}>
            {(years.data ?? []).map((y) => (
              <tr key={y.id} className={y.id === yearId ? "bg-brand-50/50" : "hover:bg-stone-50"}>
                <Td><button className="font-medium hover:underline" onClick={() => setSelected(y.id)}>{y.name}</button></Td>
                <Td>{fmtDate(y.start_date)}</Td>
                <Td>{fmtDate(y.end_date)}</Td>
                <Td>{y.open_periods} of 12</Td>
                <Td>{y.status === "open" ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}</Td>
                <Td className="text-right">
                  {manageYears && (y.status === "open" ? (
                    <Button variant="ghost" className="px-2 py-1" loading={yearAction.isPending} onClick={() => void ask(`Close ${y.name}? Its profit moves to retained earnings and every month is locked.`).then((ok) => ok && yearAction.mutate({ id: y.id, action: "close" }))}>Close year</Button>
                  ) : (
                    <Button variant="ghost" className="px-2 py-1" onClick={() => yearAction.mutate({ id: y.id, action: "reopen" })}>Reopen</Button>
                  ))}
                </Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      {yearId && (
        <div>
          <h2 className="mb-2 text-sm font-semibold text-stone-900">Months in {years.data?.find((y) => y.id === yearId)?.name}</h2>
          <Card>
            {periods.isLoading ? <div className="px-4"><Spinner /></div> : (
              <Table head={["Month", "From", "To", "Status", ""]}>
                {(periods.data ?? []).map((pr) => (
                  <tr key={pr.id}>
                    <Td className="font-medium"><Link href={`/w/${slug}/accounting/months/${pr.id}`} className="text-brand-700 hover:underline">{pr.name}</Link></Td>
                    <Td>{fmtDate(pr.start_date)}</Td>
                    <Td>{fmtDate(pr.end_date)}</Td>
                    <Td>{pr.status === "open" ? <Badge tone="green">Open</Badge> : <Badge>Closed{pr.closed_by_name ? ` by ${pr.closed_by_name}` : ""}</Badge>}</Td>
                    <Td className="text-right">
                      {managePeriods && <Button variant="ghost" className="px-2 py-1" onClick={() => pr.status === "open" ? setClosing(pr.id) : void ask(`Reopen ${pr.name}? Entries can be added and changed in it again.`, { confirmLabel: "Reopen" }).then((ok) => ok && periodAction.mutate({ id: pr.id, action: "reopen" }))}>{pr.status === "open" ? "Close" : "Reopen"}</Button>}
                    </Td>
                  </tr>
                ))}
              </Table>
            )}
          </Card>
        </div>
      )}
      {closing && <CloseMonth slug={slug} periodId={closing} busy={periodAction.isPending} onClose={() => setClosing(null)}
        onConfirm={() => periodAction.mutate({ id: closing, action: "close" }, { onSuccess: () => setClosing(null) })} />}
    </div>
  );
}

function CloseMonth({ slug, periodId, busy, onClose, onConfirm }: { slug: string; periodId: string; busy: boolean; onClose: () => void; onConfirm: () => void }) {
  const s = useQuery({
    queryKey: ["period-summary", slug, periodId],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/periods/{id}/summary/", { params: { path: { workspace: slug, id: periodId } } })),
  });
  const d = s.data;
  const loose = d ? [
    d.draft_invoices && { n: d.draft_invoices, text: "draft invoice", href: `/w/${slug}/sales/invoices?status=draft` },
    d.draft_bills && { n: d.draft_bills, text: "draft bill", href: `/w/${slug}/purchasing/bills?status=draft` },
    d.draft_journals && { n: d.draft_journals, text: "draft journal entry", plural: "draft journal entries", href: `/w/${slug}/accounting/journals` },
    d.unmatched_lines && { n: d.unmatched_lines, text: "bank statement line not matched", plural: "bank statement lines not matched", href: `/w/${slug}/banking` },
  ].filter(Boolean) as { n: number; text: string; plural?: string; href: string }[] : [];
  return (
    <Modal open title={d ? `Close ${d.name}?` : "Close this month?"} onClose={onClose}>
      {s.isLoading ? <Spinner /> : s.error ? <ErrorState error={s.error} /> : d && (
        <div className="space-y-4 text-sm">
          <p className="text-stone-600">Once closed, nothing dated {fmtDate(d.start_date)} to {fmtDate(d.end_date)} can be added, changed or voided until someone reopens the month.</p>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-2 rounded-md bg-stone-50 p-3 sm:grid-cols-3">
            {([["Income", d.income], ["Expenses", d.expenses], ["Profit", d.profit], ["Money in", d.money_in], ["Money out", d.money_out]] as const).map(([k, v]) => (
              <div key={k}><dt className="text-xs text-stone-500">{k}</dt><dd className={`font-mono ${Number(v) < 0 ? "text-red-600" : "text-stone-900"}`}>{fmt(v)}</dd></div>
            ))}
            <div><dt className="text-xs text-stone-500">Entries</dt><dd className="font-mono text-stone-900">{d.entries}</dd></div>
          </dl>
          {loose.length > 0 ? (
            <div className="rounded-md border border-amber-200 bg-amber-50 p-3">
              <p className="font-medium text-amber-900">Still unfinished in {d.name}</p>
              <ul className="mt-1 list-disc pl-5 text-amber-900">
                {loose.map((l) => <li key={l.text}><Link className="underline" href={l.href}>{l.n} {l.n === 1 ? l.text : l.plural ?? `${l.text}s`}</Link></li>)}
              </ul>
              <p className="mt-1 text-xs text-amber-800">Drafts dated in a closed month can&apos;t be posted until it&apos;s reopened.</p>
            </div>
          ) : <p className="text-emerald-700">Nothing left unfinished in this month.</p>}
          {d.earlier_open.length > 0 && <p className="text-xs text-stone-500">Earlier months still open: {d.earlier_open.join(", ")}. Closing in order is usual, but not required.</p>}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button loading={busy} onClick={onConfirm}>Close {d.name}</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
