# Catch up in bulk

Starting MannaBooks partway through the year, or behind on your books? Record the money that already moved in one sitting, without making each invoice and bill by hand. MannaBooks makes the documents for you, and someone can add their details later.

## Before you start

1. Add your **opening balances** on the day before you start: bank, M-Pesa, cash and what's owed either way. See [opening balances](/guide/opening-balances).
2. Add invoices and bills that were **still unpaid** on that day with **Bring in unpaid**.
3. Your customers and suppliers can be imported first, or added as you go (see below).

Everything you record in bulk is dated **after** your opening balances. Money from before then is already in them, so MannaBooks refuses an earlier date.

## Money in from customers

Go to **Sales > Customer payments**, then **Actions > Record in bulk**. One row for each payment received:

- **From**: pick the customer, or choose **+ Someone new** and type the name. They're added as a customer when you save.
- **What it was**:
  - **A sale** makes a **paid invoice**: the sale and its payment together. It isn't sent to eTIMS: past sales were handled when they happened.
  - **Payment for older invoices or in advance** records the payment only. It goes to their oldest unpaid invoices first; anything left stays as credit on their account.
- **Date**, **amount** (as paid, VAT included), **received into** (the bank, M-Pesa or cash account).
- **What for**: the income account (blank: Sales), and the **VAT** inside the amount if any.
- **Reference** and **description**.

Press **Done** to fold a row away, and **Add another** for the next one: it starts with the same date, account and VAT. **Save all** saves every row, or none if one has a problem; the message names the row.

## Money out to suppliers

The same on **Purchasing > Supplier payments**, **Actions > Record in bulk**. **A purchase** makes a **paid bill**. Their invoice number can wait: leave it blank and the bill gets a temporary number starting with `TO-ADD-`.

For costs with no supplier account (fuel, electricity, shopping), use **Cash and banking > Expenses > Actions > Record in bulk** instead.

## Details to add

Invoices and bills made this way are marked **Details to add**. Find them with the **Details to add** filter on the invoices and bills lists. On each one, **Add details** lets you fill in:

- on a bill: the supplier's invoice number and the **eTIMS CU invoice number**, to claim the VAT;
- on an invoice: the customer's order or LPO number;
- the description and notes.

Tick **These are all the details** to take it off the list. The amount, date and accounts can't change here. If one is wrong, void it and record it again.

## Customers who are also suppliers

A business that buys from you and sells to you is a customer and a supplier. Link the two: on the customer's page, **Link their supplier record** (or make one from the customer in a click). Both pages then show what they owe you, what you owe them and the net.

When you've both agreed, **Set off** reduces their oldest unpaid invoices and your oldest unpaid bills to them by the same amount. No money moves; both statements show the set-off. Void a set-off, with a reason, to put both back.
