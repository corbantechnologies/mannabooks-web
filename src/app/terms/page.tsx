import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "The terms for using MannaBooks, provided by Corban Technologies LTD.",
  alternates: { canonical: "/terms" },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "About these terms",
    body: [
      "These terms are an agreement between Corban Technologies LTD (\"we\", \"us\") and the person or business that creates a MannaBooks account (\"you\"). By creating an account or using MannaBooks you accept them. If you accept them for a business, you confirm you are allowed to do so.",
    ],
  },
  {
    heading: "Your account",
    body: [
      [
        "Give accurate details and keep them up to date.",
        "Keep your password safe. You are responsible for what happens under your account and for the people you invite to your business.",
        "Tell us straight away if you think someone has used your account without permission.",
      ],
    ],
  },
  {
    heading: "Plans, trials and payment",
    body: [
      "Each business has its own subscription. A new business gets a free trial of every feature; when the trial ends it moves to the Free plan unless you choose a paid plan. Plans, prices and limits are shown on the pricing page and in MannaBooks, and include VAT.",
      "Paid plans are paid monthly or yearly in advance, by M-Pesa or as we agree with you. If a payment is missed, there is a grace period; after it, the business becomes read-only until it is paid or moved to the Free plan. You can still see and export your records while read-only.",
      "We may change prices with at least 30 days' notice. A change applies from your next billing period. Payments are not refundable except where the law requires or we agree otherwise.",
    ],
  },
  {
    heading: "Your data",
    body: [
      "The records you put into MannaBooks belong to you. You give us permission to store and process them only to provide MannaBooks, as described in our privacy policy. You can export your lists and records at any time.",
      "You are responsible for having the right to enter personal data about your customers, suppliers and staff, and for using it lawfully.",
    ],
  },
  {
    heading: "Taxes and compliance",
    body: [
      "MannaBooks works out VAT, withholding tax and statutory payroll deductions from the rates and settings in the system, to help you keep your records and file returns. It is not tax, legal or accounting advice. You remain responsible for your returns, payments to KRA and other authorities, and for checking that rates and settings are right for your business. eTIMS signing is available only once KRA has approved MannaBooks and you have switched it on.",
    ],
  },
  {
    heading: "Acceptable use",
    body: [
      "You must not:",
      [
        "use MannaBooks for anything unlawful, including fraud, money laundering or tax evasion;",
        "try to get into accounts or data that are not yours, or test our security without our written permission;",
        "interfere with or overload the service, or copy or resell it;",
        "send spam or misleading messages through MannaBooks.",
      ],
    ],
  },
  {
    heading: "Third-party services",
    body: [
      "Some features rely on others, such as Safaricom M-Pesa through your own Daraja account, email delivery, and KRA systems. Their own terms apply, and we are not responsible for their availability or for money held by them.",
    ],
  },
  {
    heading: "Availability and changes",
    body: [
      "We work to keep MannaBooks available and your data safe, but we cannot promise it will always be uninterrupted or error-free. We may improve, change or remove features; if we remove something important to a paid plan, we will tell you in advance.",
    ],
  },
  {
    heading: "Suspension and closing an account",
    body: [
      "You can stop using MannaBooks at any time; export your records first. We may suspend or close an account that breaks these terms, puts others at risk, or is not paid, and where possible we will warn you first and let you export your records.",
    ],
  },
  {
    heading: "Liability",
    body: [
      "To the extent the law allows, we are not liable for indirect or consequential losses, lost profits, or losses caused by wrong information entered into MannaBooks or by third-party services. Our total liability for any claim is limited to the fees you paid us for MannaBooks in the 12 months before the claim. Nothing in these terms limits liability that cannot be limited under Kenyan law.",
    ],
  },
  {
    heading: "Law and disputes",
    body: [
      "These terms are governed by the laws of Kenya. We will try to resolve any dispute with you directly first; if we cannot, the courts of Kenya have jurisdiction.",
    ],
  },
  {
    heading: "Changes to these terms",
    body: ["We may update these terms. We will tell account owners about significant changes before they take effect. Continuing to use MannaBooks after that means you accept the new terms."],
  },
];

export default function TermsPage() {
  return (
    <LegalPage title="Terms of service" updated="21 October 2026" sections={SECTIONS}
      intro="These terms explain what you can expect from MannaBooks and what we expect from you. We have tried to keep them short and in plain language." />
  );
}
