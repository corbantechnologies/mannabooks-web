import type { Metadata } from "next";

import { LegalPage, type LegalSection } from "@/components/legal-page";

export const metadata: Metadata = {
  title: "Privacy policy",
  description: "How Corban Technologies LTD collects, uses and protects personal data in MannaBooks, under Kenya's Data Protection Act, 2019.",
  alternates: { canonical: "/privacy" },
};

const SECTIONS: LegalSection[] = [
  {
    heading: "Who we are",
    body: [
      "MannaBooks is provided by Corban Technologies LTD, a company registered in Kenya (\"we\", \"us\"). This policy explains how we handle personal data when you visit our website or use MannaBooks, in line with the Data Protection Act, 2019 and its regulations.",
      "For the details of your own account, and for visitors to our website, we are the data controller. For the records a business keeps in MannaBooks about its customers, suppliers and staff, that business is the data controller and we process the data on its behalf, only to provide the service.",
    ],
  },
  {
    heading: "What we collect",
    body: [
      [
        "Account details: your name, email address, phone number and password (stored only as a secure hash).",
        "Business details: business name, KRA PIN, VAT status, address, logo and settings.",
        "Records you enter: customers, suppliers, products, invoices, payments, stock, employees, payroll and other accounting records.",
        "Payment details: M-Pesa transaction references and the phone numbers used to pay. We do not store M-Pesa PINs or card numbers.",
        "Support and contact messages you send us.",
        "Technical data: IP address, browser type and the pages you use, kept in server logs for security and to fix problems.",
      ],
    ],
  },
  {
    heading: "Why we use it",
    body: [
      [
        "To provide MannaBooks: keep your books, send your documents, take payments and run payroll (performance of our contract with you).",
        "To bill your subscription and send reminders about it (contract).",
        "To keep MannaBooks secure, prevent fraud and investigate misuse (legitimate interests).",
        "To answer your messages and support requests (legitimate interests).",
        "To meet legal duties, such as tax and accounting record keeping (legal obligation).",
        "To send product news, only where you have agreed; you can opt out at any time (consent).",
      ],
      "We do not sell personal data, and we do not use the records in your books for advertising.",
    ],
  },
  {
    heading: "Who we share it with",
    body: [
      "We share personal data only as needed to provide MannaBooks, with service providers bound to protect it:",
      [
        "Hosting and database providers that run MannaBooks.",
        "Email delivery providers that send your documents, reminders and our replies.",
        "Safaricom (M-Pesa Daraja), through each business's own connection, when payments are requested or received.",
        "Kenya Revenue Authority (eTIMS), when a business switches on eTIMS signing.",
      ],
      "We may disclose data where the law requires it, for example to comply with a court order or a request from a lawful authority.",
    ],
  },
  {
    heading: "Where it is stored",
    body: [
      "Some of our service providers store data on servers outside Kenya. Where that happens we rely on appropriate safeguards as required by the Data Protection Act, such as the provider's contractual commitments to protect the data.",
    ],
  },
  {
    heading: "How long we keep it",
    body: [
      "We keep account and business data while the account is active. Accounting records may need to be kept for the period required by Kenyan tax law. When a business closes its account, we delete or anonymise its data within a reasonable time, unless the law requires us to keep it. Server logs are kept for a short period for security.",
    ],
  },
  {
    heading: "How we protect it",
    body: [
      [
        "All traffic is encrypted with HTTPS.",
        "Passwords are stored as one-way hashes.",
        "Each person sees only what their role allows, and changes are recorded in an audit log.",
        "Access to production systems is limited to staff who need it.",
      ],
    ],
  },
  {
    heading: "Your rights",
    body: [
      "Under the Data Protection Act you have the right to be informed about how your data is used, to access it, to have wrong data corrected, to have data deleted, to object to its use, and to receive it in a portable form.",
      "To use these rights, contact us. If your data is held by a business that uses MannaBooks (for example, as its customer or employee), contact that business first; we will help it respond.",
      "If you are not satisfied with our response, you may complain to the Office of the Data Protection Commissioner.",
    ],
  },
  {
    heading: "Cookies",
    body: [
      "MannaBooks uses a cookie to keep you signed in. It is needed for the service to work. We do not use advertising cookies.",
    ],
  },
  {
    heading: "Children",
    body: ["MannaBooks is a service for businesses and is not directed at children."],
  },
  {
    heading: "Changes to this policy",
    body: ["We may update this policy. If the changes are significant, we will tell account owners by email or in MannaBooks before they take effect."],
  },
];

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy policy" updated="21 October 2026" sections={SECTIONS}
      intro="Your books hold some of your most sensitive information. This policy explains what personal data we collect, why, who we share it with, and the rights you have over it." />
  );
}
