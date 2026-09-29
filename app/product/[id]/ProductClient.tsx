"use client";
import React, { useState } from "react";
import { Product } from "../../../lib/adapter";
import { Package, Star, Target, ChevronDown } from "lucide-react";

const reviews = [
  { badge: "Expert AR", rating: "★★★★★", title: "Finally nails the fundamentals", text: "Battery lasts a full heavy day and fast charging is no gimmick.", helpful: "421 helpful", meta: "12 Jul 2026", author: "Tech reviewer · 8 yrs" },
  { badge: "Verified RM", rating: "★★★★☆", title: "Great value for the money.", text: "The only weak spot is the design finish. Bazariyaa flagged it upfront so no surprises.", helpful: "198 helpful", meta: "Verified purchase · 3 Jul 2026", author: "Ananya Rao" },
];

const faqList = [
  "Does it support local warranties?",
  "Is the packaging sealed?",
  "How does the return policy work?",
];

function PriceHistoryChart({ history, currentPrice }: { history: { date: string, price: number }[], currentPrice: number }) {
  if (!history || history.length < 2) {
    return <div className="h-40 flex items-center justify-center text-sm text-slate-400 bg-slate-50 rounded-xl">Not enough price history data</div>;
  }

  const prices = history.map(h => h.price);
  const maxPrice = Math.max(...prices);
  const minPrice = Math.min(...prices);
  const range = maxPrice - minPrice || maxPrice * 0.1;

  const width = 900;
  const height = 180;
  const padX = 40;
  const padY = 30;

  const points = history.map((h, i) => {
    const x = padX + (i / (history.length - 1)) * (width - 2 * padX);
    const y = height - padY - ((h.price - minPrice) / range) * (height - 2 * padY);
    return `${x},${y}`;
  }).join(" ");

  const latestX = padX + (width - 2 * padX);
  const latestY = height - padY - ((prices[prices.length - 1] - minPrice) / range) * (height - 2 * padY);

  return (
    <div className="relative w-full overflow-hidden rounded-xl bg-slate-50 border border-slate-100 p-4">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto text-indigo-500 overflow-visible">
        <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={latestX} cy={latestY} r="5" fill="currentColor" className="text-indigo-600" />
        <text x={padX} y={height - 5} className="text-[10px] fill-slate-400 font-medium">Earliest</text>
        <text x={latestX - 30} y={height - 5} className="text-[10px] fill-slate-400 font-medium">Latest</text>
      </svg>
    </div>
  );
}

