"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";

import { PrintDocument } from "@/components/print-document";
import { ErrorState, Spinner } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { METHODS } from "@/lib/api/sales";
import { fmtDate } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

export default function PrintCashSalePage() {
  const { slug, context } = useWorkspace();
  const { id } = useParams<{ id: string }>();
  const receipt = useQuery({ queryKey: ["receipt", slug, id], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/receipts/{id}/", { params: { path: { workspace: slug, id } } })) });
  if (receipt.isLoading) return <Spinner />;
  if (receipt.error) return <ErrorState error={receipt.error} />;
  const r = receipt.data!;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-stone-100 print:static">
      <PrintDocument
        title="Cash sale receipt"
        number={r.number}
        workspace={context.workspace}
        party={{ name: r.customer_name || "Walk-in customer", pin: r.customer_pin }}
        details={[["Date", fmtDate(r.issue_date)], ["Paid by", METHODS.find((m) => m.value === r.method)?.label ?? ""], ["Reference", r.payment_reference ?? ""]]}
        lines={r.lines}
        subtotal={r.subtotal}
        tax={r.tax_total}
        total={r.total}
        currency={r.currency ?? ""}
        footer="Thank you for your business."
        etims={{ status: r.etims_status ?? "", cu: r.etims_cu_invoice_number, signature: r.etims_signature }}
      />
    </div>
  );
}
