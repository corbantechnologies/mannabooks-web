/**
 * The industries on the public site: the /industries hub and one page each at /industries/[slug].
 * Examples are illustrative businesses with worked figures, never customer stories. Use-case slugs refer to
 * src/content/use-cases.ts; guide slugs to src/content/guides.
 */
import {
  Briefcase, Factory, GraduationCap, HardHat, HeartHandshake, HeartPulse, type LucideIcon, Network, Scissors, Sprout, Store, Truck,
  UtensilsCrossed, Warehouse,
} from "lucide-react";

export type Industry = {
  slug: string;
  icon: LucideIcon;
  name: string;
  /** One line for cards. */
  tagline: string;
  /** The detail page's heading and opening paragraph. */
  headline: string;
  intro: string;
  who: string[];
  uses: string[];
  problems: { title: string; text: string }[];
  day: { title: string; text: string }[];
  example: { business: string; intro: string; steps: string[]; figures: [string, string][]; note?: string };
  /** Plan key from src/lib/plans.ts, and why. */
  plan: string;
  planNote: string;
  /** The setup goal to pick when creating the business. */
  goal: string;
  useCases: string[];
  guides: string[];
  faqs: { q: string; a: string }[];
};

export const INDUSTRIES: Industry[] = [
  {
    slug: "retail-shops", icon: Store, name: "Retail shops",
    tagline: "Sell at the till, take M-Pesa, and always know what is on the shelf.",
    headline: "Accounting and stock for Kenyan shops",
    intro: "Ring up sales at the till, take M-Pesa without checking your phone, and watch stock go down as you sell. Every sale lands in your books with its VAT, so the day's profit is there when you close.",
    who: ["Supermarkets and minimarts", "Hardware stores", "Chemists and pharmacies", "Agrovets", "Electronics and phone shops", "Boutiques and cosmetics", "Bookshops and stationers"],
    uses: ["Till with shifts and cash counts", "M-Pesa prompts and automatic matching", "Stock at average cost, with low-stock warnings", "Sell in cartons or pieces", "Loyalty points", "Online shop"],
    problems: [
      { title: "Cash that doesn't add up", text: "Each cashier opens a shift with a float and counts the drawer at the end. MannaBooks shows what should be there, by cash and M-Pesa, so a shortage shows the same day." },
      { title: "M-Pesa messages to check by hand", text: "Send a payment prompt to the customer's phone from the till. When they enter their PIN the sale is marked paid; no screenshots, no reading SMS." },
      { title: "Stock you can't trust", text: "Goods received add to stock and every sale takes it out at average cost. Stock takes show the difference, and low-stock warnings tell you what to reorder." },
    ],
    day: [
      { title: "Open the shift", text: "The cashier opens a shift with the float in the drawer." },
      { title: "Sell", text: "Find products, sell a carton or a single piece, and take cash, M-Pesa or both." },
      { title: "Receive goods", text: "The store keeper records the delivery against the LPO; stock and the supplier's bill are updated." },
      { title: "Close and count", text: "The cashier counts the drawer. MannaBooks compares it with the shift's cash sales and records any difference." },
      { title: "See the day", text: "Sales, cost of sales and gross profit for the day, with VAT ready for the month's return." },
    ],
    example: {
      business: "A hardware shop",
      intro: "A customer buys 10 bags of cement at KES 950 a bag (VAT inclusive) and pays by M-Pesa. The shop's average cost is KES 780 a bag.",
      steps: [
        "The cashier adds 10 bags of cement to the sale; MannaBooks fills in the price from the product.",
        "A payment prompt goes to the customer's phone; they enter their PIN and the sale is marked paid.",
        "Cement in stock drops from 120 to 110 bags.",
        "The sale, the VAT, the M-Pesa money and the cost of the cement are posted to the books.",
      ],
      figures: [["Sale (VAT inclusive)", "KES 9,500.00"], ["VAT at 16%", "KES 1,310.34"], ["Sales before VAT", "KES 8,189.66"], ["Cost of the cement (10 × 780)", "KES 7,800.00"], ["Gross profit", "KES 389.66"]],
      note: "Cement margins are thin; MannaBooks shows them exactly, so you price the rest of the shop with your eyes open.",
    },
    plan: "duka", planNote: "The till, stock, buying and the online shop are all in Duka.",
    goal: "Run a shop with a till",
    useCases: ["sell-at-the-till", "get-paid-by-mpesa", "track-stock", "sell-online", "vat-and-kra"],
    guides: ["pos", "mpesa", "inventory", "goods-received", "stock-takes", "loyalty"],
    faqs: [
      { q: "Can I sell in cartons and in pieces?", a: "Yes. Give a product extra units, such as a carton of 12, each with its own price. Stock is kept in the base unit, so selling a carton takes out 12 pieces." },
      { q: "Does it work with my own M-Pesa till or paybill?", a: "Yes. Each business connects its own Daraja account, so the money goes straight to you. MannaBooks never holds your money." },
      { q: "Can more than one cashier use it?", a: "Yes. Each cashier signs in with their own account and opens their own shift, so every count is theirs." },
    ],
  },
  {
    slug: "wholesale-distribution", icon: Warehouse, name: "Wholesale and distribution",
    tagline: "Price lists, credit customers, several warehouses and statements that match.",
    headline: "Accounting for distributors and wholesalers in Kenya",
    intro: "Sell on credit at the right price for each customer, move stock between warehouses, and collect what you are owed. MannaBooks keeps orders, stock, invoices and statements in one place.",
    who: ["Distributors and stockists", "FMCG wholesalers", "Building materials suppliers", "Importers", "Spare parts dealers"],
    uses: ["Price lists for wholesale and contract customers", "LPOs, goods received and supplier bills", "Several warehouses and transfers", "Delivery notes", "Customer statements and reminders", "Business inbox for customers on MannaBooks"],
    problems: [
      { title: "The wrong price on the invoice", text: "Put wholesale, retail and contract customers on their own price lists. The invoice picks the customer's price for you." },
      { title: "Money stuck with customers", text: "See who owes you and for how long. Send statements and reminders, and let customers pay by paybill with the invoice number." },
      { title: "Stock in more than one place", text: "Keep stock per warehouse, transfer between them, and count each one. Delivery notes record what left and who received it." },
    ],
    day: [
      { title: "Take the order", text: "Raise a quotation or go straight to an invoice; the customer's price list sets the prices." },
      { title: "Deliver", text: "Print a delivery note from the invoice; stock leaves the warehouse it was sent from." },
      { title: "Buy", text: "Raise LPOs to suppliers, receive the goods and enter the supplier's bill." },
      { title: "Collect", text: "Payments by paybill match themselves to invoices; send reminders for anything overdue." },
    ],
    example: {
      business: "A cooking oil distributor",
      intro: "A minimart orders 20 cartons of cooking oil (12 × 1 litre) on 30 days' credit, at the wholesale price of KES 3,000 a carton before VAT. The distributor's average cost is KES 2,640 a carton.",
      steps: [
        "The invoice takes the wholesale price from the minimart's price list.",
        "240 bottles leave the main warehouse; the delivery note goes with the driver.",
        "The minimart owes KES 69,600, due in 30 days, and shows on the aged receivables report.",
        "Three weeks later they pay by paybill with the invoice number as the account; the payment matches itself and the invoice is marked paid.",
      ],
      figures: [["Sales before VAT (20 × 3,000)", "KES 60,000.00"], ["VAT at 16%", "KES 9,600.00"], ["Invoice total", "KES 69,600.00"], ["Cost of sales (20 × 2,640)", "KES 52,800.00"], ["Gross profit", "KES 7,200.00"]],
    },
    plan: "duka", planNote: "Duka has buying, stock and warehouses. Choose Kampuni for approvals on LPOs and branch budgets.",
    goal: "Manage stock and warehouses",
    useCases: ["track-stock", "get-paid-by-mpesa", "recurring-billing", "vat-and-kra", "control-spending"],
    guides: ["price-lists", "inventory", "delivery-notes", "purchase-orders", "reminders", "business-inbox"],
    faqs: [
      { q: "Can customers on MannaBooks receive my invoices directly?", a: "Yes. Send an invoice to their Business inbox and they can accept it as a supplier bill in their own books, with no retyping." },
      { q: "Can I see stock in each warehouse?", a: "Yes. Stock levels, movements and stock takes are kept per warehouse, and transfers move stock between them." },
    ],
  },
  {
    slug: "food-hospitality", icon: UtensilsCrossed, name: "Food and hospitality",
    tagline: "Know what every dish and drink costs you, and sell it at the till.",
    headline: "Recipe costing and sales for restaurants, bars and cafés",
    intro: "Put each dish and drink on a recipe and MannaBooks shows its cost and margin. When you sell, the ingredients come out of stock, so your cost of sales is right without counting every evening.",
    who: ["Restaurants and cafés", "Bars and lounges", "Fast food and takeaways", "Bakeries", "Hotels and guest houses", "Caterers"],
    uses: ["Recipes with cost and margin per dish or drink", "Meals and drinks made when sold, taking out ingredients", "Spirits kept in ml and sold by the shot", "Till and M-Pesa", "Online orders for pickup or delivery"],
    problems: [
      { title: "Prices set by guesswork", text: "A recipe lists each ingredient and quantity; MannaBooks prices it at today's average cost and shows the margin at your selling price." },
      { title: "Ingredients that disappear", text: "Dishes are made when sold, so each sale takes out its ingredients. A stock take shows what went missing." },
      { title: "Bottles sold by the shot", text: "Keep spirits in millilitres and sell by the shot. A 750 ml bottle becomes 30 shots of 25 ml, each costed." },
    ],
    day: [
      { title: "Receive supplies", text: "Record the morning's deliveries; ingredients go into stock at their cost." },
      { title: "Serve", text: "Sell dishes and drinks at the till; ingredients are taken out as each is sold." },
      { title: "Take orders online", text: "Customers order from your shop page for pickup or delivery and pay by M-Pesa." },
      { title: "Close", text: "Count the drawer and see the day's sales, food cost and margin." },
    ],
    example: {
      business: "A café",
      intro: "A chicken burger is sold at KES 650 (VAT inclusive). Its recipe: a bun (KES 25), a chicken fillet (KES 120), lettuce and tomato (KES 15) and sauce (KES 10).",
      steps: [
        "The recipe costs the burger at KES 170 from the ingredients' average costs.",
        "The burger is marked as made to order, so it isn't kept in stock itself.",
        "Selling 40 burgers in a day takes out 40 buns, 40 fillets and the rest.",
        "If the price of chicken goes up, the recipe's cost and margin update with the next delivery.",
      ],
      figures: [["Price (VAT inclusive)", "KES 650.00"], ["Price before VAT", "KES 560.34"], ["Recipe cost", "KES 170.00"], ["Margin per burger", "KES 390.34 (69.7%)"], ["40 burgers: margin", "KES 15,613.79"]],
    },
    plan: "duka", planNote: "Recipes, the till, stock and online orders are all in Duka.",
    goal: "Run a shop with a till",
    useCases: ["cost-recipes", "sell-at-the-till", "sell-online", "get-paid-by-mpesa", "track-stock"],
    guides: ["manufacturing", "pos", "online-shop", "products", "stock-takes"],
    faqs: [
      { q: "Do I have to make each dish in advance?", a: "No. Mark a dish as made to order and its ingredients come out of stock when it is sold. Use production orders only for things you make in batches, like bread." },
      { q: "Can customers order online?", a: "Yes. Switch on your online shop, choose which products show, and take orders for pickup or delivery, paid by M-Pesa or on delivery." },
    ],
  },
  {
    slug: "manufacturing", icon: Factory, name: "Manufacturing and processing",
    tagline: "Recipes, production runs and finished goods costed to the shilling.",
    headline: "Production costing for Kenyan manufacturers",
    intro: "Record what goes into each product, run production orders, and let MannaBooks cost your finished goods from the raw materials used. Your stock and cost of sales are right every month.",
    who: ["Food and beverage processors", "Animal feed millers", "Furniture makers", "Block and pavers makers", "Soap, detergent and cosmetics", "Printing and packaging", "Garment and textile makers"],
    uses: ["Recipes (bills of materials)", "Production orders that cost the finished goods", "Raw materials and finished stock", "Cost of sales that is right every month", "Stock takes"],
    problems: [
      { title: "Not knowing what a product costs", text: "A recipe lists the raw materials for one unit. MannaBooks prices it at average cost so you see the cost before you set the price." },
      { title: "Raw materials that don't reconcile", text: "Production orders take raw materials out and put finished goods in, so stock on paper matches the store." },
      { title: "Month-end guesswork", text: "Cost of sales comes from the finished goods actually sold, at what they cost to make." },
    ],
    day: [
      { title: "Buy raw materials", text: "LPOs, goods received and supplier bills; materials go into stock at their cost." },
      { title: "Plan production", text: "Raise a production order for the quantity you want to make." },
      { title: "Produce", text: "Complete the order; materials come out and finished goods go in at their cost." },
      { title: "Sell", text: "Invoices and cash sales take finished goods out at their production cost." },
    ],
    example: {
      business: "An animal feed miller",
      intro: "A 70 kg bag of dairy meal uses 40 kg of maize germ (KES 30 a kg), 20 kg of wheat bran (KES 25), 8 kg of cotton seed cake (KES 45) and 2 kg of minerals (KES 120). It sells at KES 2,900 a bag.",
      steps: [
        "The recipe costs one bag at KES 2,300.",
        "A production order for 100 bags takes out 4,000 kg of maize germ, 2,000 kg of bran, 800 kg of seed cake and 200 kg of minerals.",
        "100 bags of dairy meal go into finished stock at KES 2,300 each.",
        "Each bag sold is costed at KES 2,300, so the profit on every invoice is real.",
      ],
      figures: [["Maize germ (40 × 30)", "KES 1,200.00"], ["Wheat bran (20 × 25)", "KES 500.00"], ["Cotton seed cake (8 × 45)", "KES 360.00"], ["Minerals (2 × 120)", "KES 240.00"], ["Cost per bag", "KES 2,300.00"], ["Profit per bag at KES 2,900", "KES 600.00"], ["100 bags: raw materials used", "KES 230,000.00"]],
      note: "VAT follows each product's own rate.",
    },
    plan: "duka", planNote: "Recipes and production orders are in Duka. Choose Kampuni for approvals, budgets and fixed assets such as machinery.",
    goal: "Make products",
    useCases: ["cost-recipes", "track-stock", "control-spending", "vat-and-kra", "run-payroll"],
    guides: ["manufacturing", "inventory", "purchase-orders", "goods-received", "stock-takes"],
    faqs: [
      { q: "What if a raw material's price changes?", a: "Stock is kept at average cost, so new deliveries move the cost, and the recipe shows the new cost of making a unit straight away." },
      { q: "Can I make some products to order?", a: "Yes. A product made to order takes out its materials when it is sold, without a production order." },
    ],
  },
  {
    slug: "construction-real-estate", icon: HardHat, name: "Construction and real estate",
    tagline: "Profit per job, subcontractors, withholding tax and monthly rent.",
    headline: "Job costing for contractors and property managers",
    intro: "Run every job as a project with its own income and costs, from the quotation to the final invoice. Property managers bill rent and service charge every month without retyping.",
    who: ["Building and civil contractors", "Electrical and plumbing contractors", "Interior fit-out", "Property managers", "Real estate agents"],
    uses: ["Projects with income, costs and profit per job", "Quotations into invoices", "Service orders to subcontractors", "Withholding tax on supplier payments", "Recurring invoices for rent and service charge"],
    problems: [
      { title: "Not knowing which jobs make money", text: "Tag invoices, bills and expenses to a project and see its profit as the job goes, not after." },
      { title: "Subcontractors and withholding tax", text: "Give subcontractors service orders, record their bills and keep back withholding tax when you pay." },
      { title: "Rent invoices every month", text: "Set up recurring invoices once; they go out on the date, and tenants pay by paybill with the invoice number." },
    ],
    day: [
      { title: "Quote", text: "Send a quotation; when the client agrees it becomes an invoice in one click." },
      { title: "Buy for the job", text: "Materials and subcontractor work are tagged to the project as they are bought." },
      { title: "Bill", text: "Invoice the client and track what they still owe." },
      { title: "Review", text: "The project report shows income, costs and profit for each job." },
    ],
    example: {
      business: "A building contractor",
      intro: "A perimeter wall is quoted at KES 1,200,000 plus VAT. Materials cost KES 640,000 and a subcontractor's fee is KES 180,000.",
      steps: [
        "The quotation is accepted and becomes an invoice for KES 1,392,000 (KES 1,200,000 plus VAT of KES 192,000).",
        "Material bills and the subcontractor's service order are tagged to the project.",
        "When the subcontractor is paid, 3% withholding income tax (KES 5,400) is kept back and recorded for remittance to KRA.",
        "The project report shows the job's profit.",
      ],
      figures: [["Income before VAT", "KES 1,200,000.00"], ["Materials", "KES 640,000.00"], ["Subcontractor", "KES 180,000.00"], ["Project profit", "KES 380,000.00"], ["Withholding tax kept back", "KES 5,400.00"]],
      note: "Withholding tax rates depend on the service and the supplier; check yours with KRA or your accountant.",
    },
    plan: "duka", planNote: "Projects with buying and service orders are in Duka. Choose Kampuni for approvals and budgets per job.",
    goal: "Run jobs and projects",
    useCases: ["job-costing", "recurring-billing", "vat-and-kra", "control-spending"],
    guides: ["projects", "quotations", "service-orders", "recurring-invoices", "supplier-payments"],
    faqs: [
      { q: "Can I bill a client in stages?", a: "Yes. Raise an invoice for each stage against the same project; the project report adds them up." },
      { q: "Can tenants pay by M-Pesa?", a: "Yes. They pay your paybill with the invoice number as the account number, and the payment matches itself to the invoice." },
    ],
  },
  {
    slug: "professional-services", icon: Briefcase, name: "Professional services",
    tagline: "Win the work, quote, invoice and get paid on time.",
    headline: "Invoicing and CRM for firms that sell their time",
    intro: "Win work with the CRM, send quotations and invoices with payment links, and bill retainers every month. Track time-based work as projects and see what each client is worth.",
    who: ["Accountants and auditors", "Law firms", "Consultants", "Architects and engineers", "Marketing and creative agencies", "IT and software firms"],
    uses: ["Quotations, invoices and payment links", "Recurring retainers", "CRM: leads, deals and follow-ups", "Withholding tax on supplier payments", "Projects for client work", "Work reports from staff"],
    problems: [
      { title: "Leads that go cold", text: "Track leads and deals on a pipeline, with follow-up tasks so nothing is forgotten." },
      { title: "Clients who pay late", text: "Every invoice has a private link to view and pay by M-Pesa. Statements and reminders go to anyone overdue." },
      { title: "Retainers billed late", text: "Recurring invoices go out on the same day every month." },
    ],
    day: [
      { title: "Follow up", text: "See today's tasks and the deals in your pipeline." },
      { title: "Quote", text: "Send a quotation from a deal; when it's accepted, the deal is won and the invoice is ready." },
      { title: "Bill", text: "Invoices go out by email with a link to pay by M-Pesa." },
      { title: "Collect", text: "Payments match to invoices; statements show each client what they owe." },
    ],
    example: {
      business: "A consultancy",
      intro: "A client pays a monthly retainer of KES 80,000 plus VAT. The deal came in through the CRM.",
      steps: [
        "The deal moves along the pipeline; the quotation sent from it is accepted and the deal is marked won.",
        "A recurring invoice for KES 92,800 goes out by email on the 1st of every month, with a link to pay.",
        "The client pays by M-Pesa from the link and the invoice is marked paid.",
        "Over a year the client's statement shows 12 invoices and 12 payments, and the project shows the work done for them.",
      ],
      figures: [["Retainer before VAT", "KES 80,000.00"], ["VAT at 16%", "KES 12,800.00"], ["Invoice each month", "KES 92,800.00"], ["A year's fees before VAT", "KES 960,000.00"]],
    },
    plan: "biashara", planNote: "Sales, CRM, projects and payroll are in Biashara.",
    goal: "Send invoices and get paid",
    useCases: ["win-more-deals", "recurring-billing", "job-costing", "get-paid-by-mpesa", "vat-and-kra"],
    guides: ["crm", "quotations", "invoices", "recurring-invoices", "customer-portal", "work-reports"],
    faqs: [
      { q: "Can my accountant work in my books?", a: "Yes. Invite them with the Accountant role. Accountants don't count towards your plan's team size." },
      { q: "Can clients pay online?", a: "Yes. Every invoice has a private link where the client sees it and can pay by M-Pesa." },
    ],
  },
  {
    slug: "health", icon: HeartPulse, name: "Health",
    tagline: "Patients at the counter, insurers on invoice, drugs in stock.",
    headline: "Accounting and stock for clinics and pharmacies",
    intro: "Take patients' payments at the counter, invoice insurers and companies every month, and keep drugs and supplies in stock. Branches, payroll and approvals are there as the practice grows.",
    who: ["Clinics and medical centres", "Dental and eye clinics", "Laboratories", "Pharmacies", "Veterinary practices"],
    uses: ["Cash sales and invoices to insurers and companies", "Stock of drugs and supplies", "Staff payroll and leave", "Branches", "Approvals for purchases"],
    problems: [
      { title: "Insurers who pay months later", text: "Invoice each insurer and see what each owes and for how long." },
      { title: "Drugs that expire or go missing", text: "Stock comes in on goods received and goes out on every sale; stock takes show the difference." },
      { title: "Several branches", text: "Each branch has its own sales and stock, and you see them together." },
    ],
    day: [
      { title: "See patients", text: "Consultations and drugs go on a cash sale, paid by cash or M-Pesa." },
      { title: "Bill insurers", text: "Visits covered by insurance go on the insurer's invoice." },
      { title: "Restock", text: "Order from suppliers and receive deliveries into stock." },
      { title: "Pay staff", text: "Payroll with PAYE, SHIF, NSSF and the Housing Levy, and leave balances." },
    ],
    example: {
      business: "A medical centre",
      intro: "In a month the centre sees 42 patients covered by one insurer, billed at KES 186,500 in total, and sells KES 95,000 of medicines over the counter.",
      steps: [
        "Over-the-counter sales are cash sales, paid by cash or M-Pesa, and take the medicines out of stock.",
        "At the end of the month one invoice to the insurer lists the covered visits.",
        "The insurer's balance shows on the aged receivables report until they pay.",
        "When the payment arrives it is matched to the invoice.",
      ],
      figures: [["Insurer invoice", "KES 186,500.00"], ["Over-the-counter sales", "KES 95,000.00"], ["Month's income", "KES 281,500.00"]],
      note: "Many medical services are VAT exempt. Set the right VAT rate on each service and product.",
    },
    plan: "duka", planNote: "Duka has the counter, stock and buying. Choose Kampuni for several branches with approvals.",
    goal: "Run a shop with a till",
    useCases: ["sell-at-the-till", "track-stock", "run-payroll", "control-spending"],
    guides: ["cash-sales", "invoices", "inventory", "branches", "payroll"],
    faqs: [
      { q: "Is MannaBooks a patient records system?", a: "No. MannaBooks handles the money, stock and staff. Keep clinical records in your medical system." },
    ],
  },
  {
    slug: "education", icon: GraduationCap, name: "Education",
    tagline: "Fees invoiced every term and paid by paybill, with statements for parents.",
    headline: "Fees and accounting for schools and colleges",
    intro: "Invoice fees every term, let parents pay by paybill, and send statements that show exactly what is owed. Payroll for teaching and support staff is in the same books.",
    who: ["Private schools", "Colleges and training institutes", "Driving schools", "Daycare and kindergartens", "Tuition centres"],
    uses: ["Recurring invoices for fees", "M-Pesa payments matched to students' invoices", "Customer statements for parents", "Payroll for teaching and support staff", "Budgets per term or year"],
    problems: [
      { title: "Fees paid with no reference", text: "Parents pay your paybill with the invoice number as the account, so each payment finds its student." },
      { title: "Statements by hand", text: "Each family's statement is ready at any time: invoices, payments and the balance." },
      { title: "Payroll at month end", text: "PAYE, SHIF, NSSF and the Housing Levy for every teacher, with payslips on their phones." },
    ],
    day: [
      { title: "Start the term", text: "Fee invoices go out to every family." },
      { title: "Receive fees", text: "Paybill payments match to invoices as they arrive." },
      { title: "Follow up", text: "See who still owes and send reminders and statements." },
      { title: "Pay staff", text: "Run payroll and pay salaries." },
    ],
    example: {
      business: "A private primary school",
      intro: "320 pupils, with term fees of KES 35,000 each. Each family is a customer.",
      steps: [
        "Term fee invoices are raised for every pupil on the first day of term.",
        "Parents pay by paybill with the invoice number; payments match themselves.",
        "Two weeks in, 80% has been collected and the rest shows on the aged receivables report.",
        "Reminders and statements go to the families still owing.",
      ],
      figures: [["Fees invoiced (320 × 35,000)", "KES 11,200,000.00"], ["Collected in two weeks (80%)", "KES 8,960,000.00"], ["Still owed", "KES 2,240,000.00"]],
      note: "Education services are generally VAT exempt; set the fee item's VAT rate accordingly.",
    },
    plan: "biashara", planNote: "Invoicing, M-Pesa and payroll are in Biashara. Choose Kampuni for budgets and approvals.",
    goal: "Send invoices and get paid",
    useCases: ["recurring-billing", "get-paid-by-mpesa", "run-payroll", "control-spending"],
    guides: ["recurring-invoices", "mpesa", "reminders", "customers", "payroll"],
    faqs: [
      { q: "Can I import all the families at once?", a: "Yes. Import customers from a CSV file in Import and export; MannaBooks checks every row before anything is added." },
    ],
  },
  {
    slug: "agriculture", icon: Sprout, name: "Agriculture",
    tagline: "Profit per farm, crop or herd, inputs in stock and the tractor depreciated.",
    headline: "Farm accounting for Kenyan agribusiness",
    intro: "Run each farm, crop or herd as a cost centre, keep inputs in stock, pay permanent and casual staff, and keep a register of tractors, pumps and greenhouses.",
    who: ["Farms and greenhouses", "Dairy farms", "Poultry and pig farms", "Agro-processors", "Produce aggregators and exporters"],
    uses: ["Cost centres per farm, crop or herd", "Inputs in stock, used and costed", "Casual and permanent staff payroll", "Fixed assets: tractors, pumps, greenhouses", "Sales to buyers on invoice"],
    problems: [
      { title: "Not knowing which enterprise pays", text: "Tag income and costs to a cost centre and compare dairy, avocados and poultry side by side." },
      { title: "Inputs bought in bulk", text: "Feed, seed and fertiliser go into stock and are costed as they are used." },
      { title: "Machinery losing value", text: "The fixed asset register depreciates each machine every month." },
    ],
    day: [
      { title: "Buy inputs", text: "Feed, seed and fertiliser go into stock." },
      { title: "Use them", text: "Issue inputs to a cost centre as they are used." },
      { title: "Sell", text: "Invoice the processor or buyer and track payment." },
      { title: "Pay workers", text: "Payroll for permanent staff with statutory deductions." },
    ],
    example: {
      business: "A dairy farm",
      intro: "The farm delivers 12,000 litres of milk a month to a processor at KES 50 a litre. It bought a tractor for KES 3,200,000, written off over 8 years.",
      steps: [
        "The month's milk goes on one invoice to the processor, tagged to the Dairy cost centre.",
        "50 bags of dairy meal at KES 2,900 a bag go into stock and are issued to Dairy as they are fed.",
        "The tractor is depreciated by KES 33,333.33 every month.",
        "The cost centre report shows the dairy's income, feed and other costs.",
      ],
      figures: [["Milk sales (12,000 × 50)", "KES 600,000.00"], ["Dairy meal (50 × 2,900)", "KES 145,000.00"], ["Tractor depreciation a month", "KES 33,333.33"]],
    },
    plan: "kampuni", planNote: "Cost centres, budgets and fixed assets are in Kampuni.",
    goal: "Everything",
    useCases: ["track-stock", "run-payroll", "control-spending", "vat-and-kra"],
    guides: ["cost-centres", "fixed-assets", "inventory", "payroll", "budgets"],
    faqs: [
      { q: "Can I run two farms as separate businesses?", a: "Yes. Create a business for each and put them in a company group to see them together." },
    ],
  },
  {
    slug: "transport-logistics", icon: Truck, name: "Transport and logistics",
    tagline: "Profit per vehicle, fuel and repairs with their VAT, contracts billed monthly.",
    headline: "Accounting for transporters and logistics firms",
    intro: "Make every vehicle a cost centre and see what each truck earns after fuel, repairs, the driver and depreciation. Bill contract customers every month without retyping.",
    who: ["Transporters and fleet owners", "Courier and delivery firms", "Clearing and forwarding agents", "Tour and travel companies", "Car hire"],
    uses: ["Cost centres per vehicle", "Fuel, repairs and expenses with their VAT", "Vehicle register and depreciation", "Invoices in shillings or dollars", "Recurring contract billing"],
    problems: [
      { title: "Trucks that lose money quietly", text: "Tag trips, fuel and repairs to each vehicle and compare them every month." },
      { title: "Fuel receipts everywhere", text: "Record expenses as they happen, with their VAT to claim." },
      { title: "Depreciation done once a year", text: "The vehicle register depreciates each vehicle monthly." },
    ],
    day: [
      { title: "Invoice trips", text: "Each trip or contract goes on an invoice tagged to the vehicle." },
      { title: "Record costs", text: "Fuel, tyres and repairs as expenses, tagged to the vehicle." },
      { title: "Pay drivers", text: "Payroll with statutory deductions." },
      { title: "Review", text: "The cost centre report shows profit per vehicle." },
    ],
    example: {
      business: "A transporter with four trucks",
      intro: "One truck's month: six trips billed at KES 420,000 before VAT, fuel of KES 168,000, repairs of KES 36,000, the driver's pay of KES 45,000, and depreciation of KES 62,500.",
      steps: [
        "Trip invoices, fuel, repairs and the driver's pay are tagged to the truck's cost centre.",
        "Depreciation is posted to the truck by the fixed asset register.",
        "The cost centre report shows the truck's profit next to the other three.",
      ],
      figures: [["Income before VAT", "KES 420,000.00"], ["Fuel", "KES 168,000.00"], ["Repairs", "KES 36,000.00"], ["Driver", "KES 45,000.00"], ["Depreciation", "KES 62,500.00"], ["Truck's profit", "KES 108,500.00"]],
    },
    plan: "kampuni", planNote: "Cost centres and fixed assets are in Kampuni.",
    goal: "Everything",
    useCases: ["recurring-billing", "control-spending", "run-payroll", "vat-and-kra"],
    guides: ["cost-centres", "fixed-assets", "expenses", "recurring-invoices", "payroll"],
    faqs: [
      { q: "Can I bill a customer in dollars?", a: "Yes. Switch on the currencies you trade in and record their rates; documents are converted for your books at the rate on their date." },
    ],
  },
  {
    slug: "personal-services", icon: Scissors, name: "Personal and repair services",
    tagline: "Services and products at one till, paid by M-Pesa, with staff paid properly.",
    headline: "Simple books for salons, garages and service shops",
    intro: "Ring up services and products at the till, take M-Pesa, and see a simple profit report. Products and parts are kept in stock, and staff payroll is done for you.",
    who: ["Salons, barbers and spas", "Gyms", "Garages and mechanics", "Laundry and dry cleaners", "Photographers and event planners"],
    uses: ["Till or invoices for services", "Products and parts in stock", "M-Pesa till payments", "Commission and staff payroll", "Simple profit reports"],
    problems: [
      { title: "Cash and M-Pesa mixed up", text: "Each sale records how it was paid, and the shift count shows both." },
      { title: "Products used but never sold", text: "Products and parts are kept in stock; stock takes show what was used." },
      { title: "Staff pay worked out by hand", text: "Payroll with statutory deductions and payslips on their phones." },
    ],
    day: [
      { title: "Open", text: "Open the shift with the float." },
      { title: "Serve", text: "Services and products go on the sale, paid by cash or M-Pesa." },
      { title: "Close", text: "Count the drawer and see the day's takings." },
    ],
    example: {
      business: "A salon",
      intro: "A Saturday: 28 services worth KES 64,400 and KES 9,600 of hair products sold.",
      steps: [
        "Each customer's services and products go on one sale.",
        "KES 61,000 is paid by M-Pesa and KES 13,000 in cash.",
        "Products come out of stock as they are sold.",
        "The shift count compares the drawer with the KES 13,000 of cash sales.",
      ],
      figures: [["Services", "KES 64,400.00"], ["Products", "KES 9,600.00"], ["Day's takings", "KES 74,000.00"], ["Paid by M-Pesa", "KES 61,000.00"], ["Paid in cash", "KES 13,000.00"]],
    },
    plan: "duka", planNote: "The till and stock are in Duka. A service business without a till can start on Biashara.",
    goal: "Run a shop with a till",
    useCases: ["sell-at-the-till", "get-paid-by-mpesa", "run-payroll"],
    guides: ["pos", "mpesa", "products", "payroll"],
    faqs: [
      { q: "Can I start free?", a: "Yes. The Free plan covers invoices, cash sales and M-Pesa for one person, up to 30 documents a month." },
    ],
  },
  {
    slug: "ngos-churches", icon: HeartHandshake, name: "NGOs, churches and associations",
    tagline: "Programmes and donors as cost centres, budgets, and approvals before spending.",
    headline: "Fund accounting for NGOs, churches and associations",
    intro: "Track each programme or donor as a cost centre, set budgets and compare them with what was spent, and require approval before money leaves. Payroll and the asset register are in the same books.",
    who: ["NGOs and foundations", "Churches and ministries", "Community and welfare groups", "Professional associations"],
    uses: ["Cost centres per programme or donor", "Budgets and budget against actual", "Approval chains for spending", "Payroll and leave", "Fixed assets register"],
    problems: [
      { title: "Donor reports by spreadsheet", text: "Tag every expense to its programme and print budget against actual at any time." },
      { title: "Spending without sign-off", text: "Orders and vouchers go up the approval chain before they count." },
      { title: "Assets bought with grants", text: "Keep a register of vehicles, computers and equipment with their depreciation." },
    ],
    day: [
      { title: "Request", text: "Staff raise a purchase order or payment voucher for their programme." },
      { title: "Approve", text: "It goes to the programme manager, then finance." },
      { title: "Pay and record", text: "Once approved it is paid and tagged to the programme." },
      { title: "Report", text: "Budget against actual for each programme or donor." },
    ],
    example: {
      business: "An NGO",
      intro: "A donor grant funds a programme with a training budget of KES 1,200,000 for the year. Spending over KES 50,000 needs two approvals.",
      steps: [
        "The budget is set for the programme's training line.",
        "A KES 120,000 venue booking goes to the programme manager and then finance before it is paid.",
        "By September, KES 860,000 has been spent on training.",
        "The budget report shows 72% used, with KES 340,000 left.",
      ],
      figures: [["Training budget", "KES 1,200,000.00"], ["Spent to date", "KES 860,000.00"], ["Used", "72%"], ["Left", "KES 340,000.00"]],
      note: "Registered NGOs and churches get 25% off.",
    },
    plan: "kampuni", planNote: "Budgets, approvals, cost centres and fixed assets are in Kampuni, with 25% off for registered NGOs and churches.",
    goal: "Everything",
    useCases: ["control-spending", "run-payroll", "vat-and-kra"],
    guides: ["budgets", "approvals", "cost-centres", "fixed-assets", "payment-vouchers"],
    faqs: [
      { q: "How do I get the NGO discount?", a: "Tell us through the contact page or Help and feedback, with your registration details, and we'll apply it to your business." },
    ],
  },
  {
    slug: "company-groups", icon: Network, name: "Groups of companies",
    tagline: "Every company in one sign-in, with consolidated reports.",
    headline: "Consolidated accounts for groups of companies",
    intro: "Run each company in its own books, record sales and loans between them once, and see the group's profit and loss and balance sheet with the internal amounts taken out.",
    who: ["Family businesses with several companies", "Holding companies", "Owners with a shop, a transport firm and a farm"],
    uses: ["One sign-in for every business", "Sales, loans and repayments between companies posted on both sides", "Consolidated profit and loss and balance sheet", "Business inbox between the companies"],
    problems: [
      { title: "Several logins, several spreadsheets", text: "Switch between companies in one click and report on them together." },
      { title: "Money moving between companies", text: "Record an internal sale or loan once and it is posted in both companies' books." },
      { title: "Group accounts by hand", text: "Consolidated reports take out the sales and balances between the companies for you." },
    ],
    day: [
      { title: "Work in each company", text: "Each company keeps its own sales, stock and payroll." },
      { title: "Record internal deals", text: "A sale or loan between companies is recorded once for both." },
      { title: "See the group", text: "Consolidated profit and loss and balance sheet whenever you need them." },
    ],
    example: {
      business: "An owner with a hardware shop and a transport firm",
      intro: "This year the shop sold KES 2,400,000 and the transport firm KES 900,000, of which KES 150,000 was delivering for the shop. The shop also lent the transport firm KES 500,000.",
      steps: [
        "The deliveries are recorded once as an internal sale: income in the transport firm, a cost in the shop.",
        "The loan shows as owed to the shop in one company and owed by the transport firm in the other.",
        "The group's consolidated profit and loss takes out the KES 150,000 internal sale.",
        "The consolidated balance sheet takes out the KES 500,000 loan, since the group owes it to itself.",
      ],
      figures: [["Shop sales", "KES 2,400,000.00"], ["Transport sales", "KES 900,000.00"], ["Less internal sales", "KES (150,000.00)"], ["Group sales", "KES 3,150,000.00"]],
    },
    plan: "kampuni", planNote: "Company groups and consolidation are in Kampuni.",
    goal: "Everything",
    useCases: ["consolidate-a-group", "control-spending", "vat-and-kra"],
    guides: ["company-groups", "business-inbox", "financial-reports"],
    faqs: [
      { q: "Does each company need its own plan?", a: "Yes, each business has its own subscription, and companies in a group report together." },
    ],
  },
];

export function findIndustry(slug: string) {
  return INDUSTRIES.find((i) => i.slug === slug);
}
