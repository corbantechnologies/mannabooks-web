# Approvals

Some documents need someone's go-ahead before they count: purchase and service orders, payment vouchers, payroll and budgets. MannaBooks can send each one up a chain of approvers, level by level.

## How it works without rules

With no rules, anyone whose role has the **approve** permission (for example *Purchase orders: approve*) approves a document with its **Approve** button.

**Approval limits.** On **Team and access** you can give a member an approval limit. When they approve something above their limit, it goes to the **module in-charge** instead: the head of the department that runs purchasing, finance or HR (set on **Departments**). If there is no in-charge, it goes to the owner.

## Setting up approval rules

Open **Approvals > Rules** (or **Organisation > Approval rules**) and choose **New rule**:

1. **Applies to**: the kind of document.
2. **From amount** and **Up to**: the band the rule covers. Leave *Up to* blank for "and above". You can have several rules for one kind, such as one for 0 to 50,000 and another for over 50,000.
3. **Approved by, in order**: add the levels. Each level is one of:
   - **Their supervisor**: whoever the person who prepared it reports to (set on their employee record).
   - **Their department head**.
   - **The module in-charge**.
   - **Anyone with a role**, such as Accountant.
   - **A named person**.
   - **The owner**.

Nobody approves their own document. If a level finds nobody (for example the preparer has no supervisor), the owner decides at that level.

## Sending and approving

- On a document that a rule covers, the **Approval** box shows who must approve it. Choose **Send for approval**.
- Each approver gets an email and sees it under **Approvals > Waiting for me**. They can approve from there or from the document itself, on a phone too.
- **Don't approve** needs a reason, which the person who sent it sees. They fix the document and **Send again**.
- When the last level approves, the document is approved: an order can be received, a voucher paid, payroll posted, a budget used.
- The person who sent it can **Withdraw** a request still waiting.

If a document's amount goes up after it was approved, it has to go round again.
