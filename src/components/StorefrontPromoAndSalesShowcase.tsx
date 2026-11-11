import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Bolt,
  ShoppingBag,
  Flame,
  Tag,
  Truck,
  ChevronRight,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { MarketplaceProduct, formatLKR } from '../data/catalog';
import {
  PromotionalPosterCampaign,
  CreativeSaleSpotlight,
} from '../utils/multiAgentStorefront';
import { OptimizedImage, resolveAssetUrl } from '../utils/assetResolver';

interface StorefrontPromoAndSalesShowcaseProps {
  promoPosters: PromotionalPosterCampaign[];
  creativeSales: CreativeSaleSpotlight[];
  catalog: MarketplaceProduct[];
  onOpenProduct: (product: MarketplaceProduct) => void;
  onAddToCart: (product: MarketplaceProduct, qty: number) => void;
  onBuyNow: (product: MarketplaceProduct, qty: number) => void;
}

export const StorefrontPromoAndSalesShowcase: React.FC<
  StorefrontPromoAndSalesShowcaseProps
> = ({
  promoPosters,
  creativeSales,
  catalog,
  onOpenProduct,
  onAddToCart,
  onBuyNow,
}) => {
  const [activePosterIdx, setActivePosterIdx] = useState<number>(0);

  const findProduct = (productId: string): MarketplaceProduct => {
    return catalog.find((p) => p.id === productId) || catalog[0];
  };

  return (
    <div className="mb-8 space-y-6">
      {/* =========================================================
          1. NON-INTRUSIVE ANIMATED PROMOTIONAL CAMPAIGN POSTERS
          (Daraz / AliExpress Campaign Vibe — Eye-catching, clear, smooth motion)
         ========================================================= */}
      {promoPosters.length > 0 && (
        <section aria-label="Featured Promotional Campaigns" className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[#F85606] text-white shadow-2xs">
                <Flame className="h-3.5 w-3.5" />
              </span>
              <h2 className="font-display text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
                Mega Promotional Campaigns &amp; Exclusive Posters
              </h2>
              <span className="text-xs font-medium text-slate-500">
                · Limited-Time LKR SuperDeals
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              {promoPosters.slice(0, 6).map((poster, idx) => (
                <button
                  key={poster.id}
                  type="button"
                  onClick={() => setActivePosterIdx(idx)}
                  aria-label={`Highlight campaign ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    activePosterIdx === idx
                      ? 'w-6 bg-[#F85606]'
                      : 'w-2 bg-slate-300 hover:bg-orange-300'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* 3-Column Animated Promotional Poster Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {promoPosters.slice(0, 3).map((poster, index) => {
              const targetProduct = findProduct(poster.productId);
              const savings = Math.max(0, poster.originalPrice - poster.dealPrice);

              return (
                <motion.div
                  key={poster.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: index * 0.06 }}
                  whileHover={{ y: -4 }}
                  onClick={() => onOpenProduct(targetProduct)}
                  className="group relative flex cursor-pointer flex-col justify-between overflow-hidden rounded-2xl border border-orange-200/80 bg-slate-950 text-white shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* 16:9 Promotional Poster Artwork with Measured Contrast Scrim */}
                  <div className="relative aspect-16/9 w-full overflow-hidden bg-slate-900">
                    <OptimizedImage
                      src={resolveAssetUrl(poster.imageUrl)}
                      alt={poster.headline}
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/45 to-transparent" />

                    {/* Top Campaign Kicker & Discount Badge */}
                    <div className="absolute top-3 right-3 left-3 flex items-center justify-between gap-2">
                      <span className="truncate rounded-md bg-slate-950/80 px-2.5 py-1 text-[10px] font-extrabold tracking-wider text-amber-300 uppercase backdrop-blur-xs">
                        {poster.campaignTag}
                      </span>
                      <span className="shrink-0 rounded-md bg-[#F85606] px-2.5 py-1 font-mono text-[11px] font-extrabold text-white shadow-xs">
                        {poster.discountBadge}
                      </span>
                    </div>

                    {/* Poster Headline Overlay */}
                    <div className="absolute right-3.5 bottom-2.5 left-3.5">
                      <h3 className="line-clamp-2 font-display text-base font-extrabold leading-snug text-white drop-shadow-xs sm:text-lg">
                        {poster.headline}
                      </h3>
                    </div>
                  </div>

                  {/* Bottom Interactive Deal & Action Strip */}
                  <div className="flex flex-1 flex-col justify-between bg-gradient-to-b from-slate-950 to-slate-900 px-4 pt-2.5 pb-3.5">
                    <p className="line-clamp-2 text-xs leading-relaxed text-slate-300">
                      {poster.subheadline}
                    </p>

                    <div className="mt-3 flex items-center justify-between gap-2 border-t border-white/10 pt-2.5">
                      <div className="font-mono tabular-nums">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-[#FFB800] sm:text-lg">
                            {formatLKR(poster.dealPrice)}
                          </span>
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatLKR(poster.originalPrice)}
                          </span>
                        </div>
                        {savings > 0 && (
                          <span className="block font-sans text-[10px] font-semibold text-emerald-400">
                            Save {formatLKR(savings)} · Free Delivery
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBuyNow(targetProduct, 1);
                          }}
                          className="inline-flex items-center gap-1 rounded-xl bg-[#F85606] px-3 py-2 text-xs font-extrabold text-white transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0"
                        >
                          <span>{poster.ctaLabel}</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* =========================================================
          2. CREATIVE ANIMATED SALES & OFFERS SPOTLIGHT
          (Daraz / AliExpress SuperDeals for New & Existing Products)
         ========================================================= */}
      {creativeSales.length > 0 && (
        <section
          aria-label="Live SuperDeals and Promotional Sales"
          className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-[#FFF5F0] via-white to-[#FFF8F2] p-4 shadow-2xs sm:p-5"
        >
          <div className="mb-3.5 flex flex-wrap items-center justify-between gap-2 border-b border-orange-200/70 pb-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-2.5 py-1 text-xs font-extrabold text-white uppercase">
                <Sparkles className="h-3.5 w-3.5" />
                <span>SuperDeals Spotlight</span>
              </span>
              <h2 className="font-display text-base font-extrabold text-slate-950 sm:text-lg">
                Special Sales &amp; Limited-Time Product Offers
              </h2>
              <span className="text-xs font-medium text-slate-600">
                · Instant LKR Discounts on New &amp; Popular Arrivals
              </span>
            </div>

            <span className="font-mono text-xs font-bold text-[#F85606]">
              {creativeSales.length} Active Sale Offers
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
            <AnimatePresence initial={false}>
              {creativeSales.slice(0, 4).map((sale, idx) => {
                const product = findProduct(sale.productId);
                const savings = Math.max(0, sale.originalPrice - sale.salePrice);

                return (
                  <motion.div
                    key={sale.id}
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.22, delay: idx * 0.05 }}
                    whileHover={{ y: -3 }}
                    onClick={() => onOpenProduct(product)}
                    className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-orange-200/90 bg-white p-3 shadow-2xs transition-all hover:border-[#F85606] hover:shadow-sm"
                  >
                    <div>
                      {/* Animated Top Sale Ribbon */}
                      <div className="mb-2 flex items-center justify-between gap-1.5 rounded-lg bg-gradient-to-r from-[#F85606] to-[#ff7b00] px-2.5 py-1 text-[10px] font-extrabold text-white">
                        <span className="truncate uppercase">{sale.animatedRibbonText}</span>
                        {sale.isNewProduct && (
                          <span className="shrink-0 rounded bg-amber-300 px-1.5 py-0.5 text-[9px] font-extrabold text-slate-950 uppercase">
                            NEW
                          </span>
                        )}
                      </div>

                      {/* Product Image & Discount Overlay */}
                      <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg bg-slate-100">
                        <OptimizedImage
                          src={resolveAssetUrl(sale.productImageUrl || product.imageUrl)}
                          alt={sale.productTitle}
                          className="h-full w-full object-cover"
                        />
                        <span className="absolute bottom-1.5 left-1.5 rounded bg-slate-950/85 px-2 py-0.5 font-mono text-[10px] font-extrabold text-amber-300">
                          -{sale.discountPercent}% OFF
                        </span>
                        <span className="absolute top-1.5 right-1.5 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white uppercase">
                          In Stock
                        </span>
                      </div>

                      {/* Sale Title & Creative Tagline */}
                      <p className="mt-2 text-[11px] font-extrabold text-[#F85606] uppercase">
                        {sale.saleBannerTitle}
                      </p>
                      <h3 className="mt-0.5 line-clamp-2 min-h-[2.25rem] font-display text-xs font-bold leading-snug text-slate-950 group-hover:text-[#F85606]">
                        {sale.productTitle}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-[11px] text-slate-500">
                        {sale.creativeTagline}
                      </p>
                    </div>

                    <div className="mt-3 space-y-2 border-t border-slate-100 pt-2.5">
                      {/* Price & Savings */}
                      <div className="flex items-baseline justify-between gap-1 font-mono tabular-nums">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-extrabold text-[#F85606]">
                            {formatLKR(sale.salePrice)}
                          </span>
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatLKR(sale.originalPrice)}
                          </span>
                        </div>
                        <span className="font-sans text-[10px] font-extrabold text-emerald-700">
                          Save {formatLKR(savings)}
                        </span>
                      </div>

                      {/* Animated Claimed Progress Bar */}
                      <div className="space-y-1">
                        <div className="h-1.5 w-full overflow-hidden rounded-full bg-orange-100">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${Math.min(96, Math.max(40, sale.claimedPercent))}%` }}
                            transition={{ duration: 0.6, ease: 'easeOut' }}
                            className="h-full rounded-full bg-gradient-to-r from-[#F85606] to-amber-500"
                          />
                        </div>
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-500">
                          <span className="truncate">{sale.urgencyHighlight}</span>
                          <span className="inline-flex shrink-0 items-center gap-0.5 text-emerald-700">
                            <Truck className="h-2.5 w-2.5" /> Free
                          </span>
                        </div>
                      </div>

                      {/* Quick Action Buttons */}
                      <div className="grid grid-cols-2 gap-1.5 pt-1">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddToCart(product, 1);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-2.5 py-1.5 text-[11px] font-extrabold text-slate-950 transition-colors hover:bg-[#e5a600] whitespace-nowrap shrink-0"
                        >
                          <ShoppingBag className="h-3 w-3" />
                          <span>Add Cart</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onBuyNow(product, 1);
                          }}
                          className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F85606] px-2.5 py-1.5 text-[11px] font-extrabold text-white transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0"
                        >
                          <Bolt className="h-3 w-3" />
                          <span>Buy Now</span>
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </section>
      )}
    </div>
  );
};
