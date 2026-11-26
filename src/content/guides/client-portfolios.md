# Client portfolios

A portfolio holds everything you provide one client: the services, what the client pays, what each service costs you, the margin, and the dates to bill them and renew with your suppliers. Open it from **Sales > Client portfolios**, or from the customer's page: **More > Client portfolio** (or **Start a client portfolio**).

## Starting one

**New portfolio**, choose the client, and choose the **portfolio lead**. The lead is the person in charge of this client. They find it under **My portfolios**, can change it, and get its reminders. Set your **standard margin** too, for example 30%. It is used to work out what each service should cost the client.

Who sees what:

- with *Client portfolios: view*, a person sees every client's portfolio;
- with *Client portfolios: manage*, a person can start, change and delete portfolios;
- a lead always sees and changes their own portfolios, even without these.

## Services

**Add a service** for each thing you provide. Choose its kind: core product, maintenance retainer, renewal (domain, SSL), prepaid managed service, hosting or other.

- **The client pays:** the quantity, the price each, how often (monthly, every 3 or 6 months, yearly or one-off), the contract dates, and the **next bill date**. *On the invoice as* picks the product, which sets the income account and VAT.
- **It costs you:** the cost per cycle, the supplier, and the date you must **renew with them**.
- **Remind (days before):** how early the lead is told about each date (30 days unless you change it).

The portfolio works out every service's revenue, cost and margin **per month**, so monthly and yearly services can be compared. A service that costs more than it brings in is marked **Loses money**.

**Prepaid services** (for example Google Workspace paid for a year): enter the period paid for. The service shows how much is earned so far and how much is left. Billing it from the portfolio fills the period in.

## Groups

A **group** is a folder for services that belong together, for example *Members app* (the app licence, its hosting and its support) or *Branch A*. It is just a name and an optional note: the services inside keep their own prices, dates and renewals. (It isn't the same as **Projects** in the menu, which tracks a job's costs in the books.)

- **New group:** click **New group** at the top of the portfolio and name it. It shows straight away, even before it has services.
- **The Groups tab** lists every group with its services, what it brings in a month, what it costs you and the margin. Click a group's name to open **its own page**: its services, totals, **Add a service**, and under **More**: change the name and note, duplicate or delete it.
- **Add a service here:** on the group's row, to add a service straight into it. Or choose the group in a service's form.
- **Move to group:** open a service and pick another group, or **No group**.
- **Totals:** each group's row shows what its services bring in a month, what they cost you and the margin.
- **Open and close:** on the Services tab, click a group's folder icon to fold its services away, and again to open them.
- **Delete:** under **Change** on the group's row. Its services stay, under *No group*.

### Duplicate for quick setup

When services are alike, set one up and copy it:

- **Duplicate a service:** open it and click **Duplicate**. The copy, *name (copy)*, has the same prices, billing, dates, supplier, and hosted apps with their resources, in the same group. Open the copy and change what differs. Its history, bills and documents aren't copied.
- **Duplicate a group:** **Duplicate** on the group's row copies the group with a copy of each of its services, for example to set up *Branch B* like *Branch A*. Then rename it with **Change**.

## Hosting: apps and resources

Under a hosting service, **Add an app** for each app or site. Give each app its resources: vCPU, RAM, storage, bandwidth, backups, or anything else. Each resource has your cost per unit and the client's price per unit, per month. Each app shows its margin and what it should cost at your standard margin, and an app that loses money is flagged. **Switch off** an app that is paused: it stops being billed and counted, but its history stays.

## Actual costs from supplier bills

Typed costs are estimates. For real figures, open a service and click **Link a bill**. Choose the supplier's posted bill, the amount for this service (before VAT) and the month it covers. You can split one bill across several services or apps; it can't be split beyond its total. Once bills are linked, the margin uses their average over the last 12 months (shown as *from bills*).

## Dates and reminders

**Dates ahead** lists the next 90 days:

- when to bill the client;
- when to pay or renew with each supplier;
- contracts ending;
- documents expiring.

The lead gets an in-app message before each one. Billing and renewal dates also show on **Coming up** and the Overview's Coming up card.

## Documents

**Documents > Add a document** keeps contracts, agreements and SLAs on the portfolio, or on one service. Give each an expiry date. The lead is reminded 30 days before, and the document is marked **Expires soon**.

