import { normalizeProduct } from "../adapter";
import { ParsedQuery } from "./queryParser";
import { ENTITY_ONTOLOGY, MODIFIER_LEXICON, BILINGUAL_EQUIVALENTS } from "./ontology";

export type NormalizedSearchProduct = {
  id: string;
  source: string;
  source_product_id: string;
  name: string;
  brand: string;
  category: string;
  subcategory: string;
  product_type: string;
  entity_type: string;
  model: string;
  model_number: string;
  description: string;
  price: string;
  numericPrice: number;
  currency: string;
  image: string | null;
  url: string | null;
  rating: number;
  reviews: string;
  buy: number;
  attributes: Record<string, string>;
  score: number;
  searchScore: number;
  match_reason: string;
};

export type SearchBucket = {
  exact: NormalizedSearchProduct[];
  similar: NormalizedSearchProduct[];
  associated: NormalizedSearchProduct[];
};

export const SCORING_WEIGHTS = {
  EXACT_PHRASE_MATCH: 0.30,
  TOKEN_COVERAGE: 0.25,
  BRAND_MATCH: 0.15,
  MODEL_MATCH: 0.30,
  VARIETY_MATCH: 0.20,
  ENTITY_TYPE_MATCH: 0.20,
  ATTRIBUTE_MATCH: 0.20,
  FUZZY_SIMILARITY: 0.15,
  DB_SIGNAL: 0.10
};

const UNIVERSAL_ACCESSORY_HEADS = [
  "wrist rest",
  "palm support",
  "mouse pad",
  "mousepad",
  "screen protector",
  "tempered glass",
  "laptop bag",
  "laptop sleeve",
  "laptop stand",
  "cooling pad",
  "cooler pad",
  "usb hub",
  "type c hub",
  "docking station",
  "back cover",
  "phone case",
  "protective case",
  "carrying case",
  "keyboard cover",
  "keyboard skin",
  "webcam cover",
  "privacy screen",
  "privacy filter",
  "charging cable",
  "car charger",
  "wall charger",
  "power bank",
  "adapter",
  "holder",
  "mount",
  "strap"
];

