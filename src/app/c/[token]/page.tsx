"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FileDown, MessageSquarePlus, Minus, Plus, Search, Send, Trash2, X } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, ErrorState, Field, FormError, Input, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";

/** A catalogue the business shared: the client picks products and quantities and gets a quotation. No sign-in. */
export default function SharedCataloguePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();
  const page = useQuery({ queryKey: ["shared-catalogue", token], retry: false,
    queryFn: async () => unwrap(await api.GET("/api/v1/shared/catalogues/{token}/", { params: { path: { token } } })) });
  const [picks, setPicks] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ name: "", company: "", phone: "", email: "", notes: "" });
  const [wishes, setWishes] = useState<{ description: string; quantity: string }[]>([]);
  const ask = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/shared/catalogues/{token}/quote/", {
      params: { path: { token } },
      body: {
        ...form, lines: Object.entries(picks).filter(([, q]) => Number(q) > 0).map(([product_id, quantity]) => ({ product_id, quantity })),
        wishes: wishes.filter((w) => w.description.trim()).map((w) => ({ description: w.description.trim(), quantity: w.quantity || "1" })),
      },
    })),
    onSuccess: (r) => router.push(`/q/${r.token}`),
  });
  if (page.isLoading) return <div className="p-8"><Spinner label="Opening the catalogue" /></div>;
  if (page.error) return <div className="mx-auto max-w-lg p-8"><ErrorState error={page.error} /></div>;
  const c = page.data!;
  const b = c.business;
  const categories = [...new Set(c.items.map((i) => i.category).filter(Boolean))].sort();
  const shown = c.items.filter((i) => (!category || i.category === category) && (!search || `${i.name} ${i.code} ${i.description}`.toLowerCase().includes(search.toLowerCase())));
  const lines = Object.entries(picks).map(([id, q]) => ({ item: c.items.find((i) => i.id === id)!, q: Number(q) })).filter((l) => l.item && l.q > 0);
  const net = lines.reduce((t, l) => t + Number(l.item.price ?? 0) * l.q, 0);
  const vat = lines.reduce((t, l) => t + (Number(l.item.price ?? 0) * l.q * Number(l.item.vat_percent)) / 100, 0);
  const described = wishes.filter((w) => w.description.trim()).length;
  const count = lines.length + described;
  const reviewed = c.reviews_first || described > 0; // described items have no price yet
  const wish = (i: number, k: "description" | "quantity", v: string) => setWishes((w) => w.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  const addWish = () => { setWishes((w) => (w.length < 10 ? [...w, { description: "", quantity: "1" }] : w)); setOpen(true); };
  const setQty = (id: string, q: number | string) => setPicks((p) => {
    const next = { ...p, [id]: String(q) };
    if (q !== "" && Number(q) <= 0) delete next[id];
    return next;
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {b.logo_url && <img src={b.logo_url} alt="" className="h-12 w-12 rounded-md object-contain" />}
          <div>
            <p className="text-sm text-stone-500">{b.name}</p>
            <h1 className="text-2xl font-semibold text-stone-900">{c.name}</h1>
            {c.customer_name && <p className="text-sm text-stone-600">Prepared for {c.customer_name}</p>}
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {c.pdf_available && (
            <a href={`/api/backend/api/v1/shared/catalogues/${token}/pdf/`} target="_blank" rel="noreferrer">
              <Button variant="secondary"><FileDown className="h-4 w-4" /> Download PDF</Button>
            </a>
          )}
          <Button onClick={() => setOpen(true)} className="lg:hidden">Your list ({count})</Button>
        </div>
      </header>
      {c.intro && <p className="mb-6 max-w-3xl whitespace-pre-line text-sm text-stone-700">{c.intro}</p>}
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input className="pl-9" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {categories.length > 1 && (
              <Select className="max-w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Everything</option>{categories.map((x) => <option key={x} value={x}>{x}</option>)}
              </Select>
            )}
          </div>
          {shown.length === 0 ? (
            <div className="py-10 text-center text-sm text-stone-500">
              <p>Nothing matches.</p>
              <button type="button" className="mt-2 font-medium text-brand-700 hover:underline" onClick={addWish}>Describe what you need instead</button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((i) => {
                const q = picks[i.id];
                return (
                  <Card key={i.id} className={`flex flex-col overflow-hidden ${q !== undefined ? "ring-2 ring-brand-500" : ""}`}>
                    {i.image_url ? <img src={i.image_url} alt={i.name} className="h-40 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-stone-50 text-3xl text-stone-300">{i.name.slice(0, 1)}</div>}
                    <div className="flex flex-1 flex-col p-3">
                      <p className="font-medium text-stone-900">{i.name}</p>
                      <p className="text-xs text-stone-500">{[i.code, i.category].filter(Boolean).join(" · ")}</p>
                      {i.description && <p className="mt-1 line-clamp-3 text-xs text-stone-600">{i.description}</p>}
                      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
                        <div>
                          {i.price === null ? <p className="text-sm text-stone-600">Price on request</p> : (
                            <p className="font-mono text-sm font-semibold">{b.currency} {fmt(i.price)}<span className="font-sans text-xs font-normal text-stone-500"> / {i.unit}</span></p>
                          )}
                          {i.price !== null && Number(i.vat_percent) > 0 && <p className="text-xs text-stone-500">plus {Number(i.vat_percent)}% VAT</p>}
                          {i.in_stock !== null && <p className={`text-xs ${i.in_stock ? "text-green-700" : "text-amber-700"}`}>{i.in_stock ? "In stock" : "Out of stock"}</p>}
                        </div>
                        {q !== undefined ? (
                          <span className="flex items-center gap-1">
                            <button type="button" aria-label="Less" className="rounded border p-1" onClick={() => setQty(i.id, Number(q) - 1)}><Minus className="h-3 w-3" /></button>
                            <input aria-label="Quantity" inputMode="decimal" className="w-14 rounded border border-stone-300 px-1 py-0.5 text-center text-sm" value={q} onChange={(e) => setQty(i.id, e.target.value)} />
                            <button type="button" aria-label="More" className="rounded border p-1" onClick={() => setQty(i.id, Number(q) + 1)}><Plus className="h-3 w-3" /></button>
                          </span>
                        ) : <Button variant="secondary" className="px-3 py-1" onClick={() => setQty(i.id, 1)}>Add</Button>}
                      </div>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </section>
        <aside className={open ? "" : "hidden lg:block"}>
          <Card className="sticky top-4 space-y-3 p-4">
            <h2 className="font-semibold">Your list</h2>
            {count === 0 && <p className="text-sm text-stone-500">Add what you need, then ask for your quotation.</p>}
            {lines.length > 0 && (
              <ul className="divide-y divide-stone-100 text-sm">
                {lines.map(({ item, q }) => (
                  <li key={item.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate">{q} × {item.name}</span>
                    {item.price !== null && <span className="font-mono">{fmt(Number(item.price) * q)}</span>}
                    <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => setQty(item.id, 0)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
            <div className="space-y-2 border-t border-stone-100 pt-3">
              <p className="text-sm font-medium">Can&apos;t find it?</p>
              {wishes.map((w, i) => (
                <div key={i} className="flex items-start gap-1.5">
                  <Textarea rows={2} className="min-w-0 flex-1 text-sm" value={w.description} maxLength={200} placeholder="Describe what you need: make, size, model"
                    onChange={(e) => wish(i, "description", e.target.value)} />
                  <input aria-label="Quantity" inputMode="decimal" className="w-14 rounded-md border border-stone-300 px-1 py-1.5 text-center text-sm" value={w.quantity}
                    onChange={(e) => wish(i, "quantity", e.target.value)} />
                  <button type="button" aria-label="Remove" className="pt-2 text-stone-400 hover:text-red-600" onClick={() => setWishes((x) => x.filter((_, j) => j !== i))}><X className="h-4 w-4" /></button>
                </div>
              ))}
              {wishes.length < 10 && (
                <button type="button" className="flex items-center gap-1.5 text-sm text-brand-700 hover:underline" onClick={addWish}>
                  <MessageSquarePlus className="h-4 w-4" /> {wishes.length ? "Describe another" : "Describe what you need"}
                </button>
              )}
              {described > 0 && <p className="text-xs text-stone-500">{c.business.name} will find and price these for you.</p>}
            </div>
            {count > 0 && (
              <form className="space-y-3 border-t border-stone-100 pt-3" onSubmit={(e) => { e.preventDefault(); ask.mutate(); }}>
                {c.show_prices && lines.length > 0 && (
                  <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                    <dt className="text-stone-500">Before VAT</dt><dd className="text-right font-mono">{fmt(net)}</dd>
                    <dt className="text-stone-500">VAT</dt><dd className="text-right font-mono">{fmt(vat)}</dd>
                    <dt className="font-semibold">About {b.currency}</dt><dd className="text-right font-mono font-semibold">{fmt(net + vat)}</dd>
                  </dl>
                )}
                <Field label="Your name"><Input required value={form.name} onChange={set("name")} /></Field>
                {!c.customer_name && <Field label="Company (optional)"><Input value={form.company} onChange={set("company")} /></Field>}
                <Field label="Phone"><Input required value={form.phone} onChange={set("phone")} placeholder="0712 345 678" /></Field>
                <Field label="Email (for your quotation)"><Input type="email" value={form.email} onChange={set("email")} /></Field>
                <Field label="Anything we should know? (optional)"><Textarea rows={2} value={form.notes} onChange={set("notes")} placeholder="Delivery date, colours, specifications" /></Field>
                <FormError error={ask.error} />
                <Button type="submit" className="w-full" loading={ask.isPending}><Send className="h-4 w-4" /> {reviewed ? "Ask for my quotation" : "Get my quotation"}</Button>
                <p className="text-center text-xs text-stone-500">{reviewed ? `${b.name} will check your list and send the quotation.` : "Your quotation opens straight away."}</p>
              </form>
            )}
          </Card>
        </aside>
      </div>
      <footer className="mt-10 text-center text-xs text-stone-400">{[b.phone, b.email, b.address].filter(Boolean).join(" · ")}<br />Powered by MannaBooks</footer>
    </main>
  );
}
