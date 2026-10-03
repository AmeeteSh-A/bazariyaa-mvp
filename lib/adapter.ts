export type Product = {
  id: string;
  buy: number;
  tag: string;
  cat: string;
  name: string;
  rating: number;
  reviews: string;
  real: string;
  price: string;
  numericPrice: number;
  was?: string;
  trend?: "down" | "up" | "flat";
  cta: "compare-on" | "compare-off" | "view";
  images: string[];
  specs: [string, string][];
  history: { date: string; price: number }[];
};

function parseBsonNumber(val: any): number {
  if (val == null) return 0;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val.replace(/[^0-9.-]+/g, ""));
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === 'object') {
    if (val.$numberDouble !== undefined) return parseFloat(val.$numberDouble);
    if (val.$numberInt !== undefined) return parseInt(val.$numberInt, 10);
    if (val.$numberDecimal !== undefined) return parseFloat(val.$numberDecimal);
  }
  return 0;
}

export function normalizeAmazonData(raw: any, historyDoc: any): Product {
  const priceVal = parseBsonNumber(raw.price ?? raw.selected_variant?.price);
  const msrpVal = parseBsonNumber(raw.msrp ?? raw.original_price);
  
  const rawHistory = historyDoc?.history || [];
  const historyPrices = rawHistory.map((h: any) => parseBsonNumber(h.price));
  const lastPrice = historyPrices.length > 1 ? historyPrices[historyPrices.length - 2] : priceVal;
  
  let trend: "up" | "down" | "flat" = "flat";
  if (priceVal > lastPrice) trend = "up";
  if (priceVal < lastPrice) trend = "down";

  const ratingMatch = raw.attributes?.['Customer Reviews']?.match(/([\d.]+)\s+out of/);
  const rating = ratingMatch ? parseFloat(ratingMatch[1]) : parseFloat(raw.rating || "0");
  
  const reviewsMatch = raw.attributes?.['Customer Reviews']?.match(/\(([\d,]+)\)/);
  const reviews = reviewsMatch ? reviewsMatch[1] : "0";

  const cat = raw.categories?.[1]?.name || "Uncategorized";
  const id = raw._id?.$oid || raw._id || raw.id || raw.product_id;

  const specs = Object.entries(raw.attributes || {})
    .filter(([key]) => key !== 'Customer Reviews' && key !== 'Best Sellers Rank')
    .slice(0, 12) as [string, string][];

  const history = rawHistory.map((h: any) => ({
    date: h.timestamp?.$date || h.timestamp || new Date().toISOString(),
    price: parseBsonNumber(h.price)
  }));

  return {
    id: String(id),
    buy: Math.floor(Math.random() * 20) + 80,
    tag: cat.toUpperCase(),
    cat: cat,
    name: raw.product_title || raw.title || "Unknown Product",
    rating: rating,
    reviews: reviews,
    real: "90%",
    price: `${raw.currency_code || 'AED'} ${priceVal}`,
    numericPrice: priceVal,
    was: msrpVal > 0 ? `${raw.currency_code || 'AED'} ${msrpVal}` : undefined,
    trend: trend,
    cta: "view",
    images: raw.main_image ? [raw.main_image] : [],
    specs: specs,
    history: history
  };
}

export function normalizeSharafDGData(raw: any, historyDoc: any): Product {
  const priceVal = parseBsonNumber(raw.sale_price ?? raw.price);
  const msrpVal = parseBsonNumber(raw.msrp ?? raw.original_price);
  
  const rawHistory = historyDoc?.history || [];
  const historyPrices = rawHistory.map((h: any) => parseBsonNumber(h.price));
  const lastPrice = historyPrices.length > 1 ? historyPrices[historyPrices.length - 2] : priceVal;
  
  let trend: "up" | "down" | "flat" = "flat";
  if (priceVal > lastPrice) trend = "up";
  if (priceVal < lastPrice) trend = "down";

  const rating = parseFloat(raw.average_rating || "0");
  const reviews = raw.number_of_reviews?.toString() || "0";

  const cat = raw.category2 || raw.category || "Uncategorized";
  const id = raw._id?.$oid || raw._id || raw.id || raw.product_id;

  const specs = Object.entries(raw.product_specification || {}).slice(0, 12) as [string, string][];

  const history = rawHistory.map((h: any) => ({
    date: h.timestamp?.$date || h.timestamp || new Date().toISOString(),
    price: parseBsonNumber(h.price)
  }));

  return {
    id: String(id),
    buy: Math.floor(Math.random() * 20) + 80,
    tag: cat.toUpperCase(),
    cat: cat,
    name: raw.product_title || raw.title || "Unknown Product",
    rating: rating,
    reviews: reviews,
    real: "90%",
    price: `${raw.currency || 'AED'} ${priceVal}`,
    numericPrice: priceVal,
    was: msrpVal > 0 ? `${raw.currency || 'AED'} ${msrpVal}` : undefined,
    trend: trend,
    cta: "view",
    images: raw.images || (raw.product_image ? [raw.product_image] : []),
    specs: specs,
    history: history
  };
}

export function normalizeProduct(raw: any, historyDoc: any): Product {
  if (raw.site_name === 'amazon.ae' || raw.url?.includes('amazon')) {
    return normalizeAmazonData(raw, historyDoc);
  }
  if (raw.site_name === 'sharafdg' || raw.url?.includes('sharafdg')) {
    return normalizeSharafDGData(raw, historyDoc);
  }
  return normalizeAmazonData(raw, historyDoc);
}