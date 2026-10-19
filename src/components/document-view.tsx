import type { SalesLine } from "@/lib/api/types";
import { ETIMS_STATUS, etimsVisible } from "@/lib/api/sales";
import { fmt } from "@/lib/format";

import { Badge, Card, Table, Td } from "./ui";

/** Read-only lines and totals of a posted sales document. */
export function DocumentLines({ lines, subtotal, tax, total, currency }: { lines: SalesLine[]; subtotal: string; tax: string; total: string; currency: string }) {
  return (
    <Card>
      <Table head={["Description", "Qty", "Price", "Disc %", "VAT", "Amount"]}>
        {lines.map((l) => (
          <tr key={l.id}>
            <Td>{l.description}<div className="text-xs text-stone-400">{l.account_name}</div></Td>
            <Td className="text-right font-mono">{Number(l.quantity)}</Td>
            <Td className="text-right font-mono">{fmt(l.unit_price)}</Td>
            <Td className="text-right font-mono">{Number(l.discount_percent) || ""}</Td>
            <Td className="text-stone-500">{l.tax_rate_name ?? "No VAT"}</Td>
            <Td className="text-right font-mono">{fmt(l.total_amount)}</Td>
          </tr>
        ))}
        <tr><Td colSpan={5} className="text-right text-stone-500">Subtotal</Td><Td className="text-right font-mono">{fmt(subtotal)}</Td></tr>
        <tr><Td colSpan={5} className="text-right text-stone-500">VAT</Td><Td className="text-right font-mono">{fmt(tax)}</Td></tr>
        <tr className="bg-stone-50 font-semibold"><Td colSpan={5} className="text-right">Total {currency}</Td><Td className="text-right font-mono">{fmt(total)}</Td></tr>
      </Table>
    </Card>
  );
}

export function Meta({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-stone-500">{label}</p>
      <div className="text-sm font-medium text-stone-900">{children}</div>
    </div>
  );
}

/** The document's KRA eTIMS status. Hidden when it was never sent to KRA (signing switched off). */
export function EtimsMeta({ status, cu }: { status?: string | null; cu?: string | null }) {
  if (!etimsVisible(status)) return null;
  const s = ETIMS_STATUS[status ?? ""];
  return (
    <Meta label="KRA eTIMS">
      <Badge tone={s.tone}>{s.label}</Badge>
      {cu && <div className="font-mono text-xs">{cu}</div>}
    </Meta>
  );
}
