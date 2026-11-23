import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Sparkles, Ticket, Check, ArrowRight, Flame } from 'lucide-react';
import { resolveAssetUrl } from '../utils/assetResolver';

export interface WelcomePopupPosterConfig {
  enabled: boolean;
  campaignVersion: string;
  badgeText: string;
  headline: string;
  subheadline: string;
  highlightText: string;
  couponCode: string;
  ctaLabel: string;
  imageUrl: string;
  targetProductId?: string;
}

export const DEFAULT_WELCOME_POPUP_CONFIG: WelcomePopupPosterConfig = {
  enabled: true,
  campaignVersion: 'v1_welcome_mega',
  badgeText: 'MEGA WELCOME OFFER · LIMITED TIME',
  headline: 'Up to 62% OFF + Extra Rs. 5,000 LKR Voucher',
  subheadline:
    'Shop genuine flagship electronics, audio gear & smart gadgets across Sri Lanka with Instant LANKAQR, Cash on Delivery & Free Hub Express.',
  highlightText: 'Use code BUYKIT5000 at checkout',
  couponCode: 'BUYKIT5000',
  ctaLabel: 'Claim Offer & Shop Now',
  imageUrl: '/src/assets/images/hero_marketplace_showcase_1794121196938.jpg',
  targetProductId: '',
};

interface WelcomePopupPosterModalProps {
  isOpen: boolean;
  config: WelcomePopupPosterConfig;
  onClose: () => void;
  onCtaClick: (config: WelcomePopupPosterConfig) => void;
}

export const WelcomePopupPosterModal: React.FC<WelcomePopupPosterModalProps> = ({
  isOpen,
  config,
  onClose,
  onCtaClick,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyCode = () => {
    if (!config.couponCode.trim()) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(config.couponCode.trim()).catch(() => {});
    }
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 24 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 18 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg overflow-hidden rounded-3xl border-2 border-orange-400/70 bg-slate-950 text-white shadow-2xl"
          >
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Close welcome promotion poster"
              className="absolute top-3.5 right-3.5 z-20 flex h-9 w-9 items-center justify-center rounded-full border border-white/25 bg-slate-950/80 text-white backdrop-blur-xs transition-colors hover:bg-[#F85606]"
            >
              <X className="h-4.5 w-4.5" />
            </button>

            {/* Poster Image Banner */}
            <div className="relative h-56 w-full overflow-hidden bg-slate-900 sm:h-64">
              <img
                src={resolveAssetUrl(
                  config.imageUrl || '/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'
                )}
                alt={config.headline}
                referrerPolicy="no-referrer"
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <div className="absolute top-3.5 left-3.5 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-[#F85606] to-amber-500 px-3 py-1 text-[11px] font-extrabold tracking-wide text-white uppercase shadow-md">
                <Flame className="h-3.5 w-3.5" />
                <span>{config.badgeText || 'SPECIAL PROMOTION'}</span>
              </div>
            </div>

            {/* Poster Content */}
            <div className="space-y-4 px-6 pt-3 pb-6 sm:px-7">
              <div>
                <h2 className="font-display text-2xl leading-tight font-extrabold text-white sm:text-3xl">
                  {config.headline}
                </h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-300 sm:text-sm">
                  {config.subheadline}
                </p>
              </div>

              {/* Coupon / Highlight Strip */}
              {(config.couponCode.trim() || config.highlightText.trim()) && (
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-amber-400/40 bg-gradient-to-r from-orange-500/20 via-amber-500/15 to-transparent px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#F85606] text-white shadow-xs">
                      <Ticket className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold tracking-wider text-amber-300 uppercase">
                        {config.highlightText || 'Exclusive Welcome Promo Code'}
                      </p>
                      {config.couponCode.trim() && (
                        <p className="font-mono text-base font-extrabold tracking-widest text-white">
                          {config.couponCode.trim().toUpperCase()}
                        </p>
                      )}
                    </div>
                  </div>

                  {config.couponCode.trim() && (
                    <button
                      type="button"
                      onClick={handleCopyCode}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 py-1.5 text-xs font-bold text-white transition-colors hover:bg-white/20"
                    >
                      {copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-400" />
                          <span className="text-emerald-300">Copied</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                          <span>Copy Code</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Primary CTA & Dismiss */}
              <div className="flex flex-col gap-2 pt-1 sm:flex-row">
                <button
                  type="button"
                  onClick={() => onCtaClick(config)}
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#F85606] to-[#ff7b00] px-5 py-3.5 text-sm font-extrabold text-white shadow-lg transition-transform hover:scale-[1.01]"
                >
                  <span>{config.ctaLabel || 'Shop Offer Now'}</span>
                  <ArrowRight className="h-4 w-4" />
                </button>

                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-xs font-bold text-slate-300 transition-colors hover:bg-white/15 hover:text-white"
                >
                  Maybe Later
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
