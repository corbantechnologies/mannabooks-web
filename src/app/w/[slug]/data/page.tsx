"use client";

import { useMutation, useQuery } from "@tanstack/react-query";
import { Download, Upload } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import toast from "react-hot-toast";

import { Badge, Button, Card, Field, FormError, Input, PageHeader, Select, Table, Td } from "@/components/ui";
import { api, unwrap } from "@/lib/api/client";
import { fmtDate, todayIso } from "@/lib/format";
import { useWorkspace } from "@/lib/workspace";

const KINDS: [string, string, string, string, string][] = [
  // kind, label, permission, what it does, group in the picker
  ["customers", "Customers", "customers.manage", "Names, KRA PINs, contacts and payment terms. Customers already here (same name) are skipped.", "Lists"],
  ["suppliers", "Suppliers", "suppliers.manage", "Names, KRA PINs, contacts, payment terms and bank details.", "Lists"],
  ["products", "Products and services", "products.manage", "New products: prices, VAT code, category (made if new), unit, and stock on hand for stock items.", "Lists"],
  ["employees", "Employees", "employees.manage", "Staff with salary, KRA PIN, NSSF and SHIF numbers, and bank or M-Pesa details. Departments are made if new. Staff already here (same ID number, email or KRA PIN) are skipped.", "Lists"],
  ["leads", "Leads", "crm.manage", "People from events, ads or contact lists, each with a phone or email. Leads already here (same phone or email) are skipped.", "Lists"],
  ["fixed_assets", "Fixed assets", "fixedassets.manage", "Assets you already own: cost, purchase date, depreciation method, and depreciation charged so far. Brought into the books against opening balance equity.", "Lists"],
  ["product_prices", "Update prices and price lists", "products.manage", "Find each product by code or name and set its selling price and/or its price on a price list (made if new). Only changed prices count.", "Products"],
  ["product_units", "Product units (cartons, crates)", "products.manage", "Another unit a product is sold in: how many pieces it holds, and its own price if it has one. Re-importing updates them.", "Products"],
  ["recipes", "Recipes", "manufacturing.manage", "One row per ingredient: the product, how many one batch makes, the ingredient and its quantity. Products that already have that recipe are skipped.", "Products"],
  ["stock_counts", "Stock count", "inventory.manage", "Counted quantities per product (a scanner export works: repeated rows are added up). They go into the warehouse's stock take for you to check and post.", "Products"],
  ["opening_balances", "Opening balances", "openingbalances.manage", "Your trial balance by account code. Saved as a draft for you to check and post.", "Moving from another system"],
  ["accounts", "Chart of accounts", "ledgeraccounts.manage", "Your own accounts: code, name, type, subtype and parent. Codes already here are skipped.", "Moving from another system"],
  ["open_invoices", "Unpaid customer invoices", "invoices.issue", "Invoices still unpaid in your previous system, under their own numbers. They show as owed but aren't counted as new sales or VAT. Leave Accounts receivable out of your opening balances.", "Moving from another system"],
  ["open_bills", "Unpaid supplier bills", "bills.post", "Supplier invoices you still owe from your previous system. Not counted as new costs or VAT. Leave Accounts payable out of your opening balances.", "Moving from another system"],
];
const AFTER: Record<string, string> = {
  opening_balances: " Check and post them in Accounting > Opening balances.",
  stock_counts: " Check the differences and post the count in Inventory > Stock takes.",
  open_invoices: " Customers can pay them now, by the same invoice numbers.",
};
const EXPORTS: [string, string, string, boolean][] = [
  ["customers", "Customers", "customers.view", false], ["suppliers", "Suppliers", "suppliers.view", false], ["products", "Products with stock", "products.view", false],
  ["accounts", "Chart of accounts with balances", "ledgeraccounts.view", false], ["invoices", "Invoices", "invoices.view", true], ["bills", "Supplier bills", "bills.view", true],
  ["journal", "All journal lines (the general ledger)", "journals.view", true],
];
type Job = { id: string; kind: string; filename: string; status: string; total_rows: number; imported_rows: number; skipped_rows: number; errors: unknown; created_by_name?: string | null; created_at: string };

