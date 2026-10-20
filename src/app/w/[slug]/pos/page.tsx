"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Search, Settings, Smartphone, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import toast from "react-hot-toast";

import { priceLine } from "@/components/lines-editor";
import { usePromptStatus } from "@/components/mpesa-prompt";
import { Badge, Button, Card, EmptyState, Field, FormError, Input, Modal, PageHeader, Select, Spinner } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { type ShiftTotals, useCategories, useCustomerPrices, useProducts, useVatRates } from "@/lib/api/sales";
import type { LoyaltyMember, PosShift, Product, Receipt } from "@/lib/api/types";
import { fmt, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";


interface CartLine { product: Product; quantity: number; price: string; unit?: string }

export default function PosPage() {
  const { slug } = useWorkspace();
  const current = useQuery({
    queryKey: ["pos-shift-current", slug],
    queryFn: async () => (unwrap(await api.GET("/api/v1/w/{workspace}/pos/shifts/current/", wsPath(slug))) ?? null) as PosShift | null,
  });
  if (current.isLoading) return <Spinner label="Opening the till" />;
  return current.data ? <Till shift={current.data} /> : <OpenShift />;
}

function OpenShift() {
  const { slug, can } = useWorkspace();
  const registers = useQuery({ queryKey: ["pos-registers", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/pos/registers/", wsPath(slug))) });
  const [form, setForm] = useState({ register_id: "", opening_float: "0" });
  const open = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/pos/shifts/", { ...wsPath(slug), body: form })),
    onSuccess: (s) => toast.success(`Shift ${s.number} open`),
  });
  const tills = (registers.data?.results ?? []).filter((r) => r.is_active);
  return (
    <div className="max-w-lg">
      <PageHeader title="Point of sale" description="Open a shift to start selling. Count the cash in the drawer first." guide="pos"
        actions={can("pos.manage") && <Link href={`/w/${slug}/pos/registers`}><Button variant="secondary"><Settings className="h-4 w-4" /> Tills</Button></Link>} />
      {registers.isLoading ? <Spinner /> : tills.length === 0 ? (
        <EmptyState title="No tills yet">{can("pos.manage") ? <Link className="text-brand-700 underline" href={`/w/${slug}/pos/registers`}>Add a till</Link> : "Ask a manager to add a till."}</EmptyState>
      ) : (
        <Card className="p-5">
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); open.mutate(); }}>
            <Field label="Till" error={fieldError(open.error, "register_id")}>
              <Select required value={form.register_id} onChange={(e) => setForm((prev) => ({ ...prev, register_id: e.target.value }))}>
                <option value="">Choose a till</option>
                {tills.map((r) => <option key={r.id} value={r.id} disabled={Boolean(r.open_shift_id)}>{r.name}{r.open_shift_id ? " (in use)" : ""}</option>)}
              </Select>
            </Field>
            <Field label="Cash in the drawer (float)" error={fieldError(open.error, "opening_float")}>
              <Input inputMode="decimal" value={form.opening_float} onChange={(e) => setForm((prev) => ({ ...prev, opening_float: e.target.value }))} />
            </Field>
            <FormError error={open.error} />
            <Button type="submit" loading={open.isPending}>Open shift</Button>
          </form>
        </Card>
      )}
      <p className="mt-4 text-sm"><Link href={`/w/${slug}/pos/shifts`} className="text-brand-700 underline">Past shifts</Link></p>
    </div>
  );
}

