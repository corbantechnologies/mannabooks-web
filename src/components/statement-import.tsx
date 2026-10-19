"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { CsvRow, guessColumns, parseCsv, toAmount, toIsoDate } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { fmt } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Modal, Select, Table, Td } from "./ui";

type Columns = ReturnType<typeof guessColumns>;

/** Read a statement CSV in the browser, let the user confirm the columns, then send the rows. */
export function StatementImport({ bankAccountId, onClose }: { bankAccountId: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const [data, setData] = useState<{ headers: string[]; rows: CsvRow[] } | null>(null);
  const [cols, setCols] = useState<Columns | null>(null);
  const rows = data && cols ? data.rows.map((r) => {
    const amount = cols.amount ? toAmount(r[cols.amount]) : toAmount(r[cols.money_in]) - Math.abs(toAmount(r[cols.money_out]));
    return { line_date: toIsoDate(r[cols.date] ?? ""), description: (r[cols.description] ?? "").slice(0, 255), reference: (r[cols.reference] ?? "").slice(0, 80), amount };
  }).filter((r) => r.line_date && r.amount) : [];
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/statement-lines/import/", {
      ...wsPath(slug), body: { bank_account_id: bankAccountId, rows: rows.map((r) => ({ ...r, line_date: r.line_date!, amount: r.amount.toFixed(2) })) },
    })),
    onSuccess: (created) => { toast.success(`${created.length} line(s) imported${created.length < rows.length ? `; ${rows.length - created.length} were already there` : ""}`); onClose(); },
  });
  async function read(file: File) {
    const parsed = parseCsv(await file.text());
    setData(parsed);
    setCols(guessColumns(parsed.headers));
  }
  const pick = (key: keyof Columns, label: string, optional = false) => (
    <Field label={label}>
      <Select value={cols?.[key] ?? ""} onChange={(e) => setCols((c) => (c ? { ...c, [key]: e.target.value } : c))}>
        <option value="">{optional ? "None" : "Choose"}</option>
        {data?.headers.map((h) => <option key={h} value={h}>{h}</option>)}
      </Select>
    </Field>
  );
  return (
    <Modal open title="Import a statement" onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-stone-600">Download the statement from your bank or M-Pesa (as CSV, or open it in Excel and save as CSV), then choose the file. Lines already imported are skipped.</p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
        {data && cols && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {pick("date", "Date")}
              {pick("description", "Description")}
              {pick("reference", "Reference", true)}
              {pick("amount", "Amount (+in / -out)", true)}
              {!cols.amount && pick("money_in", "Money in")}
              {!cols.amount && pick("money_out", "Money out")}
            </div>
            <p className="text-sm text-stone-600">{rows.length} line(s) ready.</p>
            {rows.length > 0 && (
              <div className="max-h-56 overflow-y-auto">
                <Table head={["Date", "Description", "Amount"]}>
                  {rows.slice(0, 8).map((r, i) => <tr key={i}><Td>{r.line_date}</Td><Td>{r.description}</Td><Td className="text-right font-mono">{fmt(r.amount)}</Td></tr>)}
                </Table>
              </div>
            )}
          </>
        )}
        <FormError error={save.error} />
        <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>Cancel</Button><Button disabled={!rows.length} loading={save.isPending} onClick={() => save.mutate()}>Import {rows.length || ""}</Button></div>
      </div>
    </Modal>
  );
}
