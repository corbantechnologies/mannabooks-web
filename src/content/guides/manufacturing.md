# Manufacturing

For businesses that make what they sell: blocks, furniture, bakery goods, animal feed, restaurant meals.

## Recipes

A **recipe** (bill of materials) lists the ingredients or components that make a product, for example *10 concrete blocks = 1 bag of cement + 3 bags of sand*. The ingredients must track stock. The product made either tracks stock (made ahead, in batches) or is **made when sold** (see below).

## What a recipe costs

Each saved recipe shows **What it costs to make**:

- each ingredient at the **average cost of the stock you have**, or its cost price when none is in stock;
- the cost of one batch and of **one finished unit**;
- the **margin on one** at the product's selling price, in shillings and as a percentage. It shows amber below 20% and red when you would lose money.

The **Recipes** list shows the cost of one and the margin for every recipe, so you can see which products need a new price when ingredient costs go up. Costs change as you buy stock; save the recipe again to refresh the figures on its page.

## Making ahead: production orders

For products that track stock:

1. **Manufacturing > Production > New production order**: choose the recipe and how many to make. The components needed are worked out.
2. When it is made, open the order, change any component quantity that was really different, and choose **Complete**.

The components come out of stock at their average cost, and the finished products go in at that total cost divided by the quantity made. Their cost then flows to cost of sales when they are sold.

## Made when sold

For a restaurant, bar or anything made to order, tick **Made when sold, from a recipe** on the product (and leave **Track stock** off), then add its recipe.

- Each invoice, cash sale or till sale of the product takes its recipe's ingredients out of the branch's warehouse, scaled to the quantity sold. Two burgers take twice the beef and buns.
- The ingredients' cost is posted as the cost of sales of that sale.
- Voiding the sale puts the ingredients back.
- The sale is refused if an ingredient would go below zero, or if the product has no active recipe.
- These products aren't made ahead, so they can't have production orders.
