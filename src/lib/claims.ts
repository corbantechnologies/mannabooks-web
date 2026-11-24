/** Badge colours for expense claim statuses. */
export const CLAIM_TONE: Record<string, "stone" | "amber" | "green" | "blue" | "red"> = {
  draft: "stone", submitted: "amber", approved: "blue", on_payslip: "blue", paid: "green", rejected: "red",
};
