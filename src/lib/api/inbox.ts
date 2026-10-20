export const INBOX_KIND: Record<string, string> = { invoice: "Invoice", quotation: "Quotation", purchase_order: "Purchase order (LPO)" };
export const INBOX_STATUS: Record<string, [string, "blue" | "green" | "stone"]> = { new: ["New", "blue"], accepted: ["Accepted", "green"], declined: ["Declined", "stone"] };