function Till({ shift }: { shift: PosShift }) {
  const { slug, can, context } = useWorkspace();
  const queryClient = useQueryClient();
  const products = useProducts(slug);
  const categories = useCategories(slug);
  const rates = useVatRates(slug);
  const vat = rates.data?.results ?? [];
  const defaultVat = vat.find((r) => r.is_default)?.id ?? "";
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [member, setMember] = useState<LoyaltyMember | null>(null);
  const [redeem, setRedeem] = useState("");
  const [paying, setPaying] = useState<"cash" | "mpesa" | "card" | null>(null);
  const [closing, setClosing] = useState(false);
  const [done, setDone] = useState<{ receipt: Receipt; change: number } | null>(null);
  const prices = useCustomerPrices(slug, member?.customer_id);
  const program = useQuery({ queryKey: ["loyalty-program", slug], enabled: can("loyalty.view"), queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/program/", wsPath(slug))) });
  const totals = shift.totals as unknown as ShiftTotals;

  const shown = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (products.data?.results ?? []).filter((p) => (!category || p.category_id === category) && (!q || p.name.toLowerCase().includes(q) || (p.code ?? "").toLowerCase().includes(q)));
  }, [products.data, search, category]);

  const priced = cart.map((l) => priceLine({ product_id: l.product.id, description: l.product.name, quantity: String(l.quantity), unit_price: l.price, discount_percent: "0", tax_rate_id: l.product.tax_rate_id ?? defaultVat }, vat, true));
  const total = priced.reduce((s, p) => s + p.total, 0);
  const redeemPoints = Math.floor(Math.min(Number(redeem) || 0, member?.points_balance ?? 0));
  const redeemValue = redeemPoints * Number(program.data?.point_value ?? 1);
  const toPay = Math.max(total - redeemValue, 0);

  function add(p: Product) {
    const price = String(Number(prices.data?.[p.id] ?? p.sale_price ?? 0));
    setCart((prev) => {
      const i = prev.findIndex((l) => l.product.id === p.id && !l.unit);
      if (i >= 0) return prev.map((l, n) => (n === i ? { ...l, quantity: l.quantity + 1 } : l));
      return [...prev, { product: p, quantity: 1, price }];
    });
  }
  /** Sell a carton instead of a piece: its own price, else the piece price times the pieces in it. */
  function setUnit(i: number, unit: string) {
    setCart((prev) => prev.map((l, n) => {
      if (n !== i) return l;
      const base = Number(prices.data?.[l.product.id] ?? l.product.sale_price ?? 0);
      const other = (l.product.units ?? []).find((u) => u.unit === unit);
      const price = other ? (other.sale_price != null ? Number(other.sale_price) : base * Number(other.factor)) : base;
      return { ...l, unit: other ? unit : undefined, price: String(Math.round(price * 10000) / 10000) };
    }));
  }
  function reset() {
    setCart([]);
    setMember(null);
    setRedeem("");
    setPaying(null);
  }

  const sell = useMutation({
    mutationFn: async ({ method, reference, mpesaId, tendered }: { method: "cash" | "mpesa" | "card"; reference?: string; mpesaId?: string; tendered?: number }) => {
      const receipt = unwrap(await api.POST("/api/v1/w/{workspace}/receipts/", {
        ...wsPath(slug),
        body: {
          issue_date: todayIso(), shift_id: shift.id, method, payment_reference: reference ?? "", mpesa_transaction_id: mpesaId ?? null,
          customer_id: member?.customer_id ?? null, prices_include_tax: true, redeem_points: redeemPoints,
          lines: cart.map((l) => ({ product_id: l.product.id, description: l.product.name, quantity: String(l.quantity), ...(l.unit ? { unit: l.unit } : {}), unit_price: l.price, discount_percent: "0", discount_amount: "0", tax_rate_id: l.product.tax_rate_id ?? (defaultVat || null) })),
        },
      }));
      return { receipt, change: tendered ? tendered - Number(receipt.total) : 0 };
    },
    onSuccess: (result) => { setDone(result); reset(); queryClient.invalidateQueries({ queryKey: ["pos-shift-current", slug] }); },
  });

  return (
    <div className="-mx-4 -my-6 flex h-[calc(100vh-3.5rem)] flex-col sm:-mx-8">
      <div className="flex flex-wrap items-center gap-3 border-b border-stone-200 bg-white px-4 py-2 text-sm">
        <span className="font-semibold">{shift.register_name}</span>
        <Badge tone="green">Shift {shift.number}</Badge>
        <span className="text-stone-500">{totals.sales_count} sales · {context.workspace.currency} {fmt(totals.sales_total)}</span>
        <div className="ml-auto flex gap-2">
          <Link href={`/w/${slug}/pos/shifts/${shift.id}`}><Button variant="ghost" className="px-2 py-1">Shift details</Button></Link>
          <Button variant="secondary" className="px-2 py-1" onClick={() => setClosing(true)}>Close shift</Button>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <section className="min-h-0 flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex flex-wrap gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input autoFocus className="pl-9" placeholder="Search or scan code" value={search} onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && shown.length === 1) { add(shown[0]); setSearch(""); } }} />
            </div>
            <div className="flex flex-wrap gap-1">
              <Button variant={category ? "ghost" : "secondary"} className="px-2 py-1" onClick={() => setCategory("")}>All</Button>
              {(categories.data?.results ?? []).filter((c) => c.is_active).map((c) => (
                <Button key={c.id} variant={category === c.id ? "secondary" : "ghost"} className="px-2 py-1" onClick={() => setCategory(c.id)}>{c.name}</Button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-4">
            {shown.map((p) => (
              <button key={p.id} onClick={() => add(p)} className="rounded-lg border border-stone-200 bg-white p-3 text-left hover:border-brand-600 hover:bg-brand-50">
                <p className="line-clamp-2 text-sm font-medium">{p.name}</p>
                <p className="mt-1 font-mono text-sm text-brand-700">{fmt(prices.data?.[p.id] ?? p.sale_price)}</p>
              </button>
            ))}
          </div>
          {shown.length === 0 && <EmptyState title="No products match" />}
        </section>
        <aside className="flex w-full flex-col border-t border-stone-200 bg-white lg:w-96 lg:border-l lg:border-t-0">
          <Customer member={member} setMember={(m) => { setMember(m); setRedeem(""); }} />
          <div className="min-h-0 flex-1 overflow-y-auto">
            {cart.length === 0 ? <p className="p-6 text-center text-sm text-stone-500">Tap a product to add it.</p> : cart.map((l, i) => (
              <div key={`${l.product.id}-${i}`} className="flex items-center gap-2 border-b border-stone-100 px-4 py-2 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{l.product.name}</p>
                  <p className="font-mono text-xs text-stone-500">
                    {fmt(l.price)}
                    {(l.product.units ?? []).length > 0 && (
                      <select aria-label="Unit" className="ml-2 rounded border border-stone-200 px-1 py-0 font-sans text-xs" value={l.unit ?? ""} onChange={(e) => setUnit(i, e.target.value)}>
                        <option value="">{l.product.unit}</option>
                        {l.product.units!.map((u) => <option key={u.unit} value={u.unit}>{u.unit} of {Number(u.factor)}</option>)}
                      </select>
                    )}
                  </p>
                </div>
                <button aria-label="Less" className="rounded border p-1" onClick={() => setCart((prev) => prev.map((x, n) => (n === i ? { ...x, quantity: Math.max(1, x.quantity - 1) } : x)))}><Minus className="h-3 w-3" /></button>
                <input aria-label="Quantity" className="w-12 rounded border px-1 py-0.5 text-center" inputMode="decimal" value={l.quantity}
                  onChange={(e) => setCart((prev) => prev.map((x, n) => (n === i ? { ...x, quantity: Number(e.target.value) || 0 } : x)))} />
                <button aria-label="More" className="rounded border p-1" onClick={() => setCart((prev) => prev.map((x, n) => (n === i ? { ...x, quantity: x.quantity + 1 } : x)))}><Plus className="h-3 w-3" /></button>
                <span className="w-20 text-right font-mono">{fmt(priced[i].total)}</span>
                <button aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => setCart((prev) => prev.filter((_, n) => n !== i))}><Trash2 className="h-4 w-4" /></button>
              </div>
            ))}
          </div>
          <div className="space-y-2 border-t border-stone-200 p-4 text-sm">
            {member && member.points_balance > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-stone-600">Use points</span>
                <Input className="w-24" inputMode="numeric" placeholder="0" value={redeem} onChange={(e) => setRedeem(e.target.value)} />
                <span className="text-xs text-stone-500">of {member.points_balance}</span>
              </div>
            )}
            {redeemValue > 0 && <p className="flex justify-between text-stone-600"><span>Points discount</span><span className="font-mono">-{fmt(redeemValue)}</span></p>}
            <p className="flex justify-between text-lg font-semibold"><span>To pay</span><span className="font-mono">{context.workspace.currency} {fmt(toPay)}</span></p>
            <div className="grid grid-cols-3 gap-2">
              <Button disabled={!cart.length} onClick={() => { sell.reset(); setPaying("cash"); }}>Cash</Button>
              <Button disabled={!cart.length} onClick={() => { sell.reset(); setPaying("mpesa"); }}>M-Pesa</Button>
              <Button disabled={!cart.length} variant="secondary" onClick={() => { sell.reset(); setPaying("card"); }}>Card</Button>
            </div>
            {cart.length > 0 && <button className="w-full text-center text-xs text-stone-500 hover:text-red-600" onClick={reset}>Clear sale</button>}
          </div>
        </aside>
      </div>
      {paying && <PayModal method={paying} amount={toPay} phone={member?.customer_phone ?? ""} pending={sell.isPending} error={sell.error}
        onClose={() => setPaying(null)} onPay={(p) => sell.mutate({ method: paying, ...p })} />}
      {done && (
        <Modal open title={`Sale ${done.receipt.number}`} onClose={() => setDone(null)}>
          <div className="space-y-4 text-center">
            <p className="text-3xl font-semibold">{context.workspace.currency} {fmt(done.receipt.total)}</p>
            {done.change > 0 && <p className="text-lg">Change: <span className="font-mono font-semibold">{fmt(done.change)}</span></p>}
            <div className="flex justify-center gap-2">
              <Link href={`/w/${slug}/pos/receipt/${done.receipt.id}`}><Button variant="secondary">Print slip</Button></Link>
              <Button onClick={() => setDone(null)}>Next sale</Button>
            </div>
          </div>
        </Modal>
      )}
      {closing && <CloseShift shift={shift} onClose={() => setClosing(false)} canManage={can("pos.manage")} />}
    </div>
  );
}

function Customer({ member, setMember }: { member: LoyaltyMember | null; setMember: (m: LoyaltyMember | null) => void }) {
  const { slug, can } = useWorkspace();
  const [lookup, setLookup] = useState("");
  const find = useMutation({
    mutationFn: async () => {
      const res = unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/members/", { params: { path: { workspace: slug }, query: { lookup } as never } }));
      if (!res.results.length) throw new Error("No member with that phone or card.");
      return res.results[0];
    },
    onSuccess: (m) => { setMember(m); setLookup(""); },
    onError: (e) => toast.error(e.message),
  });
  if (!can("loyalty.view")) return null;
  if (member) {
    return (
      <div className="flex items-center gap-2 border-b border-stone-200 bg-brand-50 px-4 py-2 text-sm">
        <div className="min-w-0 flex-1">
          <p className="truncate font-medium">{member.customer_name}</p>
          <p className="text-xs text-stone-600">{member.card_number} · {member.points_balance} points{member.tier_name ? ` · ${member.tier_name}` : ""}</p>
        </div>
        <button aria-label="Remove customer" onClick={() => setMember(null)}><X className="h-4 w-4" /></button>
      </div>
    );
  }
  return (
    <form className="flex gap-2 border-b border-stone-200 px-4 py-2" onSubmit={(e) => { e.preventDefault(); if (lookup.trim()) find.mutate(); }}>
      <Input placeholder="Loyalty phone or card" value={lookup} onChange={(e) => setLookup(e.target.value)} />
      <Button type="submit" variant="secondary" loading={find.isPending}>Find</Button>
    </form>
  );
}

function PayModal({ method, amount, phone, pending, error, onClose, onPay }: {
  method: "cash" | "mpesa" | "card"; amount: number; phone: string; pending: boolean; error: unknown;
  onClose: () => void; onPay: (p: { reference?: string; mpesaId?: string; tendered?: number }) => void;
}) {
  const { slug } = useWorkspace();
  const [tendered, setTendered] = useState(String(Math.ceil(amount)));
  const [reference, setReference] = useState("");
  const [mpesaPhone, setMpesaPhone] = useState(phone);
  const [txId, setTxId] = useState<string | null>(null);
  const prompt = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/mpesa/transactions/prompt/", { ...wsPath(slug), body: { phone: mpesaPhone, amount: String(Math.ceil(amount)), invoice_id: null, reference: "" } })),
    onSuccess: (tx) => setTxId(tx.id),
  });
  const status = usePromptStatus(slug, txId);
  const [submitted, setSubmitted] = useState(false);
  if (status.data?.status === "completed" && !submitted) {
    setSubmitted(true);
    onPay({ mpesaId: status.data.id });
  }
  const change = (Number(tendered) || 0) - amount;
  return (
    <Modal open title={`${method === "mpesa" ? "M-Pesa" : method === "card" ? "Card" : "Cash"}: ${fmt(amount)}`} onClose={onClose}>
      {method === "cash" && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onPay({ tendered: Number(tendered) || amount }); }}>
          <Field label="Cash received"><Input autoFocus inputMode="decimal" value={tendered} onChange={(e) => setTendered(e.target.value)} /></Field>
          <p className="text-lg">Change: <span className="font-mono font-semibold">{fmt(Math.max(change, 0))}</span></p>
          <FormError error={error} />
          <Button type="submit" loading={pending} disabled={change < 0}>Complete sale</Button>
        </form>
      )}
      {method === "card" && (
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); onPay({ reference }); }}>
          <Field label="Card slip or approval number (optional)"><Input autoFocus value={reference} onChange={(e) => setReference(e.target.value)} /></Field>
          <FormError error={error} />
          <Button type="submit" loading={pending}>Complete sale</Button>
        </form>
      )}
      {method === "mpesa" && (
        <div className="space-y-5">
          {!txId ? (
            <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); prompt.mutate(); }}>
              <Field label="Send a prompt to"><Input inputMode="tel" placeholder="0712 345 678" value={mpesaPhone} onChange={(e) => setMpesaPhone(e.target.value)} /></Field>
              <FormError error={prompt.error} />
              <Button type="submit" loading={prompt.isPending} disabled={!mpesaPhone}><Smartphone className="h-4 w-4" /> Send M-Pesa prompt</Button>
            </form>
          ) : (
            <div className="text-center text-sm">
              {status.data?.status === "failed" || status.data?.status === "cancelled" ? (
                <><p className="text-red-600">The customer didn&apos;t complete it.</p><Button variant="secondary" className="mt-2" onClick={() => { setTxId(null); prompt.reset(); }}>Try again</Button></>
              ) : status.data?.status === "completed" ? <p>Paid {status.data.mpesa_receipt}. Saving…</p> : (
                <><Smartphone className="mx-auto h-8 w-8 animate-pulse text-brand-700" /><p>Waiting for the customer&apos;s PIN…</p></>
              )}
            </div>
          )}
          <form className="space-y-3 border-t border-stone-200 pt-4" onSubmit={(e) => { e.preventDefault(); onPay({ reference }); }}>
            <Field label="Or type the M-Pesa code from their message"><Input value={reference} onChange={(e) => setReference(e.target.value.toUpperCase())} placeholder="SJK3L2M9XX" /></Field>
            <Button type="submit" variant="secondary" loading={pending} disabled={reference.length < 8}>Complete with code</Button>
          </form>
          <FormError error={error} />
        </div>
      )}
    </Modal>
  );
}

