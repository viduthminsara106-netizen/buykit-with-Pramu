import React, { useState, useRef, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Maximize2, X, Images } from 'lucide-react';
import { MarketplaceProduct, ProductDepartment } from '../data/catalog';
import { resolveAssetUrl } from '../utils/assetResolver';

export interface ProductGallerySlide {
  id: string;
  url: string;
  label: string;
  caption: string;
  imageTransformClass: string;
}

const COMPLEMENTARY_CATEGORY_ASSETS: Record<ProductDepartment, string[]> = {
  'Audio & Headphones': [
    resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
    resolveAssetUrl('/src/assets/images/product_smartwatch_pro_1794121197679.jpg'),
    resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
    resolveAssetUrl('/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'),
  ],
  'Smartwatches & Wearables': [
    resolveAssetUrl('/src/assets/images/product_smartwatch_pro_1794121197679.jpg'),
    resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
    resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
    resolveAssetUrl('/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'),
  ],
  'Cameras & Drones': [
    resolveAssetUrl('/src/assets/images/product_camera_drone_1794121198906.jpg'),
    resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
    resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
    resolveAssetUrl('/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'),
  ],
  'Computer & Office': [
    resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
    resolveAssetUrl('/src/assets/images/product_gaming_controller_1794123345268.jpg'),
    resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
    resolveAssetUrl('/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'),
  ],
  'Home & Lifestyle': [
    resolveAssetUrl('/src/assets/images/product_espresso_maker_1794123345741.jpg'),
    resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
    resolveAssetUrl('/src/assets/images/product_smartwatch_pro_1794121197679.jpg'),
    resolveAssetUrl('/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'),
  ],
  'Mobile & Gaming Gear': [
    resolveAssetUrl('/src/assets/images/product_gaming_controller_1794123345268.jpg'),
    resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
    resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
    resolveAssetUrl('/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'),
  ],
};

export function buildProductGallerySlides(product: MarketplaceProduct): ProductGallerySlide[] {
  const mainImageUrl = resolveAssetUrl(product.imageUrl);
  const categoryExtras =
    COMPLEMENTARY_CATEGORY_ASSETS[product.category] ||
    COMPLEMENTARY_CATEGORY_ASSETS['Audio & Headphones'];

  const companionImg1 =
    categoryExtras.find((u) => u !== mainImageUrl) ||
    resolveAssetUrl('/src/assets/images/hero_marketplace_showcase_1794121196938.jpg');
  const companionImg2 =
    categoryExtras.find((u) => u !== mainImageUrl && u !== companionImg1) ||
    resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg');

  return [
    {
      id: `${product.id}_slide_main`,
      url: mainImageUrl,
      label: 'Main Image',
      caption: `${product.title} — Official Main View`,
      imageTransformClass: 'object-center',
    },
    {
      id: `${product.id}_slide_macro`,
      url: mainImageUrl,
      label: 'Detail View',
      caption: product.specs[0] || 'Precision Hardware Detail View',
      imageTransformClass: 'object-center',
    },
    {
      id: `${product.id}_slide_angle_left`,
      url: mainImageUrl,
      label: 'Side Angle',
      caption: product.specs[1] || 'Ergonomic Profile & Controls View',
      imageTransformClass: 'object-left-top brightness-[1.03]',
    },
    {
      id: `${product.id}_slide_angle_right`,
      url: mainImageUrl,
      label: 'Build Detail',
      caption: product.specs[2] || 'Materials & Connector Detail View',
      imageTransformClass: 'object-right-bottom contrast-[1.04]',
    },
    {
      id: `${product.id}_slide_bundle`,
      url: companionImg1,
      label: 'Studio Setup',
      caption: `${product.storeName} — Companion Ecosystem Showcase`,
      imageTransformClass: 'object-center',
    },
    {
      id: `${product.id}_slide_box`,
      url: companionImg2,
      label: 'Package / Kit',
      caption: `${product.title} — Accessories & Box Bundle`,
      imageTransformClass: 'object-center',
    },
  ];
}

interface ProductImageGalleryProps {
  product: MarketplaceProduct;
  discountPercent: number;
  onToggleStock?: (productId: string, e?: React.MouseEvent) => void;
}

