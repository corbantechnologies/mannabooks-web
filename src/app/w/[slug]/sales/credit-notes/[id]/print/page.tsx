"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { PrintDocument } from "@/components/print-document";
import { ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PrintCreditNotePage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const note = useQuery({ queryKey: ["credit-note", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/credit-notes/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (note.isLoading) return <Spinner />;
  if (note.error) return <ErrorState error={note.error} />;
  const c = note.data!;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 print:static">
      <PrintDocument
        title="Credit note"
        number={c.number}
        workspace={context.workspace}
        party={{ name: c.customer_name }}
        details={[["Date", fmtDate(c.issue_date)], ["Against invoice", c.invoice_number ?? ""], ["Reason", c.reason]]}
        lines={c.lines ?? []}
        subtotal={c.subtotal}
        tax={c.tax_total}
        total={c.total}
        currency={c.currency ?? ""}
        etims={{ status: c.etims_status ?? "", cu: c.etims_cu_invoice_number, signature: c.etims_signature }}
      />
    </div>
  );
}
