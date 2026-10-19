# Tax rates

**Tax rates** are applied to sales and purchase lines, and to payments where tax is withheld. Each rate knows which account it is posted to and, for VAT, the **KRA eTIMS tax code** sent with each line.

## The starting rates

| Code | Name | eTIMS | Posted to (sales) |
| --- | --- | --- | --- |
| VAT16 | VAT 16% | B | VAT payable |
| VAT8 | VAT 8% (petroleum products) | E | VAT payable |
| ZERO | Zero-rated (0%) | C | VAT payable |
| EXEMPT | Exempt from VAT | A | - |
| NONVAT | Not subject to VAT | D | - |
| WHVAT2 | Withholding VAT 2% | - | Withholding VAT receivable |
| WHT5 | Withholding tax 5% (professional and management fees) | - | Withholding tax receivable |

If your business is **VAT registered**, *VAT 16%* is the default for new lines; otherwise *Not subject to VAT* is.

## Changing rates

Click a rate to edit it, or choose **New tax rate** for another (for example a different withholding rate). Rates are switched off rather than deleted, so documents that used them stay correct. Only a VAT rate can be the default.
