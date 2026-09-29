'use client'
import Link from "next/link";
import React, { useState } from "react";
import {
  Search,
  ChevronRight,
  ChevronDown,
  Star,
  ShieldCheck,
  Gem,
  Target,
  ArrowUp,
  ArrowDown,
  Minus,
  Package
} from "lucide-react";

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
  was?: string;
  trend?: "down" | "up" | "flat";
  cta: "compare-on" | "compare-off" | "view";
};

const faqs = [
  {
    q: "How is the Buy Score calculated?",
    a: "The Buy Score blends verified review sentiment, value-for-money against similar products, price fairness versus history, warranty and long-term reliability signals into a single 0-100 number. Weights are published and identical for every product : brands cannot buy a better score.",
  },
  { q: "Do brands pay to rank higher?", a: "No. Placement is decided entirely by the Buy Score. No product, seller or brand can pay for a higher position anywhere on Bazariyaa." },
  { q: "How do you detect fake reviews?", a: "Every review is checked against purchase records, device fingerprints and language patterns to filter out incentivised, duplicate or bot-written reviews before it affects a score." },
  { q: "Where does the price history come from?", a: "We poll prices across major Indian retailers every hour and keep a running history for every product we track, going back to launch." },
  { q: "Is Bazariyaa free to use?", a: "Yes : browsing, comparisons, price history and the newsletter are all free. We may earn a small commission if you buy through a retailer link, which never affects ranking." },
];

function BuyBadge({ score }: { score: number }) {
  return (
    <div className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 text-[11px] font-semibold text-indigo-700 shadow-sm ring-1 ring-indigo-100">
      <Target className="h-3 w-3" />
      Buy {score}
    </div>
  );
}

function TrendArrow({ dir }: { dir?: "up" | "down" | "flat" }) {
  if (dir === "up") return <ArrowUp className="h-3 w-3 text-rose-500" />;
  if (dir === "down") return <ArrowDown className="h-3 w-3 text-emerald-600" />;
  return <Minus className="h-3 w-3 text-slate-400" />;
}

function ProductCard({ p }: { p: Product }) {
  return (
    <Link href={`/product/${p.id}`} className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-3 transition hover:border-indigo-200 hover:shadow-md">
      <div className="relative mb-3 flex h-32 items-center justify-center rounded-xl bg-slate-100 p-4 text-center">
        <Package className="h-10 w-10 text-slate-300" strokeWidth={1} />
        <div className="absolute top-2 left-2">
          <BuyBadge score={p.buy} />
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">{p.tag}</div>
      </div>
      <div className="mb-0.5 text-[11px] font-medium text-indigo-600">{p.cat}</div>
      <div className="mb-1 text-sm font-semibold text-slate-900 line-clamp-2">{p.name}</div>
      <div className="mb-2 flex items-center gap-1 text-[11px] text-slate-500">
        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
        {p.rating} · {p.reviews} reviews · {p.real} real
      </div>
      <div className="mb-3 flex items-baseline gap-2 mt-auto pt-2">
        <span className="text-base font-bold text-slate-900">{p.price}</span>
        {p.was && <span className="text-xs text-slate-400 line-through">{p.was}</span>}
        {p.trend && (
          <span className="ml-auto flex items-center gap-0.5 text-[11px] text-slate-500">
            <TrendArrow dir={p.trend} />
          </span>
        )}
      </div>
      {p.cta === "view" && (
        <button className="mt-auto rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700">
          View review
        </button>
      )}
      {p.cta === "compare-on" && (
        <button className="mt-auto rounded-lg bg-indigo-50 py-1.5 text-xs font-medium text-indigo-700">
          ✓ In comparison
        </button>
      )}
      {p.cta === "compare-off" && (
        <button className="mt-auto rounded-lg border border-slate-200 py-1.5 text-xs font-medium text-slate-700 transition hover:border-indigo-300 hover:text-indigo-700">
          + Compare
        </button>
      )}
    </Link>
  );
}

