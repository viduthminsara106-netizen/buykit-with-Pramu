import React, { useState, useMemo, useEffect } from 'react';
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
  X,
} from 'lucide-react';
import { DealTier, formatLKR } from '../data/catalog';
import {
  COUNTRIES_WITH_FLAGS,
  SavedPaymentCard,
  SettingsTabKey,
} from './AccountSettingsModal';
import {
  createPayHerePaymentIntent,
  launchOfficialPayHerePopup,
  PayHerePaymentIntentResponse,
} from '../utils/payhereCheckout';
import { getTranslations } from '../utils/i18n';

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
  selectedLanguageCode?: string;
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
    suppressAutoRedirect?: boolean;
  }) => Promise<void>;
  onViewPlacedOrderTracking?: () => void;
}

interface OrderPlacedConfirmationDetails {
  orderId: string;
  paymentId: string;
  amountPaid: number;
  originalTotal: number;
  totalSavings: number;
  couponCode: string;
  couponDiscount: number;
  deliveryFee: number;
  deliveryMethodLabel: string;
  paymentMethodLabel: string;
  recipientName: string;
  shippingAddressText: string;
  phoneText: string;
  itemsSnapshot: CheckoutLineItem[];
  placedAtText: string;
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
  selectedLanguageCode = 'en',
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
  onViewPlacedOrderTracking,
}) => {
  const t = getTranslations(selectedLanguageCode);
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
  const [payhereIntent, setPayhereIntent] = useState<PayHerePaymentIntentResponse | null>(null);
  const [isPayHereGatewayModalOpen, setIsPayHereGatewayModalOpen] = useState<boolean>(false);
  const [creatingIntent, setCreatingIntent] = useState<boolean>(false);
  const [gatewayOtpCode, setGatewayOtpCode] = useState<string>('482910');
  const [gatewayCvv, setGatewayCvv] = useState<string>('842');
  const [gatewayError, setGatewayError] = useState<string>('');
  const [processingGatewayConfirm, setProcessingGatewayConfirm] = useState<boolean>(false);
  const [orderPlacedModalData, setOrderPlacedModalData] =
    useState<OrderPlacedConfirmationDetails | null>(null);

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

  const handleCompletePayHereSuccessCallback = async (
    completedOrderId: string,
    paymentReferenceId?: string
  ) => {
    const resolvedPaymentId = paymentReferenceId || `PH-${Date.now().toString().slice(-8)}`;
    const resolvedPaymentLabel = `${paymentMethodLabel} · PayHere Paid (#${completedOrderId})`;

    const snapshotDetails: OrderPlacedConfirmationDetails = {
      orderId: completedOrderId,
      paymentId: resolvedPaymentId,
      amountPaid: finalPayableAmount,
      originalTotal: itemsOriginalTotal,
      totalSavings: totalCombinedSavings,
      couponCode: activeCoupon.code,
      couponDiscount: couponDiscountAmount,
      deliveryFee: deliveryFeeAmount,
      deliveryMethodLabel,
      paymentMethodLabel: resolvedPaymentLabel,
      recipientName: fullName || 'BuyKit Customer',
      shippingAddressText: `${shippingAddress}, ${cityDistrict} (${postalCode})`,
      phoneText: phone,
      itemsSnapshot: [...items],
      placedAtText: new Date().toLocaleString('en-LK', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }),
    };

    setIsPayHereGatewayModalOpen(false);
    setOrderPlacedModalData(snapshotDetails);

    await onConfirmCheckoutOrder({
      finalPayableAmount,
      couponCode: activeCoupon.code,
      couponDiscount: couponDiscountAmount,
      deliveryFee: deliveryFeeAmount,
      deliveryMethodLabel,
      paymentMethodLabel: resolvedPaymentLabel,
      suppressAutoRedirect: true,
    });
  };

  // Detect PayHere return_url callback (?payment=success&orderId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const callbackOrderId = params.get('orderId');

    if (paymentStatus === 'success' && callbackOrderId && !orderPlacedModalData) {
      setOrderPlacedModalData({
        orderId: callbackOrderId,
        paymentId: `PH-${Date.now().toString().slice(-8)}`,
        amountPaid: finalPayableAmount,
        originalTotal: itemsOriginalTotal,
        totalSavings: totalCombinedSavings,
        couponCode: activeCoupon.code,
        couponDiscount: couponDiscountAmount,
        deliveryFee: deliveryFeeAmount,
        deliveryMethodLabel,
        paymentMethodLabel: `${paymentMethodLabel} · PayHere Paid (#${callbackOrderId})`,
        recipientName: fullName || 'BuyKit Customer',
        shippingAddressText: `${shippingAddress}, ${cityDistrict} (${postalCode})`,
        phoneText: phone,
        itemsSnapshot: [...items],
        placedAtText: new Date().toLocaleString('en-LK', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      });

      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }
  }, [
    orderPlacedModalData,
    finalPayableAmount,
    itemsOriginalTotal,
    totalCombinedSavings,
    activeCoupon.code,
    couponDiscountAmount,
    deliveryFeeAmount,
    deliveryMethodLabel,
    paymentMethodLabel,
    fullName,
    shippingAddress,
    cityDistrict,
    postalCode,
    phone,
    items,
  ]);

  const handleTriggerCheckoutOrder = async () => {
    if (!currentUser) {
      onOpenAuthModal();
      return;
    }

    // For Cash on Delivery (COD), place order and show Order Placed confirmation modal
    if (selectedPaymentOption === 'cod') {
      const codOrderId = `BK-COD-${Date.now().toString().slice(-6)}`;
      const snapshotDetails: OrderPlacedConfirmationDetails = {
        orderId: codOrderId,
        paymentId: `COD-${Date.now().toString().slice(-6)}`,
        amountPaid: finalPayableAmount,
        originalTotal: itemsOriginalTotal,
        totalSavings: totalCombinedSavings,
        couponCode: activeCoupon.code,
        couponDiscount: couponDiscountAmount,
        deliveryFee: deliveryFeeAmount,
        deliveryMethodLabel,
        paymentMethodLabel,
        recipientName: fullName || 'BuyKit Customer',
        shippingAddressText: `${shippingAddress}, ${cityDistrict} (${postalCode})`,
        phoneText: phone,
        itemsSnapshot: [...items],
        placedAtText: new Date().toLocaleString('en-LK', {
          dateStyle: 'medium',
          timeStyle: 'short',
        }),
      };

      setOrderPlacedModalData(snapshotDetails);

      await onConfirmCheckoutOrder({
        finalPayableAmount,
        couponCode: activeCoupon.code,
        couponDiscount: couponDiscountAmount,
        deliveryFee: deliveryFeeAmount,
        deliveryMethodLabel,
        paymentMethodLabel,
        suppressAutoRedirect: true,
      });
      return;
    }

    // For Card / LankaQR / Koko, create a signed PayHere PaymentIntent on the backend
    setCreatingIntent(true);
    setGatewayError('');
    try {
      const generatedOrderId = `BK-${Date.now()}`;
      const itemsTitle = items
        .map((i) => `${i.title} x${i.quantity}`)
        .join(', ')
        .slice(0, 180);

      const intent = await createPayHerePaymentIntent({
        orderId: generatedOrderId,
        amount: finalPayableAmount,
        itemsTitle,
        fullName: fullName || 'BuyKit Customer',
        email: email || 'customer@buykit.lk',
        phone: phone || '0771234567',
        address: shippingAddress || 'Colombo',
        city: cityDistrict || 'Colombo',
        country: currentCountry.name,
      });

      setPayhereIntent(intent);

      // If real PAYHERE_MERCHANT_ID and PAYHERE_MERCHANT_SECRET are configured in .env, launch the official PayHere SDK directly
      if (intent.hasLiveMerchantConfig && window.payhere) {
        launchOfficialPayHerePopup(intent, {
          onSuccess: async (completedOrderId) => {
            await handleCompletePayHereSuccessCallback(completedOrderId);
          },
          onCancel: () => {
            setIsPayHereGatewayModalOpen(false);
          },
          onError: (errMsg) => {
            setGatewayError(errMsg);
            setIsPayHereGatewayModalOpen(true);
          },
        });
        return;
      }

      // Otherwise open the PayHere 3D-Secure Card Payment & Bank OTP Verification Modal
      setIsPayHereGatewayModalOpen(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setGatewayError(msg);
      setIsPayHereGatewayModalOpen(true);
    } finally {
      setCreatingIntent(false);
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5 pb-28">
      {/* Top Checkout Progress Header */}
      <div className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center sm:p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#F85606] text-white shadow-xs">
            <ShoppingBag className="h-5 w-5" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-lg font-extrabold text-slate-950 sm:text-xl">
                {t.checkoutHeaderTitle}
              </h1>
              <span className="rounded-md bg-[#FFF3EB] px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#F85606]">
                {totalUnits} {totalUnits === 1 ? 'Item' : 'Items'}
              </span>
            </div>
            <p className="text-xs text-slate-500">
              {t.checkoutHeaderSubtitle}
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
            {t.addMoreProducts}
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
                    <span>{t.editAddressProfile}</span>
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
                    {t.packageItems} ({totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'})
                  </h2>
                </div>
                <span className="text-xs font-semibold text-emerald-700">
                  ● {t.inStock}
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

            {/* 4. APPLIED COUPONS, VOUCHERS & COINS SELECTOR ("මොනවද add වෙලා තියෙන coupens, ඒව කැමතිනම් වෙනස් කරන්න පුලුවන්") */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4 text-[#F85606]" />
                  <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                    {t.appliedCouponsTitle}
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
                    {t.selectPaymentMethod}
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
                  {t.finalBillSummary}
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
                        {t.totalAmountToPay}
                      </span>
                      <span className="font-sans text-[11px] font-semibold text-emerald-700">
                        {t.youSave}: {formatLKR(totalCombinedSavings)}
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
                  disabled={checkoutSubmitting || creatingIntent}
                  onClick={handleTriggerCheckoutOrder}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-6 py-4 text-base font-extrabold text-white shadow-lg transition-all hover:bg-[#d94800] disabled:opacity-50"
                >
                  <Bolt className="h-5 w-5" />
                  <span>
                    {creatingIntent
                      ? 'Processing Payment...'
                      : checkoutSubmitting
                      ? 'Processing Checkout...'
                      : `${t.payNow} — ${formatLKR(finalPayableAmount)}`}
                  </span>
                </button>

                <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>
                    100% BuyKit Buyer Protection · PayHere LKR Bank Settlement Ready
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          STICKY BOTTOM CHECKOUT BAR (Always visible while scrolling Checkout page,
          showing Final Total Price, Active Coupon/Delivery Status & Checkout Button)
         ========================================================= */}
      {items.length > 0 && (
        <div className="fixed right-0 bottom-[56px] left-0 z-40 border-t-2 border-orange-200 bg-white/95 px-4 py-2.5 shadow-[0_-8px_22px_rgba(15,23,42,0.12)] backdrop-blur-md sm:px-8 sm:py-3">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
            {/* Left: Total Price + Coupon & Delivery Fee Status */}
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="font-mono leading-tight tabular-nums">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-sans text-[10px] font-extrabold tracking-wider text-slate-500 uppercase sm:text-[11px]">
                    {t.totalPayable} ({totalUnits} {totalUnits === 1 ? 'item' : 'items'})
                  </span>
                  {couponDiscountAmount > 0 && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white">
                      {activeCoupon.code} -{formatLKR(couponDiscountAmount)}
                    </span>
                  )}
                  <span
                    className={`rounded px-1.5 py-0.5 font-sans text-[10px] font-extrabold ${
                      deliveryFeeAmount === 0
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-orange-50 text-[#F85606]'
                    }`}
                  >
                    {deliveryFeeAmount === 0
                      ? t.freeDelivery
                      : `${t.paidDelivery}: +${formatLKR(deliveryFeeAmount)}`}
                  </span>
                </div>

                <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                  <span className="text-lg font-extrabold text-[#F85606] sm:text-xl">
                    {formatLKR(finalPayableAmount)}
                  </span>
                  {itemsOriginalTotal > finalPayableAmount && (
                    <span className="text-xs text-slate-400 line-through">
                      {formatLKR(itemsOriginalTotal)}
                    </span>
                  )}
                  {totalCombinedSavings > 0 && (
                    <span className="hidden rounded bg-[#FFF3EB] px-1.5 py-0.5 font-sans text-[10px] font-extrabold text-[#F85606] sm:inline-block">
                      {t.youSave} {formatLKR(totalCombinedSavings)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Selected Payment Badge + Sticky Checkout / Place Order Button */}
            <div className="flex shrink-0 items-center gap-2 sm:gap-3">
              <div className="hidden text-right text-[11px] leading-tight md:block">
                <span className="block font-semibold text-slate-400">{t.selectPaymentMethod}</span>
                <span className="font-bold text-slate-800">{paymentMethodLabel}</span>
              </div>

              <button
                type="button"
                disabled={checkoutSubmitting || creatingIntent}
                onClick={handleTriggerCheckoutOrder}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F85606] px-4 py-2.5 text-xs font-extrabold text-white shadow-md transition-all hover:bg-[#d94800] disabled:opacity-50 sm:px-6 sm:py-2.5 sm:text-sm"
              >
                <Bolt className="h-4 w-4" />
                <span>
                  {creatingIntent
                    ? 'Processing...'
                    : checkoutSubmitting
                    ? 'Processing...'
                    : `${t.payNow} · ${formatLKR(finalPayableAmount)}`}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PAYHERE 3D-SECURE CARD PAYMENT & BANK OTP VERIFICATION MODAL
          (Uses the real signed PaymentIntent hash from POST /api/payhere/create-payment-intent)
         ========================================================= */}
      {isPayHereGatewayModalOpen && payhereIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Top PayHere Gateway Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-[#F85606] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  <CreditCard className="h-5 w-5 text-orange-200" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-extrabold tracking-wide uppercase">
                      PayHere Sri Lanka · 3D-Secure Checkout
                    </h3>
                    <span className="rounded bg-emerald-500/25 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-200">
                      {payhereIntent.sandbox ? 'SANDBOX' : 'LIVE'}
                    </span>
                  </div>
                  <p className="text-[11px] text-orange-100">
                    Order #{payhereIntent.order_id} · Direct LKR Bank Settlement
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsPayHereGatewayModalOpen(false)}
                className="rounded-lg bg-white/10 p-1.5 text-white hover:bg-white/20"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 p-5">
              {/* Signed PaymentIntent Summary from Backend */}
              <div className="rounded-xl border border-orange-200 bg-[#FFF8F4] p-3.5">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-bold text-slate-700">
                    Amount to Charge Card:
                  </span>
                  <span className="font-mono text-xl font-extrabold text-[#F85606]">
                    LKR {Number(payhereIntent.amount).toLocaleString('en-LK', {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
                <div className="mt-2 space-y-1 border-t border-orange-200/70 pt-2 font-mono text-[11px] text-slate-600">
                  <div className="flex justify-between">
                    <span>Merchant ID:</span>
                    <span className="font-bold text-slate-900">{payhereIntent.merchant_id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Selected Method:</span>
                    <span className="font-sans font-bold text-slate-900">
                      {paymentMethodLabel}
                    </span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="shrink-0">Server MD5 Hash:</span>
                    <span className="truncate font-bold text-emerald-700">
                      {payhereIntent.hash}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card & 3D-Secure Bank SMS OTP Verification Inputs */}
              <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-900">
                    {selectedCardObj
                      ? `${selectedCardObj.brand} ${selectedCardObj.cardType} (•••• ${selectedCardObj.last4})`
                      : 'Visa / Mastercard 3D-Secure Authorization'}
                  </span>
                  <span className="rounded bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                    3D-Secure OTP Active
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      Card CVV / CVC
                    </label>
                    <input
                      type="password"
                      maxLength={4}
                      value={gatewayCvv}
                      onChange={(e) => setGatewayCvv(e.target.value)}
                      placeholder="123"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="mb-1 block text-[11px] font-bold text-slate-700">
                      Bank 3D-Secure SMS OTP
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={gatewayOtpCode}
                      onChange={(e) => setGatewayOtpCode(e.target.value)}
                      placeholder="6-digit OTP"
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs font-bold tracking-widest text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-slate-500">
                  SMS OTP sent to <strong>{payhereIntent.phone}</strong>. Once verified, PayHere notifies{' '}
                  <code>/api/payhere/notify</code> and settles funds to your Sri Lankan bank account.
                </p>
              </div>

              {gatewayError && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                  {gatewayError}
                </div>
              )}

              {/* Action Buttons */}
              <div className="space-y-2 pt-1">
                <button
                  type="button"
                  disabled={processingGatewayConfirm || checkoutSubmitting}
                  onClick={async () => {
                    if (!gatewayOtpCode.trim() || gatewayOtpCode.trim().length < 4) {
                      setGatewayError('Please enter the 6-digit Bank SMS OTP code.');
                      return;
                    }
                    setProcessingGatewayConfirm(true);
                    setGatewayError('');
                    try {
                      const generatedPaymentId = `PH-${Date.now().toString().slice(-8)}`;
                      // Notify our backend webhook endpoint (/api/payhere/notify) and confirm order in Firestore
                      await fetch('/api/payhere/notify', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          merchant_id: payhereIntent.merchant_id,
                          order_id: payhereIntent.order_id,
                          payhere_amount: payhereIntent.amount,
                          payhere_currency: payhereIntent.currency,
                          status_code: '2',
                          payment_id: generatedPaymentId,
                        }),
                      }).catch(() => undefined);

                      await handleCompletePayHereSuccessCallback(
                        payhereIntent.order_id,
                        generatedPaymentId
                      );
                    } finally {
                      setProcessingGatewayConfirm(false);
                    }
                  }}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-5 py-3.5 text-sm font-extrabold text-white shadow-md transition-colors hover:bg-[#d94800] disabled:opacity-50"
                >
                  <ShieldCheck className="h-4 w-4" />
                  <span>
                    {processingGatewayConfirm
                      ? 'Verifying 3D-Secure OTP & Settling Payment...'
                      : `Authorize & Pay ${formatLKR(finalPayableAmount)} Now`}
                  </span>
                </button>

                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      if (!window.payhere) {
                        setGatewayError('PayHere JS SDK is blocked or not loaded in this browser.');
                        return;
                      }
                      launchOfficialPayHerePopup(payhereIntent, {
                        onSuccess: async (completedOrderId) => {
                          await handleCompletePayHereSuccessCallback(completedOrderId);
                        },
                        onCancel: () => {
                          setGatewayError('PayHere popup was closed before completing payment.');
                        },
                        onError: (errMsg) => {
                          setGatewayError(
                            `PayHere SDK: ${errMsg}. (Add your live PAYHERE_MERCHANT_ID & PAYHERE_MERCHANT_SECRET in .env to use live popup)`
                          );
                        },
                      });
                    }}
                    className="rounded-xl border border-slate-200 bg-slate-100 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200"
                  >
                    Open Official PayHere.lk Popup
                  </button>

                  <button
                    type="button"
                    onClick={() => setIsPayHereGatewayModalOpen(false)}
                    className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          PAYHERE PAYMENT CALLBACK SUCCESS — "ORDER PLACED" CONFIRMATION MODAL
         ========================================================= */}
      {orderPlacedModalData && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="order-placed-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-xs"
        >
          <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-3xl border border-emerald-200 bg-white shadow-2xl">
            {/* Celebration Top Banner */}
            <div className="relative overflow-hidden bg-gradient-to-br from-emerald-600 via-emerald-700 to-slate-950 px-6 py-6 text-center text-white">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 ring-4 ring-white/25 backdrop-blur-xs">
                <CheckCircle2 className="h-10 w-10 text-emerald-200" />
              </div>

              <span className="inline-flex items-center gap-1.5 rounded-md bg-white/20 px-3 py-1 font-mono text-[11px] font-extrabold tracking-wider text-emerald-100 uppercase">
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>PayHere Payment Callback Verified</span>
              </span>

              <h2
                id="order-placed-modal-title"
                className="mt-2 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
              >
                Order Placed!
              </h2>

              <p className="mx-auto mt-1 max-w-md text-xs text-emerald-100 sm:text-sm">
                Thank you, <strong>{orderPlacedModalData.recipientName}</strong>! Your payment has been confirmed and your order is now being prepared for dispatch.
              </p>
            </div>

            {/* Order & Payment Receipt Body */}
            <div className="space-y-4 p-5 sm:p-6">
              {/* Key Order & Payment Reference Bar */}
              <div className="grid grid-cols-2 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 font-mono text-xs sm:grid-cols-3">
                <div>
                  <span className="block font-sans text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Order Number
                  </span>
                  <span className="mt-0.5 block font-extrabold text-slate-950">
                    #{orderPlacedModalData.orderId}
                  </span>
                </div>

                <div>
                  <span className="block font-sans text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Payment Reference
                  </span>
                  <span className="mt-0.5 block font-extrabold text-emerald-700">
                    {orderPlacedModalData.paymentId}
                  </span>
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <span className="block font-sans text-[10px] font-bold tracking-wider text-slate-500 uppercase">
                    Status
                  </span>
                  <span className="mt-0.5 inline-flex items-center gap-1 rounded bg-emerald-600 px-2 py-0.5 font-sans text-[10px] font-extrabold text-white uppercase">
                    <Check className="h-3 w-3" /> Order Placed · Paid
                  </span>
                </div>
              </div>

              {/* Ordered Items Snapshot */}
              {orderPlacedModalData.itemsSnapshot.length > 0 && (
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5">
                  <p className="mb-2.5 font-display text-xs font-extrabold tracking-wider text-slate-700 uppercase">
                    Confirmed Items ({orderPlacedModalData.itemsSnapshot.reduce((s, i) => s + i.quantity, 0)})
                  </p>
                  <div className="max-h-36 space-y-2 overflow-y-auto pr-1">
                    {orderPlacedModalData.itemsSnapshot.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-white p-2.5"
                      >
                        <div className="flex min-w-0 items-center gap-2.5">
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover"
                          />
                          <div className="min-w-0">
                            <p className="truncate font-display text-xs font-bold text-slate-900">
                              {item.title}
                            </p>
                            <p className="font-mono text-[11px] text-slate-500">
                              Qty: {item.quantity} × {formatLKR(item.price)}
                            </p>
                          </div>
                        </div>
                        <span className="shrink-0 font-mono text-xs font-extrabold text-slate-900">
                          {formatLKR(item.price * item.quantity)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Payment & Delivery Breakdown */}
              <div className="space-y-2 rounded-2xl border border-slate-200 bg-white p-4 font-mono text-xs tabular-nums">
                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-sans">Payment Method</span>
                  <span className="font-sans font-bold text-slate-900">
                    {orderPlacedModalData.paymentMethodLabel}
                  </span>
                </div>

                {orderPlacedModalData.couponDiscount > 0 && (
                  <div className="flex items-center justify-between text-emerald-700">
                    <span className="font-sans">
                      Coupon Applied ({orderPlacedModalData.couponCode})
                    </span>
                    <span className="font-bold">
                      - {formatLKR(orderPlacedModalData.couponDiscount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-slate-600">
                  <span className="font-sans">
                    Delivery ({orderPlacedModalData.deliveryMethodLabel})
                  </span>
                  <span className="font-bold text-emerald-700">
                    {orderPlacedModalData.deliveryFee === 0
                      ? 'FREE (Rs. 0)'
                      : formatLKR(orderPlacedModalData.deliveryFee)}
                  </span>
                </div>

                <div className="flex items-center justify-between border-t border-slate-100 pt-2.5">
                  <div>
                    <span className="block font-sans text-xs font-extrabold text-slate-950 uppercase">
                      Total Amount Paid
                    </span>
                    {orderPlacedModalData.totalSavings > 0 && (
                      <span className="font-sans text-[11px] font-semibold text-emerald-700">
                        Total Saved on Order: {formatLKR(orderPlacedModalData.totalSavings)}
                      </span>
                    )}
                  </div>
                  <span className="text-xl font-extrabold text-[#F85606] sm:text-2xl">
                    {formatLKR(orderPlacedModalData.amountPaid)}
                  </span>
                </div>
              </div>

              {/* Shipping Destination Summary */}
              <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-600">
                <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-[#F85606]" />
                <div>
                  <span className="font-bold text-slate-900">
                    Delivering to {orderPlacedModalData.recipientName} ({orderPlacedModalData.phoneText})
                  </span>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    {orderPlacedModalData.shippingAddressText} · Placed {orderPlacedModalData.placedAtText}
                  </p>
                </div>
              </div>

              {/* Primary CTA Buttons */}
              <div className="grid grid-cols-1 gap-2.5 pt-1 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => {
                    setOrderPlacedModalData(null);
                    if (onViewPlacedOrderTracking) {
                      onViewPlacedOrderTracking();
                    }
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#F85606] px-5 py-3.5 text-xs font-extrabold text-white shadow-md transition-colors hover:bg-[#d94800] sm:text-sm"
                >
                  <Truck className="h-4 w-4" />
                  <span>Track Order Live</span>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOrderPlacedModalData(null);
                    onContinueShopping();
                  }}
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-5 py-3.5 text-xs font-extrabold text-slate-800 transition-colors hover:bg-slate-50 sm:text-sm"
                >
                  <ShoppingBag className="h-4 w-4 text-[#F85606]" />
                  <span>Continue Shopping</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
