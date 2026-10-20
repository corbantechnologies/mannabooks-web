type Tone = "stone" | "green" | "amber" | "red" | "blue";

export const ONLINE_STATUS: Record<string, [string, Tone]> = {
  new: ["New", "blue"], confirmed: ["Confirmed", "amber"], ready: ["Ready", "green"], completed: ["Completed", "green"], cancelled: ["Cancelled", "stone"],
};
export const PAYMENT_STATUS: Record<string, [string, Tone]> = {
  paid: ["Paid (M-Pesa)", "green"], pending: ["Prompt sent", "amber"], unpaid: ["Not paid", "stone"],
};