## What if: repricing

**What if** compares what the client pays a month with what they would pay at a margin you type, service by service. A red difference means the client pays less than that margin needs. Nothing changes until you change a price.

## The month's invoice

Under **More**, choose **Make the month's invoice**, then pick the month. The preview lists everything due by the end of that month:

- one billing cycle for each service whose next bill date has come;
- a line per app for hosting;
- renewals in the month they fall.

**Make the draft invoice** creates it. Check it, then issue it as usual. Each billed service moves on to its next bill date, so nothing is billed twice or forgotten. A month can be invoiced once; void that invoice to make it again.

**Group the lines by group:** when the client has groups, tick this to list the lines group by group, each starting with its group's name (for example *Members app: Hosting*). MannaBooks remembers the choice for this client's next invoices.

If the client also has a recurring invoice, the preview warns you. Stop the recurring invoice once the portfolio bills the same services.

## History

Every change of price, quantity, cost, billing cycle or status, and every app or resource added or removed on hosting, is kept with its date, who made it and why (the form asks when money changes). **Effect a month** shows how much each change moved what the client pays a month. Use it to show the client when and why their bill changed.

## Reports

**Reports** on the Client portfolios page (or **More > Reports for this client** on a portfolio, **More > Reports for this group** on a group) opens 16 reports. Each one works for all clients, one client, one of their groups, or one lead's clients: choose at the top. Every report prints, saves as PDF and downloads as CSV, and its filters stay in the page address, so you can bookmark or share it.

For a client or a group:

- **Planned vs actual profit:** month by month, what you planned to earn, what the month's invoices billed, what it really cost from linked supplier bills, and the margin. Then the same per service, lowest margin first.
- **Statement of services:** for the client, with no costs or margins: their services, prices, how often they're billed, contract dates and next bill. Safe to send them.
- **Cash forecast:** money in from billing the client against money out to suppliers, month by month for 3 to 24 months, with a running total. Months where more goes out than comes in show in red.
- **Billed vs collected:** the invoices made from the portfolio, what's paid, what's still owed and how many days late, with what's owed by age.
- **Prepaid services:** for prepaid services, what's earned and what's still to deliver on a date you choose. Still to deliver is income received in advance in the books.
- **Hosting resources:** each resource per app with its cost, price and margin, and totals by kind (vCPU, RAM, storage...).
- **Renewals and expiries:** contracts ending, supplier renewals, prepaid periods ending and documents expiring, with amounts.
- **Missed billing:** services whose bill date passed without an invoice, recurring services with no bill date, and contracts that are over but still active.
- **Change log:** every change with its date, reason, who made it and its effect a month.

Across all clients:

- **Recurring revenue:** what clients pay a month and a year by client, group, kind of service, product and lead.
- **Margin ranking:** clients, groups and services from the lowest margin, with how much more a month would bring each to your standard margin.
- **Client concentration:** how much of your recurring revenue your biggest one, three and five clients carry.
- **Supplier exposure:** what you pay each supplier across clients, what's billed on it, what you've paid in 12 months, and the next renewal.
- **Lead performance:** per lead, their clients, revenue, margin, clients below standard, services losing money, missed bills and dates coming up.
- **New and lost revenue:** month by month, services added, price rises and add-ons, cuts, and services ended or removed.
- **Hosting capacity:** total vCPU, RAM, storage and more sold, by kind and by client, to plan your servers.

A few things to know:

- Amounts are before VAT, except Billed vs collected, which shows invoices as the client pays them.
- Billed by service and by group comes from invoices made after 26 Nov 2026, when MannaBooks started keeping what each service was billed. Older invoices still count in their month.
- The effect a month of changes made before 26 Nov 2026 is known only for services added then; the reports say when something can't be valued.

## The portfolio summary

**More > Portfolio summary** gives a page to print or save as PDF:

- **For the client:** their services, prices, coming dates, price changes and agreements.
- **Internal** (tick the box): adds your costs, margins and what each service should cost at your standard margin.

## Tasks and notes

**Tasks and notes** shows the client's open tasks, and the calls, meetings and notes logged on the customer, in one place. To link a task to the client, choose this customer on it.
