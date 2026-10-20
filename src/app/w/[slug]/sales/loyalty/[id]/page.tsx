"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Meta } from "@/components/document-view";
import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, fieldError, unwrap } from "@/lib/api/client";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const KIND: Record<string, string> = { earn: "Earned", redeem: "Redeemed", expire: "Expired", adjust: "Adjusted", reverse: "Reversed" };
const DOC: Record<string, string> = { receipt: "cash-sales", invoice: "invoices" };

export default function MemberPage() {
  const { slug, can } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const [adjusting, setAdjusting] = useState(false);
  const [form, setForm] = useState({ points: "", reason: "" });
  const member = useQuery({ queryKey: ["loyalty-member", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/members/{id}/", { params: { path: { workspace: slug, id } } })) });
  const history = useQuery({
    queryKey: ["loyalty-transactions", slug, id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/loyalty/transactions/", { params: { path: { workspace: slug }, query: { member: id, page_size: 200 } } })),
  });
  const adjust = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/loyalty/members/{id}/adjust/", { params: { path: { workspace: slug, id } }, body: { points: Number(form.points), reason: form.reason } })),
    onSuccess: () => { toast.success("Points adjusted"); setAdjusting(false); },
  });
  if (member.isLoading) return <Spinner />;
  if (member.error) return <ErrorState error={member.error} />;
  const m = member.data!;
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/loyalty`} className="text-sm text-stone-500 hover:underline">&larr; Loyalty</Link>
      <PageHeader title={m.customer_name} description={`Card ${m.card_number}`} guide="loyalty"
        actions={can("loyalty.manage") && <Button variant="secondary" onClick={() => { adjust.reset(); setAdjusting(true); }}>Adjust points</Button>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-5">
        <Meta label="Points">{m.points_balance}</Meta>
        <Meta label="Worth">{fmt(m.points_value)}</Meta>
        <Meta label="Tier">{m.tier_name ? <Badge tone="amber">{m.tier_name}</Badge> : "-"}</Meta>
        <Meta label="Earned (12 months)">{m.qualifying_points}</Meta>
        <Meta label="Earned ever">{m.lifetime_points}</Meta>
      </Card>
      <Card>
        {(history.data?.results ?? []).length === 0 ? <EmptyState title="No points yet" /> : (
          <Table head={["Date", "What", "Document", "Points", "Expires"]}>
            {history.data!.results.map((t) => (
              <tr key={t.id}>
                <Td className="whitespace-nowrap">{fmtDate(t.created_at)}</Td>
                <Td>{KIND[t.kind]}{t.description ? <span className="text-stone-500"> · {t.description}</span> : null}</Td>
                <Td>{t.document_id && DOC[t.document_type ?? ""] ? <Link className="font-mono text-xs hover:underline" href={`/w/${slug}/sales/${DOC[t.document_type!]}/${t.document_id}`}>{t.document_number}</Link> : "-"}</Td>
                <Td className={`text-right font-mono ${t.points < 0 ? "text-red-600" : "text-green-700"}`}>{t.points > 0 ? `+${t.points}` : t.points}</Td>
                <Td>{t.kind === "earn" && t.expires_on ? `${fmtDate(t.expires_on)}${t.remaining !== t.points ? ` (${t.remaining} left)` : ""}` : ""}</Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={adjusting} title="Adjust points" onClose={() => setAdjusting(false)}>
        <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); adjust.mutate(); }}>
          <Field label="Points" hint="Positive to add (e.g. a welcome bonus), negative to remove." error={fieldError(adjust.error, "points")}><Input required inputMode="numeric" value={form.points} onChange={(e) => setForm((prev) => ({ ...prev, points: e.target.value }))} /></Field>
          <Field label="Reason" error={fieldError(adjust.error, "reason")}><Input required value={form.reason} onChange={(e) => setForm((prev) => ({ ...prev, reason: e.target.value }))} /></Field>
          <FormError error={adjust.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAdjusting(false)}>Cancel</Button><Button type="submit" loading={adjust.isPending}>Save</Button></div>
        </form>
      </Modal>
    </div>
  );
}
