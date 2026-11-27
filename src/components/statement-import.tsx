"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import toast from "react-hot-toast";

import { CsvRow, guessColumns, parseCsv, toAmount, toIsoDate } from "@/lib/api/banking";
import { api, unwrap } from "@/lib/api/client";
import { downloadCsv, fmt, todayIso } from "@/lib/format";
import { useWorkspace, wsPath } from "@/lib/workspace";

import { Button, Field, FormError, Modal, Select, Table, Td } from "./ui";

export const TEMPLATE_HEAD = ["Date", "Description", "Reference", "Money in", "Money out"];

/** MannaBooks' own statement layout: fill it from any bank's statement, in Excel, and import it here. */
export function downloadTemplate(name = "statement-template.csv") {
  downloadCsv(name, [TEMPLATE_HEAD, [todayIso(), "Example: payment from a customer (delete this row)", "FT123456", "15000", ""],
    [todayIso(), "Example: bank charges (delete this row)", "CHG001", "", "350"]]);
}

type Columns = ReturnType<typeof guessColumns>;

/** Read a statement CSV in the browser, let the user confirm the columns, then send the rows. */
export function StatementImport({ bankAccountId, onClose }: { bankAccountId: string; onClose: () => void }) {
  const { slug } = useWorkspace();
  const qc = useQueryClient();
  const [data, setData] = useState<{ headers: string[]; rows: CsvRow[] } | null>(null);
  const [cols, setCols] = useState<Columns | null>(null);
  const [autoMatch, setAutoMatch] = useState(true);
  const rows = data && cols ? data.rows.map((r) => {
    const amount = cols.amount ? toAmount(r[cols.amount]) : toAmount(r[cols.money_in]) - Math.abs(toAmount(r[cols.money_out]));
    return { line_date: toIsoDate(r[cols.date] ?? ""), description: (r[cols.description] ?? "").slice(0, 255), reference: (r[cols.reference] ?? "").slice(0, 80), amount };
  }).filter((r) => r.line_date && r.amount) : [];
  const save = useMutation({
    mutationFn: async () => unwrap(await api.POST("/api/v1/w/{workspace}/statement-lines/import/", {
      ...wsPath(slug), body: { bank_account_id: bankAccountId, auto_match: autoMatch, rows: rows.map((r) => ({ ...r, line_date: r.line_date!, amount: r.amount.toFixed(2) })) },
    })),
    onSuccess: (created) => {
      const matched = created.filter((l) => l.status === "matched").length;
      toast.success(`${created.length} line(s) imported${matched ? `, ${matched} matched to the books` : ""}${created.length < rows.length ? `; ${rows.length - created.length} were already there` : ""}`);
      void qc.invalidateQueries({ queryKey: ["statement-lines", slug, bankAccountId] });
      onClose();
    },
  });
  async function read(file: File) {
    const parsed = parseCsv(await file.text());
    // a MannaBooks export is the books, not the bank: importing it would match the books to themselves
    if (parsed.headers.includes("Other side") && parsed.headers.includes("Entry")) {
      toast.error("That's an export of the books, not a bank statement. Import the statement from your bank, or fill in our template.");
      setData(null);
      setCols(null);
      return;
    }
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
        <p className="text-sm text-stone-600">Download the statement from your bank or M-Pesa as CSV (or open it in Excel and save as CSV), then choose the file. Any layout works: you confirm which column is which. Lines already imported are skipped.</p>
        <p className="text-sm text-stone-600">
          Bank gives you a PDF, or the columns are a mess? <button type="button" className="font-medium text-brand-700 hover:underline" onClick={() => downloadTemplate()}>Download our template</button>{" "}
          (Date, Description, Reference, Money in, Money out), fill it in Excel, save as CSV and import it.
        </p>
        <input type="file" accept=".csv,text/csv" onChange={(e) => e.target.files?.[0] && read(e.target.files[0])} />
        {data && cols && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              {pick("date", "Date")}
              {pick("description", "Description")}
              {pick("reference", "Reference", true)}
              {pick("amount", "Amount (+in / -out)", true)}
              {!cols.amount && pick("money_in", "Money in")}
              {!cols.amount && pick("money_out", "Money out")}
            </div>
            <p className="text-sm text-stone-600">{rows.length} line(s) ready.</p>
            <label className="flex items-start gap-2 text-sm text-stone-700">
              <input type="checkbox" className="mt-0.5" checked={autoMatch} onChange={(e) => setAutoMatch(e.target.checked)} />
              Match the obvious ones to the books: the same amount there once within 3 days, or the same reference
            </label>
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
