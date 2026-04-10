import Stripe from "stripe";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string, {
  apiVersion: "2025-10-29.clover",
});

const PLANNED_PRICES = {
  pro: { name: "Nex-T1 Pro", monthly: 2999, yearly: 28790, credits: 1200 },
  trader: { name: "Nex-T1 Trader", monthly: 7999, yearly: 76790, credits: 4000 },
  ultra: { name: "Nex-T1 Ultra", monthly: 19999, yearly: 191990, credits: 14000 },
  enterprise: { name: "Nex-T1 Enterprise", monthly: 59999, yearly: 575990, credits: 60000 },
};

async function main() {
  console.log("Setting up Updated Stripe SaaS Prices...");
  const priceMap: Record<string, string> = {};

  for (const [planKey, planConfig] of Object.entries(PLANNED_PRICES)) {
    const existingProducts = await stripe.products.search({
      query: `name:'${planConfig.name}' AND active:'true'`,
    });

    let product = existingProducts.data[0];
    if (!product) {
       product = await stripe.products.create({
         name: planConfig.name,
         description: `Subscription tier: ${planConfig.name} (${planConfig.credits} credits/mo)`,
         metadata: { plan: planKey },
       });
    }

    // Monthly Price
    const monthlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: planConfig.monthly,
      currency: "usd",
      recurring: { interval: "month" },
      metadata: { plan: planKey, period: "monthly" },
    });
    priceMap[monthlyPrice.id] = planKey;

    // Yearly Price
    const yearlyPrice = await stripe.prices.create({
      product: product.id,
      unit_amount: planConfig.yearly,
      currency: "usd",
      recurring: { interval: "year" },
      metadata: { plan: planKey, period: "yearly" },
    });
    priceMap[yearlyPrice.id] = planKey;
    
    console.log(`${planConfig.name} - Monthly: ${monthlyPrice.id} | Yearly: ${yearlyPrice.id}`);
  }

  const overageName = "Nex-T1 Overage Credits";
  const existingOverageProducts = await stripe.products.search({
    query: `name:'${overageName}' AND active:'true'`,
  });
  let overageProduct = existingOverageProducts.data[0];
  if (!overageProduct) {
    overageProduct = await stripe.products.create({
      name: overageName,
      description: "250 Extra Credits",
      metadata: { type: "overage", credits: 250 },
    });
  }

  const overagePrices = await stripe.prices.list({ product: overageProduct.id, active: true });
  let overagePrice = overagePrices.data.find((p) => p.unit_amount === 1000 && p.type === "one_time");
  if (!overagePrice) {
    overagePrice = await stripe.prices.create({
      product: overageProduct.id,
      unit_amount: 1000,
      currency: "usd",
      metadata: { type: "overage", credits: 250 },
    });
  }

  console.log("--- RESULTING PRICE MAP ---");
  console.log(JSON.stringify(priceMap, null, 2));
  console.log(`Overage Price ID: ${overagePrice.id}`);
}

main().catch(console.error);
