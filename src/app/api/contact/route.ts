/**
 * The public contact form: emails the message to the MannaBooks team through Resend, with the visitor as reply-to.
 * Needs RESEND_API_KEY and CONTACT_TO_EMAIL (comma-separated); CONTACT_FROM_EMAIL must be on a domain verified in Resend.
 */
import { CONTACT_TOPICS, type ContactTopic, isContactTopic } from "@/lib/contact";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const WINDOW_MS = 10 * 60 * 1000;
const PER_WINDOW = 5;
const recent = new Map<string, number[]>();  // per instance only; enough to slow down a script

function tooMany(ip: string) {
  const now = Date.now();
  const times = (recent.get(ip) ?? []).filter((t) => now - t < WINDOW_MS);
  times.push(now);
  recent.set(ip, times);
  return times.length > PER_WINDOW;
}

function escape(text: string) {
  return text.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") return Response.json({ message: "Send the form as JSON." }, { status: 400 });
  if (clean(body.website, 200)) return Response.json({ ok: true });  // the hidden field only robots fill in

  const name = clean(body.name, 120);
  const email = clean(body.email, 200);
  const phone = clean(body.phone, 40);
  const business = clean(body.business, 160);
  const message = clean(body.message, 5000);
  const topic: ContactTopic = isContactTopic(body.topic) ? body.topic : "other";
  const errors: Record<string, string> = {};
  if (!name) errors.name = "Tell us your name.";
  if (!EMAIL.test(email)) errors.email = "Enter an email address we can reply to.";
  if (message.length < 10) errors.message = "Tell us a little more (at least 10 characters).";
  if (Object.keys(errors).length) return Response.json({ message: "Check the form.", errors }, { status: 400 });

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (tooMany(ip)) return Response.json({ message: "Too many messages from here. Please try again in a few minutes." }, { status: 429 });

  const key = process.env.RESEND_API_KEY;
  const to = (process.env.CONTACT_TO_EMAIL ?? "").split(",").map((e) => e.trim()).filter(Boolean);
  if (!key || !to.length) {
    return Response.json({ message: "The contact form isn't switched on yet. Please try again later." }, { status: 503 });
  }

  const label = CONTACT_TOPICS[topic];
  const rows: [string, string][] = [["Name", name], ["Email", email], ["Phone", phone], ["Business", business], ["About", label]];
  const filled = rows.filter(([, v]) => v);
  const text = `${filled.map(([k, v]) => `${k}: ${v}`).join("\n")}\n\n${message}`;
  const html = `<table style="font:14px sans-serif;border-collapse:collapse">${filled
    .map(([k, v]) => `<tr><td style="padding:2px 12px 2px 0;color:#78716c">${k}</td><td style="padding:2px 0">${escape(v)}</td></tr>`).join("")}</table>`
    + `<p style="font:14px sans-serif;white-space:pre-wrap;margin-top:16px">${escape(message)}</p>`;

  const sent = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      from: process.env.CONTACT_FROM_EMAIL || "MannaBooks <hello@mannabooks.co.ke>",
      to,
      reply_to: email,
      subject: `${label}: ${name}${business ? ` (${business})` : ""}`,
      text,
      html,
    }),
    cache: "no-store",
  }).catch(() => null);
  if (!sent?.ok) {
    console.error("contact form: Resend refused the message", sent?.status, await sent?.text().catch(() => ""));
    return Response.json({ message: "We couldn't send your message just now. Please try again in a moment." }, { status: 502 });
  }
  return Response.json({ ok: true });
}
