"use client";

import { ComingUp } from "@/components/coming-up";
import { PageHeader } from "@/components/ui";

export default function ComingUpPage() {
  return (
    <div className="w-full max-w-4xl">
      <PageHeader title="Coming up" guide="getting-started"
        description="Everything due to pay and to collect: suppliers' bills, approved vouchers, salaries, statutory payments by the 9th, VAT by the 20th, and customers' invoices." />
      <ComingUp />
    </div>
  );
}