export default function DataPage() {
  const { slug, can } = useWorkspace();
  const kinds = KINDS.filter(([, , perm]) => can(perm));
  const asked = useSearchParams().get("kind"); // e.g. ?kind=products from the Products page
  const [kind, setKind] = useState(kinds.some(([k]) => k === asked) ? asked! : kinds[0]?.[0] ?? "customers");
  const [file, setFile] = useState<File | null>(null);
  const [asOf, setAsOf] = useState(todayIso());
  const [result, setResult] = useState<Job | null>(null);
  const [range, setRange] = useState({ from: `${new Date().getFullYear()}-01-01`, to: todayIso() });
  const history = useQuery({ queryKey: ["imports", slug], queryFn: async () => unwrap(await api.GET("/api/v1/w/{workspace}/imports/", { params: { path: { workspace: slug } } })) });
  const send = useMutation({
    mutationFn: async (commit: boolean) => {
      const form = new FormData();
      form.append("kind", kind);
      form.append("file", file!);
      form.append("commit", String(commit));
      if (kind === "opening_balances") form.append("as_of", asOf);
      const res = await fetch(`/api/backend/api/v1/w/${slug}/imports/`, { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message ?? "The file couldn't be read.");
      return data as Job;
    },
    onSuccess: (job) => {
      setResult(job);
      if (job.status === "imported") toast.success(`${job.imported_rows} imported${job.skipped_rows ? `, ${job.skipped_rows} already here` : ""}`);
    },
  });
  const errors = (result?.errors as { row: number; message: string }[]) ?? [];
  const download = (path: string) => { window.location.href = `/api/backend/api/v1/w/${slug}/${path}`; };
  return (
    <div className="w-full">
      <PageHeader title="Import and export" guide="import-and-export" description="Bring your lists in from Excel or another system, and take any list out as a spreadsheet." />
      <div className="grid gap-6 xl:grid-cols-2">
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Import from a spreadsheet</h2>
          <ol className="list-decimal space-y-1 pl-5 text-sm text-stone-600">
            <li>Download the template and fill it in (or rename your own columns to match).</li>
            <li>Save it as <strong>CSV</strong> (in Excel: File &gt; Save as &gt; CSV UTF-8).</li>
            <li>Check it: MannaBooks lists any row it can&apos;t take. Nothing is saved until every row is right.</li>
          </ol>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="What"><Select value={kind} onChange={(e) => { setKind(e.target.value); setResult(null); }}>{[...new Set(kinds.map((x) => x[4]))].map((group) => (
              <optgroup key={group} label={group}>{kinds.filter((x) => x[4] === group).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</optgroup>
            ))}</Select></Field>
            {kind === "opening_balances" && <Field label="Balances at" hint="The day before your first day on MannaBooks."><Input type="date" value={asOf} onChange={(e) => setAsOf(e.target.value)} /></Field>}
          </div>
          <p className="text-sm text-stone-600">{KINDS.find(([k]) => k === kind)?.[3]} <button type="button" className="text-brand-700 underline" onClick={() => download(`imports/templates/${kind}/`)}>Download the template</button></p>
          <Field label="CSV file"><Input type="file" accept=".csv,text/csv" onChange={(e) => { setFile(e.target.files?.[0] ?? null); setResult(null); }} /></Field>
          <FormError error={send.error} />
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" disabled={!file} loading={send.isPending && send.variables === false} onClick={() => send.mutate(false)}>Check the file</Button>
            <Button disabled={!file || (result !== null && result.status === "failed")} loading={send.isPending && send.variables === true} onClick={() => send.mutate(true)}><Upload className="h-4 w-4" /> Import</Button>
          </div>
          {result && (
            <div className={`rounded-md p-3 text-sm ${result.status === "failed" ? "bg-red-50 text-red-900" : "bg-brand-50 text-brand-900"}`}>
              {result.status === "failed" ? `${errors.length} row${errors.length === 1 ? "" : "s"} to fix before importing:` :
                result.status === "checked" ? `All ${result.total_rows} rows are fine: ${result.imported_rows} will be added${result.skipped_rows ? `, ${result.skipped_rows} are already here` : ""}. Choose Import.` :
                `Imported ${result.imported_rows}${result.skipped_rows ? `; ${result.skipped_rows} were already here` : ""}.${AFTER[kind] ?? ""}`}
              {errors.length > 0 && <ul className="mt-2 max-h-56 space-y-0.5 overflow-y-auto">{errors.map((e, i) => <li key={i}><strong>Row {e.row}:</strong> {e.message}</li>)}</ul>}
            </div>
          )}
        </Card>
        <Card className="space-y-4 p-5">
          <h2 className="font-semibold">Export</h2>
          <p className="text-sm text-stone-600">CSV files that open in Excel or Google Sheets. Your data is always yours to take out, whatever your plan.</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Invoices, bills and journal from"><Input type="date" value={range.from} onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))} /></Field>
            <Field label="To"><Input type="date" value={range.to} onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))} /></Field>
          </div>
          <ul className="divide-y divide-stone-100">
            {EXPORTS.filter(([, , perm]) => can(perm)).map(([k, label, , dated]) => (
              <li key={k} className="flex items-center justify-between py-2 text-sm">
                <span>{label}{dated && <span className="text-xs text-stone-500"> (dates above)</span>}</span>
                <Button variant="ghost" className="px-2 py-1" onClick={() => download(`exports/${k}/${dated ? `?from=${range.from}&to=${range.to}` : k === "accounts" ? `?to=${range.to}` : ""}`)}><Download className="h-4 w-4" /> CSV</Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
      {(history.data?.results ?? []).length > 0 && (
        <Card className="mt-6">
          <h2 className="px-4 pt-3 text-sm font-semibold">Past imports</h2>
          <Table head={["When", "What", "File", "Rows", "Result", "By"]}>
            {(history.data!.results as Job[]).map((j) => (
              <tr key={j.id}>
                <Td>{fmtDate(j.created_at)}</Td>
                <Td>{KINDS.find(([k]) => k === j.kind)?.[1]}</Td>
                <Td className="text-stone-600">{j.filename}</Td>
                <Td className="text-right">{j.total_rows}</Td>
                <Td><Badge tone={j.status === "imported" ? "green" : j.status === "failed" ? "red" : "stone"}>{j.status === "imported" ? `${j.imported_rows} imported` : j.status === "failed" ? "Had errors" : "Checked only"}</Badge></Td>
                <Td className="text-stone-600">{j.created_by_name}</Td>
              </tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
