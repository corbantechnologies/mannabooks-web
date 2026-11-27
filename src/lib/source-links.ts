/**
 * Where the document behind a journal entry opens, from the entry's source_model ("bills.Bill") and source_id.
 * Anything not listed opens the journal entry itself.
 */
const SOURCE_PAGE: Record<string, [string, string]> = {
  "invoices.Invoice": ["sales/invoices", "Invoice"],
  "receipts.Receipt": ["sales/cash-sales", "Cash sale"],
  "creditnotes.CreditNote": ["sales/credit-notes", "Credit note"],
  "payments.Payment": ["sales/payments", "Customer payment"],
  "bills.Bill": ["purchasing/bills", "Bill"],
  "supplierpayments.SupplierPayment": ["purchasing/payments", "Supplier payment"],
  "paymentvouchers.PaymentVoucher": ["purchasing/vouchers", "Payment voucher"],
  "goodsreceipts.GoodsReceipt": ["purchasing/receipts", "Goods received"],
  "expenses.Expense": ["banking/expenses", "Expense"],
  "otherincomes.OtherIncome": ["banking/income", "Other income"],
  "payruns.PayRun": ["payroll", "Payroll"],
  "stockadjustments.StockAdjustment": ["inventory/adjustments", "Stock adjustment"],
  "stocktakes.StockTake": ["inventory/stock-takes", "Stock take"],
  "stocktransfers.StockTransfer": ["inventory/transfers", "Stock transfer"],
  "fixedassets.FixedAsset": ["accounting/fixed-assets", "Fixed asset"],
  "productionorders.ProductionOrder": ["manufacturing/production", "Production"],
};

export function sourceLink(slug: string, src: { source_model?: string | null; source_id?: string | null }): { href: string; label: string } | null {
  const key = (src.source_model ?? "").split(".").slice(0, 2).join(".");
  const page = SOURCE_PAGE[key];
  return page && src.source_id ? { href: `/w/${slug}/${page[0]}/${src.source_id}`, label: page[1] } : null;
}

const KIND_LABEL: Record<string, string> = {
  "banktransfers.BankTransfer": "Transfer",
  "owners.OwnerTransaction": "Owner money",
  "mpesatransactions.MpesaTransaction": "M-Pesa payment",
  "cardpayments.CardPayment": "Card payment",
  "expenseclaims.ExpenseClaim": "Expense claim",
  "advances.Advance": "Salary advance",
  "giftvouchers.GiftVoucherEntry": "Gift voucher",
  "fiscalyears.FiscalYear": "Year end",
  manual: "Journal",
  opening_balance: "Opening balance",
};

/** A name for what recorded a transaction: "expenses.Expense" -> "Expense", "owner_money" -> "Owner money". */
export function kindLabel(kind: string): string {
  const key = kind.split(".").slice(0, 2).join(".");
  if (KIND_LABEL[key]) return KIND_LABEL[key];
  if (SOURCE_PAGE[key]) return SOURCE_PAGE[key][1];
  const last = key.includes(".") ? key.split(".")[1].replace(/([a-z])([A-Z])/g, "$1 $2") : key.replace(/_/g, " ");
  return last.charAt(0).toUpperCase() + last.slice(1).toLowerCase();
}
