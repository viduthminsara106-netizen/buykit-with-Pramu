import React, { useState, useEffect } from 'react';
import { ShoppingBag } from 'lucide-react';

// Static Vite module imports guarantee every image is bundled into dist/assets/ on Vercel builds
import heroMarketplaceImg from '../assets/images/hero_marketplace_showcase_1794121196938.jpg';
import audioHeadphonesImg from '../assets/images/product_audio_headphones_1794121197272.jpg';
import cameraDroneImg from '../assets/images/product_camera_drone_1794121198906.jpg';
import espressoMakerImg from '../assets/images/product_espresso_maker_1794123345741.jpg';
import gamingControllerImg from '../assets/images/product_gaming_controller_1794123345268.jpg';
import powerbankChargerImg from '../assets/images/product_powerbank_charger_1794123346828.jpg';
import smartwatchProImg from '../assets/images/product_smartwatch_pro_1794121197679.jpg';
import promoFlashFestivalImg from '../assets/images/promo_poster_flash_festival_1794319675114.jpg';
import promoHomeLifestyleImg from '../assets/images/promo_poster_home_lifestyle_1794319676096.jpg';
import promoMegaSaleImg from '../assets/images/promo_poster_mega_sale_1794319674629.jpg';
import buykitLogoImg from '../assets/images/buykit_logo_emblem.jpg';

export const BUNDLED_IMAGE_MAP: Record<string, string> = {
  'hero_marketplace_showcase_1794121196938.jpg': heroMarketplaceImg,
  'product_audio_headphones_1794121197272.jpg': audioHeadphonesImg,
  'product_camera_drone_1794121198906.jpg': cameraDroneImg,
  'product_espresso_maker_1794123345741.jpg': espressoMakerImg,
  'product_gaming_controller_1794123345268.jpg': gamingControllerImg,
  'product_powerbank_charger_1794123346828.jpg': powerbankChargerImg,
  'product_smartwatch_pro_1794121197679.jpg': smartwatchProImg,
  'promo_poster_flash_festival_1794319675114.jpg': promoFlashFestivalImg,
  'promo_poster_home_lifestyle_1794319676096.jpg': promoHomeLifestyleImg,
  'promo_poster_mega_sale_1794319674629.jpg': promoMegaSaleImg,
  'Screenshot_20261107_191852_81defece.jpg': buykitLogoImg,
  'buykit_logo_emblem.jpg': buykitLogoImg,
};

/**
 * Resolves any image path (including legacy `/src/assets/images/...` or persisted Firestore URLs)
 * to the Vite-bundled asset URL so images work 100% reliably on Vercel and local dev.
 */
export function resolveAssetUrl(rawUrl?: string | null): string {
  if (!rawUrl) return heroMarketplaceImg;
  const trimmed = rawUrl.trim();
  if (!trimmed) return heroMarketplaceImg;

  // Data URLs or external https URLs pass through directly
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Match filename against bundled Vite assets
  for (const [fileName, bundledUrl] of Object.entries(BUNDLED_IMAGE_MAP)) {
    if (trimmed.endsWith(fileName) || trimmed.includes(fileName)) {
      return bundledUrl;
    }
  }

  // Ensure leading slash for public assets (e.g., /assets/aistudio/...)
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

/**
 * Detects whether the user is on a slow connection (2G / slow-2G / 3G or Data Saver enabled)
 */
export function detectSlowConnection(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as unknown as {
    connection?: {
      saveData?: boolean;
      effectiveType?: string;
      downlink?: number;
    };
  }).connection;
  if (!conn) return false;
  if (conn.saveData) return true;
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g' || conn.effectiveType === '3g') {
    return true;
  }
  if (typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 1.5) {
    return true;
  }
  return false;
}

export interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
  lowDataMode?: boolean;
}

/**
 * Progressive, low-connection friendly Image component:
 * - Resolves `/src/assets/images/*` via Vite bundle + `/public` fallback for Vercel
 * - Uses native `loading="lazy"` and `decoding="async"` to save bandwidth on offscreen cards
 * - Renders an instant lightweight shimmer placeholder until the progressive JPEG finishes decoding
 * - Provides a clean fallback if offline
 */
export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  className = '',
  priority = false,
}) => {
  const resolvedSrc = resolveAssetUrl(src);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);
  const [usedFallbackPath, setUsedFallbackPath] = useState(false);

  useEffect(() => {
    setFailed(false);
    setUsedFallbackPath(false);
  }, [src]);

  // Extract fallback public path if bundled path ever fails
  const getPublicFallbackUrl = (input: string): string => {
    for (const fileName of Object.keys(BUNDLED_IMAGE_MAP)) {
      if (input.includes(fileName)) {
        return `/assets/images/${fileName}`;
      }
    }
    return input;
  };

  if (failed || !resolvedSrc) {
    return (
      <div
        className={`flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 via-stone-100 to-orange-50/60 p-3 text-center ${className}`}
      >
        <ShoppingBag className="mb-1 h-6 w-6 text-[#F85606]/70" />
        <span className="line-clamp-2 text-[11px] font-semibold text-slate-600">{alt}</span>
      </div>
    );
  }

  const activeSrc = usedFallbackPath ? getPublicFallbackUrl(src) : resolvedSrc;

  return (
    <div className="relative h-full w-full overflow-hidden bg-[#F4F3EF]">
      {!loaded && (
        <div
          aria-hidden="true"
          className="absolute inset-0 animate-pulse bg-gradient-to-r from-[#F4F3EF] via-[#EAE7DF] to-[#F4F3EF]"
        />
      )}
      <img
        src={activeSrc}
        alt={alt}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        fetchPriority={priority ? 'high' : 'auto'}
        referrerPolicy="no-referrer"
        onLoad={() => setLoaded(true)}
        onError={() => {
          if (!usedFallbackPath) {
            setUsedFallbackPath(true);
          } else {
            setFailed(true);
          }
        }}
        className={`${className} transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-90'
        }`}
      />
    </div>
  );
};
