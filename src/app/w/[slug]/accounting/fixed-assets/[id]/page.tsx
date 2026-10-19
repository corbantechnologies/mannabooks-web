"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { AssetForm } from "@/components/asset-form";
import { Meta } from "@/components/document-view";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { ASSET_STATUS, METHODS } from "@/lib/api/assets";
import { useBankAccounts } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { fmt, fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function AssetPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const path = { params: { path: { workspace: slug, id } } };
  const [editing, setEditing] = useState(false);
  const [disposing, setDisposing] = useState(false);
  const [d, setD] = useState({ date: todayIso(), proceeds: "0", received_into_id: "" });
  const banks = useBankAccounts(slug);
  const asset = useQuery({ queryKey: ["fixed-asset", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fixed-assets/{id}/", path)) });
  const schedule = useQuery({ queryKey: ["fixed-asset-schedule", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/fixed-assets/{id}/schedule/", path)) });
  const act = useMutation({
    mutationFn: async (body: Record<string, unknown>) => unwrap(await api.POST("/api/v1/w/{workspace}/fixed-assets/{id}/action/", { ...path, body: body as never })),
    onSuccess: (a) => { toast.success(ASSET_STATUS[a.status ?? "active"].label); setDisposing(false); },
    onError: (e) => { if (!disposing) toast.error(e.message); },
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/fixed-assets/{id}/", path)),
    onSuccess: () => { toast.success("Asset removed"); router.replace(`/w/${slug}/accounting/fixed-assets`); },
    onError: (e) => toast.error(e.message),
  });
  if (asset.isLoading) return <Spinner />;
  if (asset.error) return <ErrorState error={asset.error} />;
  const a = asset.data!;
  if (editing) return <div className="max-w-5xl"><PageHeader title={`Edit ${a.number}`} guide="fixed-assets" /><AssetForm existing={a} /></div>;
  const s = schedule.data;
  const manage = can("fixedassets.manage");
  return (
    <div className="max-w-5xl">
      <Link href={`/w/${slug}/accounting/fixed-assets`} className="text-sm text-stone-500 hover:underline">&larr; Fixed assets</Link>
      <PageHeader title={`${a.number} ${a.name}`} description={a.serial_number || undefined} guide="fixed-assets"
        actions={manage && <div className="flex flex-wrap gap-2">
          {!a.depreciated_to && a.status !== "disposed" && <Button variant="ghost" className="text-red-600" onClick={() => confirm("Remove this asset from the register?") && remove.mutate()}>Remove</Button>}
          <Button variant="secondary" onClick={() => setEditing(true)}>Edit</Button>
          {a.status === "disposed"
            ? <Button variant="secondary" onClick={() => confirm("Undo the sale or scrapping?") && act.mutate({ action: "undo_disposal" })}>Undo disposal</Button>
            : <Button onClick={() => { act.reset(); setDisposing(true); }}>Sell or scrap</Button>}
        </div>} />
      <div className="mb-4 grid gap-3 sm:grid-cols-3">
        <Card className="p-4"><p className="text-xs uppercase text-stone-500">Cost</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(a.cost)}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-stone-500">Depreciation so far</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(a.accumulated_depreciation)}</p>
          <p className="text-xs text-stone-500">{a.depreciated_to ? `Up to ${fmtDate(a.depreciated_to)}` : "None yet"}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-stone-500">Book value</p><p className="mt-1 font-mono text-xl font-semibold">{fmt(a.book_value)}</p></Card>
      </div>
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status"><Badge tone={ASSET_STATUS[a.status ?? "active"].tone}>{ASSET_STATUS[a.status ?? "active"].label}</Badge></Meta>
        <Meta label="Bought">{fmtDate(a.purchase_date)}{a.supplier_name ? `, ${a.supplier_name}` : ""}</Meta>
        <Meta label="In use from">{fmtDate(a.in_service_date)}</Meta>
        <Meta label="Method">{METHODS.find((m) => m.value === a.method)?.label}{a.method === "straight_line" ? `, ${(a.useful_life_months ?? 0) / 12} years` : a.method === "reducing_balance" ? `, ${a.rate_percent}% a year` : ""}</Meta>
        <Meta label="Cost account">{a.asset_account_name}</Meta>
        <Meta label="Charged to">{a.expense_account_name}{a.cost_center_name ? `, ${a.cost_center_name}` : ""}</Meta>
        <Meta label="Where">{a.location_name ?? "-"}</Meta>
        <Meta label="Looked after by">{a.custodian_name ?? "-"}</Meta>
        {a.status === "disposed" && <>
          <Meta label="Disposed of">{fmtDate(a.disposal_date)}</Meta>
          <Meta label="Received">{fmt(a.disposal_proceeds)}{a.disposal_account_name ? ` into ${a.disposal_account_name}` : ""}</Meta>
          <Meta label={Number(a.disposal_gain) >= 0 ? "Gain" : "Loss"}>{fmt(Math.abs(Number(a.disposal_gain)))}</Meta>
        </>}
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Depreciation in the next 10 years</h2>
          {!s?.projection.length ? <EmptyState title={a.status === "active" ? "Nothing more to charge" : "Not being depreciated"} /> : (
            <Table head={["Year", "Start", "Depreciation", "End"]}>
              {s.projection.map((r) => <tr key={r.year}><Td>{r.year}</Td><Td className="text-right font-mono">{fmt(r.opening)}</Td><Td className="text-right font-mono">{fmt(r.depreciation)}</Td><Td className="text-right font-mono">{fmt(r.closing)}</Td></tr>)}
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="border-b border-stone-200 px-4 py-2.5 text-sm font-semibold">Charged so far</h2>
          {!s?.history.length ? <EmptyState title="No depreciation charged yet">Run depreciation each month from the Depreciation page.</EmptyState> : (
            <Table head={["Month", "Amount"]}>
              {[...s.history].reverse().map((h) => <tr key={h.month_end}><Td>{new Date(`${h.month_end}T00:00:00`).toLocaleDateString("en-KE", { month: "long", year: "numeric" })}</Td><Td className="text-right font-mono">{fmt(h.amount)}</Td></tr>)}
            </Table>
          )}
        </Card>
      </div>
      {a.notes && <p className="mt-4 whitespace-pre-line text-sm text-stone-600">{a.notes}</p>}
      <Modal open={disposing} title={`Sell or scrap ${a.number}`} onClose={() => setDisposing(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); act.mutate({ action: "dispose", date: d.date, proceeds: d.proceeds || "0", received_into_id: d.received_into_id || null }); }}>
          <p className="text-sm text-stone-600">Book value now: <span className="font-mono">{fmt(a.book_value)}</span>. Run depreciation up to the month before first.</p>
          <Field label="Date"><Input type="date" required value={d.date} onChange={(e) => setD((x) => ({ ...x, date: e.target.value }))} /></Field>
          <Field label="Money received" hint="0 if it was scrapped or written off."><Input type="number" min="0" step="0.01" value={d.proceeds} onChange={(e) => setD((x) => ({ ...x, proceeds: e.target.value }))} /></Field>
          {Number(d.proceeds) > 0 && <Field label="Received into"><Select required value={d.received_into_id} onChange={(e) => setD((x) => ({ ...x, received_into_id: e.target.value }))}>
            <option value="">Choose the account</option>{(banks.data?.results ?? []).filter((b) => b.is_active).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}</Select></Field>}
          {d.proceeds !== "" && <p className="text-sm">{Number(d.proceeds) - Number(a.book_value) >= 0 ? "Gain" : "Loss"} on disposal: <span className="font-mono">{fmt(Math.abs(Number(d.proceeds) - Number(a.book_value)))}</span></p>}
          <FormError error={act.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setDisposing(false)}>Cancel</Button><Button type="submit" loading={act.isPending}>Record disposal</Button></div>
        </form>
      </Modal>
    </div>
  );
}
