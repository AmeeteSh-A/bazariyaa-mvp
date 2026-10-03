import {
  ENTITY_ONTOLOGY,
  QUERY_SYNONYMS,
  MODIFIER_LEXICON,
  COMMON_TYPOS,
  KNOWN_BRANDS,
  BILINGUAL_EQUIVALENTS
} from "./ontology";

export type ParsedQuery = {
  original: string;
  normalizedQuery: string;
  cleanQuery: string;
  tokens: string[];
  expandedTerms: string[];
  equivalentGroups: string[][];
  brand?: string;
  productType?: string;
  model?: string;
  variety?: string;
  attributes: {
    storage?: string;
    network?: string;
    ram?: string;
    screenSize?: string;
    volume?: string;
    weight?: string;
    normalizedUnitGramsOrMl?: number;
    modifier?: string;
  };
};

function levenshtein(a: string, b: string): number {
  const dp: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array(b.length + 1).fill(0)
  );
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

const VOCABULARY = Array.from(
  new Set([
    ...KNOWN_BRANDS,
    ...Object.keys(QUERY_SYNONYMS),
    ...Object.keys(MODIFIER_LEXICON),
    ...Object.keys(BILINGUAL_EQUIVALENTS),
    ...ENTITY_ONTOLOGY.flatMap((e) => [
      e.canonicalType,
      ...e.headNouns,
      ...(e.varieties || [])
    ]),
    "galaxy",
    "charger",
    "adapter",
    "bluetooth",
    "monitor"
  ])
).filter((w) => !w.includes(" "));

function correctWord(word: string): string {
  if (COMMON_TYPOS[word]) return COMMON_TYPOS[word];
  if (word.length < 4 || /\d/.test(word)) return word;

  let bestMatch = word;
  let minDistance = 2;

  for (const candidate of VOCABULARY) {
    if (Math.abs(candidate.length - word.length) > 2) continue;
    const dist = levenshtein(word, candidate);
    if (dist < minDistance) {
      minDistance = dist;
      bestMatch = candidate;
    }
  }

  return bestMatch;
}

