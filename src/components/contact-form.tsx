"use client";

import { CheckCircle2, Send } from "lucide-react";
import { useState } from "react";

import { CONTACT_TOPICS, type ContactTopic } from "@/lib/contact";

import { Button, Field, Input, Select, Textarea } from "./ui";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

/** The public contact form; posts to /api/contact, which emails the team. */
export function ContactForm({ topic: initialTopic }: { topic: ContactTopic }) {
  const [form, setForm] = useState({ name: "", email: "", phone: "", business: "", topic: initialTopic, message: "", website: "" });
  const [sending, setSending] = useState(false);
  const [errors, setErrors] = useState<Errors>({});
  const [problem, setProblem] = useState("");
  const [sentTo, setSentTo] = useState("");
  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSending(true);
    setErrors({});
    setProblem("");
    try {
      const res = await fetch("/api/contact", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setSentTo(form.email);
      else { setErrors(data.errors ?? {}); setProblem(data.message ?? "Something went wrong. Please try again."); }
    } catch {
      setProblem("We couldn't reach the server. Check your connection and try again.");
    } finally {
      setSending(false);
    }
  }

  if (sentTo) {
    return (
      <div className="flex flex-col items-center rounded-xl border border-brand-100 bg-brand-50 px-6 py-12 text-center">
        <CheckCircle2 className="h-10 w-10 text-brand-700" aria-hidden />
        <h2 className="mt-4 text-xl font-semibold text-stone-900">Message sent</h2>
        <p className="mt-2 max-w-sm text-stone-600">Thank you. We&apos;ll reply to <strong className="text-stone-900">{sentTo}</strong>.</p>
        <button type="button" onClick={() => { setSentTo(""); setForm((f) => ({ ...f, message: "" })); }} className="mt-6 text-sm font-medium text-brand-700 hover:underline">
          Send another message
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={submit} noValidate className="space-y-5 rounded-xl border border-stone-200 bg-white p-6 shadow-sm sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={errors.name}><Input required autoComplete="name" value={form.name} onChange={set("name")} /></Field>
        <Field label="Email" error={errors.email}><Input required type="email" autoComplete="email" value={form.email} onChange={set("email")} /></Field>
        <Field label="Phone (optional)"><Input type="tel" autoComplete="tel" inputMode="tel" value={form.phone} onChange={set("phone")} placeholder="07XX XXX XXX" /></Field>
        <Field label="Business (optional)"><Input autoComplete="organization" value={form.business} onChange={set("business")} /></Field>
      </div>
      <Field label="What is it about?">
        <Select value={form.topic} onChange={set("topic")}>
          {Object.entries(CONTACT_TOPICS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}
        </Select>
      </Field>
      <Field label="Message" error={errors.message}>
        <Textarea required rows={6} value={form.message} onChange={set("message")} placeholder="Tell us about your business and how we can help." />
      </Field>
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>Website<input tabIndex={-1} autoComplete="off" value={form.website} onChange={set("website")} /></label>
      </div>
      {problem && <p role="alert" className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{problem}</p>}
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-stone-500">We only use these details to reply to you.</p>
        <Button type="submit" loading={sending} className="w-full px-5 py-2.5 sm:w-auto">{!sending && <Send className="h-4 w-4" aria-hidden />}Send message</Button>
      </div>
    </form>
  );
}
