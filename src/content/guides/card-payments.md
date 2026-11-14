# Card payments (Paystack)

Customers can pay their invoices by card (Visa or Mastercard) from the link you send them. The payment is recorded against the invoice by itself, the same way M-Pesa prompts are.

MannaBooks connects to **your own Paystack account**. Paystack takes the card and pays the money into your bank, less its fee. MannaBooks never holds the money and never sees the card number.

## Before you start

1. Open an account at paystack.com and complete their business checks so it can take **live** payments. Paystack asks for your business registration and bank account.
2. On Paystack, open **Settings > API Keys and Webhooks**. You will need the **public key** and the **secret key**. Use the test keys first if you want to try it without real money.

## Connecting it

1. In MannaBooks, open **Organisation > Card payments**.
2. Paste the **public key** and the **secret key**. Test keys go together, and live keys go together. The secret key is stored encrypted and is never shown again.
3. Choose **Save**, then **Check key with Paystack**.
4. Copy the **Webhook URL** shown and paste it on Paystack under **Settings > API Keys and Webhooks**. This lets payments be recorded even if the customer closes the page before it finishes.
5. Tick **Show "Pay by card" on the links customers open** and save.

Only people who manage card payments (admins and accountants) can change these settings.

## How a customer pays

1. Share an invoice or statement link with the customer, as usual.
2. They choose **Pay by card**. If you don't have their email address, they type it in for the receipt.
3. Paystack's secure page opens. They enter their card, and confirm with their bank if asked.
4. They come back to the link, which shows the payment as confirmed. The invoice is marked paid.

Card payments are taken in your base currency (for example KES). Invoices in other currencies are paid another way.

## In the books

- The payment is recorded as a customer payment, method **Card**, against the invoice.
- The money goes to **Card payments in transit**, because Paystack pays it to your bank a day or so later. You can choose another account under **Card money waits in**.
- Paystack's fee is recorded as **Bank and M-Pesa charges**, so the amount waiting in transit matches what Paystack will pay out.
- When the payout reaches your bank, match it in the **bank reconciliation** as a transfer from Card payments in transit to the bank.

## Checking card payments

**Organisation > Card payments** lists recent card payments: who paid, for which invoice, the card used (for example *Visa ending 4081*), Paystack's fee, and whether it went through. A card payment that went through but couldn't be recorded (for example because the month is closed) shows the reason. Record it by hand under **Payments**.

## Card machines at the counter

A card machine from your bank (a PDQ) doesn't need connecting. Record the sale or payment with the method **Card**. At the end of a shift, the till shows card takings separately from cash, so you can compare them with the machine's end-of-day slip.
