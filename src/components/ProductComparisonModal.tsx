import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Scale,
  Plus,
  Trash2,
  ShoppingBag,
  Bolt,
  Star,
  CheckCircle2,
  Truck,
  ShieldCheck,
  Award,
  Search,
  Sparkles,
  ChevronUp,
  ChevronDown,
  Lock,
} from 'lucide-react';
import { MarketplaceProduct, formatLKR } from '../data/catalog';

export interface ProductRatingSummary {
  averageRating: number;
  userReviewCount: number;
  totalRatingCount: number;
  questionCount: number;
}

interface ProductComparisonModalProps {
  isOpen: boolean;
  onClose: () => void;
  comparedProducts: MarketplaceProduct[];
  catalog: MarketplaceProduct[];
  currentUser: unknown;
  getEffectivePrice: (product: MarketplaceProduct) => number;
  getProductRatingStats: (product: MarketplaceProduct) => ProductRatingSummary;
  onRemoveFromCompare: (productId: string) => void;
  onAddToCompare: (product: MarketplaceProduct) => void;
  onClearCompare: () => void;
  onAddToCart: (product: MarketplaceProduct, quantity: number) => void;
  onBuyNow: (product: MarketplaceProduct, quantity: number) => void;
  onOpenProductDetails: (product: MarketplaceProduct) => void;
}

export const MAX_COMPARE_PRODUCTS = 3;

