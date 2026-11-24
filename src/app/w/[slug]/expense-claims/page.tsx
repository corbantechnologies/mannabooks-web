"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Field, FormError, Input, Modal, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { CLAIM_TONE } from "@/lib/claims";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

/** Money staff spent on the business from their own pocket, claimed back with a receipt on each line. */
export default function ExpenseClaimsPage() {
  const { slug, can } = useWorkspace();
  const router = useRouter();
  const finance = can("expenseclaims.approve") || can("banking.spend");
  const boxes = [{ key: "mine", label: "My claims" }, ...(finance ? [{ key: "decide", label: "To approve" }, { key: "pay", label: "To pay back" }, { key: "all", label: "Everyone's" }] : [])];
  const [box, setBox] = useState("mine");
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const list = useQuery({
    queryKey: ["expense-claims", slug, box],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/expense-claims/", { params: { path: { workspace: slug }, query: { box: box as never, page_size: 100 } } })),
  });
  const create = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/expense-claims/", { ...wsPath(slug), body: { title } as never })),
    onSuccess: (c) => router.push(`/w/${slug}/expense-claims/${c.id}`),
  });
  const rows = list.data?.results ?? [];
  return (
    <div className="w-full">
      <PageHeader title="Expense claims" guide="expense-claims"
        description="Spent your own money on the business (fuel, fares, a client lunch)? Claim it back line by line, with a photo of each receipt. Finance approves it and pays you back."
        actions={<Button onClick={() => { create.reset(); setAdding(true); }}><Plus className="h-4 w-4" /> New claim</Button>} />
      {boxes.length > 1 && (
        <div className="mb-4 flex gap-1 overflow-x-auto border-b border-stone-200">
          {boxes.map((b) => (
            <button key={b.key} onClick={() => setBox(b.key)}
              className={clsx("shrink-0 whitespace-nowrap border-b-2 px-3 py-2 text-sm", box === b.key ? "border-brand-700 font-medium text-brand-800" : "border-transparent text-stone-500 hover:text-stone-800")}>{b.label}</button>
          ))}
        </div>
      )}
      <Card>
        {list.isLoading ? <div className="px-4"><Spinner /></div> : list.error ? <div className="p-4"><ErrorState error={list.error} /></div> : rows.length === 0 ? (
          <EmptyState title={box === "mine" ? "No claims yet" : "Nothing here"}>{box === "mine" ? "Start one with New claim." : undefined}</EmptyState>
        ) : (
          <Table head={["Claim", "For", "Who", "Claimed", "Approved", "Status"]}>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-stone-50">
                <Td><Link href={`/w/${slug}/expense-claims/${c.id}`} className="font-mono text-xs text-brand-700 hover:underline">{c.number || "Draft"}</Link><span className="block text-xs text-stone-500">{fmtDate(c.created_at)}</span></Td>
                <Td>{c.title}</Td>
                <Td>{c.employee_name}</Td>
                <Td className="text-right font-mono">{fmt(c.total)}</Td>
                <Td className="text-right font-mono">{c.status === "draft" || c.status === "submitted" ? "-" : fmt(c.approved_total)}</Td>
                <Td><Badge tone={CLAIM_TONE[c.status ?? "draft"]}>{c.status_label}</Badge></Td>
              </tr>
            ))}
          </Table>
        )}
      </Card>
      <Modal open={adding} title="New expense claim" onClose={() => setAdding(false)}>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); create.mutate(); }}>
          <Field label="What it was for" hint="Then add each thing you paid for, with its receipt."><Input required autoFocus value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Field visit to Nakuru, 20-22 Nov" /></Field>
          <FormError error={create.error} />
          <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={() => setAdding(false)}>Cancel</Button><Button type="submit" loading={create.isPending}>Start the claim</Button></div>
        </form>
      </Modal>
    </div>
  );
}