function trigramSimilarity(a: string, b: string): number {
  const s1 = `  ${a.toLowerCase()} `;
  const s2 = `  ${b.toLowerCase()} `;
  if (s1.trim().length === 0 || s2.trim().length === 0) return 0;

  const trigrams1 = new Set<string>();
  for (let i = 0; i < s1.length - 2; i++) trigrams1.add(s1.slice(i, i + 3));

  const trigrams2 = new Set<string>();
  for (let i = 0; i < s2.length - 2; i++) trigrams2.add(s2.slice(i, i + 3));

  let intersection = 0;
  trigrams1.forEach((t) => {
    if (trigrams2.has(t)) intersection++;
  });

  const union = trigrams1.size + trigrams2.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

function extractProductUnitGramsOrMl(text: string): number | null {
  const withoutTech = text.replace(/\b(\d+)\s*(gb|tb|5g|4g)\b/gi, "");

  const volMatch = withoutTech.match(/\b(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|litres)\b/i);
  if (volMatch) {
    const val = parseFloat(volMatch[1]);
    const isLitre = volMatch[2].toLowerCase().startsWith("l");
    return isLitre ? Math.round(val * 1000) : Math.round(val);
  }

  const wtMatch = withoutTech.match(/\b(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|gram|grams)\b/i);
  if (wtMatch) {
    const val = parseFloat(wtMatch[1]);
    const isKg = wtMatch[2].toLowerCase().startsWith("k");
    return isKg ? Math.round(val * 1000) : Math.round(val);
  }

  return null;
}

function detectProductEntityType(
  name: string,
  categoryPath: string,
  subcategory: string
): string {
  const nameLower = name.toLowerCase();
  const catLower = `${categoryPath} ${subcategory}`.toLowerCase();

  const primaryClause = nameLower
    .split(/\b(?:for|compatible with|fits|works with)\b/)[0]
    .split("|")[0];

  if (UNIVERSAL_ACCESSORY_HEADS.some((acc) => primaryClause.includes(acc))) {
    return "accessory";
  }

  if (
    /\b(lip|cheek|blush|primer|mascara|eyeliner|foundation|concealer|serum|cleanser|moisturizer|face wash|body wash|shampoo|conditioner|eau de parfum|eau de toilette)\b/.test(
      primaryClause
    ) ||
    /\b(beauty|makeup|cosmetics|skin care|skincare|fragrance|perfume)\b/.test(catLower)
  ) {
    return "beauty";
  }

  const snackOverride = ENTITY_ONTOLOGY.filter(
    (e) => e.canonicalType === "namkeen" || e.canonicalType === "chips" || e.canonicalType === "biscuit"
  );
  for (const snack of snackOverride) {
    if (snack.headNouns.some((hn) => new RegExp(`\\b${hn}\\b`, "i").test(primaryClause))) {
      if (!snack.disqualifiers.some((d) => primaryClause.includes(d))) {
        return snack.canonicalType;
      }
    }
  }

  for (const entity of ENTITY_ONTOLOGY) {
    const hasDisqualifier = entity.disqualifiers.some((d) => primaryClause.includes(d) || catLower.includes(d));
    if (hasDisqualifier) continue;

    const matchesCategory = entity.categoryKeywords.some((ck) => catLower.includes(ck));
    const matchesHeadNoun = entity.headNouns.some((hn) =>
      new RegExp(`\\b${hn}\\b`, "i").test(primaryClause)
    );

    if (matchesHeadNoun || (matchesCategory && entity.domain === "electronics")) {
      return entity.canonicalType;
    }
  }

  if (/\b(case|cover|sleeve|bag|stand|holder|mount|protector|cable|charger|adapter)\b/.test(primaryClause)) {
    return "accessory";
  }

  return "general";
}

function toCanonicalProduct(
  raw: any,
  rowId?: string
): Omit<NormalizedSearchProduct, "score" | "searchScore" | "match_reason"> {
  const uiProduct = normalizeProduct(raw, null);
  const attrs: Record<string, string> = {};

  if (raw.attributes && typeof raw.attributes === "object") {
    for (const [k, v] of Object.entries(raw.attributes)) {
      if (typeof v === "string" || typeof v === "number") attrs[k] = String(v);
    }
  }
  if (raw.product_specification && typeof raw.product_specification === "object") {
    for (const [k, v] of Object.entries(raw.product_specification)) {
      if (typeof v === "string" || typeof v === "number") attrs[k] = String(v);
    }
  }

  const allCategoryNames = Array.isArray(raw.categories)
    ? raw.categories.map((c: any) => c?.name).filter(Boolean)
    : [];

  let brand =
    raw.attributes?.Brand ||
    raw.product_specification?.Brand ||
    raw.brand ||
    "";

  if ((!brand || brand.toLowerCase().includes("renewed")) && /apple|macbook|iphone|ipad/i.test(uiProduct.name)) {
    brand = "Apple";
  }

  const category =
    allCategoryNames[0] ||
    raw.category ||
    uiProduct.cat ||
    "Uncategorized";

  const subcategory =
    allCategoryNames[1] ||
    allCategoryNames[2] ||
    raw.category2 ||
    category;

  const productTypePath = allCategoryNames.join(" > ") || String(subcategory || category);
  const fullName = raw.product_name || raw.product_title || raw.title || uiProduct.name;
  const entityType = detectProductEntityType(fullName, productTypePath, String(subcategory));

  const model =
    raw.attributes?.["Model name"] ||
    raw.attributes?.["Model Name"] ||
    raw.product_specification?.["Model Name"] ||
    "";

  const modelNumber =
    raw.attributes?.["Item model number"] ||
    raw.attributes?.ASIN ||
    raw.asin ||
    raw.sku ||
    "";

  return {
    id: rowId || uiProduct.id,
    source: raw.site_name || (raw.url?.includes("sharafdg") ? "sharafdg" : "amazon.ae"),
    source_product_id: String(raw.asin || raw.sku || raw.product_id || uiProduct.id),
    name: fullName,
    brand: String(brand),
    category: String(category),
    subcategory: String(subcategory),
    product_type: productTypePath,
    entity_type: entityType,
    model: String(model),
    model_number: String(modelNumber),
    description: String(raw.description || raw.feature_bullets || "").slice(0, 300),
    price: uiProduct.price,
    numericPrice: uiProduct.numericPrice,
    currency: raw.currency_code || raw.currency || "AED",
    image: uiProduct.images?.[0] || null,
    url: raw.url || null,
    rating: uiProduct.rating,
    reviews: uiProduct.reviews,
    buy: uiProduct.buy,
    attributes: attrs
  };
}

export function classifyResults(
  dbResults: any[],
  parsedQuery: ParsedQuery
): SearchBucket {
  const bucket: SearchBucket = { exact: [], similar: [], associated: [] };
  const seenIds = new Set<string>();

  const queryLower = parsedQuery.cleanQuery.toLowerCase();
  const targetEntityDef = ENTITY_ONTOLOGY.find((e) => e.canonicalType === parsedQuery.productType);

  const scoredItems: Array<
    NormalizedSearchProduct & {
      isAssociatedCandidate: boolean;
      hasRequirementConflict: boolean;
      isDisqualifiedForEntity: boolean;
      matchedTokenRatio: number;
    }
  > = [];

  for (const row of dbResults) {
    const rawData = row.data || row;
    const canonical = toCanonicalProduct(rawData, row.id);
    if (seenIds.has(canonical.id)) continue;
    seenIds.add(canonical.id);

    const nameLower = canonical.name.toLowerCase();
    const brandLower = canonical.brand.toLowerCase();
    const catLower = `${canonical.category} ${canonical.subcategory} ${canonical.product_type}`.toLowerCase();
    const modelLower = `${canonical.model} ${canonical.model_number}`.toLowerCase();
    const attrString = JSON.stringify(canonical.attributes).toLowerCase();
    const descLower = canonical.description.toLowerCase();

    const fullSearchText = `${nameLower} ${brandLower} ${catLower} ${modelLower} ${attrString} ${descLower}`;

    const matchesTargetAssociation = targetEntityDef
      ? targetEntityDef.associatedTypes.some((assoc) => {
          const equivalents = BILINGUAL_EQUIVALENTS[assoc] || [assoc];
          return equivalents.some((eq) => nameLower.includes(eq) || canonical.entity_type === eq);
        }) && canonical.entity_type !== targetEntityDef.canonicalType
      : false;

    const isDerivativeSnackOfVegetable =
      (parsedQuery.productType === "potato" || parsedQuery.productType === "onion" || parsedQuery.productType === "tomato") &&
      (canonical.entity_type === "chips" || canonical.entity_type === "namkeen");

    const isAssociatedCandidate =
      Boolean(row.is_associated_fetch) ||
      (canonical.entity_type === "accessory" && parsedQuery.productType !== "accessory") ||
      matchesTargetAssociation ||
      isDerivativeSnackOfVegetable;

    let isDisqualifiedForEntity = false;
    if (targetEntityDef && !isAssociatedCandidate) {
      if (targetEntityDef.disqualifiers.some((d) => nameLower.includes(d) || catLower.includes(d))) {
        isDisqualifiedForEntity = true;
      }
      if (
        canonical.entity_type !== "general" &&
        canonical.entity_type !== targetEntityDef.canonicalType
      ) {
        isDisqualifiedForEntity = true;
      }
    }

    let score = 0;
    const reasons: string[] = [];

    const bilingualPhraseMatches =
      nameLower.includes(queryLower) ||
      modelLower.includes(queryLower) ||
      (parsedQuery.productType &&
        parsedQuery.tokens.length === 1 &&
        (BILINGUAL_EQUIVALENTS[parsedQuery.tokens[0]] || []).some((eq) =>
          new RegExp(`\\b${eq}\\b`, "i").test(nameLower)
        ));

    if (bilingualPhraseMatches && !isDisqualifiedForEntity) {
      score += SCORING_WEIGHTS.EXACT_PHRASE_MATCH;
      reasons.push("exact_phrase");
    }

    let matchedGroups = 0;
    for (const eqGroup of parsedQuery.equivalentGroups) {
      const groupHit = eqGroup.some((term) => fullSearchText.includes(term));
      if (groupHit) {
        matchedGroups++;
      } else if (
        parsedQuery.productType &&
        canonical.entity_type === parsedQuery.productType &&
        eqGroup.some((t) => t === parsedQuery.productType || t === "phone" || t === "laptop")
      ) {
        matchedGroups++;
      } else if (parsedQuery.attributes.modifier && eqGroup.includes(parsedQuery.attributes.modifier)) {
        const modSignals = MODIFIER_LEXICON[parsedQuery.attributes.modifier] || [];
        if (modSignals.some((sig) => fullSearchText.includes(sig))) {
          matchedGroups++;
        }
      }
    }

    const matchedTokenRatio =
      parsedQuery.equivalentGroups.length > 0
        ? matchedGroups / parsedQuery.equivalentGroups.length
        : 0;

    if (matchedTokenRatio > 0) {
      score += matchedTokenRatio * SCORING_WEIGHTS.TOKEN_COVERAGE;
      if (matchedTokenRatio === 1) reasons.push("all_tokens_matched");
    }

    let hasBrandConflict = false;
    if (parsedQuery.brand) {
      if (brandLower.includes(parsedQuery.brand) || nameLower.includes(parsedQuery.brand)) {
        score += SCORING_WEIGHTS.BRAND_MATCH;
        reasons.push("brand_match");
      } else {
        hasBrandConflict = true;
      }
    }

    let hasModelConflict = false;
    if (parsedQuery.model) {
      const mLower = parsedQuery.model.toLowerCase();
      if (
        nameLower.includes(mLower) ||
        modelLower.includes(mLower) ||
        canonical.source_product_id.toLowerCase().includes(mLower)
      ) {
        score += SCORING_WEIGHTS.MODEL_MATCH;
        reasons.push("model_match");
      } else {
        hasModelConflict = true;
      }
    }

    let hasVarietyConflict = false;
    if (parsedQuery.variety) {
      const vKey = parsedQuery.variety.toLowerCase();
      const vSignals = MODIFIER_LEXICON[vKey] || [vKey];
      if (vSignals.some((sig) => fullSearchText.includes(sig))) {
        score += SCORING_WEIGHTS.VARIETY_MATCH;
        reasons.push(`variety_${vKey}`);
      } else {
        hasVarietyConflict = true;
      }
    }

    let hasEntityConflict = false;
    if (parsedQuery.productType && !isAssociatedCandidate) {
      if (canonical.entity_type === parsedQuery.productType && !isDisqualifiedForEntity) {
        score += SCORING_WEIGHTS.ENTITY_TYPE_MATCH;
        reasons.push(`entity_${canonical.entity_type}`);
      } else {
        hasEntityConflict = true;
      }
    }

    let hasStorageConflict = false;
    if (parsedQuery.attributes.storage) {
      const targetStorage = parsedQuery.attributes.storage.toLowerCase().replace(/\s+/g, "");
      const normalizedFull = fullSearchText.replace(/\s+/g, "");
      if (normalizedFull.includes(targetStorage)) {
        score += SCORING_WEIGHTS.ATTRIBUTE_MATCH;
        reasons.push("storage_match");
      } else {
        hasStorageConflict = true;
      }
    }

    let hasNetworkConflict = false;
    if (parsedQuery.attributes.network) {
      const targetNet = parsedQuery.attributes.network.toLowerCase();
      const hasNet = new RegExp(`\\b${targetNet}\\b`, "i").test(fullSearchText);
      const isWifiOnly = /\bwi-?fi\s+only\b/i.test(nameLower);
      if (hasNet && !isWifiOnly) {
        score += SCORING_WEIGHTS.ATTRIBUTE_MATCH;
        reasons.push("network_match");
      } else {
        hasNetworkConflict = true;
      }
    }

    let hasUnitConflict = false;
    if (parsedQuery.attributes.normalizedUnitGramsOrMl) {
      const prodUnit = extractProductUnitGramsOrMl(fullSearchText);
      if (prodUnit !== null && prodUnit === parsedQuery.attributes.normalizedUnitGramsOrMl) {
        score += SCORING_WEIGHTS.ATTRIBUTE_MATCH;
        reasons.push("unit_size_match");
      } else {
        hasUnitConflict = true;
      }
    }

    let hasModifierConflict = false;
    if (parsedQuery.attributes.modifier && !parsedQuery.variety) {
      const modSignals = MODIFIER_LEXICON[parsedQuery.attributes.modifier] || [parsedQuery.attributes.modifier];
      if (modSignals.some((sig) => fullSearchText.includes(sig))) {
        score += SCORING_WEIGHTS.ATTRIBUTE_MATCH;
        reasons.push("modifier_match");
      } else {
        hasModifierConflict = true;
      }
    }

    if (isDisqualifiedForEntity) {
      score *= 0.45;
    }

    if (!/\b(renewed|refurbished)\b/i.test(nameLower) && !nameLower.includes("macbok")) {
      score += 0.04;
    }

    const trgm = Math.max(
      Number(row.trgm_score || 0),
      trigramSimilarity(queryLower, nameLower.slice(0, 50)),
      trigramSimilarity(queryLower, `${brandLower} ${canonical.model}`)
    );
    score += trgm * SCORING_WEIGHTS.FUZZY_SIMILARITY;

    const fts = Math.min(Number(row.fts_score || 0), 1);
    score += fts * SCORING_WEIGHTS.DB_SIGNAL;

    const clampedScore = Math.min(Number(score.toFixed(4)), 0.99);

    if (clampedScore < 0.14 && !isAssociatedCandidate) {
      continue;
    }

    if (
      isDisqualifiedForEntity &&
      targetEntityDef?.domain === "electronics" &&
      canonical.entity_type !== "general" &&
      canonical.entity_type !== parsedQuery.productType
    ) {
      continue;
    }

    const hasRequirementConflict =
      hasBrandConflict ||
      hasModelConflict ||
      hasVarietyConflict ||
      hasEntityConflict ||
      hasStorageConflict ||
      hasNetworkConflict ||
      hasUnitConflict ||
      hasModifierConflict ||
      isDisqualifiedForEntity;

    scoredItems.push({
      ...canonical,
      score: clampedScore,
      searchScore: clampedScore,
      match_reason: reasons.length > 0 ? reasons.join(", ") : "fuzzy_similarity",
      isAssociatedCandidate,
      hasRequirementConflict,
      isDisqualifiedForEntity,
      matchedTokenRatio
    });
  }

  scoredItems.sort((a, b) => b.score - a.score);

  for (const item of scoredItems) {
    const {
      isAssociatedCandidate,
      hasRequirementConflict,
      isDisqualifiedForEntity,
      matchedTokenRatio,
      ...cleanItem
    } = item;

    if (isAssociatedCandidate) {
      bucket.associated.push({
        ...cleanItem,
        match_reason: "associated_product"
      });
      continue;
    }

    if (hasRequirementConflict || isDisqualifiedForEntity) {
      bucket.similar.push({
        ...cleanItem,
        match_reason: parsedQuery.variety ? "alternative_variety" : "similar_alternative"
      });
      continue;
    }

    if ((cleanItem.score >= 0.40 && matchedTokenRatio >= 0.5) || matchedTokenRatio === 1) {
      bucket.exact.push(cleanItem);
    } else if (cleanItem.score >= 0.18) {
      bucket.similar.push(cleanItem);
    } else {
      bucket.associated.push(cleanItem);
    }
  }

  if (bucket.exact.length > 10 && bucket.similar.length === 0) {
    const overflowSimilar = bucket.exact.splice(10).map((item) => ({
      ...item,
      match_reason: "category_alternative"
    }));
    bucket.similar.push(...overflowSimilar);
  }

  bucket.exact = bucket.exact.slice(0, 15);
  bucket.similar = bucket.similar.slice(0, 15);
  bucket.associated = bucket.associated.slice(0, 10);

  return bucket;
}