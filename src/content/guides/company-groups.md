# Company groups

If you own several businesses, for example a hardware shop, a transport company and a farm, each has its own workspace and its own books. A **company group** puts them together so you can see how the whole group is doing, without counting the money they pass between themselves.

## Setting up a group

1. On **Your workspaces**, choose **Company groups** (it appears once you have two workspaces), then **New group**.
2. Give it a name and the currency it reports in. Every company in the group must keep its books in that currency.
3. On the group's **Companies** tab, add each workspace. You need to manage a workspace's settings to add it, and a workspace can be in only one group.

Inside a company that belongs to a group, the menu shows a **Group** link.

## Transactions between the companies

When one company sells to, recharges, lends to or repays another, record it on the group's **Intercompany** tab instead of in each company separately. It is posted in both companies' books at once, so they always agree:

| Type | First company | Second company |
| --- | --- | --- |
| **Sale or recharge** | The seller: its income account, and *Due from group companies* | The buyer: the expense it is for, and *Due to group companies* |
| **Loan** | The lender: money leaves its bank, and *Due from group companies* | The borrower: money arrives in its bank, and *Due to group companies* |
| **Settlement** | The company paying what it owes: money leaves its bank | The company being paid: money arrives in its bank |

**Who owes whom** at the top of the tab shows what is still owed between each pair of companies. Voiding a transaction removes it from both companies (or reverses it, if the month is closed).

Intercompany sales are recorded without VAT. For a sale that needs VAT and an eTIMS invoice, issue a normal invoice and send it through the **Business inbox** instead.

To record one, you need to post journal entries in both companies.

## Consolidated reports

- **Profit and loss**: each company's income and costs side by side, matched by account code, then the group total. Intercompany sales are taken out of the seller's income *and* the buyer's costs (the *Eliminated* column), so the group's profit only counts business with the outside world.
- **Balance sheet**: each company's assets, liabilities and equity, then the group's. What the companies owe each other is taken out on both sides. If the companies disagree about what they owe each other, the difference is shown in red: look for an entry recorded in one company only.

Both reports print and download as CSV. To see them, you need to be able to see the reports of every company in the group.

## Good to know

- Record intercompany costs against an **expense** account. If the buyer records them as stock or an asset, the seller's profit on them stays in the group until the stock is sold.
- Removing a company from the group is blocked while it has intercompany transactions. Void or settle them first.
- Deleting a group doesn't touch any company's books.
