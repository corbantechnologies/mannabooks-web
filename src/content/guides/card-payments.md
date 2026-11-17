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
4. Copy the **Webhook URL** shown and paste it on Paystack under **Settings > API Keys and Webhooks**, in the row for the keys you use (Test or Live). This lets payments be recorded even if the customer closes the page before it finishes. Leave Paystack's **Callback URL** blank: MannaBooks tells Paystack where to send each customer back.
5. Under **Paystack pays out to**, choose the bank account your Paystack payouts go to. Decide whether payouts that match should be recorded by themselves (see Payouts to your bank).
6. Tick **Show "Pay by card" on the links customers open** and save.

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
- When Paystack pays out, the payout is recorded as a transfer into your bank (see below), so Card payments in transit goes back to nothing.

## Payouts to your bank

Paystack pays your card takings into your bank, usually the next working day, as one payout less its fees. Paystack doesn't announce payouts, so every morning MannaBooks fetches the last 45 days of them, starting from your first card payment through MannaBooks. **Check Paystack now** on the Card payments page does the same straight away.

Each payout is checked against the card payments recorded in MannaBooks:

- **Matches**: every payment in it came through MannaBooks, and the amount is exactly those payments less the fees already recorded.
- **Check it**: something is different, and the reason is shown, for example:
  - Paystack paid less than expected, because of a refund, a chargeback or a fee difference;
  - some payments weren't taken through MannaBooks, for example from a website on the same Paystack account;
  - a card payment couldn't be recorded by itself.

**Recording a payout.** Choose **Record in the bank**. MannaBooks makes a **Bank transfer** of the whole payout from Card payments in transit into the bank under **Paystack pays out to**, dated the payout day, with the reference **PSTK-** and the payout number. On your bank statement it is one line, so it matches in the **bank reconciliation**. If it was wrong, void the transfer under **Banking > Transfers**, and the payout goes back to **To record**.

- **If part of it was taken outside MannaBooks**, you choose the account those payments belong to, for example your online sales. That part is moved into Card payments in transit from that account first.
- **If Paystack paid less** (a refund or a chargeback), the difference stays in Card payments in transit, with a note. Record what happened, for example a credit note and refund to the customer, and transit goes back to nothing.

**Let MannaBooks record them.** If you tick **Record payouts in the bank by themselves when they match**, payouts marked **Matches** are recorded without you. Anything marked **Check it** still waits for you. Leave it off if you want finance to look at every payout first.

Card payments in transit also shows under **Banking** as an account, so you can move any odd amount out of it with an ordinary **Bank transfer**.

Test keys usually have no payouts, so you will only see them once you use live keys.

## Checking card payments

**Organisation > Card payments** lists recent card payments: who paid, for which invoice, the card used (for example *Visa ending 4081*), Paystack's fee, and whether it went through. A card payment that went through but couldn't be recorded (for example because the month is closed) shows the reason. Record it by hand under **Payments**.

## Card machines at the counter

A card machine from your bank (a PDQ) doesn't need connecting. Record the sale or payment with the method **Card**. At the end of a shift, the till shows card takings separately from cash, so you can compare them with the machine's end-of-day slip.
