import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Share2,
  Copy,
  Check,
  Link2,
  MessageCircle,
  Send,
  Mail,
  ExternalLink,
} from 'lucide-react';
import { MarketplaceProduct, formatLKR } from '../data/catalog';
import { resolveAssetUrl } from '../utils/assetResolver';

/**
 * Builds the canonical deep-link URL that directly opens a specific product on BuyKit with Pramu.
 */
export function buildProductShareUrl(productId: string): string {
  if (typeof window === 'undefined') {
    return `?product=${encodeURIComponent(productId)}`;
  }
  const url = new URL(window.location.href);
  url.search = '';
  url.hash = '';
  url.searchParams.set('product', productId);
  return url.toString();
}

interface ProductShareModalProps {
  product: MarketplaceProduct | null;
  effectivePrice: number;
  onClose: () => void;
  onCopiedLink?: (product: MarketplaceProduct, shareUrl: string) => void;
}

export const ProductShareModal: React.FC<ProductShareModalProps> = ({
  product,
  effectivePrice,
  onClose,
  onCopiedLink,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setCopied(false);
  }, [product?.id]);

  if (!product) return null;

  const shareUrl = buildProductShareUrl(product.id);
  const shareCaption = `${product.title} — ${formatLKR(effectivePrice)} on BuyKit with Pramu`;
  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedTextWithLink = encodeURIComponent(`${shareCaption}\n${shareUrl}`);
  const encodedSubject = encodeURIComponent(product.title);

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(shareUrl);
      } else {
        const input = document.createElement('input');
        input.value = shareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      onCopiedLink?.(product, shareUrl);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }
  };

  const canNativeShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';

  const handleNativeShare = async () => {
    if (!canNativeShare) {
      await handleCopyLink();
      return;
    }
    try {
      await navigator.share({
        title: product.title,
        text: shareCaption,
        url: shareUrl,
      });
    } catch (err) {
      // If user dismissed native share sheet or iframe blocked Web Share, silently fallback to copy
      if ((err as Error)?.name !== 'AbortError') {
        await handleCopyLink();
      }
    }
  };

  const discountPercent = Math.max(
    0,
    Math.round(((product.originalPrice - effectivePrice) / Math.max(1, product.originalPrice)) * 100)
  );

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Share ${product.title}`}
        className="fixed inset-0 z-[130] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-[2px] sm:items-center sm:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.98 }}
          transition={{ duration: 0.18, ease: 'easeOut' }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-md overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl sm:rounded-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Share2 className="h-4 w-4 text-[#F85606]" />
              <h2 className="font-display text-base font-bold text-slate-950">
                Share Product Link
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close share dialog"
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 p-5">
            {/* Compact Product Preview */}
            <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
              <img
                src={resolveAssetUrl(product.imageUrl)}
                alt={product.title}
                referrerPolicy="no-referrer"
                className="h-16 w-16 shrink-0 rounded-lg border border-slate-200 bg-white object-cover"
              />
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 font-display text-xs font-bold leading-snug text-slate-900 sm:text-sm">
                  {product.title}
                </p>
                <div className="mt-1 flex flex-wrap items-baseline gap-1.5 font-mono tabular-nums">
                  <span className="text-sm font-extrabold text-[#F85606]">
                    {formatLKR(effectivePrice)}
                  </span>
                  {product.originalPrice > effectivePrice && (
                    <span className="text-[11px] text-slate-400 line-through">
                      {formatLKR(product.originalPrice)}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-[11px] font-bold text-emerald-700">
                      -{discountPercent}%
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Direct Copyable Product Link Box */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold text-slate-700">
                Direct Product Link
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5 pl-3">
                <Link2 className="h-4 w-4 shrink-0 text-slate-400" />
                <input
                  type="text"
                  readOnly
                  value={shareUrl}
                  onFocus={(e) => e.currentTarget.select()}
                  aria-label="Product link URL"
                  className="min-w-0 flex-1 bg-transparent font-mono text-xs text-slate-800 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3.5 py-2 text-xs font-bold text-white transition-colors whitespace-nowrap ${
                    copied
                      ? 'bg-emerald-600 hover:bg-emerald-700'
                      : 'bg-[#F85606] hover:bg-[#d94800]'
                  }`}
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Link</span>
                    </>
                  )}
                </button>
              </div>
              <p className="mt-1.5 text-[11px] text-slate-500">
                Anyone who opens this link will go directly to this product page.
              </p>
            </div>

            {/* Share Channels (Pure Product Link Delivery via Anchor Links — No window.open) */}
            <div className="grid grid-cols-4 gap-2 pt-1">
              <a
                href={`https://wa.me/?text=${encodedTextWithLink}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center transition-colors hover:border-emerald-300 hover:bg-emerald-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500 text-white">
                  <MessageCircle className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold text-slate-700">WhatsApp</span>
              </a>

              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center transition-colors hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
                  <ExternalLink className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold text-slate-700">Facebook</span>
              </a>

              <a
                href={`https://t.me/share/url?url=${encodedUrl}&text=${encodeURIComponent(shareCaption)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center transition-colors hover:border-sky-300 hover:bg-sky-50"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-sky-500 text-white">
                  <Send className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold text-slate-700">Telegram</span>
              </a>

              <a
                href={`mailto:?subject=${encodedSubject}&body=${encodedTextWithLink}`}
                className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-3 text-center transition-colors hover:border-orange-300 hover:bg-[#FFF5F0]"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-800 text-white">
                  <Mail className="h-4 w-4" />
                </span>
                <span className="text-[11px] font-semibold text-slate-700">Email</span>
              </a>
            </div>

            {canNativeShare && (
              <button
                type="button"
                onClick={handleNativeShare}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-bold text-slate-800 transition-colors hover:border-[#F85606] hover:bg-[#FFF5F0] hover:text-[#F85606]"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>Share via Device Apps</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