export function parseQuery(rawQuery: string): ParsedQuery {
  const original = rawQuery.trim();
  const lower = original.toLowerCase();

  const rawTokens = lower.split(/\s+/).filter(Boolean);
  const correctedTokens = rawTokens.map(correctWord);
  const normalizedQuery = correctedTokens.join(" ");

  const attributes: ParsedQuery["attributes"] = {};

  const ramMatch = normalizedQuery.match(/\b(\d+)\s*gb\s*ram\b/);
  if (ramMatch) attributes.ram = `${ramMatch[1]}gb`;

  const storageRegex = /\b(\d+)\s*(gb|tb)\b/g;
  let match: RegExpExecArray | null;
  while ((match = storageRegex.exec(normalizedQuery)) !== null) {
    const val = `${match[1]}${match[2].toLowerCase()}`;
    if (!attributes.ram || val !== attributes.ram) {
      attributes.storage = val;
    }
  }

  const networkMatch = normalizedQuery.match(/\b(5g|4g|lte)\b/);
  if (networkMatch) attributes.network = networkMatch[1].toLowerCase();

  const screenMatch = normalizedQuery.match(/\b(\d{2}(?:\.\d)?)\s*(?:inch|inches|in)\b/);
  if (screenMatch) attributes.screenSize = `${screenMatch[1]}`;

  const withoutTechUnits = normalizedQuery
    .replace(/\b(\d+)\s*(gb|tb)\b/g, "")
    .replace(/\b(5g|4g|lte)\b/g, "");

  const volumeMatch = withoutTechUnits.match(/\b(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|litres)\b/);
  if (volumeMatch) {
    const num = parseFloat(volumeMatch[1]);
    const unit = volumeMatch[2].toLowerCase().startsWith("l") ? "l" : "ml";
    attributes.volume = `${volumeMatch[1]}${unit}`;
    attributes.normalizedUnitGramsOrMl = unit === "l" ? Math.round(num * 1000) : Math.round(num);
  }

  const weightMatch = withoutTechUnits.match(/\b(\d+(?:\.\d+)?)\s*(kg|kgs|g|gm|gms|gram|grams)\b/);
  if (weightMatch) {
    const num = parseFloat(weightMatch[1]);
    const unit = weightMatch[2].toLowerCase().startsWith("k") ? "kg" : "g";
    attributes.weight = `${weightMatch[1]}${unit}`;
    attributes.normalizedUnitGramsOrMl = unit === "kg" ? Math.round(num * 1000) : Math.round(num);
  }

  for (const modKey of Object.keys(MODIFIER_LEXICON)) {
    const modPhrase = modKey.replace(/_/g, " ");
    if (normalizedQuery.includes(modPhrase) || correctedTokens.includes(modKey)) {
      attributes.modifier = modKey;
      break;
    }
  }

  let brand = KNOWN_BRANDS.find((b) => new RegExp(`\\b${b}\\b`, "i").test(normalizedQuery));
  if (!brand && correctedTokens.includes("macbook")) brand = "apple";
  if (!brand && correctedTokens.includes("iphone")) brand = "apple";

  let productType: string | undefined;
  if (/\baloo\s+bhujia\b/i.test(normalizedQuery)) {
    productType = "namkeen";
  } else if (/\bpotato\s+(?:chips|crisps|wafers)\b/i.test(normalizedQuery)) {
    productType = "chips";
  } else if (/\bdairy\s+milk\b/i.test(normalizedQuery)) {
    productType = "chocolate";
  } else {
    for (const token of correctedTokens) {
      if (QUERY_SYNONYMS[token]) {
        productType = QUERY_SYNONYMS[token];
        break;
      }
      const entityMatch = ENTITY_ONTOLOGY.find(
        (e) => e.canonicalType === token || e.headNouns.includes(token)
      );
      if (entityMatch) {
        productType = entityMatch.canonicalType;
        break;
      }
    }
  }

  let variety: string | undefined;
  if (productType) {
    const entityDef = ENTITY_ONTOLOGY.find((e) => e.canonicalType === productType);
    if (entityDef?.varieties) {
      variety = entityDef.varieties.find((v) =>
        new RegExp(`\\b${v}\\b`, "i").test(normalizedQuery)
      );
    }
  }

  const modelToken = correctedTokens.find(
    (t) =>
      /^[a-z]+\d+[a-z0-9/-]*$/i.test(t) &&
      !t.endsWith("gb") &&
      !t.endsWith("tb") &&
      !t.endsWith("ml") &&
      !t.endsWith("kg") &&
      !t.endsWith("gm") &&
      t !== "5g" &&
      t !== "4g" &&
      t !== "a2"
  );
  const model = modelToken ? modelToken.toLowerCase() : undefined;

  if (!productType && brand === "samsung" && model && /^[maszf]\d+/i.test(model)) {
    productType = "smartphone";
  }

  let cleanQuery = normalizedQuery
    .replace(/\b(\d+)\s*gb\s*ram\b/g, "")
    .replace(/\b(\d+)\s*(gb|tb)\b/g, "")
    .replace(/\b(5g|4g|lte)\b/g, "")
    .replace(/\b(\d+(?:\.\d+)?)\s*(ml|l|ltr|litre|litres|kg|kgs|g|gm|gms|gram|grams)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();

  if (!cleanQuery) cleanQuery = normalizedQuery;

  const stopWords = new Set(["for", "with", "and", "the", "in", "on", "of", "a", "an"]);
  const tokens = cleanQuery
    .split(/\s+/)
    .filter((t) => t.length > 1 && !stopWords.has(t));

  const finalTokens = tokens.length > 0 ? tokens : [cleanQuery];

  const equivalentGroups: string[][] = finalTokens.map((t) => {
    if (BILINGUAL_EQUIVALENTS[t]) {
      return BILINGUAL_EQUIVALENTS[t];
    }
    return [t];
  });

  const expandedSet = new Set<string>(finalTokens);
  for (const group of equivalentGroups) {
    group.forEach((term) => expandedSet.add(term));
  }

  if (productType) {
    expandedSet.add(productType);
    const entityDef = ENTITY_ONTOLOGY.find((e) => e.canonicalType === productType);
    if (entityDef) {
      entityDef.headNouns.slice(0, 5).forEach((n) => expandedSet.add(n));
    }
  }

  return {
    original,
    normalizedQuery,
    cleanQuery,
    tokens: finalTokens,
    expandedTerms: Array.from(expandedSet),
    equivalentGroups,
    brand,
    productType,
    model,
    variety,
    attributes
  };
}