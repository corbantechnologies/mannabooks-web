"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, ErrorState, Field, FormError, Input, Modal, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { fmtDate, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

export default function CurrenciesPage() {
  const { slug, can, context } = useWorkspace();
  const p = wsPath(slug);
  const manage = can("currencies.manage");
  const [rateOpen, setRateOpen] = useState(false);
  const [rate, setRate] = useState({ currency_id: "", rate_date: todayIso(), rate: "" });
  const [newCode, setNewCode] = useState({ code: "", name: "", symbol: "" });
  const [adding, setAdding] = useState(false);

  const currencies = useQuery({ queryKey: ["currencies", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/currencies/", p)) });
  const rates = useQuery({ queryKey: ["exchange-rates", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/exchange-rates/", p)) });
  const toggle = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) =>
      unwrap(await api.PATCH("/api/v1/w/{workspace}/currencies/{id}/", { params: { path: { workspace: slug, id } }, body: { is_active } })),
    onError: (e) => toast.error(e.message),
  });
  const addRate = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/exchange-rates/", { ...p, body: rate })),
    onSuccess: () => { toast.success("Rate saved"); setRateOpen(false); },
  });
  const addCurrency = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/currencies/", { ...p, body: { ...newCode, is_active: true } })),
    onSuccess: () => { toast.success("Currency added"); setAdding(false); },
  });
  const removeRate = useMutation({
    mutationFn: async (id: string) => unwrap(await api.DELETE("/api/v1/w/{workspace}/exchange-rates/{id}/", { params: { path: { workspace: slug, id } } })),
    onError: (e) => toast.error(e.message),
  });
  const list = currencies.data?.results ?? [];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Currencies and exchange rates"
        description={`Your books are kept in ${context.workspace.currency}. Switch on the other currencies you trade in and record their rates; documents in those currencies are converted at the rate for their date.`}
        guide="currencies"
        actions={manage && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => { addCurrency.reset(); setAdding(true); }}>Add currency</Button>
            <Button onClick={() => { addRate.reset(); setRateOpen(true); }}>Record a rate</Button>
          </div>
        )}
      />
      {currencies.isLoading ? <Spinner /> : currencies.error ? <ErrorState error={currencies.error} /> : (
        <Card>
          <Table head={["Code", "Name", "Latest rate", "Status", ""]}>
            {list.map((c) => (
              <tr key={c.id}>
                <Td className="font-mono">{c.code}</Td>
                <Td>{c.name} {c.is_base && <Badge tone="blue">Base</Badge>}</Td>
                <Td className="font-mono">{c.is_base ? "1" : c.latest_rate ?? <span className="text-stone-400">No rate yet</span>}</Td>
                <Td>{c.is_active ? <Badge tone="green">In use</Badge> : <Badge>Off</Badge>}</Td>
                <Td className="text-right">{manage && !c.is_base && <Button variant="ghost" className="px-2 py-1" onClick={() => toggle.mutate({ id: c.id, is_active: !c.is_active })}>{c.is_active ? "Switch off" : "Switch on"}</Button>}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
      <div>
        <h2 className="mb-2 text-sm font-semibold text-stone-900">Exchange rates</h2>
        <Card>
          {rates.isLoading ? <div className="px-4"><Spinner /></div> : (
            <Table head={["Date", "Currency", `Rate (in ${context.workspace.currency})`, ""]}>
              {(rates.data?.results ?? []).map((r) => (
                <tr key={r.id}>
                  <Td>{fmtDate(r.rate_date)}</Td>
                  <Td className="font-mono">{r.currency_code}</Td>
                  <Td className="font-mono">{r.rate}</Td>
                  <Td className="text-right">{manage && <Button variant="ghost" className="px-2 py-1 text-red-600" onClick={() => removeRate.mutate(r.id)}>Delete</Button>}</Td>
                </tr>
              ))}
              {rates.data?.results.length === 0 && <tr><Td colSpan={4} className="text-stone-500">No rates recorded yet.</Td></tr>}
            </Table>
          )}
        </Card>
      </div>

      <Modal open={rateOpen} title="Record an exchange rate" onClose={() => setRateOpen(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); addRate.mutate(); }}>
          <Field label="Currency" error={fieldError(addRate.error, "currency_id")}>
            <Select required value={rate.currency_id} onChange={(e) => setRate((prev) => ({ ...prev, currency_id: e.target.value }))}>
              <option value="">Choose</option>
              {list.filter((c) => !c.is_base && c.is_active).map((c) => <option key={c.id} value={c.id}>{c.code} {c.name}</option>)}
            </Select>
          </Field>
          <Field label="Date" error={fieldError(addRate.error, "rate_date")}><Input type="date" required value={rate.rate_date} onChange={(e) => setRate((prev) => ({ ...prev, rate_date: e.target.value }))} /></Field>
          <Field label={`1 unit equals this many ${context.workspace.currency}`} error={fieldError(addRate.error, "rate")}><Input required inputMode="decimal" value={rate.rate} onChange={(e) => setRate((prev) => ({ ...prev, rate: e.target.value }))} placeholder="129.50" /></Field>
          <FormError error={addRate.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setRateOpen(false)}>Cancel</Button><Button type="submit" loading={addRate.isPending}>Save rate</Button></div>
        </form>
      </Modal>
      <Modal open={adding} title="Add a currency" onClose={() => setAdding(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); addCurrency.mutate(); }}>
          <Field label="Code" error={fieldError(addCurrency.error, "code")}><Input required maxLength={3} value={newCode.code} onChange={(e) => setNewCode((prev) => ({ ...prev, code: e.target.value }))} placeholder="ZAR" /></Field>
          <Field label="Name" error={fieldError(addCurrency.error, "name")}><Input required value={newCode.name} onChange={(e) => setNewCode((prev) => ({ ...prev, name: e.target.value }))} /></Field>
          <Field label="Symbol"><Input value={newCode.symbol} onChange={(e) => setNewCode((prev) => ({ ...prev, symbol: e.target.value }))} /></Field>
          <FormError error={addCurrency.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" loading={addCurrency.isPending}>Add</Button></div>
        </form>
      </Modal>
    </div>
  );
}