export default function ProductClient({ product }: { product: Product }) {
  const [activeTab, setActiveTab] = useState("Overview");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [mainImgError, setMainImgError] = useState(false);

  const tabs = ["Overview", "Price", "Specs", "Reviews", "FAQ"];

  const handleScroll = (tab: string) => {
    setActiveTab(tab);
    document.getElementById(tab.toLowerCase())?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <main className="min-h-screen bg-white font-sans text-slate-900 antialiased">
      <header className="sticky top-0 z-30 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-8">
            <span className="text-lg font-bold tracking-tight text-indigo-700">bazariyaa</span>
            <nav className="hidden gap-6 text-sm text-slate-600 md:flex">
              <a href="/" className="hover:text-slate-900">Home</a>
              <a href="/" className="hover:text-slate-900">Categories</a>
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-xs text-emerald-600 sm:block">Prices updated hourly</span>
          </div>
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-6 py-6 text-xs text-slate-400">
        <a href="/" className="hover:text-indigo-600">Home</a> / <span>{product.cat}</span> / <b className="text-slate-700">{product.name}</b>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-12">
        <div className="grid gap-12 md:grid-cols-2">
          <div className="relative flex aspect-square items-center justify-center rounded-3xl bg-slate-50 border border-slate-100 p-8">
            <div className="absolute top-4 left-4 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 shadow-sm border border-slate-200">
              ✦ Editor&apos;s Choice
            </div>
            {product.images.length > 0 && !mainImgError ? (
              <img 
                src={product.images[0]} 
                alt={product.name} 
                className="max-h-full max-w-full object-contain mix-blend-multiply"
                onError={() => setMainImgError(true)}
              />
            ) : (
              <Package className="h-32 w-32 text-slate-300" strokeWidth={1} />
            )}
          </div>

          <div className="flex flex-col justify-center">
            <div className="mb-2 text-xs font-bold uppercase tracking-wider text-indigo-600">{product.tag}</div>
            <h1 className="mb-4 text-3xl font-bold leading-tight tracking-tight sm:text-4xl">{product.name}</h1>
            
            <div className="mb-8 flex flex-wrap items-center gap-3 text-sm">
              <div className="flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-amber-700 font-semibold border border-amber-100">
                <Star className="h-3.5 w-3.5 fill-amber-500 text-amber-500" />
                {product.rating}
              </div>
              <span className="text-slate-500">{product.reviews} reviews</span>
              <span className="text-slate-300">|</span>
              <span className="font-medium text-emerald-600">{product.real} Buy Rate</span>
            </div>

            <div className="mb-8 rounded-2xl bg-slate-50 p-6 border border-slate-100">
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-bold text-slate-900">{product.price}</span>
                {product.was && <span className="text-lg text-slate-400 line-through">{product.was}</span>}
              </div>
              <div className="mt-2 text-xs font-medium text-slate-500">
                {product.trend === "down" ? "Price has dropped recently" : "Price is stable right now"}
              </div>
            </div>

            <p className="mb-4 text-xs font-bold uppercase tracking-wider text-slate-400">Available At</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <button className="flex-1 rounded-full bg-indigo-600 py-3.5 text-sm font-semibold text-white shadow-md transition hover:bg-indigo-700">
                Buy now for {product.price}
              </button>
              <button className="rounded-full border border-slate-200 bg-white px-6 py-3.5 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50">
                Add to compare
              </button>
            </div>
          </div>
        </div>
      </section>

      <div className="sticky top-[69px] z-20 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl gap-8 overflow-x-auto px-6 hide-scrollbar">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => handleScroll(tab)}
              className={`whitespace-nowrap py-4 text-sm font-medium transition-colors ${
                activeTab === tab ? "border-b-2 border-indigo-600 text-indigo-600" : "text-slate-500 hover:text-slate-900"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <section id="overview" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-24">
        <div className="flex flex-col gap-8 md:flex-row">
          <div className="flex w-full flex-col justify-center rounded-3xl bg-indigo-600 p-8 text-white md:w-1/3">
            <div className="mb-2 flex items-center gap-2 opacity-80">
              <Target className="h-5 w-5" />
              <span className="text-sm font-semibold uppercase tracking-wide">Buy Score</span>
            </div>
            <div className="text-6xl font-bold">{product.buy}<span className="text-3xl opacity-50">/100</span></div>
            <p className="mt-4 text-sm leading-relaxed opacity-90">
              Based on verified reviews, price fairness, and brand reliability.
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-center rounded-3xl border border-slate-200 p-8">
            <div className="mb-3 text-xs font-bold uppercase tracking-wider text-indigo-600">✦ AI Summary Placeholder</div>
            <p className="text-base leading-relaxed text-slate-700">
              This is a static placeholder for the AI summary. Once the backend AI endpoint is connected, this will display a generated consensus of the reviews, highlighting specific pros and cons based on the product description and user feedback.
            </p>
            <div className="mt-6 flex gap-6 border-t border-slate-100 pt-6">
              <div className="flex-1">
                <h3 className="mb-2 text-sm font-bold text-slate-900">✓ What's great (Placeholder)</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>Placeholder pro bullet point 1</li>
                  <li>Placeholder pro bullet point 2</li>
                </ul>
              </div>
              <div className="flex-1">
                <h3 className="mb-2 text-sm font-bold text-slate-900">✕ Worth knowing (Placeholder)</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>Placeholder con bullet point 1</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="price" className="mx-auto max-w-6xl px-6 py-16 border-t border-slate-100 scroll-mt-24">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Price history</h2>
          <p className="text-sm text-slate-500">Tracked across major retailers</p>
        </div>
        
        <PriceHistoryChart history={product.history} currentPrice={product.numericPrice} />

        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500">Current</div>
            <div className="text-lg font-bold">{product.price}</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4 bg-emerald-50 border-emerald-100">
            <div className="text-xs text-emerald-700">Lowest Recorded</div>
            <div className="text-lg font-bold text-emerald-700">
              {product.history.length > 0 ? `${product.price.split(' ')[0]} ${Math.min(...product.history.map(h => h.price))}` : product.price}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="text-xs text-slate-500">Average</div>
            <div className="text-lg font-bold">
              {product.history.length > 0 ? `${product.price.split(' ')[0]} ${Math.round(product.history.reduce((acc, h) => acc + h.price, 0) / product.history.length)}` : product.price}
            </div>
          </div>
          <div className="rounded-xl border border-slate-200 bg-slate-900 text-white p-4">
            <div className="text-xs text-slate-400">Bazariyaa Verdict</div>
            <div className="text-lg font-bold">{product.trend === "down" ? "Good time to buy" : "Wait for drop"}</div>
          </div>
        </div>
      </section>

      <section id="specs" className="bg-slate-50 py-16 scroll-mt-24">
        <div className="mx-auto max-w-6xl px-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Specifications</h2>
          </div>
          <div className="grid gap-x-8 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {product.specs.length > 0 ? product.specs.map(([label, value], idx) => (
              <div key={idx} className="flex flex-col rounded-xl border border-slate-200 bg-white p-4">
                <span className="text-xs font-medium text-slate-500 mb-1">{label}</span>
                <strong className="text-sm text-slate-900 truncate">{value}</strong>
              </div>
            )) : (
              <div className="text-sm text-slate-500">No specifications available for this product.</div>
            )}
          </div>
        </div>
      </section>

      <section id="reviews" className="mx-auto max-w-6xl px-6 py-16 scroll-mt-24">
        <div className="mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-slate-900">Community reviews (Placeholder)</h2>
          <p className="text-sm text-slate-500">Only verified, genuine reviews count toward the rating.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-2">
          {reviews.map((review, idx) => (
            <article key={idx} className="rounded-2xl border border-slate-200 p-6">
              <div className="mb-3 flex items-center justify-between">
                <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">{review.badge}</span>
                <span className="text-amber-500 tracking-widest">{review.rating}</span>
              </div>
              <h3 className="mb-2 font-bold text-slate-900">{review.title}</h3>
              <p className="mb-4 text-sm text-slate-600">{review.text}</p>
              <footer className="mt-auto flex items-center justify-between text-xs text-slate-400 border-t border-slate-100 pt-4">
                <span>{review.author}</span>
                <span>{review.meta}</span>
              </footer>
            </article>
          ))}
        </div>
      </section>

      <section id="faq" className="bg-slate-50 py-16 scroll-mt-24">
        <div className="mx-auto max-w-3xl px-6">
          <div className="mb-8 text-center">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">Frequently asked</h2>
          </div>
          <div className="divide-y divide-slate-200 rounded-2xl border border-slate-200 bg-white">
            {faqList.map((question, index) => (
              <div key={question}>
                <button
                  onClick={() => setOpenFaq(openFaq === index ? null : index)}
                  className="flex w-full items-center justify-between px-6 py-5 text-left text-sm font-medium text-slate-800"
                >
                  {question}
                  <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${openFaq === index ? "rotate-180" : ""}`} />
                </button>
                {openFaq === index && (
                  <div className="px-6 pb-5 text-sm leading-relaxed text-slate-500">
                    This is a static placeholder answer for the FAQ section.
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-100 bg-white px-6 py-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-sm text-slate-500">
          <div>
            <strong className="text-indigo-700 mr-2">bazariyaa</strong>
            <span>© 2026 Bazariyaa. Made in India.</span>
          </div>
          <div className="flex items-center gap-4">
            <b className="text-slate-900">{product.name}</b>
            <span className="font-bold text-slate-900">{product.price}</span>
          </div>
        </div>
      </footer>
    </main>
  );
}