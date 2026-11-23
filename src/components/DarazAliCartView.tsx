import React, { useMemo } from 'react';
import {
  ShoppingBag,
  Check,
  Minus,
  Plus,
  Trash2,
  Store,
  ShieldCheck,
  ChevronRight,
  Truck,
} from 'lucide-react';
import { formatLKR } from '../data/catalog';
import { resolveAssetUrl } from '../utils/assetResolver';
import { CheckoutLineItem } from './DarazAliCheckoutView';

interface DarazAliCartViewProps {
  items: CheckoutLineItem[];
  selectedItemIds: string[];
  onToggleSelectItem: (itemId: string) => void;
  onToggleSelectAll: () => void;
  onUpdateItemQuantity: (item: CheckoutLineItem, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onRemoveSelectedItems: () => void;
  onOpenProductById?: (productId: string) => void;
  onContinueShopping: () => void;
  onProceedToCheckout: () => void;
}

export const DarazAliCartView: React.FC<DarazAliCartViewProps> = ({
  items,
  selectedItemIds,
  onToggleSelectItem,
  onToggleSelectAll,
  onUpdateItemQuantity,
  onRemoveItem,
  onRemoveSelectedItems,
  onOpenProductById,
  onContinueShopping,
  onProceedToCheckout,
}) => {
  const selectedIdSet = useMemo(() => new Set(selectedItemIds), [selectedItemIds]);

  const selectedItems = useMemo(
    () => items.filter((item) => selectedIdSet.has(item.id)),
    [items, selectedIdSet]
  );

  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const totalCartUnitCount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity, 0),
    [items]
  );
  const selectedUnitCount = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.quantity, 0),
    [selectedItems]
  );
  const selectedSubtotal = useMemo(
    () => selectedItems.reduce((sum, item) => sum + item.price * item.quantity, 0),
    [selectedItems]
  );
  const selectedOriginalTotal = useMemo(
    () =>
      selectedItems.reduce(
        (sum, item) => sum + Math.max(item.originalPrice, item.price) * item.quantity,
        0
      ),
    [selectedItems]
  );
  const selectedSavings = Math.max(0, selectedOriginalTotal - selectedSubtotal);

  return (
    <section className="mx-auto max-w-4xl pb-44">
      {/* Daraz / AliExpress Cart Top Header */}
      <div className="mb-3 flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 shadow-2xs sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB] text-[#F85606]">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-display text-base font-extrabold tracking-tight text-slate-950 sm:text-lg">
              Shopping Cart{' '}
              <span className="font-mono text-sm font-bold text-[#F85606]">
                ({totalCartUnitCount})
              </span>
            </h1>
            <p className="text-[11px] text-slate-500">
              Select the products you want to pay for now
            </p>
          </div>
        </div>

        {items.length > 0 && selectedItems.length > 0 && (
          <button
            type="button"
            onClick={onRemoveSelectedItems}
            className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/70 px-3 py-1.5 text-xs font-bold text-red-600 transition-colors hover:bg-red-600 hover:text-white"
          >
            <Trash2 className="h-3.5 w-3.5" />
            <span>Delete ({selectedItems.length})</span>
          </button>
        )}
      </div>

      {/* Empty Cart State — Strictly shows ONLY user-added products */}
      {items.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-2xs">
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-[#FFF3EB] text-[#F85606]">
            <ShoppingBag className="h-10 w-10" />
          </div>
          <h2 className="font-display text-lg font-extrabold text-slate-950">
            Your shopping cart is empty
          </h2>
          <p className="mt-1.5 max-w-sm text-xs leading-relaxed text-slate-500 sm:text-sm">
            Products you add to your cart will appear here. Browse flash deals and add items to
            get started.
          </p>
          <button
            type="button"
            onClick={onContinueShopping}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-[#F85606] px-7 py-3 text-sm font-extrabold text-white shadow-sm transition-colors hover:bg-[#d94800]"
          >
            <span>Start Shopping</span>
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Select All Control Strip (Daraz / AliExpress style) */}
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="flex items-center gap-3 text-left"
              aria-pressed={allSelected}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                  allSelected
                    ? 'border-[#F85606] bg-[#F85606] text-white'
                    : 'border-slate-300 bg-white text-transparent hover:border-[#F85606]'
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span className="text-xs font-extrabold tracking-wide text-slate-900 uppercase sm:text-sm">
                Select All ({items.length} {items.length === 1 ? 'Product' : 'Products'})
              </span>
            </button>

            <span className="text-xs font-semibold text-slate-500">
              {selectedItems.length} of {items.length} selected
            </span>
          </div>

          {/* Store Group Container (Daraz Mall / AliExpress Choice Seller Block) */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xs">
            {/* Store Header */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-2.5">
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={onToggleSelectAll}
                  aria-label="Select all items from BuyKit Official Store"
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-colors ${
                    allSelected
                      ? 'border-[#F85606] bg-[#F85606] text-white'
                      : 'border-slate-300 bg-white text-transparent hover:border-[#F85606]'
                  }`}
                >
                  <Check className="h-3.5 w-3.5 stroke-[3]" />
                </button>
                <Store className="h-4 w-4 text-[#F85606]" />
                <span className="text-xs font-extrabold text-slate-900 sm:text-sm">
                  BuyKit Official Store
                </span>
                <span className="rounded bg-[#FFF3EB] px-1.5 py-0.5 text-[10px] font-extrabold text-[#F85606]">
                  Choice
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700">
                <Truck className="h-3.5 w-3.5" />
                <span>Free Shipping eligible at Checkout</span>
              </div>
            </div>

            {/* Individual Cart Product Rows */}
            <div className="divide-y divide-slate-100">
              {items.map((item) => {
                const isSelected = selectedIdSet.has(item.id);
                const discountPercent =
                  item.originalPrice > item.price
                    ? Math.round(
                        ((item.originalPrice - item.price) / item.originalPrice) * 100
                      )
                    : 0;

                return (
                  <div
                    key={item.id}
                    className={`flex items-start gap-3 p-3.5 transition-colors sm:items-center sm:gap-4 sm:p-4 ${
                      isSelected ? 'bg-white' : 'bg-slate-50/40'
                    }`}
                  >
                    {/* Left Item Checkbox */}
                    <button
                      type="button"
                      onClick={() => onToggleSelectItem(item.id)}
                      aria-label={isSelected ? `Unselect ${item.title}` : `Select ${item.title}`}
                      aria-pressed={isSelected}
                      className={`mt-7 flex h-5 w-5 shrink-0 items-center justify-center rounded-md border-2 transition-all sm:mt-0 ${
                        isSelected
                          ? 'border-[#F85606] bg-[#F85606] text-white shadow-2xs'
                          : 'border-slate-300 bg-white text-transparent hover:border-[#F85606]'
                      }`}
                    >
                      <Check className="h-3.5 w-3.5 stroke-[3]" />
                    </button>

                    {/* Product Thumbnail */}
                    <button
                      type="button"
                      onClick={() => onOpenProductById?.(item.productId || item.id)}
                      className="h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 sm:h-24 sm:w-24"
                    >
                      <img
                        src={resolveAssetUrl(item.imageUrl)}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        className={`h-full w-full object-cover transition-opacity ${
                          isSelected ? 'opacity-100' : 'opacity-70'
                        }`}
                      />
                    </button>

                    {/* Product Details, Price & Qty Controls */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => onOpenProductById?.(item.productId || item.id)}
                          className="line-clamp-2 text-left text-xs font-bold leading-snug text-slate-900 transition-colors hover:text-[#F85606] sm:text-sm"
                        >
                          {item.title}
                        </button>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          aria-label={`Remove ${item.title} from cart`}
                          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-1.5">
                        <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                          {item.category}
                        </span>
                        {discountPercent > 0 && (
                          <span className="rounded bg-[#FFF3EB] px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-[#F85606]">
                            -{discountPercent}% OFF
                          </span>
                        )}
                      </div>

                      {/* Bottom Row: Price on Left, Quantity Stepper on Right */}
                      <div className="mt-3 flex flex-wrap items-end justify-between gap-2">
                        <div>
                          <div className="flex items-baseline gap-2">
                            <span className="font-mono text-sm font-extrabold text-[#F85606] tabular-nums sm:text-base">
                              {formatLKR(item.price)}
                            </span>
                            {item.originalPrice > item.price && (
                              <span className="font-mono text-[11px] text-slate-400 line-through tabular-nums">
                                {formatLKR(item.originalPrice)}
                              </span>
                            )}
                          </div>
                          {item.quantity > 1 && (
                            <p className="text-[10px] font-semibold text-slate-500">
                              Subtotal: {formatLKR(item.price * item.quantity)}
                            </p>
                          )}
                        </div>

                        {/* Daraz / AliExpress Quantity Stepper */}
                        <div className="inline-flex items-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">
                          <button
                            type="button"
                            onClick={() => onUpdateItemQuantity(item, -1)}
                            aria-label="Decrease quantity"
                            className="flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-200 sm:h-8 sm:w-8"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="min-w-[32px] bg-white px-2 text-center font-mono text-xs font-extrabold text-slate-950 tabular-nums sm:text-sm">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateItemQuantity(item, 1)}
                            aria-label="Increase quantity"
                            className="flex h-7 w-7 items-center justify-center text-slate-700 transition-colors hover:bg-slate-200 sm:h-8 sm:w-8"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Subtle Buyer Protection Note */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50/50 px-4 py-2.5 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span>BuyKit Buyer Protection · Coupons, Address & Payment Options on next step</span>
              </span>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          STICKY BOTTOM TOTAL PAYABLE BAR (Daraz / AliExpress Style)
          Stays pinned right above the bottom navigation bar
         ========================================================= */}
      {items.length > 0 && (
        <div className="fixed right-0 bottom-[62px] left-0 z-30 border-t border-slate-200 bg-white/98 px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.08)] backdrop-blur-md sm:px-6">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-3">
            {/* Left: Select All Toggle */}
            <button
              type="button"
              onClick={onToggleSelectAll}
              className="flex shrink-0 items-center gap-2 py-1"
              aria-pressed={allSelected}
            >
              <span
                className={`flex h-5 w-5 items-center justify-center rounded-md border-2 transition-colors ${
                  allSelected
                    ? 'border-[#F85606] bg-[#F85606] text-white'
                    : 'border-slate-300 bg-white text-transparent hover:border-[#F85606]'
                }`}
              >
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </span>
              <span className="text-xs font-bold text-slate-800 sm:text-sm">All</span>
            </button>

            {/* Right: Total Payable + Pay Now CTA */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="text-right">
                <div className="flex items-baseline justify-end gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-500 sm:text-xs">
                    Total Payable:
                  </span>
                  <span className="font-mono text-base font-extrabold text-[#F85606] tabular-nums sm:text-xl">
                    {formatLKR(selectedSubtotal)}
                  </span>
                </div>
                {selectedSavings > 0 ? (
                  <p className="text-[10px] font-bold text-emerald-700">
                    You save {formatLKR(selectedSavings)} · Coupons on next step
                  </p>
                ) : (
                  <p className="text-[10px] text-slate-500">
                    {selectedUnitCount > 0
                      ? 'Coupons, address & payment on next page'
                      : 'Select at least 1 product to continue'}
                  </p>
                )}
              </div>

              <button
                type="button"
                disabled={selectedItems.length === 0}
                onClick={onProceedToCheckout}
                className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-5 py-3 text-xs font-extrabold shadow-sm transition-all sm:px-8 sm:text-sm ${
                  selectedItems.length > 0
                    ? 'bg-[#F85606] text-white hover:bg-[#d94800] active:scale-[0.98]'
                    : 'cursor-not-allowed bg-slate-200 text-slate-400 shadow-none'
                }`}
              >
                <span>Pay Now</span>
                <span className="font-mono">({selectedUnitCount})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