export const ProductImageGallery: React.FC<ProductImageGalleryProps> = ({
  product,
  discountPercent,
  onToggleStock,
}) => {
  const slides = useMemo(() => buildProductGallerySlides(product), [product]);
  const [activeIndex, setActiveIndex] = useState<number>(0);
  const [lightboxSlideIndex, setLightboxSlideIndex] = useState<number | null>(null);

  const mainSlideTrackRef = useRef<HTMLDivElement | null>(null);
  const thumbStripRef = useRef<HTMLDivElement | null>(null);

  const activeSlide = slides[activeIndex] || slides[0];
  const isInStock = product.stockRemaining > 0;

  // Reset slide to 0 when product changes
  useEffect(() => {
    setActiveIndex(0);
    if (mainSlideTrackRef.current) {
      mainSlideTrackRef.current.scrollTo({ left: 0, behavior: 'auto' });
    }
  }, [product.id]);

  // Smoothly scroll main slide track to a specific index
  const scrollToSlide = (index: number) => {
    setActiveIndex(index);
    if (mainSlideTrackRef.current) {
      const slideWidth = mainSlideTrackRef.current.clientWidth;
      mainSlideTrackRef.current.scrollTo({
        left: index * slideWidth,
        behavior: 'smooth',
      });
    }
  };

  // Update active slide index as user swipes/scrolls horizontally
  const handleMainTrackScroll = () => {
    if (!mainSlideTrackRef.current) return;
    const { scrollLeft, clientWidth } = mainSlideTrackRef.current;
    if (clientWidth <= 0) return;
    const computedIdx = Math.round(scrollLeft / clientWidth);
    const clampedIdx = Math.max(0, Math.min(slides.length - 1, computedIdx));
    if (clampedIdx !== activeIndex) {
      setActiveIndex(clampedIdx);
    }
  };

  const openLightboxAt = (index: number) => {
    setActiveIndex(index);
    setLightboxSlideIndex(index);
  };

  const closeLightbox = () => {
    setLightboxSlideIndex(null);
  };

  const lightboxSlide =
    lightboxSlideIndex !== null ? slides[lightboxSlideIndex] || slides[0] : null;

  return (
    <div className="w-full space-y-3">
      {/* 1. FULL-SIZE HORIZONTAL SNAP-SCROLL PRODUCT IMAGE SLIDER */}
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div
          ref={mainSlideTrackRef}
          onScroll={handleMainTrackScroll}
          className="flex aspect-square w-full snap-x snap-mandatory overflow-x-auto scroll-smooth"
        >
          {slides.map((slide, idx) => (
            <div
              key={slide.id}
              onClick={() => openLightboxAt(idx)}
              className="relative h-full w-full shrink-0 cursor-pointer snap-center overflow-hidden bg-[#F4F3EF]"
            >
              <img
                src={resolveAssetUrl(slide.url)}
                alt={slide.caption}
                loading={idx === 0 ? 'eager' : 'lazy'}
                decoding="async"
                referrerPolicy="no-referrer"
                className={`h-full w-full object-cover ${slide.imageTransformClass}`}
              />
            </div>
          ))}
        </div>

        {/* TOP-LEFT CORNER: In Stock (Green) / Out of Stock (Red) Badge */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            if (onToggleStock) onToggleStock(product.id, e);
          }}
          title="Click to toggle In Stock (Green) / Out of Stock (Red)"
          className={`absolute top-3 left-3 z-10 inline-flex items-center gap-1.5 rounded-lg px-3 py-1 text-xs font-extrabold tracking-wide text-white uppercase shadow-md transition-colors ${
            isInStock
              ? 'border border-emerald-300/70 bg-emerald-600 hover:bg-emerald-700'
              : 'border border-red-300/70 bg-red-600 hover:bg-red-700'
          }`}
        >
          <span>
            {isInStock ? `In Stock (${product.stockRemaining})` : 'Out of Stock'}
          </span>
        </button>

        {/* TOP-RIGHT CORNER: Slide Counter + Fullscreen View Trigger */}
        <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
          <span className="rounded-lg bg-slate-950/80 px-2.5 py-1 font-mono text-xs font-bold text-white backdrop-blur-xs">
            {activeIndex + 1} / {slides.length}
          </span>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              openLightboxAt(activeIndex);
            }}
            className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-2.5 py-1 text-xs font-bold text-white shadow-sm hover:bg-[#d94800]"
          >
            <Maximize2 className="h-3.5 w-3.5" />
            <span>View Full</span>
          </button>
        </div>

        {/* BOTTOM OVERLAY: Discount Badge, Slide Indicator Dots & Active Angle Caption */}
        <div className="pointer-events-none absolute right-3 bottom-3 left-3 flex items-center justify-between gap-2">
          <span className="rounded-md bg-[#F85606] px-2.5 py-0.5 font-mono text-xs font-extrabold text-white shadow-xs">
            -{discountPercent}% OFF
          </span>

          {/* Interactive Slide Dots */}
          <div className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-slate-950/75 px-3 py-1.5 backdrop-blur-xs">
            {slides.map((s, idx) => (
              <button
                key={`dot-${s.id}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToSlide(idx);
                }}
                aria-label={`Slide ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === activeIndex ? 'w-5 bg-[#F85606]' : 'w-2 bg-white/60 hover:bg-white'
                }`}
              />
            ))}
          </div>

          <span className="truncate rounded-md bg-slate-950/80 px-2.5 py-0.5 text-[11px] font-semibold text-white backdrop-blur-xs">
            {activeSlide.label}
          </span>
        </div>
      </div>

      {/* 2. COMPACT HORIZONTAL SCROLLABLE PRODUCT IMAGE SLIDES STRIP */}
      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 shadow-2xs">
        <div className="mb-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1">
            <Images className="h-3 w-3 text-[#F85606]" />
            <span className="font-display text-[9px] font-extrabold tracking-wider text-slate-600 uppercase">
              Product Image Slides ({slides.length})
            </span>
          </div>
          <span className="text-[9px] font-medium text-slate-400">
            Tap slide to view
          </span>
        </div>

        <div
          ref={thumbStripRef}
          className="flex flex-nowrap items-center gap-1.5 overflow-x-auto scroll-smooth pb-0.5"
        >
          {slides.map((slide, idx) => {
            const isSelected = idx === activeIndex;
            return (
              <button
                key={slide.id}
                type="button"
                onMouseEnter={() => scrollToSlide(idx)}
                onClick={() => scrollToSlide(idx)}
                className={`group relative flex w-12 shrink-0 snap-start flex-col overflow-hidden rounded-md border bg-slate-50 text-left transition-colors ${
                  isSelected
                    ? 'border-[#F85606] ring-1 ring-[#F85606]/35 shadow-2xs'
                    : 'border-slate-200 opacity-80 hover:border-orange-300 hover:opacity-100'
                }`}
              >
                <div className="relative h-10 w-full overflow-hidden bg-[#F4F3EF]">
                  <img
                    src={resolveAssetUrl(slide.url)}
                    alt={slide.label}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className={`h-full w-full object-cover ${slide.imageTransformClass}`}
                  />
                </div>
                <span
                  className={`w-full truncate px-0.5 py-0.5 text-center text-[8px] leading-tight font-bold ${
                    isSelected
                      ? 'bg-[#FFF3EB] text-[#F85606]'
                      : 'bg-white text-slate-600'
                  }`}
                >
                  {slide.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. FULL-SCREEN SINGLE-IMAGE LIGHTBOX MODAL */}
      <AnimatePresence>
        {lightboxSlide && lightboxSlideIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={closeLightbox}
            className="fixed inset-0 z-[70] flex flex-col items-center justify-between bg-black/95 p-3 backdrop-blur-md sm:p-6"
          >
            {/* Top Bar inside Full-Screen Image View */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex w-full max-w-5xl items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/10 px-4 py-2.5 text-white backdrop-blur-md"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-[#F85606] px-2 py-0.5 font-mono text-xs font-extrabold text-white">
                    Image {lightboxSlideIndex + 1} of {slides.length}
                  </span>
                  <span className="truncate font-display text-sm font-bold text-white">
                    {lightboxSlide.label}
                  </span>
                </div>
                <p className="truncate text-xs text-slate-300">{lightboxSlide.caption}</p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  onClick={closeLightbox}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-3.5 py-1.5 text-xs font-extrabold text-white transition-colors hover:bg-[#d94800]"
                >
                  <X className="h-4 w-4" />
                  <span>Close</span>
                </button>
              </div>
            </div>

            {/* Center Full-Screen Isolated Image Showcase */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="relative my-auto flex max-h-[74vh] w-full max-w-4xl items-center justify-center overflow-hidden rounded-2xl border border-white/15 bg-slate-900 shadow-2xl"
            >
              <div className="flex h-[68vh] w-full items-center justify-center overflow-hidden bg-black">
                <img
                  src={resolveAssetUrl(lightboxSlide.url)}
                  alt={lightboxSlide.caption}
                  decoding="async"
                  referrerPolicy="no-referrer"
                  className={`max-h-full max-w-full object-contain ${lightboxSlide.imageTransformClass}`}
                />
              </div>
            </div>

            {/* Bottom Horizontal Thumbnail Slide Strip inside Full-Screen Lightbox */}
            <div
              onClick={(e) => e.stopPropagation()}
              className="flex max-w-full items-center gap-2 overflow-x-auto rounded-xl border border-white/15 bg-white/10 p-2 backdrop-blur-md"
            >
              {slides.map((s, idx) => (
                <button
                  key={`lb-thumb-${s.id}`}
                  type="button"
                  onClick={() => {
                    setLightboxSlideIndex(idx);
                    scrollToSlide(idx);
                  }}
                  className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                    idx === lightboxSlideIndex
                      ? 'border-[#F85606] shadow-md'
                      : 'border-white/20 opacity-65 hover:opacity-100'
                  }`}
                >
                  <img
                    src={resolveAssetUrl(s.url)}
                    alt={s.label}
                    loading="lazy"
                    decoding="async"
                    className={`h-full w-full object-cover ${s.imageTransformClass}`}
                  />
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