export default function BazariyaaLanding({ initialProducts = [] }: { initialProducts: Product[] }) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [searchQuery, setSearchQuery] = useState("");

  const uniqueCats = Array.from(new Set(initialProducts.map((p) => p.cat))).filter(Boolean);
  const filters = ["All", ...uniqueCats];

  const dynamicCategories = uniqueCats.map((cat) => ({
    label: cat,
    count: initialProducts.filter((p) => p.cat === cat).length,
  }));

  const dynamicTrending = initialProducts.slice(0, 6).map((p, index) => ({
    rank: index + 1,
    icon: p.cat.toLowerCase().includes("fragrance") ? "✨" : "📱",
    name: p.name,
    cat: p.cat,
    price: p.price,
    change: p.trend === "up" ? "Price Up" : p.trend === "down" ? "Price Drop" : "Flat",
    dir: p.trend,
  }));

  const priceIntelligence = initialProducts.filter((p) => p.trend === "down").slice(0, 3);
  if (priceIntelligence.length < 3) {
    priceIntelligence.push(...initialProducts.filter((p) => p.trend !== "down").slice(0, 3 - priceIntelligence.length));
  }

  const highlightProduct = initialProducts[0];

  let searchFilteredProducts = initialProducts;
  if (searchQuery.trim() !== "") {
    const lowerQuery = searchQuery.toLowerCase();
    searchFilteredProducts = initialProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.cat.toLowerCase().includes(lowerQuery) ||
        p.tag.toLowerCase().includes(lowerQuery)
    );
  }

  let gridVisibleProducts = initialProducts;
  if (activeFilter !== "All") {
    gridVisibleProducts = gridVisibleProducts.filter(
      (p) => p.cat.toUpperCase() === activeFilter.toUpperCase()
    );
  }

  return (
    <div className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <div className="bg-slate-900 py-2 text-center text-xs text-slate-200">
        Get the Bazariyaa app : honest verdicts &amp; price drops in your pocket.
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold tracking-tight text-indigo-700">bazariyaa</span>
            <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
              <a href="#categories" className="hover:text-slate-900">Categories</a>
              <a href="#search" className="hover:text-slate-900">Search</a>
              <a href="#" className="hover:text-slate-900">Grocery</a>
              <a href="#" className="hover:text-slate-900">Compare</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <button className="hidden text-sm font-medium text-slate-600 hover:text-slate-900 sm:block">Sign in</button>
            <button className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700">
              Get the app
            </button>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 pt-14">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="mb-4 inline-flex items-center gap-1.5 text-xs font-medium text-indigo-600">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Live across India
            </div>
            <h1 className="text-4xl font-bold leading-[1.08] tracking-tight text-slate-900 sm:text-5xl">
              Know what&rsquo;s
              <br />
              worth buying.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-slate-500">
              India&rsquo;s honest product-discovery platform. Real reviews, live price
              history and a Buy Score you can trust : before you spend a rupee.
            </p>

            <div id="search" className="relative mt-8 max-w-md z-40">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="What are you shopping for today?"
                className="w-full rounded-full border border-slate-200 py-3.5 pl-11 pr-24 text-sm outline-none transition focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              />
              <button className="absolute right-1.5 top-1/2 flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full bg-indigo-600 text-white transition hover:bg-indigo-700">
                <ChevronRight className="h-4 w-4" />
              </button>

              {searchQuery.trim().length > 0 && (
                <div className="absolute top-full left-0 mt-2 w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                  {searchFilteredProducts.length > 0 ? (
                    <ul className="max-h-72 overflow-y-auto py-2">
                      {searchFilteredProducts.slice(0, 6).map((p, idx) => (
                        <li key={idx} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50">
                          <Package className="h-8 w-8 shrink-0 rounded bg-slate-100 p-1.5 text-slate-400" />
                          <div className="min-w-0 flex-1">
                            <div className="truncate text-sm font-medium text-slate-900">{p.name}</div>
                            <div className="text-xs text-slate-500">{p.cat} · {p.price}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="px-4 py-4 text-sm text-slate-500">
                      No products found for "{searchQuery}"
                    </div>
                  )}
                </div>
              )}
            </div>
            <p className="mt-3 text-xs text-slate-400">
              Trending: {dynamicCategories.slice(0, 4).map(c => c.label).join(' · ')}
            </p>

            <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-xs text-slate-500">
              <span>No paid rankings</span>
              <span>Verified reviews</span>
              <span>Updated hourly</span>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 shadow-sm">
            <div className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900">
              What India is buying
            </div>
            <ul className="divide-y divide-slate-100">
              {dynamicTrending.map((t) => (
                <li key={t.rank} className="flex items-center gap-3 px-5 py-3">
                  <span className="w-4 text-xs font-medium text-slate-400">{t.rank}</span>
                  <span className="text-base">{t.icon}</span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium text-slate-800">{t.name}</div>
                    <div className="text-xs text-slate-400">
                      {t.cat} · {t.price}
                    </div>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-semibold ${
                      t.dir === "up"
                        ? "text-rose-500"
                        : t.dir === "down"
                        ? "text-emerald-600"
                        : "text-indigo-500"
                    }`}
                  >
                    {t.dir === "up" && "↑ "}
                    {t.dir === "down" && "↓ "}
                    {t.change}
                  </span>
                </li>
              ))}
            </ul>
            <button className="flex w-full items-center justify-center gap-1 border-t border-slate-100 py-3 text-xs font-medium text-indigo-600 hover:bg-indigo-50">
              View all trending <ChevronRight className="h-3 w-3" />
            </button>
          </div>
        </div>
      </section>

      <section id="categories" className="mx-auto max-w-6xl px-6 py-16">
        <div className="grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
          <div className="flex flex-col justify-between rounded-2xl bg-gradient-to-br from-indigo-600 to-indigo-800 p-7 text-white">
            <div>
              <div className="mb-4 inline-block rounded-full bg-white/15 px-3 py-1 text-[11px] font-medium">
                Trending Now
              </div>
              <h2 className="text-2xl font-bold leading-tight">
                Flagship picks, honestly ranked.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-indigo-100">
                Products graded by real reviews and live price
                history : never by who pays.
              </p>
            </div>
            <div className="mt-8 space-y-3">
              {initialProducts.slice(0, 3).map((p, idx) => (
                <div key={idx} className="flex items-center justify-between rounded-xl bg-white/10 px-3 py-2 text-xs">
                  <span className="truncate mr-4">{p.name} · {p.price}</span>
                  <span className="text-emerald-300 shrink-0">{p.real} recommended</span>
                </div>
              ))}
            </div>
            <button className="mt-6 flex items-center gap-1 text-sm font-semibold">
              Explore catalog <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div>
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-bold tracking-tight">Explore categories</h2>
              <button className="flex items-center gap-1 text-sm font-medium text-indigo-600 hover:text-indigo-700">
                All categories <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {dynamicCategories.map((cat) => (
                <div key={cat.label} className="rounded-2xl border border-slate-200 p-4 flex flex-col items-center justify-center py-8 transition hover:border-indigo-300 hover:bg-slate-50">
                  <Package className="mb-3 h-8 w-8 text-indigo-600" strokeWidth={1.5} />
                  <span className="text-sm font-semibold text-slate-900 text-center line-clamp-1">{cat.label}</span>
                  <span className="mt-1 text-xs text-slate-500">{cat.count} products</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-500">
          Reviewed &amp; ranked
        </div>
        <h2 className="mb-6 text-2xl font-bold tracking-tight">Top-reviewed products</h2>
        <div className="mb-8 flex flex-wrap gap-2">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`rounded-full border px-4 py-1.5 text-sm font-medium transition ${
                activeFilter === f
                  ? "border-indigo-600 bg-indigo-600 text-white"
                  : "border-slate-200 text-slate-600 hover:border-indigo-300"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {gridVisibleProducts.map((p, idx) => (
            <ProductCard key={idx} p={p} />
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-500">
            Why trust us
          </div>
          <h2 className="mb-3 text-2xl font-bold tracking-tight sm:text-3xl">
            Three scores. Zero guesswork.
          </h2>
          <p className="mx-auto mb-10 max-w-md text-sm text-slate-500">
            Every product is graded by the same transparent system : never by who pays us.
          </p>
          <div className="grid gap-4 text-left sm:grid-cols-3">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <ShieldCheck className="mb-4 h-6 w-6 text-indigo-600" />
              <div className="mb-1 text-3xl font-bold">94</div>
              <div className="mb-2 text-sm font-semibold">Review Trust Score</div>
              <p className="text-xs leading-relaxed text-slate-500">
                What share of reviews are from genuine, verified buyers : with fake and
                coordinated reviews filtered out.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <Gem className="mb-4 h-6 w-6 text-indigo-600" />
              <div className="mb-1 text-3xl font-bold">8.8</div>
              <div className="mb-2 text-sm font-semibold">Value for Money</div>
              <p className="text-xs leading-relaxed text-slate-500">
                How much you get per rupee versus every comparable product in the
                category, updated as prices move.
              </p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <Target className="mb-4 h-6 w-6 text-indigo-600" />
              <div className="mb-1 text-3xl font-bold">92</div>
              <div className="mb-2 text-sm font-semibold">Buy Score</div>
              <p className="text-xs leading-relaxed text-slate-500">
                One honest number combining trust, value, price fairness and reliability
                : so you can decide in seconds.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-500">
          Price intelligence
        </div>
        <div className="mb-8 flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-2xl font-bold tracking-tight">Best time to buy</h2>
          <p className="max-w-xs text-sm text-slate-500">
            We track every price change so you never overpay at the wrong moment.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {priceIntelligence.map((item, idx) => (
            <div key={idx} className="rounded-2xl border border-slate-200 p-5">
              <div className="mb-4 flex items-center gap-3">
                <span className="text-xl">{item.cat.toLowerCase().includes("fragrance") ? "✨" : "📱"}</span>
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold">{item.name}</div>
                  <div className="text-xs text-slate-400">{item.cat}</div>
                </div>
              </div>
              <div className="mb-3 h-14 rounded-lg bg-gradient-to-r from-indigo-50 to-emerald-50" />
              <div className="mb-1 text-lg font-bold">{item.price}</div>
              <div className="mb-4 text-xs font-medium text-emerald-600">
                {item.trend === "down" ? "Recent price drop" : "Price is stable"}
              </div>
              <button className="w-full rounded-lg bg-indigo-600 py-2 text-xs font-semibold text-white hover:bg-indigo-700">
                Buy now
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-2 text-xs font-medium uppercase tracking-wide text-indigo-500">
            Trusted by shoppers
          </div>
          <div className="mb-8 flex flex-wrap items-end justify-between gap-6">
            <h2 className="text-2xl font-bold tracking-tight">
              A community that buys with confidence
            </h2>
            <div className="flex gap-8 text-sm">
              <div>
                <div className="text-xl font-bold">4.8 / 5</div>
                <div className="text-xs text-slate-500">Average buyer rating</div>
              </div>
              <div>
                <div className="text-xl font-bold">2.1M</div>
                <div className="text-xs text-slate-500">Verified reviews</div>
              </div>
              <div>
                <div className="text-xl font-bold">98%</div>
                <div className="text-xs text-slate-500">Would buy again</div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <div className="mb-2 flex items-center gap-1">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                ))}
              </div>
              <p className="mb-4 text-sm leading-relaxed text-slate-700">
                The one I now recommend to every first-time buyer. The price timeline
                made an inflated sale obvious and helped me wait two weeks for the
                genuine low.
              </p>
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>Priya Nair · Kochi, KL · 28 Jun 2026</span>
                <span>312 helpful</span>
              </div>
              {highlightProduct && (
                <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-200">
                    <Package className="h-5 w-5 text-slate-400" />
                  </div>
                  <div className="min-w-0 text-xs">
                    <div className="truncate font-medium">{highlightProduct.name}</div>
                    <div className="truncate text-slate-400">
                      {highlightProduct.price} · Buy {highlightProduct.buy}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { n: "2.4M", l: "Products tracked" },
                { n: "8.9M", l: "Verified reviews" },
                { n: "40M", l: "Price points daily" },
                { n: "₹4,200", l: "Avg. saved per buyer" },
              ].map((s) => (
                <div key={s.l} className="flex flex-col justify-center rounded-2xl bg-slate-900 p-5 text-white">
                  <div className="text-2xl font-bold">{s.n}</div>
                  <div className="mt-1 text-xs text-slate-300">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 py-16">
        <div className="mb-2 text-center text-xs font-medium uppercase tracking-wide text-indigo-500">
          Good to know
        </div>
        <h2 className="mb-8 text-center text-2xl font-bold tracking-tight">
          Questions, answered
        </h2>
        <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200">
          {faqs.map((f, i) => (
            <div key={f.q}>
              <button
                onClick={() => setOpenFaq(openFaq === i ? null : i)}
                className="flex w-full items-center justify-between px-5 py-4 text-left text-sm font-medium text-slate-800"
              >
                {f.q}
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                    openFaq === i ? "rotate-180" : ""
                  }`}
                />
              </button>
              {openFaq === i && (
                <div className="px-5 pb-4 text-sm leading-relaxed text-slate-500">{f.a}</div>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="flex flex-col items-center gap-6 rounded-2xl bg-slate-900 px-8 py-10 text-center text-white sm:flex-row sm:justify-between sm:text-left">
          <div>
            <h2 className="text-xl font-bold sm:text-2xl">Buy smarter, every single time.</h2>
            <p className="mt-1 text-sm text-slate-300">
              Weekly price drops, honest verdicts and early access to the AI Buying
              Assistant : straight to your inbox.
            </p>
          </div>
          <div className="flex w-full max-w-sm gap-2">
            <input
              type="email"
              placeholder="you@email.com"
              className="w-full rounded-full border-0 px-4 py-2.5 text-sm text-slate-900 outline-none"
            />
            <button className="shrink-0 rounded-full bg-indigo-500 px-5 py-2.5 text-sm font-semibold hover:bg-indigo-400">
              Notify me
            </button>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-slate-400">No spam. Unsubscribe anytime.</p>
      </section>

      <footer className="border-t border-slate-100 bg-slate-50 px-6 py-12">
        <div className="mx-auto grid max-w-6xl gap-8 sm:grid-cols-[1.4fr_1fr_1fr]">
          <div>
            <div className="mb-3 text-lg font-bold text-indigo-700">bazariyaa</div>
            <p className="max-w-xs text-sm leading-relaxed text-slate-500">
              India&rsquo;s honest product-discovery platform. We help you decide with
              confidence : no paid rankings, ever.
            </p>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold">Discover</div>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>Categories</li>
              <li>Trending</li>
              <li>Compare</li>
              <li>Deals</li>
            </ul>
          </div>
          <div>
            <div className="mb-3 text-sm font-semibold">Company</div>
            <ul className="space-y-2 text-sm text-slate-500">
              <li>How it works</li>
              <li>About</li>
              <li>Careers</li>
              <li>Press</li>
            </ul>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-6xl flex-col gap-2 border-t border-slate-200 pt-6 text-xs text-slate-400 sm:flex-row sm:items-center sm:justify-between">
          <span>© 2026 Bazariyaa. Made in India, for India.</span>
          <span>Prices updated hourly · Reviews independently verified</span>
        </div>
      </footer>
    </div>
  );
}