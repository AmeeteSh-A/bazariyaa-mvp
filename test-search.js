const testQueries = [
  "dhaniya",
  "hara dhaniya",
  "potato",
  "baby potato",
  "pahari aloo",
  "amul milk 1l",
  "amool milk",
  "milk",
  "biscuit",
  "digestive biscuit",
  "namkeen",
  "aloo bhujia",
  "laptop",
  "lapotp",
  "macbook",
  "macbok",
  "samsung m35",
  "samsng m35",
  "apple laptop",
  "wireless mouse",
  "mjve2ll/a",
  "128gb samsung",
  "128gb samsung 5g",
  "xyznonexistentproduct"
];

async function runTests() {
  console.log("Starting Tests.\n");

  for (const q of testQueries) {
    try {
      const res = await fetch(`http://localhost:3000/api/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (!res.ok) {
        console.error(`X [${q}] HTTP ${res.status}:`, data.error || data);
        continue;
      }

      const qu = data.query_understanding || {};
      console.log(
        `*-*-*- [${q}] -> Normalized: "${data.normalized_query}" | Type: ${qu.product_type || "any"} | Variety: ${qu.variety || "none"}`
      );
      console.log(`   Synonyms Expanded: ${JSON.stringify(qu.expanded_synonyms || [])}`);
      console.log(`   Attributes: ${JSON.stringify(data.parsed_attributes)}`);
      console.log(
        `   Exact: ${data.exact.length} | Similar: ${data.similar.length} | Associated: ${data.associated.length}`
      );

      if (data.exact.length > 0) {
        console.log(`   Top Exact Match: ${data.exact[0].name} (Score: ${data.exact[0].score.toFixed(2)})`);
      } else if (data.similar.length > 0) {
        console.log(`   Top Similar Match (Fallback): ${data.similar[0].name} (Score: ${data.similar[0].score.toFixed(2)})`);
      } else {
        console.log(`   No matches found`);
      }
      console.log("---------------------------------------------------");
    } catch (err) {
      console.error(`X [${q}] Connection failed:`, err.message);
    }
  }
}

runTests();