type Tone = "stone" | "green" | "amber" | "red" | "blue";

export const SUB_STATUS: Record<string, [string, Tone]> = {
  trialing: ["Trial", "blue"], active: ["Active", "green"], past_due: ["Payment due", "amber"], read_only: ["Read only", "red"], cancelled: ["Cancelled", "stone"],
};
export const PAYMENT_STATUS: Record<string, [string, Tone]> = {
  pending: ["Pending", "amber"], completed: ["Completed", "green"], failed: ["Failed", "stone"], refunded: ["Refunded", "red"],
};
export const TICKET_STATUS: Record<string, [string, Tone]> = {
  open: ["Open", "blue"], waiting: ["Waiting for customer", "amber"], resolved: ["Resolved", "green"], closed: ["Closed", "stone"],
};
export const PRIORITY: Record<string, [string, Tone]> = { low: ["Low", "stone"], normal: ["Normal", "blue"], high: ["High", "amber"], urgent: ["Urgent", "red"] };
