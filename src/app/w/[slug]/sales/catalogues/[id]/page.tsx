"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { FileDown, Share2 } from "lucide-react";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { ActionMenu } from "@/components/action-menu";
import { CatalogueForm } from "@/components/catalogue-form";
import { CatalogueShare } from "@/components/catalogue-share";
import { Meta } from "@/components/document-view";
import { Badge, Button, Card, EmptyState, ErrorState, PageHeader, Spinner, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { QUOTE_STATUS } from "@/lib/api/sales";
import { fmt, fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function CataloguePage() {
  const { slug, can, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [sharing, setSharing] = useState(useSearchParams().get("share") === "1");
  const [editing, setEditing] = useState(false);
  const path = { params: { path: { workspace: slug, id } } };
  const catalogue = useQuery({ queryKey: ["catalogue", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/catalogues/{id}/", path)) });
  const items = useQuery({ queryKey: ["catalogue", slug, id, "items"], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/catalogues/{id}/items/", path)) });
  const quotes = useQuery({
    queryKey: ["quotations", slug, "catalogue", id],
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/quotations/", { params: { path: { workspace: slug }, query: { catalogue: id, page_size: 50 } } })),
  });
  const remove = useMutation({
    mutationFn: async () => unwrap(await api.DELETE("/api/v1/w/{workspace}/catalogues/{id}/", path)),
    onSuccess: () => { toast.success("Catalogue deleted"); router.replace(`/w/${slug}/sales/catalogues`); },
    onError: (e) => toast.error(e.message),
  });
  if (catalogue.isLoading) return <Spinner />;
  if (catalogue.error) return <ErrorState error={catalogue.error} />;
  const c = catalogue.data!;
  const manage = can("quotations.manage");
  if (editing) return <div className="w-full"><PageHeader title={`Edit ${c.name}`} guide="catalogues" /><CatalogueForm existing={c} onDone={() => setEditing(false)} /></div>;
  const currency = context.workspace.currency;
  const rows = quotes.data?.results ?? [];
  return (
    <div className="w-full">
      <Link href={`/w/${slug}/sales/catalogues`} className="text-sm text-stone-500 hover:underline">&larr; Catalogues</Link>
      <PageHeader title={c.name} description={c.intro || undefined} guide="catalogues"
        actions={<>
          {context.pdf_enabled && (
            <Button variant="secondary" onClick={() => window.open(`/api/backend/api/v1/w/${slug}/catalogues/${c.id}/pdf/`, "_blank", "noopener")}>
              <FileDown className="h-4 w-4" /> Download PDF
            </Button>
          )}
          {c.is_open && <Button onClick={() => setSharing(true)}><Share2 className="h-4 w-4" /> Share</Button>}
          {manage && <ActionMenu actions={[
            { label: "Edit", onClick: () => setEditing(true) },
            { label: "Preview as the client", href: c.url },
            { label: "Delete", danger: true, onClick: () => { if (confirm("Delete this catalogue? Its link stops working; quotations made from it stay.")) remove.mutate(); } },
          ]} />}
        </>} />
      <Card className="mb-4 grid gap-4 p-4 sm:grid-cols-4">
        <Meta label="Status">{c.is_open ? <Badge tone="green">Open</Badge> : <Badge>Closed</Badge>}{c.expires_on && <span className="ml-2 text-xs text-stone-500">until {fmtDate(c.expires_on)}</span>}</Meta>
        <Meta label="For">{c.customer_name ?? "Anyone with the link"}</Meta>
        <Meta label="Quotes">{c.quote_mode === "auto" && c.show_prices ? "Sent at once" : "Reviewed first"}</Meta>
        <Meta label="Opened">{c.view_count} time{c.view_count === 1 ? "" : "s"}{c.last_viewed_at ? `, last ${fmtDate(c.last_viewed_at)}` : ""}</Meta>
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">Quotations from it</h2>
          {quotes.isLoading ? <div className="px-4"><Spinner /></div> : rows.length === 0 ? (
            <EmptyState title="No requests yet">When a client sends their picks, the quotation appears here.</EmptyState>
          ) : (
            <Table head={["Quotation", "Customer", "Total", "Status"]}>
              {rows.map((q) => (
                <tr key={q.id} className="hover:bg-stone-50">
                  <Td><Link href={`/w/${slug}/sales/quotations/${q.id}`} className="hover:underline">{q.number}</Link><div className="text-xs text-stone-500">{fmtDate(q.issue_date)}</div></Td>
                  <Td>{q.customer_name}</Td>
                  <Td className="text-right font-mono">{fmt(q.total)}</Td>
                  <Td><Badge tone={QUOTE_STATUS[q.status].tone}>{q.status === "draft" ? "To review" : QUOTE_STATUS[q.status].label}</Badge></Td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
        <Card>
          <h2 className="border-b border-stone-100 px-4 py-3 font-semibold">What the client sees ({items.data?.length ?? 0})</h2>
          {items.isLoading ? <div className="px-4"><Spinner /></div> : (
            <ul className="max-h-[32rem] divide-y divide-stone-100 overflow-y-auto">
              {(items.data ?? []).map((i) => (
                <li key={i.id} className="flex items-center gap-3 px-4 py-2 text-sm">
                  {i.image_url ? <img src={i.image_url} alt="" className="h-9 w-9 rounded object-cover" /> : <span className="flex h-9 w-9 items-center justify-center rounded bg-stone-100 text-stone-400">{i.name.slice(0, 1)}</span>}
                  <span className="min-w-0 flex-1"><span className="block truncate">{i.name}</span><span className="block text-xs text-stone-500">{i.category}</span></span>
                  <span className="font-mono">{i.price === null ? "On request" : `${currency} ${fmt(i.price)}`}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
      {sharing && <CatalogueShare catalogue={c} open onClose={() => setSharing(false)} />}
    </div>
  );
}
