# Bills

A **bill** is a supplier's invoice: what you owe them. Posting it records the debt, the **input VAT** you can claim from KRA, and where the cost goes.

## Entering a bill

- From a **delivery**: open the goods received note and choose **Enter their bill**. The lines are copied; enter the supplier's invoice number.
- From a **service order** or an **order with no deliveries**: choose **Enter bill** on it.
- Anything else (rent, electricity, a one-off purchase): **Purchasing > Bills > Enter bill**, and choose the account for each line.

Enter the supplier's **eTIMS CU invoice number** from their invoice: KRA only allows input VAT on purchases with a valid eTIMS invoice.

**Save draft** to check it, then **Post bill**. MannaBooks refuses the same supplier invoice number twice.

## What posting does

- Delivered stock clears *Goods received not invoiced*. If the bill price differs from the order price, the difference goes to cost of sales.
- Stock items bought without a delivery note go into stock now.
- Other lines go to the account you chose.
- VAT goes to *VAT recoverable*, and the total to *Accounts payable*.

A posted bill can be **voided** if nothing has been paid on it.
