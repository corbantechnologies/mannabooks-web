"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { PrintDocument } from "@/components/print-document";
import { ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PrintQuotationPage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const quotation = useQuery({ queryKey: ["quotation", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/quotations/{id}/", path)) });
  const q = quotation.data;
  const customer = useQuery({
    queryKey: ["customer", slug, q?.customer_id],
    enabled: Boolean(q),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/customers/{id}/", { params: { path: { workspace: slug, id: q!.customer_id } } })),
  });
  if (quotation.isLoading || customer.isLoading) return <Spinner />;
  if (quotation.error || customer.error) return <ErrorState error={quotation.error || customer.error} />;
  const c = customer.data!;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 print:static">
      <PrintDocument
        title="Quotation"
        number={q!.number || "Draft"}
        workspace={context.workspace}
        party={{ name: c.name, pin: c.kra_pin, lines: [c.address ?? "", c.city ?? "", c.phone ?? ""] }}
        details={[["Date", fmtDate(q!.issue_date)], ["Valid until", fmtDate(q!.valid_until)], ["Your ref", q!.reference ?? ""]]}
        lines={q!.lines ?? []}
        subtotal={q!.subtotal}
        tax={q!.tax_total}
        total={q!.total}
        currency={q!.currency ?? ""}
        footer={q!.notes}
        howToPay
      />
    </div>
  );
}
