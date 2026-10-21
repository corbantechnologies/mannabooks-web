/** What a visitor can write to us about, on the contact page and in the email subject. */
export const CONTACT_TOPICS = {
  sales: "Plans and pricing",
  demo: "Book a demo",
  support: "Help with my account",
  partner: "Partners and accountants",
  migration: "Moving to the new MannaBooks",
  other: "Something else",
} as const;

export type ContactTopic = keyof typeof CONTACT_TOPICS;

export function isContactTopic(value: unknown): value is ContactTopic {
  return typeof value === "string" && value in CONTACT_TOPICS;
}
