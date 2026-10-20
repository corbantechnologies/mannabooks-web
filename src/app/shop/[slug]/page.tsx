"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Minus, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { useParams, useRouter } from "next/navigation";
import { useState } from "react";

import { Button, Card, ErrorState, Field, FormError, Input, Select, Spinner, Textarea } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";

type Product = { id: string; name: string; description: string; category: string; unit: string; price: string; image_url: string; available: boolean };

/** The business's public online shop: no sign-in. The basket lives in this page until the order is placed. */
export default function ShopPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const shop = useQuery({ queryKey: ["shop", slug], retry: false, queryFn: async () => unwrap(await api.GET("/api/v1/store/{slug}/", { params: { path: { slug } } })) });
  const [basket, setBasket] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [checkout, setCheckout] = useState(false);
  const [form, setForm] = useState({ customer_name: "", phone: "", email: "", fulfilment: "", address: "", notes: "", payment_method: "" });
  const place = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/store/{slug}/orders/", {
      params: { path: { slug } },
      body: { ...form, fulfilment: (form.fulfilment || defaults.fulfilment) as never, payment_method: (form.payment_method || defaults.payment) as never,
              lines: Object.entries(basket).map(([product_id, quantity]) => ({ product_id, quantity: String(quantity) })) },
    })),
    onSuccess: (o) => router.push(`/shop/${slug}/order/${o.token}`),
  });
  if (shop.isLoading) return <div className="p-8"><Spinner label="Opening the shop" /></div>;
  if (shop.error) return <div className="mx-auto max-w-lg p-8"><ErrorState error={shop.error} /></div>;
  const s = shop.data!;
  const products = s.products as Product[];
  const defaults = { fulfilment: s.allow_pickup ? "pickup" : "delivery", payment: s.mpesa ? "mpesa" : "on_delivery" };
  const fulfilment = form.fulfilment || defaults.fulfilment;
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))].sort();
  const shown = products.filter((p) => (!category || p.category === category) && (!search || p.name.toLowerCase().includes(search.toLowerCase())));
  const lines = Object.entries(basket).map(([id, q]) => ({ p: products.find((x) => x.id === id)!, q })).filter((l) => l.p);
  const subtotal = lines.reduce((t, l) => t + Number(l.p.price) * l.q, 0);
  const fee = fulfilment === "delivery" ? Number(s.delivery_fee) : 0;
  const add = (id: string, by: number) => setBasket((b) => {
    const next = { ...b, [id]: Math.max((b[id] ?? 0) + by, 0) };
    if (!next[id]) delete next[id];
    return next;
  });
  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setForm((p) => ({ ...p, [k]: e.target.value }));
  const count = lines.reduce((t, l) => t + l.q, 0);
  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {s.logo_url && <img src={s.logo_url} alt="" className="h-12 w-12 rounded-md object-contain" />}
          <div>
            <h1 className="text-2xl font-semibold text-stone-900">{s.name}</h1>
            {s.intro && <p className="text-sm text-stone-600">{s.intro}</p>}
            <p className="text-xs text-stone-500">{[s.phone, s.address].filter(Boolean).join(" · ")}</p>
          </div>
        </div>
        <Button onClick={() => setCheckout(true)} disabled={!count}><ShoppingBag className="h-4 w-4" /> Basket ({count}) · {s.currency} {fmt(subtotal)}</Button>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
        <section>
          <div className="mb-4 flex flex-wrap gap-2">
            <div className="relative w-full max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-stone-400" />
              <Input className="pl-9" placeholder="Search" value={search} onChange={(e) => setSearch(e.target.value)} />
            </div>
            {categories.length > 0 && (
              <Select className="max-w-48" value={category} onChange={(e) => setCategory(e.target.value)}>
                <option value="">Everything</option>{categories.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            )}
          </div>
          {shown.length === 0 ? <p className="py-10 text-center text-sm text-stone-500">Nothing here yet.</p> : (
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((p) => (
                <Card key={p.id} className="flex flex-col overflow-hidden">
                  {p.image_url ? <img src={p.image_url} alt={p.name} className="h-40 w-full object-cover" /> : <div className="flex h-24 items-center justify-center bg-stone-50 text-3xl text-stone-300">{p.name.slice(0, 1)}</div>}
                  <div className="flex flex-1 flex-col p-3">
                    <p className="font-medium text-stone-900">{p.name}</p>
                    {p.description && <p className="mt-1 line-clamp-2 text-xs text-stone-600">{p.description}</p>}
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <p className="font-mono text-sm font-semibold">{s.currency} {fmt(p.price)}<span className="font-sans text-xs font-normal text-stone-500"> / {p.unit}</span></p>
                      {!p.available ? <span className="text-xs text-stone-500">Out of stock</span> : basket[p.id] ? (
                        <span className="flex items-center gap-1">
                          <button type="button" aria-label="Less" className="rounded border p-1" onClick={() => add(p.id, -1)}><Minus className="h-3 w-3" /></button>
                          <span className="w-6 text-center text-sm">{basket[p.id]}</span>
                          <button type="button" aria-label="More" className="rounded border p-1" onClick={() => add(p.id, 1)}><Plus className="h-3 w-3" /></button>
                        </span>
                      ) : <Button variant="secondary" className="px-3 py-1" onClick={() => add(p.id, 1)}>Add</Button>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </section>
        <aside className={`${checkout ? "" : "hidden lg:block"}`}>
          <Card className="sticky top-4 space-y-3 p-4">
            <h2 className="font-semibold">Your order</h2>
            {lines.length === 0 ? <p className="text-sm text-stone-500">Add something to your basket.</p> : (
              <ul className="divide-y divide-stone-100 text-sm">
                {lines.map(({ p, q }) => (
                  <li key={p.id} className="flex items-center justify-between gap-2 py-1.5">
                    <span className="min-w-0 flex-1 truncate">{q} × {p.name}</span>
                    <span className="font-mono">{fmt(Number(p.price) * q)}</span>
                    <button type="button" aria-label="Remove" className="text-stone-400 hover:text-red-600" onClick={() => add(p.id, -q)}><Trash2 className="h-3.5 w-3.5" /></button>
                  </li>
                ))}
              </ul>
            )}
            {lines.length > 0 && (
              <form className="space-y-3 border-t border-stone-100 pt-3" onSubmit={(e) => { e.preventDefault(); place.mutate(); }}>
                <Field label="Your name"><Input required value={form.customer_name} onChange={set("customer_name")} /></Field>
                <Field label="Phone (M-Pesa)"><Input required value={form.phone} onChange={set("phone")} placeholder="0712 345 678" /></Field>
                <Field label="Email (optional)"><Input type="email" value={form.email} onChange={set("email")} /></Field>
                {s.allow_pickup && s.allow_delivery && (
                  <Field label="Collect or deliver?">
                    <Select value={fulfilment} onChange={set("fulfilment")}>
                      <option value="pickup">I&apos;ll collect it</option>
                      <option value="delivery">Deliver it{Number(s.delivery_fee) ? ` (+${fmt(s.delivery_fee)})` : ""}</option>
                    </Select>
                  </Field>
                )}
                {fulfilment === "delivery" && <Field label="Deliver to"><Textarea required rows={2} value={form.address} onChange={set("address")} placeholder="Estate, road, building, landmark" /></Field>}
                {s.mpesa && s.pay_on_delivery && (
                  <Field label="Pay">
                    <Select value={form.payment_method || defaults.payment} onChange={set("payment_method")}>
                      <option value="mpesa">M-Pesa now (a prompt comes to your phone)</option>
                      <option value="on_delivery">When I {fulfilment === "delivery" ? "receive" : "collect"} it</option>
                    </Select>
                  </Field>
                )}
                {!s.mpesa && <p className="text-xs text-stone-500">You pay when you {fulfilment === "delivery" ? "receive" : "collect"} your order.</p>}
                <Field label="Anything we should know? (optional)"><Textarea rows={2} value={form.notes} onChange={set("notes")} /></Field>
                <dl className="grid grid-cols-[1fr_auto] gap-y-1 text-sm">
                  <dt className="text-stone-500">Items</dt><dd className="text-right font-mono">{fmt(subtotal)}</dd>
                  {fee > 0 && <><dt className="text-stone-500">Delivery</dt><dd className="text-right font-mono">{fmt(fee)}</dd></>}
                  <dt className="font-semibold">Total {s.currency}</dt><dd className="text-right font-mono font-semibold">{fmt(subtotal + fee)}</dd>
                </dl>
                <FormError error={place.error} />
                <Button type="submit" className="w-full" loading={place.isPending}>Place order</Button>
                <p className="text-center text-xs text-stone-400">Prices include VAT where it applies.</p>
              </form>
            )}
          </Card>
        </aside>
      </div>
    </main>
  );
}
