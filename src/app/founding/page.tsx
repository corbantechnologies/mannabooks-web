"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { CheckCircle2, MessageCircle, PhoneCall, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { SiteFooter } from "@/components/site-footer";
import { SiteHeader } from "@/components/site-header";
import { Button, Field, FormError, Input, Select, Textarea } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";

const SIZES = [{ v: "1", l: "Just me" }, { v: "2-5", l: "2 to 5" }, { v: "6-20", l: "6 to 20" }, { v: "21-50", l: "21 to 50" }, { v: "50+", l: "More than 50" }];

/** The founding-customer page posters point to: the offer, places left per industry, and the application form. */
export default function FoundingPage() {
  const info = useQuery({ queryKey: ["founding"], queryFn: async () => unwrap(await api.GET("/api/v1/founding/")) });
  const [sent, setSent] = useState(false);
  const [f, setF] = useState({ business_name: "", contact_name: "", phone: "", email: "", industry: "", staff: "", uses_now: "", wants: "", website: "" });
  const apply = useMutation({
    mutationFn: async () => {
      const source = typeof window !== "undefined" ? (new URLSearchParams(window.location.search).get("from") ?? "").slice(0, 60) : "";
      return unwrap(await api.POST("/api/v1/founding/apply/", { body: { ...f, source } as never }));
    },
    onSuccess: () => setSent(true),
  });
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF((p) => ({ ...p, [k]: e.target.value }));
  const places = info.data?.places ?? [];
  const open = info.data?.is_open ?? true;
  const offer = info.data?.offer ?? "40% off your first year";
  const chosen = places.find((p) => p.industry === f.industry);
  return (
    <div className="min-h-screen bg-white text-stone-800">
      <SiteHeader />
      <main>
        <section className="bg-gradient-to-b from-brand-50 to-white">
          <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:py-20 lg:grid-cols-5">
            <div className="lg:col-span-2">
              <p className="inline-flex items-center gap-1.5 text-sm font-semibold uppercase tracking-wider text-brand-700"><Sparkles className="h-4 w-4" /> Founding customers</p>
              <h1 className="mt-3 text-4xl font-bold tracking-tight text-stone-900 sm:text-5xl">Help shape MannaBooks. Pay less for it.</h1>
              <p className="mt-5 text-lg text-stone-600">
                We&apos;re choosing a small number of Kenyan businesses in each industry to be our founding customers: <strong className="text-stone-900">{offer}</strong>, and a direct line to the people who build it.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-stone-700">
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />Every feature: sales and M-Pesa, stock, payroll, tasks, reports and KRA-ready VAT.</li>
                <li className="flex gap-2"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />We help you move your books over and set things up for your business.</li>
                <li className="flex gap-2"><PhoneCall className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />In return: honest feedback and a short call with us each month.</li>
                <li className="flex gap-2"><MessageCircle className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />What you ask for shapes what we build next.</li>
              </ul>
              {places.length > 0 && (
                <div className="mt-8 rounded-xl border border-stone-200 bg-white p-4">
                  <p className="text-sm font-semibold text-stone-900">Places left</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {places.filter((p) => p.industry !== "other").map((p) => (
                      <li key={p.industry} className="flex items-center justify-between gap-3">
                        <span className="text-stone-700">{p.label}</span>
                        <span className={p.left ? "font-medium text-stone-900" : "text-stone-400"}>{p.left ? `${p.left} of ${p.total}` : "Full"}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
            <div className="lg:col-span-3">
              <div className="rounded-xl border border-stone-200 bg-white p-6 shadow-sm">
                {sent ? (
                  <div className="py-10 text-center">
                    <CheckCircle2 className="mx-auto h-10 w-10 text-brand-600" />
                    <h2 className="mt-3 text-xl font-semibold text-stone-900">Thank you, {f.contact_name.split(" ")[0]}.</h2>
                    <p className="mx-auto mt-2 max-w-md text-stone-600">We&apos;ve got your application for {f.business_name}. Someone from our team will call you within two working days. We&apos;ve also sent a note to {f.email}.</p>
                  </div>
                ) : !open ? (
                  <div className="py-10 text-center">
                    <h2 className="text-xl font-semibold text-stone-900">Founding places are closed for now</h2>
                    <p className="mx-auto mt-2 max-w-md text-stone-600">You can still try every feature free for 30 days.</p>
                    <Link href="/signup" className="mt-5 inline-block rounded-md bg-brand-700 px-4 py-2.5 text-sm font-medium text-white hover:bg-brand-600">Start your free trial</Link>
                  </div>
                ) : (
                  <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); apply.mutate(); }}>
                    <h2 className="text-lg font-semibold text-stone-900">Apply for a founding place</h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <Field label="Business name" error={fieldError(apply.error, "business_name")}><Input required value={f.business_name} onChange={set("business_name")} /></Field>
                      <Field label="Your name" error={fieldError(apply.error, "contact_name")}><Input required autoComplete="name" value={f.contact_name} onChange={set("contact_name")} /></Field>
                      <Field label="Phone or WhatsApp" error={fieldError(apply.error, "phone")}><Input required type="tel" autoComplete="tel" value={f.phone} onChange={set("phone")} placeholder="0712 345 678" /></Field>
                      <Field label="Email" error={fieldError(apply.error, "email")}><Input required type="email" autoComplete="email" value={f.email} onChange={set("email")} /></Field>
                      <Field label="Your industry" error={fieldError(apply.error, "industry")} hint={chosen && chosen.industry !== "other" ? (chosen.left ? `${chosen.left} places left` : "Full for now: apply anyway and we'll tell you if one opens") : undefined}>
                        <Select required value={f.industry} onChange={set("industry")}>
                          <option value="">Choose</option>
                          {places.map((p) => <option key={p.industry} value={p.industry}>{p.label}</option>)}
                        </Select>
                      </Field>
                      <Field label="People working there">
                        <Select value={f.staff} onChange={set("staff")}><option value="">Choose</option>{SIZES.map((s) => <option key={s.v} value={s.v}>{s.l}</option>)}</Select>
                      </Field>
                    </div>
                    <Field label="What do you keep your books in today?"><Input value={f.uses_now} onChange={set("uses_now")} placeholder="Excel, QuickBooks, a notebook, nothing yet..." /></Field>
                    <Field label="What would you most like help with?"><Textarea rows={3} value={f.wants} onChange={set("wants")} placeholder="Tracking stock, M-Pesa payments, payroll, KRA returns, knowing what my staff are working on..." /></Field>
                    <input tabIndex={-1} autoComplete="off" aria-hidden className="hidden" value={f.website} onChange={set("website")} name="website" />
                    <FormError error={apply.error} />
                    <Button type="submit" loading={apply.isPending} className="w-full sm:w-auto">Apply</Button>
                    <p className="text-xs text-stone-500">We&apos;ll only use your details to talk to you about MannaBooks. See our <Link className="underline" href="/privacy">privacy policy</Link>.</p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
}
