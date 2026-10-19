# KRA eTIMS

**eTIMS** is KRA's electronic tax invoice system. Once it is on, every invoice, cash sale and credit note you issue is sent to KRA and comes back signed with a control unit number and a QR code, printed on the document.

MannaBooks uses **OSCU** (Online Sales Control Unit), KRA's online option. It is software only: there is no physical device to buy or plug in.

## Platform status

MannaBooks is going through KRA's approval as an eTIMS system. Until approval, eTIMS is **switched off for everyone**: MannaBooks does not contact KRA, and documents carry no eTIMS status or line. You can carry on selling as normal. When it is switched on, the **KRA eTIMS** page says so.

## Connecting your business

1. On the KRA eTIMS portal, apply for **OSCU** and choose MannaBooks as your system.
2. KRA gives each branch a **serial number** (KRA calls it the device serial number).
3. In MannaBooks, open **Organisation > KRA eTIMS** and enter your **KRA PIN**, **branch id** (00 for the head office) and the **OSCU serial number**. Save.
4. Once eTIMS is switched on, choose **Connect to KRA**. MannaBooks fetches the communication key from KRA and stores it encrypted; you never type it.

Use **KRA sandbox** while testing and **KRA production** for real sales. Only owners and admins can change these details.

## What happens when you issue

With eTIMS on, the document shows **Waiting for KRA** while it is sent. MannaBooks retries automatically if KRA is slow or offline. It then shows **Signed by KRA**, or **KRA rejected it** with the reason under **Recent submissions**. A signed document can't be voided; correct it with a credit note.
