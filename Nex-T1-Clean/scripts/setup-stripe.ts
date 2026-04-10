import { Stripe } from "stripe";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-10-29.clover",
});

const PLANNED_PRICES = {
  pro: { name: "Nex-T1 Pro", amount: 2999, interval: "month", credits: 1200 },
  trader: { name: "Nex-T1 Trader", amount: 7999, interval: "month", credits: 4000 },
  ultra: { name: "Nex-T1 Ultra", amount: 19999, interval: "month", credits: 14000 },
  enterprise: { name: "Nex-T1 Enterprise", amount: 59999, interval: "month", credits: 60000 },
};

async function main() {
  console.log("Setting up Stripe Products and Prices...");
  const priceMap: Record<string, string> = {};

  for (const [planKey, planConfig] of Object.entries(PLANNED_PRICES)) {
    const existingProducts = await stripe.products.search({
      query: `name:'${planConfig.name}' AND active:'true'`,
    });

    let product = existingProducts.data[0];
    if (!product) {
       console.log(`Creating product ${planConfig.name}...`);
       product = await stripe.products.create({
         name: planConfig.name,
         description: `Subscription tier: ${planConfig.name} (${planConfig.credits} credits/mo)`,
         metadata: { plan: planKey },
       });
    } else {
       console.log(`Product ${planConfig.name} already exists: ${product.id}`);
    }

    const existingPrices = await stripe.prices.list({ product: product.id, active: true });
    let price = existingPrices.data.find(p => p.unit_amount === planConfig.amount && p.recurring?.interval === planConfig.interval);

    if (!price) {
      console.log(`Creating price for ${planConfig.name}...`);
      price = await stripe.prices.create({
        product: product.id,
        unit_amount: planConfig.amount,
        currency: "usd",
        recurring: { interval: planConfig.interval as "month" },
        metadata: { plan: planKey },
      });
    } else {
      console.log(`Price for ${planConfig.name} already exists: ${price.id}`);
    }

    priceMap[price.id] = planKey;
  }

  const overageName = "Nex-T1 Overage Credits";
  const existingOverageProducts = await stripe.products.search({
    query: `name:'${overageName}' AND active:'true'`,
  });
  let overageProduct = existingOverageProducts.data[0];
  if (!overageProduct) {
     console.log(`Creating product ${overageName}...`);
     overageProduct = await stripe.products.create({
       name: overageName,
       description: "250 Extra Credits",
       metadata: { type: "overage", credits: 250 },
     });
  }

  const overagePrices = await stripe.prices.list({ product: overageProduct.id, active: true });
  let overagePrice = overagePrices.data.find(p => p.unit_amount === 1000 && p.type === "one_time");
  
  if (!overagePrice) {
    console.log(`Creating overage price...`);
    overagePrice = await stripe.prices.create({
      product: overageProduct.id,
      unit_amount: 1000,
      currency: "usd",
      metadata: { type: "overage", credits: 250 },
    });
  }

  console.log("--- RESULTING PRICE MAP ---");
  for (const [priceId, plan] of Object.entries(priceMap)) {
    console.log(`  "${priceId}": "${plan}",`);
  }
  
  console.log(`Overage Price ID: ${overagePrice.id}`);
}

main().catch(console.error);
