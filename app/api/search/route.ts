import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { parseQuery, ParsedQuery } from "../../../lib/search/queryParser";
import { classifyResults } from "../../../lib/search/classifier";
import { ENTITY_ONTOLOGY, MODIFIER_LEXICON } from "../../../lib/search/ontology";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://mpnywlderrwnpajinbpq.supabase.co";
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.SUPABASE_SECRET_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchIndexedCandidates(parsed: ParsedQuery) {
  const queries: PromiseLike<any>[] = [];

  if (parsed.model) {
    const m = parsed.model.replace(/[,()*]/g, "");
    queries.push(
      supabase
        .from("search_products")
        .select("id, name, brand, category, data")
        .ilike("name", `%${m}%`)
        .limit(30)
    );
  }

  if (parsed.brand && parsed.attributes.storage && parsed.attributes.network) {
    const storageDigits = parsed.attributes.storage.replace(/[^0-9]/g, "");
    queries.push(
      supabase
        .from("search_products")
        .select("id, name, brand, category, data")
        .ilike("name", `%${parsed.brand}%`)
        .ilike("name", `%${storageDigits}%`)
        .ilike("name", `%${parsed.attributes.network}%`)
        .limit(35)
    );
  }

  if (parsed.brand && parsed.attributes.storage) {
    const storageDigits = parsed.attributes.storage.replace(/[^0-9]/g, "");
    queries.push(
      supabase
        .from("search_products")
        .select("id, name, brand, category, data")
        .ilike("name", `%${parsed.brand}%`)
        .ilike("name", `%${storageDigits}%`)
        .limit(40)
    );
  }

  if (parsed.attributes.modifier && parsed.productType) {
    const modSignals = (MODIFIER_LEXICON[parsed.attributes.modifier] || [parsed.attributes.modifier]).slice(0, 8);
    const orClauses = modSignals.map((sig) => `name.ilike.*${sig}*`).join(",");
    queries.push(
      supabase
        .from("search_products")
        .select("id, name, brand, category, data")
        .or(orClauses)
        .limit(40)
    );
  }

  const bilingualSearchTerms = Array.from(
    new Set([
      ...parsed.tokens,
      ...parsed.expandedTerms.slice(0, 6)
    ])
  )
    .map((t) => t.replace(/[,()*]/g, "").trim())
    .filter((t) => t.length >= 2)
    .slice(0, 6);

  if (bilingualSearchTerms.length > 0) {
    const orClauses = bilingualSearchTerms.flatMap((term) => [
      `name.ilike.*${term}*`,
      `brand.ilike.*${term}*`,
      `category.ilike.*${term}*`
    ]);

    queries.push(
      supabase
        .from("search_products")
        .select("id, name, brand, category, data")
        .or(orClauses.join(","))
        .limit(60)
    );
  }

  const responses = await Promise.all(queries);
  return responses.flatMap((r) => r.data || []);
}

async function fetchAssociatedItems(parsed: ParsedQuery) {
  const entityDef = ENTITY_ONTOLOGY.find((e) => e.canonicalType === parsed.productType);
  let keywords: string[] = [];

  if (entityDef) {
    keywords = entityDef.associatedTypes.slice(0, 5);
  } else if (parsed.brand === "samsung" || parsed.attributes.network) {
    const phoneDef = ENTITY_ONTOLOGY.find((e) => e.canonicalType === "smartphone");
    keywords = phoneDef ? phoneDef.associatedTypes.slice(0, 4) : [];
  }

  if (keywords.length === 0) return [];

  const orClauses = keywords.map((kw) => `name.ilike.*${kw.trim()}*`);

  const { data } = await supabase
    .from("search_products")
    .select("id, name, brand, category, data")
    .or(orClauses.join(","))
    .limit(20);

  return (data || []).map((row) => ({ ...row, is_associated_fetch: true }));
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const q = searchParams.get("q") || "";

    if (q.trim().length === 0) {
      return NextResponse.json({
        query: q,
        normalized_query: "",
        parsed_attributes: {},
        exact: [],
        similar: [],
        associated: [],
        meta: { total: 0, database_matches: 0 }
      });
    }

    const parsedQuery = parseQuery(q);

    const [rpcResponse, indexedRows] = await Promise.all([
      supabase.rpc("search_catalog", { search_query: parsedQuery.normalizedQuery }),
      fetchIndexedCandidates(parsedQuery)
    ]);

    const rpcRows = !rpcResponse.error && Array.isArray(rpcResponse.data) ? rpcResponse.data : [];
    let combinedRows = [...indexedRows, ...rpcRows];

    if (combinedRows.length > 0 && (parsedQuery.productType || parsedQuery.brand)) {
      const assocRows = await fetchAssociatedItems(parsedQuery);
      combinedRows = [...combinedRows, ...assocRows];
    }

    const categorizedResults = classifyResults(combinedRows, parsedQuery);
    const totalResults =
      categorizedResults.exact.length +
      categorizedResults.similar.length +
      categorizedResults.associated.length;

    return NextResponse.json({
      query: parsedQuery.original,
      normalized_query: parsedQuery.normalizedQuery,
      query_understanding: {
        brand: parsedQuery.brand || null,
        product_type: parsedQuery.productType || null,
        variety: parsedQuery.variety || null,
        model: parsedQuery.model || null,
        expanded_synonyms: parsedQuery.expandedTerms,
        attributes: parsedQuery.attributes
      },
      parsed_attributes: parsedQuery.attributes,
      exact: categorizedResults.exact,
      similar: categorizedResults.similar,
      associated: categorizedResults.associated,
      meta: {
        total: totalResults,
        database_matches: combinedRows.length
      }
    });
  } catch (err: any) {
    console.error("Search API Error:", err);
    return NextResponse.json(
      {
        error: err?.message || "Internal search error"
      },
      { status: 500 }
    );
  }
}