export const ProductComparisonModal: React.FC<ProductComparisonModalProps> = ({
  isOpen,
  onClose,
  comparedProducts,
  catalog,
  currentUser,
  getEffectivePrice,
  getProductRatingStats,
  onRemoveFromCompare,
  onAddToCompare,
  onClearCompare,
  onAddToCart,
  onBuyNow,
  onOpenProductDetails,
}) => {
  const [highlightBest, setHighlightBest] = useState<boolean>(true);
  const [pickerSearch, setPickerSearch] = useState<string>('');
  const [pickerCategory, setPickerCategory] = useState<string>('all');

  // Compute best metrics across compared products (when at least 2 products are present)
  const bestMetrics = useMemo(() => {
    if (comparedProducts.length < 2) {
      return {
        lowestPriceId: null as string | null,
        highestRatingId: null as string | null,
        mostSoldId: null as string | null,
        biggestDiscountId: null as string | null,
      };
    }

    let lowestPrice = Infinity;
    let lowestPriceId: string | null = null;

    let highestRating = -1;
    let highestRatingId: string | null = null;

    let mostSold = -1;
    let mostSoldId: string | null = null;

    let biggestDiscount = -1;
    let biggestDiscountId: string | null = null;

    for (const p of comparedProducts) {
      const eff = getEffectivePrice(p);
      if (eff < lowestPrice) {
        lowestPrice = eff;
        lowestPriceId = p.id;
      }

      const rating = getProductRatingStats(p).averageRating;
      if (rating > highestRating) {
        highestRating = rating;
        highestRatingId = p.id;
      }

      if (p.soldCount > mostSold) {
        mostSold = p.soldCount;
        mostSoldId = p.id;
      }

      const discPct = Math.round(((p.originalPrice - eff) / p.originalPrice) * 100);
      if (discPct > biggestDiscount) {
        biggestDiscount = discPct;
        biggestDiscountId = p.id;
      }
    }

    return {
      lowestPriceId,
      highestRatingId,
      mostSoldId,
      biggestDiscountId,
    };
  }, [comparedProducts, getEffectivePrice, getProductRatingStats]);

  // Candidate products to add when fewer than 3 products are selected
  const availableCandidates = useMemo(() => {
    const selectedIds = new Set(comparedProducts.map((p) => p.id));
    const preferredCategory =
      pickerCategory !== 'all'
        ? pickerCategory
        : comparedProducts.length > 0
        ? comparedProducts[0].category
        : 'all';

    return catalog
      .filter((p) => !selectedIds.has(p.id))
      .filter((p) => {
        if (pickerCategory !== 'all' && p.category !== pickerCategory) return false;
        if (pickerSearch.trim() !== '') {
          const q = pickerSearch.trim().toLowerCase();
          return (
            p.title.toLowerCase().includes(q) ||
            p.category.toLowerCase().includes(q) ||
            p.specs.some((s) => s.toLowerCase().includes(q))
          );
        }
        return true;
      })
      .sort((a, b) => {
        const aSameCat = a.category === preferredCategory ? 1 : 0;
        const bSameCat = b.category === preferredCategory ? 1 : 0;
        if (aSameCat !== bSameCat) return bSameCat - aSameCat;
        return b.soldCount - a.soldCount;
      })
      .slice(0, 6);
  }, [catalog, comparedProducts, pickerCategory, pickerSearch]);

  const slots = [0, 1, 2].map((index) => comparedProducts[index] || null);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-2 backdrop-blur-xs sm:p-4"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 16 }}
            transition={{ duration: 0.2 }}
            className="relative flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          >
            {/* Modal Header */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#2a1205] px-5 py-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F85606] text-white shadow-sm">
                  <Scale className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                      Product Comparison Board
                    </h2>
                    <span className="rounded-md bg-white/15 px-2 py-0.5 font-mono text-xs font-bold text-orange-300">
                      {comparedProducts.length} / {MAX_COMPARE_PRODUCTS} Selected
                    </span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Side-by-side comparison of technical specifications, LKR deal prices, and customer ratings
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {comparedProducts.length >= 2 && (
                  <button
                    type="button"
                    onClick={() => setHighlightBest((prev) => !prev)}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-colors ${
                      highlightBest
                        ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-200'
                        : 'border-white/15 bg-white/5 text-slate-300 hover:bg-white/10'
                    }`}
                  >
                    <Sparkles className="h-3.5 w-3.5" />
                    <span>{highlightBest ? 'Highlighting Best Values' : 'Highlight Best Values'}</span>
                  </button>
                )}

                {comparedProducts.length > 0 && (
                  <button
                    type="button"
                    onClick={onClearCompare}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-red-500/30 hover:border-red-400/50"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>Clear Board</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close comparison board"
                  className="rounded-lg bg-white/10 p-2 text-slate-200 transition-colors hover:bg-white/20 hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Main Scrollable Comparison Table Body */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs">
                <table className="w-full min-w-[780px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/80">
                      <th className="w-44 shrink-0 border-r border-slate-200 p-4 align-top font-display text-xs font-extrabold tracking-wider text-slate-700 uppercase">
                        <div className="space-y-1.5">
                          <span>Comparison Matrix</span>
                          <p className="font-sans text-[11px] font-normal leading-relaxed text-slate-500 normal-case">
                            Compare up to 3 products side by side across price, ratings, stock, and specs.
                          </p>
                        </div>
                      </th>

                      {slots.map((product, slotIdx) => (
                        <th
                          key={product ? product.id : `empty-slot-${slotIdx}`}
                          className="w-1/3 border-r border-slate-200 p-4 align-top last:border-r-0"
                        >
                          {product ? (
                            <div className="flex flex-col justify-between space-y-3">
                              {/* Top Slot Bar: Slot Number + Remove Button */}
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-mono text-[11px] font-bold text-slate-400 uppercase">
                                  Product #{slotIdx + 1}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onRemoveFromCompare(product.id)}
                                  className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-slate-500 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                                >
                                  <X className="h-3 w-3" />
                                  <span>Remove</span>
                                </button>
                              </div>

                              {/* Product Image + Badges */}
                              <div
                                onClick={() => {
                                  onClose();
                                  onOpenProductDetails(product);
                                }}
                                className="group relative mx-auto h-36 w-36 cursor-pointer overflow-hidden rounded-xl border border-slate-200 bg-[#F4F3EF]"
                              >
                                <img
                                  src={product.imageUrl}
                                  alt={product.title}
                                  className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                                />
                                <span
                                  className={`absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-extrabold text-white uppercase shadow-2xs ${
                                    product.stockRemaining > 0 ? 'bg-emerald-600' : 'bg-red-600'
                                  }`}
                                >
                                  {product.stockRemaining > 0
                                    ? `In Stock (${product.stockRemaining})`
                                    : 'Out of Stock'}
                                </span>
                              </div>

                              {/* Store, Category & Title */}
                              <div>
                                <p className="text-[11px] font-medium text-slate-500">
                                  {product.storeName} · {product.category}
                                </p>
                                <h3
                                  onClick={() => {
                                    onClose();
                                    onOpenProductDetails(product);
                                  }}
                                  className="mt-1 line-clamp-2 cursor-pointer font-display text-sm font-bold text-slate-950 hover:text-[#F85606]"
                                >
                                  {product.title}
                                </h3>
                              </div>
                            </div>
                          ) : (
                            <div className="flex h-full min-h-[210px] flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 p-4 text-center">
                              <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-orange-100 text-[#F85606]">
                                <Plus className="h-5 w-5" />
                              </div>
                              <p className="font-display text-xs font-bold text-slate-800">
                                Empty Comparison Slot #{slotIdx + 1}
                              </p>
                              <p className="mt-1 text-[11px] text-slate-500">
                                Select a product from the quick picker below or click &ldquo;Compare&rdquo; on any product card.
                              </p>
                            </div>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-200">
                    {/* ROW 1: Effective LKR Price */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Deal Price (LKR)
                      </td>
                      {slots.map((product, idx) => {
                        if (!product) {
                          return (
                            <td
                              key={`price-empty-${idx}`}
                              className="border-r border-slate-200 p-3.5 text-center text-slate-400 last:border-r-0"
                            >
                              —
                            </td>
                          );
                        }
                        const effPrice = getEffectivePrice(product);
                        const isLowest =
                          highlightBest && bestMetrics.lowestPriceId === product.id;

                        return (
                          <td
                            key={`price-${product.id}`}
                            className={`border-r border-slate-200 p-3.5 font-mono tabular-nums last:border-r-0 ${
                              isLowest ? 'bg-emerald-50/70' : ''
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-base font-extrabold text-[#F85606] sm:text-lg">
                                {formatLKR(effPrice)}
                              </span>
                              {isLowest && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 font-sans text-[10px] font-extrabold text-white uppercase">
                                  <Award className="h-3 w-3" /> Best Price
                                </span>
                              )}
                            </div>
                            <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-400">
                              <span className="line-through">
                                {formatLKR(product.originalPrice)}
                              </span>
                              <span className="font-sans font-semibold text-emerald-700">
                                New User: {formatLKR(product.newUserPrice)}
                              </span>
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* ROW 2: Discount & Total LKR Savings */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Discount & Savings
                      </td>
                      {slots.map((product, idx) => {
                        if (!product) {
                          return (
                            <td
                              key={`disc-empty-${idx}`}
                              className="border-r border-slate-200 p-3.5 text-center text-slate-400 last:border-r-0"
                            >
                              —
                            </td>
                          );
                        }
                        const effPrice = getEffectivePrice(product);
                        const savings = Math.max(0, product.originalPrice - effPrice);
                        const discountPercent = Math.round(
                          (savings / product.originalPrice) * 100
                        );
                        const isBiggestDiscount =
                          highlightBest && bestMetrics.biggestDiscountId === product.id;

                        return (
                          <td
                            key={`disc-${product.id}`}
                            className={`border-r border-slate-200 p-3.5 font-mono tabular-nums last:border-r-0 ${
                              isBiggestDiscount ? 'bg-orange-50/60' : ''
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="rounded-md bg-[#FFF3EB] px-2 py-0.5 font-bold text-[#F85606]">
                                -{discountPercent}% OFF
                              </span>
                              <span className="font-semibold text-slate-700">
                                Save {formatLKR(savings)}
                              </span>
                            </div>
                            <p className="mt-1 font-sans text-[11px] text-slate-500">
                              Campaign: {product.dealLabel}
                            </p>
                          </td>
                        );
                      })}
                    </tr>

                    {/* ROW 3: Customer Star Rating & Reviews */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Customer Rating
                      </td>
                      {slots.map((product, idx) => {
                        if (!product) {
                          return (
                            <td
                              key={`rating-empty-${idx}`}
                              className="border-r border-slate-200 p-3.5 text-center text-slate-400 last:border-r-0"
                            >
                              —
                            </td>
                          );
                        }
                        const stats = getProductRatingStats(product);
                        const isHighestRated =
                          highlightBest && bestMetrics.highestRatingId === product.id;

                        return (
                          <td
                            key={`rating-${product.id}`}
                            className={`border-r border-slate-200 p-3.5 last:border-r-0 ${
                              isHighestRated ? 'bg-amber-50/70' : ''
                            }`}
                          >
                            <div className="flex flex-wrap items-center gap-2">
                              <div className="flex items-center gap-1 font-mono text-sm font-extrabold text-amber-600">
                                <Star className="h-4 w-4 fill-amber-400 text-amber-500" />
                                <span>{stats.averageRating.toFixed(1)} / 5.0</span>
                              </div>
                              {isHighestRated && (
                                <span className="inline-flex items-center gap-1 rounded-md bg-amber-500 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                                  Top Rated
                                </span>
                              )}
                            </div>
                            <p className="mt-1 font-mono text-[11px] text-slate-500 tabular-nums">
                              {stats.totalRatingCount.toLocaleString()} verified ratings ·{' '}
                              {stats.userReviewCount} media reviews · {stats.questionCount} Q&A
                            </p>
                          </td>
                        );
                      })}
                    </tr>

                    {/* ROW 4: Popularity / Units Sold */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Units Sold
                      </td>
                      {slots.map((product, idx) => {
                        if (!product) {
                          return (
                            <td
                              key={`sold-empty-${idx}`}
                              className="border-r border-slate-200 p-3.5 text-center text-slate-400 last:border-r-0"
                            >
                              —
                            </td>
                          );
                        }
                        const isMostSold =
                          highlightBest && bestMetrics.mostSoldId === product.id;

                        return (
                          <td
                            key={`sold-${product.id}`}
                            className="border-r border-slate-200 p-3.5 font-mono tabular-nums last:border-r-0"
                          >
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900">
                                {product.soldCount.toLocaleString()}+ Sold
                              </span>
                              {isMostSold && (
                                <span className="rounded bg-slate-900 px-2 py-0.5 font-sans text-[10px] font-bold text-white uppercase">
                                  Best Seller
                                </span>
                              )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>

                    {/* ROW 5: Stock Availability Status (Green / Red) */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Stock Status
                      </td>
                      {slots.map((product, idx) => {
                        if (!product) {
                          return (
                            <td
                              key={`stock-empty-${idx}`}
                              className="border-r border-slate-200 p-3.5 text-center text-slate-400 last:border-r-0"
                            >
                              —
                            </td>
                          );
                        }
                        const isInStock = product.stockRemaining > 0;
                        return (
                          <td
                            key={`stock-${product.id}`}
                            className="border-r border-slate-200 p-3.5 last:border-r-0"
                          >
                            <span
                              className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${
                                isInStock
                                  ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                  : 'border-red-200 bg-red-50 text-red-700'
                              }`}
                            >
                              {isInStock
                                ? `In Stock (${product.stockRemaining} of ${product.totalStock} left)`
                                : 'Out of Stock'}
                            </span>
                          </td>
                        );
                      })}
                    </tr>

                    {/* ROW 6: Spec #1 — Core Hardware / Primary Feature */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Primary Specification
                      </td>
                      {slots.map((product, idx) => (
                        <td
                          key={product ? `spec0-${product.id}` : `spec0-empty-${idx}`}
                          className="border-r border-slate-200 p-3.5 text-slate-700 last:border-r-0"
                        >
                          {product ? (
                            <div className="flex items-start gap-1.5">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                              <span className="font-medium">{product.specs[0] || 'Standard Flagship Spec'}</span>
                            </div>
                          ) : (
                            <span className="block text-center text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* ROW 7: Spec #2 — Performance / Battery / Display */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Performance & Power
                      </td>
                      {slots.map((product, idx) => (
                        <td
                          key={product ? `spec1-${product.id}` : `spec1-empty-${idx}`}
                          className="border-r border-slate-200 p-3.5 text-slate-700 last:border-r-0"
                        >
                          {product ? (
                            <div className="flex items-start gap-1.5">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                              <span className="font-medium">{product.specs[1] || 'High-Efficiency Architecture'}</span>
                            </div>
                          ) : (
                            <span className="block text-center text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* ROW 8: Spec #3 — Build & Connectivity */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Build & Materials
                      </td>
                      {slots.map((product, idx) => (
                        <td
                          key={product ? `spec2-${product.id}` : `spec2-empty-${idx}`}
                          className="border-r border-slate-200 p-3.5 text-slate-700 last:border-r-0"
                        >
                          {product ? (
                            <div className="flex items-start gap-1.5">
                              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                              <span className="font-medium">{product.specs[2] || 'Premium Chassis & Accessories'}</span>
                            </div>
                          ) : (
                            <span className="block text-center text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* ROW 9: Delivery, Cash on Delivery & Warranty */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Delivery & Warranty
                      </td>
                      {slots.map((product, idx) => (
                        <td
                          key={product ? `ship-${product.id}` : `ship-empty-${idx}`}
                          className="border-r border-slate-200 p-3.5 text-slate-600 last:border-r-0"
                        >
                          {product ? (
                            <div className="space-y-1">
                              <div className="flex items-center gap-1.5">
                                <Truck className="h-3.5 w-3.5 shrink-0 text-emerald-600" />
                                <span>
                                  {product.freeShipping
                                    ? 'Free Islandwide Express (1–3 Days)'
                                    : 'Standard Express Delivery'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                                <span>
                                  {product.codEligible ? 'Cash on Delivery (COD) · ' : ''}1-Year Warranty
                                </span>
                              </div>
                            </div>
                          ) : (
                            <span className="block text-center text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* ROW 10: Summary Overview */}
                    <tr className="hover:bg-slate-50/60">
                      <td className="border-r border-slate-200 bg-slate-50/50 p-3.5 font-bold text-slate-800">
                        Summary Overview
                      </td>
                      {slots.map((product, idx) => (
                        <td
                          key={product ? `desc-${product.id}` : `desc-empty-${idx}`}
                          className="border-r border-slate-200 p-3.5 text-slate-600 last:border-r-0"
                        >
                          {product ? (
                            <p className="line-clamp-3 leading-relaxed">{product.description}</p>
                          ) : (
                            <span className="block text-center text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>

                    {/* ROW 11: Action Buttons Row */}
                    <tr className="bg-slate-50/90">
                      <td className="border-r border-slate-200 p-3.5 font-bold text-slate-800">
                        Quick Actions
                      </td>
                      {slots.map((product, idx) => (
                        <td
                          key={product ? `act-${product.id}` : `act-empty-${idx}`}
                          className="border-r border-slate-200 p-3.5 last:border-r-0"
                        >
                          {product ? (
                            <div className="space-y-2">
                              {product.stockRemaining > 0 ? (
                                <div className="grid grid-cols-2 gap-2">
                                  <button
                                    type="button"
                                    onClick={() => onAddToCart(product, 1)}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-3 py-2 text-xs font-extrabold text-slate-950 shadow-2xs transition-colors hover:bg-[#e5a600]"
                                  >
                                    {!currentUser ? (
                                      <Lock className="h-3.5 w-3.5 shrink-0" />
                                    ) : (
                                      <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
                                    )}
                                    <span>Add Cart</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      onClose();
                                      onBuyNow(product, 1);
                                    }}
                                    className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F85606] px-3 py-2 text-xs font-extrabold text-white shadow-2xs transition-colors hover:bg-[#d94800]"
                                  >
                                    <Bolt className="h-3.5 w-3.5 shrink-0" />
                                    <span>Buy Now</span>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  disabled
                                  className="w-full cursor-not-allowed rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-600"
                                >
                                  Out of Stock
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => {
                                  onClose();
                                  onOpenProductDetails(product);
                                }}
                                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-[#F85606] hover:text-[#F85606]"
                              >
                                View Full Specs & Reviews
                              </button>
                            </div>
                          ) : (
                            <span className="block text-center text-slate-400">—</span>
                          )}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Quick Add Products Picker when fewer than 3 products are in the board */}
              {comparedProducts.length < MAX_COMPARE_PRODUCTS && (
                <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
                    <div>
                      <h3 className="font-display text-sm font-bold text-slate-900">
                        Add Products to Compare ({MAX_COMPARE_PRODUCTS - comparedProducts.length}{' '}
                        {MAX_COMPARE_PRODUCTS - comparedProducts.length === 1 ? 'slot' : 'slots'} open)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Pick any product below to add it directly into your side-by-side comparison table
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <div className="flex items-center rounded-lg border border-slate-200 bg-white px-2.5 py-1.5">
                        <Search className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          value={pickerSearch}
                          onChange={(e) => setPickerSearch(e.target.value)}
                          placeholder="Search product to compare..."
                          className="w-44 bg-transparent text-xs text-slate-900 focus:outline-none"
                        />
                      </div>

                      <select
                        value={pickerCategory}
                        onChange={(e) => setPickerCategory(e.target.value)}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-[#F85606] focus:outline-none"
                      >
                        <option value="all">All Categories</option>
                        <option value="Audio & Headphones">Audio & Headphones</option>
                        <option value="Smartwatches & Wearables">Smartwatches & Wearables</option>
                        <option value="Cameras & Drones">Cameras & Drones</option>
                        <option value="Computer & Office">Computer & Office</option>
                        <option value="Home & Lifestyle">Home & Lifestyle</option>
                        <option value="Mobile & Gaming Gear">Mobile & Gaming Gear</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2 md:grid-cols-3">
                    {availableCandidates.map((cand) => {
                      const effPrice = getEffectivePrice(cand);
                      const stats = getProductRatingStats(cand);
                      return (
                        <div
                          key={cand.id}
                          className="flex items-center justify-between gap-2.5 rounded-xl border border-slate-200 bg-white p-2.5 shadow-2xs transition-colors hover:border-[#F85606]"
                        >
                          <div className="flex min-w-0 items-center gap-2.5">
                            <img
                              src={cand.imageUrl}
                              alt={cand.title}
                              className="h-12 w-12 shrink-0 rounded-lg bg-[#F4F3EF] object-cover"
                            />
                            <div className="min-w-0">
                              <p className="truncate font-display text-xs font-bold text-slate-900">
                                {cand.title}
                              </p>
                              <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] tabular-nums">
                                <span className="font-extrabold text-[#F85606]">
                                  {formatLKR(effPrice)}
                                </span>
                                <span className="text-amber-600">
                                  ★ {stats.averageRating.toFixed(1)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => onAddToCompare(cand)}
                            className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-[#FFF3EB] px-2.5 py-1.5 text-xs font-bold text-[#F85606] transition-colors hover:bg-[#F85606] hover:text-white"
                          >
                            <Plus className="h-3.5 w-3.5" />
                            <span>Add</span>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

interface FloatingCompareBarProps {
  comparedProducts: MarketplaceProduct[];
  getEffectivePrice: (product: MarketplaceProduct) => number;
  onOpenCompareModal: () => void;
  onRemoveFromCompare: (productId: string) => void;
  onClearCompare: () => void;
}

export const FloatingCompareBar: React.FC<FloatingCompareBarProps> = ({
  comparedProducts,
  getEffectivePrice,
  onOpenCompareModal,
  onRemoveFromCompare,
  onClearCompare,
}) => {
  const [minimized, setMinimized] = useState(false);

  if (comparedProducts.length === 0) return null;

  return (
    <div className="fixed right-3 bottom-20 left-3 z-30 mx-auto max-w-4xl sm:right-6 sm:left-6">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        className="overflow-hidden rounded-2xl border border-orange-300/80 bg-slate-950/95 text-white shadow-2xl backdrop-blur-md"
      >
        {/* Top Header Strip */}
        <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#F85606] text-white">
              <Scale className="h-4 w-4" />
            </div>
            <span className="font-display text-xs font-extrabold tracking-wide uppercase sm:text-sm">
              Comparison Board ({comparedProducts.length}/{MAX_COMPARE_PRODUCTS})
            </span>
            <span className="hidden text-xs text-slate-300 sm:inline">
              · Select up to 3 products to compare specs, LKR prices & ratings
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onOpenCompareModal}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-3.5 py-1.5 text-xs font-extrabold text-white shadow-sm transition-colors hover:bg-[#d94800]"
            >
              <Scale className="h-3.5 w-3.5" />
              <span>Compare Now ({comparedProducts.length})</span>
            </button>

            <button
              type="button"
              onClick={onClearCompare}
              className="rounded-lg border border-white/15 bg-white/5 px-2.5 py-1.5 text-xs font-semibold text-slate-300 hover:bg-white/10 hover:text-white"
            >
              Clear
            </button>

            <button
              type="button"
              onClick={() => setMinimized((prev) => !prev)}
              aria-label={minimized ? 'Expand compare tray' : 'Minimize compare tray'}
              className="rounded-lg bg-white/10 p-1.5 text-slate-300 hover:bg-white/20 hover:text-white"
            >
              {minimized ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>
        </div>

        {/* 3 Product Slots Preview */}
        {!minimized && (
          <div className="grid grid-cols-3 gap-2.5 p-3">
            {[0, 1, 2].map((slotIdx) => {
              const prod = comparedProducts[slotIdx];
              if (!prod) {
                return (
                  <button
                    key={`dock-empty-${slotIdx}`}
                    type="button"
                    onClick={onOpenCompareModal}
                    className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 bg-white/5 p-2.5 text-left text-xs text-slate-400 transition-colors hover:border-orange-400/60 hover:text-orange-200"
                  >
                    <Plus className="h-4 w-4 shrink-0 text-[#F85606]" />
                    <span className="truncate font-medium">Slot #{slotIdx + 1}: Add Product</span>
                  </button>
                );
              }

              return (
                <div
                  key={`dock-${prod.id}`}
                  className="flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-white/10 p-2"
                >
                  <div
                    onClick={onOpenCompareModal}
                    className="flex min-w-0 cursor-pointer items-center gap-2"
                  >
                    <img
                      src={prod.imageUrl}
                      alt={prod.title}
                      className="h-10 w-10 shrink-0 rounded-lg bg-white object-cover"
                    />
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-white">{prod.title}</p>
                      <p className="font-mono text-[11px] font-bold text-orange-300 tabular-nums">
                        {formatLKR(getEffectivePrice(prod))}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => onRemoveFromCompare(prod.id)}
                    aria-label={`Remove ${prod.title} from comparison`}
                    className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-500/30 hover:text-white"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