function CloseShift({ shift, onClose, canManage }: { shift: PosShift; onClose: () => void; canManage: boolean }) {
  const { slug } = useWorkspace();
  const queryClient = useQueryClient();
  const [counted, setCounted] = useState("");
  const [notes, setNotes] = useState("");
  const totals = shift.totals as unknown as ShiftTotals;
  const close = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/pos/shifts/{id}/close/", { params: { path: { workspace: slug, id: shift.id } }, body: { counted_cash: counted, notes } })),
    onSuccess: (s) => {
      const diff = Number(s.cash_difference);
      toast.success(diff === 0 ? "Shift closed. Cash balances." : `Shift closed. Cash ${diff > 0 ? "over" : "short"} by ${fmt(Math.abs(diff))}.`);
      queryClient.invalidateQueries({ queryKey: ["pos-shift-current", slug] });
      onClose();
    },
  });
  return (
    <Modal open title={`Close shift ${shift.number}`} onClose={onClose}>
      <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); close.mutate(); }}>
        <p className="text-sm text-stone-600">Count the cash in the drawer, including the float. {canManage ? `Expected: ${fmt(totals.expected_cash)}.` : ""}</p>
        <Field label="Cash counted" error={fieldError(close.error, "counted_cash")}><Input required autoFocus inputMode="decimal" value={counted} onChange={(e) => setCounted(e.target.value)} /></Field>
        <Field label="Notes"><Input value={notes} onChange={(e) => setNotes(e.target.value)} /></Field>
        <FormError error={close.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button type="submit" loading={close.isPending}>Close shift</Button></div>
      </form>
    </Modal>
  );
}
