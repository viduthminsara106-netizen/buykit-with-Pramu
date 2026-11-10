import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Truck,
  MapPin,
  Ticket,
  CreditCard,
  Wallet,
  ShieldCheck,
  CheckCircle2,
  Plus,
  Minus,
  Trash2,
  ChevronRight,
  Sparkles,
  Edit3,
  Globe,
  Phone,
  Mail,
  Lock,
  Bolt,
  Check,
  QrCode,
  CalendarClock,
} from 'lucide-react';
import { DealTier, formatLKR } from '../data/catalog';
import {
  COUNTRIES_WITH_FLAGS,
  SavedPaymentCard,
  SettingsTabKey,
} from './AccountSettingsModal';

export interface CheckoutLineItem {
  id: string;
  userId: string;
  productId: string;
  title: string;
  category: string;
  dealType: DealTier;
  price: number;
  originalPrice: number;
  quantity: number;
  imageUrl: string;
}

export interface CouponOption {
  id: string;
  code: string;
  title: string;
  subtitle: string;
  type: 'percent' | 'flat' | 'none';
  value: number;
  maxCap: number;
  minSpend: number;
  badgeText: string;
}

export const AVAILABLE_CHECKOUT_COUPONS: CouponOption[] = [
  {
    id: 'coupon_buykit5000',
    code: 'BUYKIT5000',
    title: 'New User & Choice Welcome Voucher',
    subtitle: '12% OFF your order (Up to Rs. 5,000 max discount)',
    type: 'percent',
    value: 12,
    maxCap: 5000,
    minSpend: 0,
    badgeText: '12% OFF · Max Rs. 5,000',
  },
  {
    id: 'coupon_mega2500',
    code: 'MEGA2500',
    title: 'BuyKit SuperDeal Flash Coupon',
    subtitle: 'Flat Rs. 2,500 instant discount on orders above Rs. 12,000',
    type: 'flat',
    value: 2500,
    maxCap: 2500,
    minSpend: 12000,
    badgeText: 'Flat Rs. 2,500 OFF',
  },
  {
    id: 'coupon_bank10',
    code: 'VISAMC10',
    title: 'Visa & Mastercard Bank Partner Voucher',
    subtitle: '10% OFF for Credit/Debit card checkout (Up to Rs. 4,000)',
    type: 'percent',
    value: 10,
    maxCap: 4000,
    minSpend: 5000,
    badgeText: '10% Bank Partner OFF',
  },
  {
    id: 'coupon_choice1000',
    code: 'CHOICE1000',
    title: 'BuyKit Mall Instant Cashback Coupon',
    subtitle: 'Flat Rs. 1,000 OFF on any product in the store',
    type: 'flat',
    value: 1000,
    maxCap: 1000,
    minSpend: 0,
    badgeText: 'Flat Rs. 1,000 OFF',
  },
  {
    id: 'coupon_none',
    code: 'NO_COUPON',
    title: 'Do Not Apply Any Coupon',
    subtitle: 'Pay standard storefront deal price without extra voucher',
    type: 'none',
    value: 0,
    maxCap: 0,
    minSpend: 0,
    badgeText: 'No Coupon',
  },
];

export type DeliveryMethodKey = 'standard' | 'express' | 'pickup_hub';
export type CheckoutPaymentMethodKey =
  | 'card_express'
  | 'cod'
  | 'koko_installments'
  | 'lanka_qr';

