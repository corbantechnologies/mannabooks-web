# M-Pesa (Daraja)

Connect your own paybill or till so that:

- you can send customers an **M-Pesa prompt** (STK push) from an invoice, the till or a shared link, and the payment records itself;
- money paid straight to your paybill or till shows up in **Sales > M-Pesa payments**.

The money goes straight to your M-Pesa account; MannaBooks never holds it.

## What you need

A **Daraja app** on developer.safaricom.co.ke, taken live for your paybill or till ("Go Live"). Safaricom gives you a **consumer key**, **consumer secret** and a **passkey** (Lipa na M-Pesa Online). The paybill or till administrator does the Go Live step. Ask us if you want help.

## Connecting

1. Open **Organisation > M-Pesa (Daraja)**.
2. Choose **Paybill** or **Till**. For a till, enter the store number and the till number.
3. Enter the consumer key, consumer secret and passkey. They are stored encrypted.
4. Tick **Use M-Pesa prompts in MannaBooks** and save.
5. Choose **Check keys with Safaricom**, then **Receive direct payments**.

Use the **Sandbox** environment to test with Safaricom's test numbers first.

## Matching payments

- A prompt sent from an invoice pays that invoice.
- A customer paying your paybill with an **invoice number as the account number** is matched to that invoice.
- Anything else waits under **M-Pesa payments > To apply**: choose **Apply** and pick the customer and invoice.

Without Daraja you can still record M-Pesa payments by typing the M-Pesa code.
