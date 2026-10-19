"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { PrintDocument } from "@/components/print-document";
import { ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PrintInvoicePage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const path = { params: { path: { workspace: slug, id } } };
  const invoice = useQuery({ queryKey: ["invoice", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/invoices/{id}/", path)) });
  const inv = invoice.data;
  const customer = useQuery({
    queryKey: ["customer", slug, inv?.customer_id],
    enabled: Boolean(inv),
    queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/customers/{id}/", { params: { path: { workspace: slug, id: inv!.customer_id } } })),
  });
  if (invoice.isLoading || customer.isLoading) return <Spinner />;
  if (invoice.error || customer.error) return <ErrorState error={invoice.error || customer.error} />;
  const c = customer.data!;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 print:static">
      <PrintDocument
        title={context.workspace.vat_registered ? "Tax invoice" : "Invoice"}
        number={inv!.number}
        workspace={context.workspace}
        party={{ name: c.name, pin: c.kra_pin, lines: [c.address ?? "", c.city ?? "", c.phone ?? ""] }}
        details={[["Date", fmtDate(inv!.issue_date)], ["Due", fmtDate(inv!.due_date)], ["Your ref", inv!.reference ?? ""], ["Balance", `${inv!.currency} ${Number(inv!.balance_due).toLocaleString("en-KE", { minimumFractionDigits: 2 })}`]]}
        lines={inv!.lines ?? []}
        subtotal={inv!.subtotal}
        tax={inv!.tax_total}
        total={inv!.total}
        currency={inv!.currency ?? ""}
        footer={inv!.notes}
        etims={{ status: inv!.etims_status ?? "", cu: inv!.etims_cu_invoice_number, signature: inv!.etims_signature }}
      />
    </div>
  );
}
