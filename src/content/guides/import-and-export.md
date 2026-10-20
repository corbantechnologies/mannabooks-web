# Import and export

Bring your lists in from Excel or your old system, and take any list out as a spreadsheet. Open **Organisation > Import and export**.

## Importing

You can import **customers**, **suppliers**, **products and services** and **opening balances**.

1. Choose what to import and **download the template**. It has the right column headings and an example row.
2. Fill it in, or rename your own spreadsheet's columns to match. Save it as **CSV** (in Excel: File > Save as > CSV UTF-8).
3. Choose the file and **Check the file**. MannaBooks lists any row it can't take, with the row number and why.
4. Fix those rows and check again. When every row is fine, choose **Import**.

Nothing is saved unless every row is right, so an import is never half done. Customers and suppliers with a name already in MannaBooks, and products with the same name or code, are **skipped**, so importing the same file twice adds nothing.

### Columns

| Import | Columns |
| --- | --- |
| Customers and suppliers | name (needed), kind (company or individual), kra_pin, email, phone, address, city, payment_terms_days, and for customers credit_limit, for suppliers bank_details |
| Products | name (needed), code, kind (goods or service), category (made if new), unit, sale_price, cost_price, vat (VAT16, VAT8, ZERO, EXEMPT or NONVAT), track_stock (yes or no), quantity_on_hand, reorder_level |
| Opening balances | account_code (from your chart of accounts), debit, credit |

Products with **quantity_on_hand** go into the default warehouse as opening stock at their cost price.

**Opening balances** need the date they are at: the day before your first day on MannaBooks. They are saved as a draft; check them in **Accounting > Opening balances** and post them there.

## Exporting

Download as CSV (opens in Excel and Google Sheets): customers, suppliers, products with stock, the chart of accounts with balances, and, for the dates you choose, invoices, supplier bills and every journal line (the general ledger). Exports work on every plan, including when a business is read-only: your data is always yours.

## Moving from another system

1. Import suppliers, customers and products.
2. Import your trial balance as opening balances at your start date, then post it.
3. Enter the invoices customers still owe and the bills you still owe as they are paid, or ask MannaBooks support to bring them across for you.
