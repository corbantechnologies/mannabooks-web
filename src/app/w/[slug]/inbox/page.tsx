"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { Badge, Card, EmptyState, ErrorState, PageHeader, Select, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { INBOX_KIND, INBOX_STATUS } from "@/lib/api/inbox";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const SOURCE_PATH: Record<string, string> = { invoice: "sales/invoices", quotation: "sales/quotations", purchase_order: "purchasing/orders" };

export default function InboxPage() {
  const { slug, can } = useWorkspace();
  const [box, setBox] = useState(can("inbox.view") ? "received" : "sent");
  const [status, setStatus] = useState("");
  const received = useQuery({
    queryKey: ["inbox", slug, "received", status], enabled: box === "received",
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/inbox/", { params: { path: { workspace: slug }, query: { status: (status || undefined) as never, page_size: 100 } } })),
  });
  const sent = useQuery({
    queryKey: ["inbox", slug, "sent", status], enabled: box === "sent",
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/inbox/sent/", { params: { path: { workspace: slug }, query: { status: (status || undefined) as never, page_size: 100 } } })),
  });
  const q = box === "received" ? received : sent;
  const rows = q.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Business inbox" guide="business-inbox"
        description="Invoices, quotations and LPOs that other businesses on MannaBooks send you, ready to turn into your own bill, order or invoice in one click." />
      <div className="mb-4 flex flex-wrap gap-2">
        <div className="inline-flex rounded-md border border-stone-200 bg-white p-0.5 text-sm">
          {can("inbox.view") && <button type="button" onClick={() => setBox("received")} className={`rounded px-3 py-1 ${box === "received" ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600"}`}>Received</button>}
          {can("inbox.send") && <button type="button" onClick={() => setBox("sent")} className={`rounded px-3 py-1 ${box === "sent" ? "bg-brand-50 font-medium text-brand-700" : "text-stone-600"}`}>Sent</button>}
        </div>
        <Select className="max-w-40" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All</option>{Object.entries(INBOX_STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}
        </Select>
      </div>
      <Card>
        {q.isLoading ? <div className="px-4"><Spinner /></div> : q.error ? <div className="p-4"><ErrorState error={q.error} /></div> : rows.length === 0 ? (
          <EmptyState title={box === "received" ? "Nothing received yet" : "Nothing sent yet"}>
            {box === "received"
              ? "When a supplier or customer on MannaBooks sends you a document, it arrives here."
              : "Open an issued invoice, a quotation or an approved LPO and choose Send to their MannaBooks. It works when the customer's or supplier's KRA PIN matches a business on MannaBooks."}
          </EmptyState>
        ) : (
          <Table head={[box === "received" ? "From" : "To", "Document", "Date", "Total", "Status"]}>
            {rows.map((m) => (
              <tr key={m.id} className={`hover:bg-stone-50 ${box === "received" && !m.read_at ? "font-semibold" : ""}`}>
                <Td>{box === "received" ? m.sender_name : m.recipient_name}</Td>
                <Td>
                  {box === "received"
                    ? <Link href={`/w/${slug}/inbox/${m.id}`} className="hover:underline">{INBOX_KIND[m.kind]} {m.number}</Link>
                    : <Link href={`/w/${slug}/${SOURCE_PATH[m.kind]}/${m.source_id}`} className="hover:underline">{INBOX_KIND[m.kind]} {m.number}</Link>}
                </Td>
                <Td className="text-stone-600">{fmtDate(m.document_date)}</Td>
                <Td className="text-right font-mono">{m.currency} {fmt(m.total)}</Td>
                <Td><Badge tone={INBOX_STATUS[m.status][1]}>{INBOX_STATUS[m.status][0]}</Badge>{m.decline_reason && <span className="ml-1 text-xs font-normal text-stone-500">{m.decline_reason}</span>}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
    </div>
  );
}
