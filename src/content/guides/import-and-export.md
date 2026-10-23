# Import and export

Bring your lists in from Excel or your old system, and take any list out as a spreadsheet. Open **Organisation > Import and export**.

## Importing

You can import:

- **Lists:** customers, suppliers, products and services, employees, leads and fixed assets
- **Products:** price updates and price lists, units such as cartons and crates, recipes, and stock counts
- **Moving from another system:** opening balances, your chart of accounts, and invoices and bills still unpaid

1. Choose what to import and **download the template**. It has the right column headings and an example row.
2. Fill it in, or rename your own spreadsheet's columns to match. Save it as **CSV** (in Excel: File > Save as > CSV UTF-8).
3. Choose the file and **Check the file**. MannaBooks lists any row it can't take, with the row number and why.
4. Fix those rows and check again. When every row is fine, choose **Import**.

Nothing is saved unless every row is right, so an import is never half done. Records already in MannaBooks are **skipped** (customers and suppliers by name, products by name or code, employees by ID number, email or KRA PIN, leads by phone or email), so importing the same file twice adds nothing. Price, unit and stock count imports update what is there instead.

### Columns

| Import | Columns |
| --- | --- |
| Customers and suppliers | name (needed), kind (company or individual), kra_pin, email, phone, address, city, payment_terms_days, and for customers credit_limit, for suppliers bank_details |
| Products | name (needed), code, kind (goods or service), category (made if new), unit, sale_price, cost_price, vat (VAT16, VAT8, ZERO, EXEMPT or NONVAT), track_stock (yes or no), quantity_on_hand, reorder_level |
| Employees | first_name and last_name (needed), other_names, email, phone, national_id, kra_pin, job_title, department (made if new), branch, hire_date, basic_salary (monthly), pay_method (bank or mpesa), bank_name, bank_account_number, mpesa_phone, nssf_number, shif_number, annual_leave_days |
| Leads | name (needed), company, phone or email (one needed), source (event, website, social, referral, call, walk_in), interest, estimated_value, notes |
| Fixed assets | name, purchase_date and cost (needed), category, serial_number, in_service_date, residual_value, method (straight_line, reducing_balance or none), useful_life_years or rate_percent, depreciation_to_date and depreciated_to, location (a branch), asset_account_code |
| Price updates | code or name (to find the product), sale_price, and price_list with list_price for a price list (made if new) |
| Product units | product_code or product_name, unit (e.g. crate), factor (how many pieces it holds), sale_price |
| Recipes | product_code or product_name, recipe_name, output_quantity, component_code or component_name, quantity: one row per ingredient |
| Stock counts | warehouse (blank: the main one), product_code or product_name, counted_quantity |
| Opening balances | account_code (from your chart of accounts), debit, credit |
| Chart of accounts | code, name, type (asset, liability, equity, income or expense), subtype, parent_code, description |
| Unpaid invoices | customer, invoice_number, invoice_date, due_date, amount_due |
| Unpaid bills | supplier, supplier_invoice_number, bill_date, due_date, amount_due |

Dates can be written 2026-10-31 or 31/10/2026.

**Stock counts** go into the warehouse's stock take (one is started if none is open). A scanner export that lists the same product once per scan works: the rows are added up. Check the differences and post the count in **Inventory > Stock takes**.

**Fixed assets** are ones you already own; they come into the books against opening balance equity, with the depreciation charged so far.

Products with **quantity_on_hand** go into the default warehouse as opening stock at their cost price.

**Opening balances** need the date they are at: the day before your first day on MannaBooks. They are saved as a draft; check them in **Accounting > Opening balances** and post them there.

## Exporting

Download as CSV (opens in Excel and Google Sheets): customers, suppliers, products with stock, the chart of accounts with balances, and, for the dates you choose, invoices, supplier bills and every journal line (the general ledger). Exports work on every plan, including when a business is read-only: your data is always yours.

## Moving from another system

1. Import suppliers, customers and products.
2. Import your trial balance as opening balances at your start date, then post it.
3. Import the **invoices customers still owe** and the **bills you still owe**. They keep their numbers, so customers can pay against them, and they are not counted again as sales, costs or VAT. If you import them, leave Accounts receivable and Accounts payable out of your opening balances: the invoices and bills bring those balances in.
4. Import your staff, fixed assets and, if you use your own, your chart of accounts.