interface DarazAliCheckoutViewProps {
  currentUser: unknown;
  items: CheckoutLineItem[];
  fullName: string;
  email: string;
  phone: string;
  secondaryPhone: string;
  shippingAddress: string;
  cityDistrict: string;
  postalCode: string;
  addressLabel: 'Home' | 'Office';
  selectedHubName: string;
  selectedCountryCode: string;
  savedCards: SavedPaymentCard[];
  paymentMethod: 'cod' | 'card_express';
  checkoutSubmitting: boolean;
  onSelectPaymentMethod: (method: 'cod' | 'card_express') => void;
  onUpdateItemQuantity: (item: CheckoutLineItem, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onOpenSettingsTab: (tab: SettingsTabKey) => void;
  onOpenPickupMap: () => void;
  onContinueShopping: () => void;
  onOpenAuthModal: () => void;
  onConfirmCheckoutOrder: (summary: {
    finalPayableAmount: number;
    couponCode: string;
    couponDiscount: number;
    deliveryFee: number;
    deliveryMethodLabel: string;
    paymentMethodLabel: string;
  }) => Promise<void>;
}

export const DarazAliCheckoutView: React.FC<DarazAliCheckoutViewProps> = ({
  currentUser,
  items,
  fullName,
  email,
  phone,
  secondaryPhone,
  shippingAddress,
  cityDistrict,
  postalCode,
  addressLabel,
  selectedHubName,
  selectedCountryCode,
  savedCards,
  checkoutSubmitting,
  onSelectPaymentMethod,
  onUpdateItemQuantity,
  onRemoveItem,
  onOpenSettingsTab,
  onOpenPickupMap,
  onContinueShopping,
  onOpenAuthModal,
  onConfirmCheckoutOrder,
}) => {
  const [selectedCouponId, setSelectedCouponId] = useState<string>('coupon_buykit5000');
  const [isCouponPickerOpen, setIsCouponPickerOpen] = useState<boolean>(false);
  const [customCouponInput, setCustomCouponInput] = useState<string>('');
  const [freeShippingVoucherApplied, setFreeShippingVoucherApplied] = useState<boolean>(true);
  const [redeemBuyKitCoins, setRedeemBuyKitCoins] = useState<boolean>(true);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodKey>('standard');
  const [selectedPaymentOption, setSelectedPaymentOption] =
    useState<CheckoutPaymentMethodKey>('card_express');
  const [selectedCardId, setSelectedCardId] = useState<string>(
    savedCards.find((c) => c.isDefault)?.id || savedCards[0]?.id || ''
  );

  const currentCountry =
    COUNTRIES_WITH_FLAGS.find((c) => c.code === selectedCountryCode) ||
    COUNTRIES_WITH_FLAGS[0];

  const totalUnits = items.reduce((sum, i) => sum + i.quantity, 0);
  const itemsSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const itemsOriginalTotal = items.reduce(
    (sum, i) => sum + i.originalPrice * i.quantity,
    0
  );
  const storefrontDealSavings = Math.max(0, itemsOriginalTotal - itemsSubtotal);

  const activeCoupon =
    AVAILABLE_CHECKOUT_COUPONS.find((c) => c.id === selectedCouponId) ||
    AVAILABLE_CHECKOUT_COUPONS[0];

  // Calculate Coupon Discount in LKR
  const couponDiscountAmount = useMemo(() => {
    if (itemsSubtotal <= 0 || activeCoupon.type === 'none') return 0;
    if (itemsSubtotal < activeCoupon.minSpend) return 0;
    if (activeCoupon.type === 'flat') {
      return Math.min(itemsSubtotal * 0.5, activeCoupon.value);
    }
    if (activeCoupon.type === 'percent') {
      const raw = Math.round((itemsSubtotal * activeCoupon.value) / 100);
      return Math.min(activeCoupon.maxCap, raw);
    }
    return 0;
  }, [itemsSubtotal, activeCoupon]);

  // Calculate BuyKit Coins Discount
  const coinsDiscountAmount = useMemo(() => {
    if (!redeemBuyKitCoins || itemsSubtotal <= 0) return 0;
    return Math.min(1250, Math.round(itemsSubtotal * 0.1));
  }, [redeemBuyKitCoins, itemsSubtotal]);

  // Calculate Delivery Fee (Shows clearly whether Delivery Fee is Rs. 0 FREE or has a Fee)
  const deliveryFeeAmount = useMemo(() => {
    if (itemsSubtotal <= 0) return 0;
    if (deliveryMethod === 'pickup_hub') return 0;
    if (deliveryMethod === 'express') {
      return currentCountry.code === 'LK' ? 450 : currentCountry.baseShippingLkr + 600;
    }
    // Standard Delivery: Free if Free Shipping Voucher is toggled on, otherwise base country shipping fee (Rs. 350 in LK)
    return freeShippingVoucherApplied ? 0 : currentCountry.baseShippingLkr;
  }, [itemsSubtotal, deliveryMethod, freeShippingVoucherApplied, currentCountry]);

  const hubCollectionBonus = deliveryMethod === 'pickup_hub' && itemsSubtotal > 0 ? 150 : 0;

  const finalPayableAmount = Math.max(
    500,
    itemsSubtotal -
      couponDiscountAmount -
      coinsDiscountAmount -
      hubCollectionBonus +
      deliveryFeeAmount
  );

  const totalCombinedSavings =
    storefrontDealSavings + couponDiscountAmount + coinsDiscountAmount + hubCollectionBonus;

  const handleApplyCustomCoupon = () => {
    const clean = customCouponInput.trim().toUpperCase();
    if (!clean) return;
    const matched = AVAILABLE_CHECKOUT_COUPONS.find(
      (c) => c.code.toUpperCase() === clean
    );
    if (matched) {
      setSelectedCouponId(matched.id);
      setCustomCouponInput('');
    } else {
      setSelectedCouponId('coupon_mega2500');
      setCustomCouponInput('');
    }
  };

  const handleSelectPaymentType = (opt: CheckoutPaymentMethodKey) => {
    setSelectedPaymentOption(opt);
    if (opt === 'cod') {
      onSelectPaymentMethod('cod');
    } else {
      onSelectPaymentMethod('card_express');
    }
  };

  const selectedCardObj =
    savedCards.find((c) => c.id === selectedCardId) || savedCards[0];

  const paymentMethodLabel = useMemo(() => {
    if (selectedPaymentOption === 'cod') return 'Cash on Delivery (COD)';
    if (selectedPaymentOption === 'koko_installments')
      return 'Koko / BuyKit PayLater (3x 0% Installments)';
    if (selectedPaymentOption === 'lanka_qr') return 'LankaQR / Instant Bank Transfer';
    if (selectedCardObj) {
      return `${selectedCardObj.brand} ${selectedCardObj.cardType} (•••• ${selectedCardObj.last4})`;
    }
    return 'Credit / Debit Card';
  }, [selectedPaymentOption, selectedCardObj]);

  const deliveryMethodLabel = useMemo(() => {
    if (deliveryMethod === 'pickup_hub') {
      return `BuyKit Pickup Hub (${selectedHubName})`;
    }
    if (deliveryMethod === 'express') {
      return 'Priority 24h Express Courier';
    }
    return freeShippingVoucherApplied
      ? 'Standard Courier (Free Shipping)'
      : 'Standard Islandwide Courier';
  }, [deliveryMethod, selectedHubName, freeShippingVoucherApplied]);

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      {/* Top Checkout Progress Header (Daraz / AliExpress Shipping Site Style) */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F85606] text-white shadow-xs">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-lg font-extrabold text-slate-950 sm:text-xl">
                BuyKit Order Checkout & Payment
              </h1>
              <span className="rounded-md bg-[#FFF3EB] px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#F85606]">
                {totalUnits} {totalUnits === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              Verify your shipping address, customize applied LKR coupons, check delivery fees, and choose your payment method
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => onOpenSettingsTab('country_language')}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 hover:border-[#F85606]"
          >
            <img
              src={currentCountry.flagUrl}
              alt={currentCountry.name}
              className="h-4 w-6 rounded-xs border border-slate-300 object-cover"
            />
            <span>{currentCountry.name}</span>
          </button>

          <button
            type="button"
            onClick={onContinueShopping}
            className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
          >
            + Add More Products
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <ShoppingBag className="mx-auto mb-3 h-11 w-11 text-slate-300" />
          <h2 className="font-display text-lg font-bold text-slate-900">
            No Products Selected for Checkout Yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Click &ldquo;Buy Now&rdquo; or &ldquo;Add to Cart&rdquo; on any product card to open this Checkout page with your item, coupons, delivery fee breakdown, and payment options.
          </p>
          <button
            type="button"
            onClick={onContinueShopping}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F85606] px-6 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800]"
          >
            <Bolt className="h-4 w-4" />
            <span>Browse Products & Deals</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          {/* LEFT 7 COLUMNS: Address, Order Items, Delivery Fee Selector, Coupons & Payment Options */}
          <div className="space-y-5 lg:col-span-7">
            {/* 1. SHIPPING ADDRESS, COUNTRY FLAG & CONTACT DETAILS BANNER */}
            <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="absolute top-0 right-0 left-0 h-1.5 bg-gradient-to-r from-[#F85606] via-blue-500 to-[#F85606]" />
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB] text-[#F85606]">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded bg-[#F85606] px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                        {addressLabel}
                      </span>
                      <span className="font-display text-sm font-extrabold text-slate-950">
                        {fullName || 'BuyKit Shopper'}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-700">
                        {phone}
                      </span>
                      {secondaryPhone && (
                        <span className="font-mono text-xs text-slate-500">
                          / {secondaryPhone}
                        </span>
                      )}
                    </div>

                    <p className="text-xs font-medium text-slate-700">
                      {shippingAddress}, {cityDistrict} · Postal Code: {postalCode}
                    </p>

                    <div className="flex flex-wrap items-center gap-3 pt-1 text-[11px] text-slate-500">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                        <img
                          src={currentCountry.flagUrl}
                          alt={currentCountry.name}
                          className="h-3.5 w-5 rounded-xs border border-slate-300 object-cover"
                        />
                        {currentCountry.name} ({currentCountry.shippingZone})
                      </span>
                      <span>·</span>
                      <span>Hub: {selectedHubName}</span>
                      <span>·</span>
                      <span>{email}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onOpenSettingsTab('address')}
                    className="inline-flex items-center gap-1 rounded-xl border border-orange-200 bg-[#FFF3EB] px-3 py-1.5 text-xs font-bold text-[#F85606] hover:bg-orange-100"
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                    <span>Edit Address / Profile</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 2. ORDER ITEMS LIST */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="h-4 w-4 text-[#F85606]" />
                  <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                    Package Items ({totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'})
                  </h2>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  ● All Items Verified In Stock
                </span>
              </div>

              <div className="space-y-3">
                {items.map((item) => {
                  const itemDiscount = Math.max(0, item.originalPrice - item.price);
                  return (
                    <div
                      key={item.id}
                      className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200/90 bg-slate-50/50 p-3.5 sm:flex-row sm:items-center"
                    >
                      <div className="flex items-start gap-3.5">
                        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="h-full w-full object-cover"
                          />
                          <span className="absolute top-1 left-1 rounded bg-emerald-600 px-1.5 py-0.5 text-[9px] font-extrabold text-white uppercase">
                            In Stock
                          </span>
                        </div>

                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 font-display text-sm font-bold text-slate-950">
                            {item.title}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-2 font-mono text-xs tabular-nums">
                            <span className="text-sm font-extrabold text-[#F85606]">
                              {formatLKR(item.price)}
                            </span>
                            {item.originalPrice > item.price && (
                              <>
                                <span className="text-slate-400 line-through">
                                  {formatLKR(item.originalPrice)}
                                </span>
                                <span className="rounded bg-emerald-50 px-1.5 py-0.5 font-sans text-[10px] font-bold text-emerald-700">
                                  Save {formatLKR(itemDiscount)}/unit
                                </span>
                              </>
                            )}
                          </div>
                          <p className="mt-1 text-[11px] font-medium text-slate-500">
                            {freeShippingVoucherApplied
                              ? '✓ Eligible for Free Islandwide Delivery (Rs. 0)'
                              : `Standard Shipping (${formatLKR(currentCountry.baseShippingLkr)})`}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-slate-200/70 pt-2.5 sm:border-t-0 sm:pt-0">
                        <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1">
                          <button
                            type="button"
                            onClick={() => onUpdateItemQuantity(item, -1)}
                            className="rounded p-1 text-slate-600 hover:bg-slate-100"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-6 text-center font-mono text-xs font-extrabold text-slate-950 tabular-nums">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => onUpdateItemQuantity(item, 1)}
                            className="rounded p-1 text-slate-600 hover:bg-slate-100"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>

                        <div className="text-right font-mono tabular-nums">
                          <p className="text-sm font-extrabold text-slate-950">
                            {formatLKR(item.price * item.quantity)}
                          </p>
                          <button
                            type="button"
                            onClick={() => onRemoveItem(item.id)}
                            className="inline-flex items-center gap-1 font-sans text-[11px] font-semibold text-slate-400 hover:text-red-600"
                          >
                            <Trash2 className="h-3 w-3" />
                            <span>Remove</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* 3. DELIVERY METHOD & DELIVERY FEE BREAKDOWN ("dwlivery fee තියේද ,නැද්ද කියල") */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Truck className="h-4 w-4 text-[#F85606]" />
                  <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                    Shipping Option & Delivery Fee Status
                  </h2>
                </div>

                <span
                  className={`rounded-md px-2.5 py-0.5 font-mono text-xs font-extrabold ${
                    deliveryFeeAmount === 0
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-orange-50 text-[#F85606] border border-orange-200'
                  }`}
                >
                  {deliveryFeeAmount === 0
                    ? 'DELIVERY FEE: FREE (Rs. 0)'
                    : `DELIVERY FEE: ${formatLKR(deliveryFeeAmount)}`}
                </span>
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
                {/* Option 1: Standard Courier */}
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('standard')}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    deliveryMethod === 'standard'
                      ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      Standard Courier
                    </span>
                    <span
                      className={`font-mono text-xs font-extrabold ${
                        freeShippingVoucherApplied ? 'text-emerald-700' : 'text-[#F85606]'
                      }`}
                    >
                      {freeShippingVoucherApplied
                        ? 'FREE (Rs. 0)'
                        : formatLKR(currentCountry.baseShippingLkr)}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    {currentCountry.shippingZone} · Doorstep Delivery
                  </p>
                </button>

                {/* Option 2: Priority Express 24h */}
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('express')}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    deliveryMethod === 'express'
                      ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      Priority Express
                    </span>
                    <span className="font-mono text-xs font-extrabold text-[#F85606]">
                      {formatLKR(
                        currentCountry.code === 'LK'
                          ? 450
                          : currentCountry.baseShippingLkr + 600
                      )}
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500">
                    Fastest 24h Priority Dispatch with Paid Delivery Fee
                  </p>
                </button>

                {/* Option 3: Pickup Hub Collection */}
                <button
                  type="button"
                  onClick={() => setDeliveryMethod('pickup_hub')}
                  className={`flex flex-col justify-between rounded-xl border p-3.5 text-left transition-all ${
                    deliveryMethod === 'pickup_hub'
                      ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900">
                      Hub Collection
                    </span>
                    <span className="font-mono text-xs font-extrabold text-emerald-700">
                      FREE + -Rs. 150
                    </span>
                  </div>
                  <p className="mt-1 truncate text-[11px] text-slate-500">
                    Collect at {selectedHubName}
                  </p>
                </button>
              </div>

              {/* Toggle Free Shipping Voucher on/off so user can see With Delivery Fee vs Without Delivery Fee */}
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <CheckCircle2
                    className={`h-4 w-4 ${
                      freeShippingVoucherApplied ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  />
                  <span className="font-medium text-slate-700">
                    Free Shipping Voucher (<strong>FREESHIP_LK</strong>):{' '}
                    {freeShippingVoucherApplied
                      ? 'Applied — Standard Delivery Fee is Rs. 0 (FREE)'
                      : `Not Applied — Standard Delivery Fee is ${formatLKR(
                          currentCountry.baseShippingLkr
                        )}`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setFreeShippingVoucherApplied((prev) => !prev)}
                  className="font-bold text-[#F85606] underline"
                >
                  {freeShippingVoucherApplied
                    ? 'Remove Free Shipping (Test Paid Fee)'
                    : 'Apply Free Shipping Voucher'}
                </button>
              </div>
            </div>

            {/* 4. APPLIED COUPONS, VOUCHERS & COINS SELECTOR ("මොනවද add වෙලා තියෙන coupens, ඒව කැමතිනම් වෙනස් කරන්න පුලුවන්") */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-[#F85606]" />
                  <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                    Applied Coupons & Vouchers
                  </h2>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCouponPickerOpen((prev) => !prev)}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#FFF3EB] px-3 py-1 text-xs font-extrabold text-[#F85606] hover:bg-orange-100"
                >
                  <span>
                    {isCouponPickerOpen ? 'Hide Coupon List' : 'Change / Select Coupon'}
                  </span>
                  <ChevronRight
                    className={`h-3.5 w-3.5 transition-transform ${
                      isCouponPickerOpen ? 'rotate-90' : ''
                    }`}
                  />
                </button>
              </div>

              {/* Currently Applied Coupon Banner */}
              <div className="mt-3.5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-gradient-to-r from-[#FFF5F0] to-amber-50/50 p-3.5">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#F85606] font-mono text-xs font-extrabold text-white">
                    %
                  </div>
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-extrabold text-[#F85606]">
                        {activeCoupon.code}
                      </span>
                      <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                        {couponDiscountAmount > 0
                          ? `Saving ${formatLKR(couponDiscountAmount)}`
                          : 'No Discount Active'}
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs font-bold text-slate-900">
                      {activeCoupon.title}
                    </p>
                    <p className="text-[11px] text-slate-500">{activeCoupon.subtitle}</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCouponPickerOpen((prev) => !prev)}
                  className="rounded-xl border border-[#F85606] bg-white px-3.5 py-2 text-xs font-extrabold text-[#F85606] hover:bg-[#F85606] hover:text-white"
                >
                  Change Coupon
                </button>
              </div>

              {/* Expandable Coupon Switcher List */}
              {isCouponPickerOpen && (
                <div className="mt-3.5 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <p className="text-xs font-bold text-slate-800">
                    Select any available BuyKit Coupon below to switch your discount:
                  </p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {AVAILABLE_CHECKOUT_COUPONS.map((coup) => {
                      const isSelected = coup.id === selectedCouponId;
                      const eligible = itemsSubtotal >= coup.minSpend;
                      return (
                        <button
                          key={coup.id}
                          type="button"
                          onClick={() => setSelectedCouponId(coup.id)}
                          className={`flex flex-col justify-between rounded-xl border p-3 text-left transition-all ${
                            isSelected
                              ? 'border-[#F85606] bg-white ring-2 ring-[#F85606]/25'
                              : 'border-slate-200 bg-white/80 hover:border-orange-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="rounded bg-[#FFF3EB] px-2 py-0.5 font-mono text-xs font-extrabold text-[#F85606]">
                              {coup.code}
                            </span>
                            {isSelected ? (
                              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-700">
                                <Check className="h-3.5 w-3.5" /> Selected
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-slate-400">
                                {eligible
                                  ? 'Click to Apply'
                                  : `Min ${formatLKR(coup.minSpend)}`}
                              </span>
                            )}
                          </div>
                          <p className="mt-1.5 text-xs font-bold text-slate-900">
                            {coup.title}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-500">
                            {coup.subtitle}
                          </p>
                        </button>
                      );
                    })}
                  </div>

                  {/* Custom Promo Code Input */}
                  <div className="flex gap-2 pt-2">
                    <input
                      type="text"
                      value={customCouponInput}
                      onChange={(e) => setCustomCouponInput(e.target.value)}
                      placeholder="Enter promo code (e.g., BUYKIT5000, MEGA2500)..."
                      className="flex-1 rounded-xl border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs uppercase text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCustomCoupon}
                      className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800"
                    >
                      Apply Code
                    </button>
                  </div>
                </div>
              )}

              {/* BuyKit Reward Coins Toggle */}
              <div className="mt-3 flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-3.5 py-2.5 text-xs">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-500" />
                  <span className="font-semibold text-slate-800">
                    BuyKit Reward Coins (1,250 Coins Available)
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setRedeemBuyKitCoins((prev) => !prev)}
                  className={`rounded-lg px-3 py-1 text-xs font-extrabold transition-colors ${
                    redeemBuyKitCoins
                      ? 'bg-emerald-600 text-white'
                      : 'border border-slate-300 bg-white text-slate-700'
                  }`}
                >
                  {redeemBuyKitCoins
                    ? `Applied (-${formatLKR(coinsDiscountAmount)})`
                    : 'Redeem Coins'}
                </button>
              </div>
            </div>

            {/* 5. PAYMENT OPTION SELECTOR ("ඒකෙදි තමයි payment option එක select කරන්නෙ") */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-[#F85606]" />
                  <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                    Select Payment Method
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => onOpenSettingsTab('cards')}
                  className="text-xs font-bold text-[#F85606] underline"
                >
                  + Add New Credit / Debit Card
                </button>
              </div>

              <div className="mt-3.5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {/* Payment 1: Credit / Debit Card */}
                <button
                  type="button"
                  onClick={() => handleSelectPaymentType('card_express')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    selectedPaymentOption === 'card_express'
                      ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <CreditCard className="mt-0.5 h-5 w-5 shrink-0 text-[#F85606]" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-950">
                      Credit / Debit Card (Visa / Mastercard)
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Instant 3D-Secure LKR Payment · Use saved card or add new
                    </p>
                  </div>
                </button>

                {/* Payment 2: Cash on Delivery */}
                <button
                  type="button"
                  onClick={() => handleSelectPaymentType('cod')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    selectedPaymentOption === 'cod'
                      ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <Wallet className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-950">
                      Cash on Delivery (COD)
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Pay in LKR cash at your doorstep when package arrives
                    </p>
                  </div>
                </button>

                {/* Payment 3: Koko / BuyKit PayLater 3x Installments */}
                <button
                  type="button"
                  onClick={() => handleSelectPaymentType('koko_installments')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    selectedPaymentOption === 'koko_installments'
                      ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <CalendarClock className="mt-0.5 h-5 w-5 shrink-0 text-blue-600" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-950">
                      BuyKit PayLater / Koko (3x 0% Interest)
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] font-bold text-blue-700">
                      3 × {formatLKR(Math.round(finalPayableAmount / 3))} / month
                    </p>
                  </div>
                </button>

                {/* Payment 4: LankaQR / Bank Transfer */}
                <button
                  type="button"
                  onClick={() => handleSelectPaymentType('lanka_qr')}
                  className={`flex items-start gap-3 rounded-xl border p-3.5 text-left transition-all ${
                    selectedPaymentOption === 'lanka_qr'
                      ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                      : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                  }`}
                >
                  <QrCode className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
                  <div>
                    <p className="text-xs font-extrabold text-slate-950">
                      LankaQR / Instant Bank Transfer
                    </p>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Scan QR with any Sri Lankan banking app
                    </p>
                  </div>
                </button>
              </div>

              {/* Saved Credit/Debit Card Picker when Card option is selected */}
              {selectedPaymentOption === 'card_express' && (
                <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Choose Saved Credit / Debit Card:
                    </span>
                    <button
                      type="button"
                      onClick={() => onOpenSettingsTab('cards')}
                      className="inline-flex items-center gap-1 text-xs font-extrabold text-[#F85606] hover:underline"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Another Card</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {savedCards.map((card) => {
                      const isPicked = card.id === (selectedCardObj?.id || '');
                      return (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() => setSelectedCardId(card.id)}
                          className={`flex items-center justify-between rounded-xl border p-3 text-left transition-all ${
                            isPicked
                              ? 'border-[#F85606] bg-white ring-2 ring-[#F85606]/20'
                              : 'border-slate-200 bg-white/80 hover:border-orange-200'
                          }`}
                        >
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="rounded bg-slate-900 px-1.5 py-0.5 font-mono text-[10px] font-bold text-white uppercase">
                                {card.brand}
                              </span>
                              <span className="font-mono text-xs font-extrabold text-slate-900">
                                •••• {card.last4}
                              </span>
                              <span className="text-[10px] font-semibold text-slate-500">
                                ({card.cardType})
                              </span>
                            </div>
                            <p className="mt-1 text-[11px] text-slate-500">
                              {card.bankName} · Exp {card.expiry}
                            </p>
                          </div>
                          {isPicked && (
                            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-[#F85606] text-white">
                              <Check className="h-3 w-3" />
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT 5 COLUMNS: STICKY ORDER BILL SUMMARY & FINAL TOTAL PAYABLE ("අන්තිමට total ගෙවන්න ඕන ගනන") */}
          <div className="lg:col-span-5">
            <div className="sticky top-20 rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-md sm:p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
                <h2 className="font-display text-base font-extrabold text-slate-950">
                  Final Checkout Bill Summary
                </h2>
                <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                  LKR Official Invoice
                </span>
              </div>

              {/* Line-by-Line Price, Coupons & Delivery Fee Calculation */}
              <div className="mt-4 space-y-2.5 font-mono text-xs tabular-nums">
                <div className="flex items-center justify-between text-slate-500">
                  <span className="font-sans">
                    Original Retail Value ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})
                  </span>
                  <span className="line-through">{formatLKR(itemsOriginalTotal)}</span>
                </div>

                <div className="flex items-center justify-between text-emerald-700">
                  <span className="font-sans">Storefront Deal Discount</span>
                  <span>- {formatLKR(storefrontDealSavings)}</span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2 font-bold text-slate-900">
                  <span className="font-sans">Items Subtotal</span>
                  <span>{formatLKR(itemsSubtotal)}</span>
                </div>

                {/* Coupon Discount Line */}
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="font-sans">
                    Coupon Applied (<strong>{activeCoupon.code}</strong>)
                  </span>
                  <span className="font-extrabold">
                    {couponDiscountAmount > 0
                      ? `- ${formatLKR(couponDiscountAmount)}`
                      : 'Rs. 0'}
                  </span>
                </div>

                {/* BuyKit Coins Line */}
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="font-sans">BuyKit Coins Cashback</span>
                  <span>
                    {coinsDiscountAmount > 0
                      ? `- ${formatLKR(coinsDiscountAmount)}`
                      : 'Rs. 0'}
                  </span>
                </div>

                {hubCollectionBonus > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="font-sans">Pickup Hub Rebate</span>
                    <span>- {formatLKR(hubCollectionBonus)}</span>
                  </div>
                )}

                {/* Delivery Fee Line ("dwlivery fee තියේද ,නැද්ද කියල") */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2">
                  <span className="font-sans font-semibold text-slate-800">
                    Delivery Fee ({deliveryMethodLabel.split('(')[0].trim()})
                  </span>
                  {deliveryFeeAmount === 0 ? (
                    <span className="rounded bg-emerald-100 px-2 py-0.5 font-sans text-xs font-extrabold text-emerald-800">
                      FREE (Rs. 0)
                    </span>
                  ) : (
                    <span className="font-extrabold text-[#F85606]">
                      + {formatLKR(deliveryFeeAmount)}
                    </span>
                  )}
                </div>

                {/* Selected Payment Mode */}
                <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                  <span className="font-sans">Selected Payment:</span>
                  <span className="font-sans font-bold text-slate-900">
                    {paymentMethodLabel}
                  </span>
                </div>

                {/* FINAL TOTAL PAYABLE BLOCK ("අන්තිමට total ගෙවන්න ඕන ගනන") */}
                <div className="mt-3 rounded-xl border border-orange-200 bg-gradient-to-r from-[#FFF5F0] to-orange-50 p-4">
                  <div className="flex items-baseline justify-between">
                    <div>
                      <span className="block font-sans text-xs font-extrabold tracking-wide text-slate-900 uppercase">
                        Total Amount to Pay
                      </span>
                      <span className="font-sans text-[11px] font-semibold text-emerald-700">
                        Total You Save: {formatLKR(totalCombinedSavings)}
                      </span>
                    </div>
                    <span className="text-2xl font-extrabold text-[#F85606] sm:text-3xl">
                      {formatLKR(finalPayableAmount)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Place Order Button */}
              <div className="mt-5 space-y-2.5">
                {!currentUser && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                    <div className="flex items-center gap-1.5 font-bold">
                      <Lock className="h-3.5 w-3.5 text-[#F85606]" />
                      <span>Sign in with Google to Confirm & Track Your Order</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-amber-800">
                      Clicking Place Order below will let you sign in and immediately confirm this order.
                    </p>
                  </div>
                )}

                <button
                  type="button"
                  disabled={checkoutSubmitting}
                  onClick={() => {
                    if (!currentUser) {
                      onOpenAuthModal();
                      return;
                    }
                    onConfirmCheckoutOrder({
                      finalPayableAmount,
                      couponCode: activeCoupon.code,
                      couponDiscount: couponDiscountAmount,
                      deliveryFee: deliveryFeeAmount,
                      deliveryMethodLabel,
                      paymentMethodLabel,
                    });
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-6 py-4 text-base font-extrabold text-white shadow-lg transition-all hover:bg-[#d94800] disabled:opacity-50"
                >
                  <Bolt className="h-5 w-5" />
                  <span>
                    {checkoutSubmitting
                      ? 'Processing Checkout...'
                      : `Place Order & Pay — ${formatLKR(finalPayableAmount)}`}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>
                    100% BuyKit Buyer Protection · Live 4-Stage Order Tracking
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
