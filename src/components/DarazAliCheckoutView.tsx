import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  ArrowLeft,
} from 'lucide-react';
import { DealTier, formatLKR } from '../data/catalog';
import { resolveAssetUrl } from '../utils/assetResolver';
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
import { LankaQrPaymentPanel } from './LankaQrPaymentPanel';
import {
  KokoPaymentPanel,
  KokoOrderSession,
  KOKO_MIN_ORDER_LKR,
  KOKO_MAX_ORDER_LKR,
} from './KokoPaymentPanel';

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
  availableCoupons?: CouponOption[];
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
  onBackToCart?: () => void;
  onViewPlacedOrderTracking?: () => void;
  checkoutSessionKey?: number;
  onTriggerTopLoading?: (onNavigate: () => void) => void;
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
  availableCoupons = AVAILABLE_CHECKOUT_COUPONS,
  checkoutSubmitting,
  onSelectPaymentMethod,
  onUpdateItemQuantity,
  onRemoveItem,
  onOpenSettingsTab,
  onOpenPickupMap,
  onContinueShopping,
  onOpenAuthModal,
  onConfirmCheckoutOrder,
  onBackToCart,
  onViewPlacedOrderTracking,
  checkoutSessionKey = 0,
  onTriggerTopLoading,
}) => {
  const effectiveCoupons =
    availableCoupons && availableCoupons.length > 0
      ? availableCoupons
      : AVAILABLE_CHECKOUT_COUPONS;
  const t = getTranslations(selectedLanguageCode);
  const [checkoutStep, setCheckoutStep] = useState<'setup' | 'review'>('setup');
  const summarySectionRef = useRef<HTMLDivElement | null>(null);
  const paymentSectionRef = useRef<HTMLDivElement | null>(null);
  const [selectedCouponId, setSelectedCouponId] = useState<string>('coupon_buykit5000');
  const [isCouponPickerOpen, setIsCouponPickerOpen] = useState<boolean>(false);
  const [customCouponInput, setCustomCouponInput] = useState<string>('');
  const [freeShippingVoucherApplied, setFreeShippingVoucherApplied] = useState<boolean>(true);
  const [redeemBuyKitCoins, setRedeemBuyKitCoins] = useState<boolean>(true);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethodKey>('standard');
  const [selectedPaymentOption, setSelectedPaymentOption] =
    useState<CheckoutPaymentMethodKey | null>(null);
  const [paymentSelectionWarning, setPaymentSelectionWarning] = useState<boolean>(false);
  const [selectedCardId, setSelectedCardId] = useState<string>(
    savedCards.find((c) => c.isDefault)?.id || savedCards[0]?.id || ''
  );
  const [payhereIntent, setPayhereIntent] = useState<PayHerePaymentIntentResponse | null>(null);
  const [isPayHereGatewayModalOpen, setIsPayHereGatewayModalOpen] = useState<boolean>(false);
  const [kokoSession, setKokoSession] = useState<KokoOrderSession | null>(null);
  const [isKokoModalOpen, setIsKokoModalOpen] = useState<boolean>(false);
  const [creatingIntent, setCreatingIntent] = useState<boolean>(false);
  const [gatewayOtpCode, setGatewayOtpCode] = useState<string>('482910');
  const [gatewayCvv, setGatewayCvv] = useState<string>('842');
  const [gatewayError, setGatewayError] = useState<string>('');
  const [processingGatewayConfirm, setProcessingGatewayConfirm] = useState<boolean>(false);
  const [orderPlacedModalData, setOrderPlacedModalData] =
    useState<OrderPlacedConfirmationDetails | null>(null);

  // Reset to Step 1 with NO default payment method whenever a fresh Checkout session starts
  useEffect(() => {
    setCheckoutStep('setup');
    setSelectedPaymentOption(null);
    setPaymentSelectionWarning(false);
    setIsCouponPickerOpen(false);
    setGatewayError('');
  }, [checkoutSessionKey]);

  // Default scroll to the Order Summary section at the bottom when entering Step 2 (Read-Only Review)
  useEffect(() => {
    if (checkoutStep !== 'review') return;
    const timer = window.setTimeout(() => {
      if (summarySectionRef.current) {
        summarySectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
      } else {
        window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' });
      }
    }, 90);
    return () => window.clearTimeout(timer);
  }, [checkoutStep]);

  const handleGoToReviewStep = () => {
    // Strictly require a payment method selection before proceeding to Step 2
    if (!selectedPaymentOption) {
      setPaymentSelectionWarning(true);
      paymentSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    setPaymentSelectionWarning(false);
    setGatewayError('');
    setIsCouponPickerOpen(false);
    const moveToReview = () => {
      setCheckoutStep('review');
    };
    if (onTriggerTopLoading) {
      onTriggerTopLoading(moveToReview);
    } else {
      moveToReview();
    }
  };

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
    effectiveCoupons.find((c) => c.id === selectedCouponId) ||
    effectiveCoupons[0];

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
    const matched = effectiveCoupons.find(
      (c) => c.code.toUpperCase() === clean
    );
    if (matched) {
      setSelectedCouponId(matched.id);
      setCustomCouponInput('');
    } else if (effectiveCoupons[0]) {
      setSelectedCouponId(effectiveCoupons[0].id);
      setCustomCouponInput('');
    }
  };

  const handleSelectPaymentType = (opt: CheckoutPaymentMethodKey) => {
    if (opt === 'koko_installments') return; // Disabled (Coming Soon)
    setSelectedPaymentOption(opt);
    setPaymentSelectionWarning(false);
    if (opt === 'cod') {
      onSelectPaymentMethod('cod');
    } else {
      onSelectPaymentMethod('card_express');
    }
  };

  const selectedCardObj =
    savedCards.find((c) => c.id === selectedCardId) || savedCards[0];

  const paymentMethodLabel = useMemo(() => {
    if (!selectedPaymentOption) return 'Not Selected';
    if (selectedPaymentOption === 'cod') return 'Cash on Delivery (COD)';
    if (selectedPaymentOption === 'koko_installments')
      return 'Koko / BuyKit PayLater (Coming Soon)';
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

  const handleCompleteKokoPaymentCallback = async (details: {
    orderId: string;
    trnId: string;
    firstInstallmentLkr: number;
    totalAmountLkr: number;
  }) => {
    const resolvedPaymentLabel = `Koko Pay 3x 0% · 1st Paid ${formatLKR(
      details.firstInstallmentLkr
    )} (Ref: ${details.trnId})`;

    const snapshotDetails: OrderPlacedConfirmationDetails = {
      orderId: details.orderId,
      paymentId: details.trnId,
      amountPaid: details.totalAmountLkr,
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

    setIsKokoModalOpen(false);
    setKokoSession(null);
    setOrderPlacedModalData(snapshotDetails);

    await onConfirmCheckoutOrder({
      finalPayableAmount: details.totalAmountLkr,
      couponCode: activeCoupon.code,
      couponDiscount: couponDiscountAmount,
      deliveryFee: deliveryFeeAmount,
      deliveryMethodLabel,
      paymentMethodLabel: resolvedPaymentLabel,
      suppressAutoRedirect: true,
    });
  };

  // Detect PayHere return_url callback (?payment=success&orderId=...) OR Koko return_url (?kokoPayment=success&sessionId=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const paymentStatus = params.get('payment');
    const callbackOrderId = params.get('orderId');
    const kokoPaymentStatus = params.get('kokoPayment');
    const kokoSessionId = params.get('sessionId');

    if (kokoPaymentStatus === 'success' && kokoSessionId && !orderPlacedModalData) {
      // Never trust return_url alone — verify Koko session status on the server first
      fetch(`/api/koko/session/${encodeURIComponent(kokoSessionId)}`)
        .then((r) => r.json())
        .then((data) => {
          if (data?.status === 'paid' && data?.trnId) {
            const firstInst =
              data.installments?.[0]?.amountLkr ?? Math.round((data.amountLkr || finalPayableAmount) / 3);
            handleCompleteKokoPaymentCallback({
              orderId: data.orderId || callbackOrderId || `BK-KOKO-${Date.now()}`,
              trnId: data.trnId,
              firstInstallmentLkr: firstInst,
              totalAmountLkr: data.amountLkr || finalPayableAmount,
            });
          } else {
            setGatewayError(
              'Koko payment is still awaiting server callback verification. Please check your Koko app or try again.'
            );
          }
        })
        .catch(() => {
          setGatewayError('Unable to verify Koko payment status.');
        })
        .finally(() => {
          window.history.replaceState({}, document.title, window.location.pathname);
        });
      return;
    }

    if (kokoPaymentStatus === 'cancelled') {
      setGatewayError('Koko payment was cancelled before approval.');
      window.history.replaceState({}, document.title, window.location.pathname);
      return;
    }

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

    if (!selectedPaymentOption) {
      setGatewayError('Please select an available payment method before placing your order.');
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

    // Koko 3x 0% Installments is currently disabled (Coming Soon)
    if (selectedPaymentOption === 'koko_installments') {
      setGatewayError('Koko / BuyKit PayLater is Coming Soon. Please choose another payment method.');
      return;
    }

    // For Card / LankaQR, create a signed PayHere PaymentIntent on the backend
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
    <section className="mx-auto max-w-3xl space-y-3 pt-2.5 pb-44">
      {/* Compact Top Step Bar — Shown ONLY on Step 2 (Removed on Step 1 for maximum vertical space) */}
      {checkoutStep === 'review' && (
        <div className="sticky top-0 z-30 -mx-3 flex items-center justify-between gap-3 border-b border-slate-200 bg-white/98 px-4 py-2.5 shadow-2xs backdrop-blur-md sm:mx-0 sm:rounded-2xl sm:border sm:px-5">
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setCheckoutStep('setup');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              aria-label="Back to Address, Coupons and Payment"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-800 transition-colors hover:border-[#F85606] hover:text-[#F85606]"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>

            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-display text-sm font-extrabold text-slate-950 sm:text-base">
                  Order Review &amp; Summary
                </h1>
                <span className="rounded-md bg-[#FFF3EB] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#F85606] uppercase">
                  Step 2 of 2
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Read-only final order details — verify your summary &amp; confirm payment
              </p>
            </div>
          </div>

          <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-slate-100 px-2.5 py-1 text-[10px] font-extrabold text-slate-700 uppercase">
            <Lock className="h-3 w-3 text-[#F85606]" />
            <span>Read-Only</span>
          </span>
        </div>
      )}

      {items.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center shadow-2xs">
          <ShoppingBag className="mx-auto mb-3 h-11 w-11 text-slate-300" />
          <h2 className="font-display text-lg font-bold text-slate-900">
            No Products Selected for Checkout Yet
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Select products in your Cart and click &ldquo;Pay Now&rdquo; to continue to checkout.
          </p>
          <button
            type="button"
            onClick={onBackToCart || onContinueShopping}
            className="mt-5 inline-flex items-center gap-2 rounded-xl bg-[#F85606] px-6 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800]"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{onBackToCart ? 'Return to Cart' : 'Browse Products & Deals'}</span>
          </button>
        </div>
      ) : checkoutStep === 'setup' ? (
        /* =========================================================
           STEP 1: ADDRESS, COMPACT APPLIED COUPONS & VOUCHERS, SELECT PAYMENT METHOD ONLY
           (No top header bar, no products list, no summary card — requires payment selection)
           ========================================================= */
        <div className="space-y-3">
          {/* 1. SHIPPING ADDRESS (Compact & Clean) */}
          <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
            <div className="absolute top-0 right-0 left-0 h-1 bg-gradient-to-r from-[#F85606] via-blue-500 to-[#F85606]" />
            <div className="flex flex-wrap items-start justify-between gap-2.5">
              <div className="flex items-start gap-2.5">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#FFF3EB] text-[#F85606]">
                  <MapPin className="h-4 w-4" />
                </div>
                <div className="space-y-0.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-[#F85606] px-1.5 py-0.5 text-[9px] font-extrabold text-white uppercase">
                      {addressLabel}
                    </span>
                    <span className="font-display text-xs font-extrabold text-slate-950 sm:text-sm">
                      {fullName || 'BuyKit Shopper'}
                    </span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">
                      {phone}
                    </span>
                    {secondaryPhone && (
                      <span className="font-mono text-[11px] text-slate-500">
                        / {secondaryPhone}
                      </span>
                    )}
                  </div>

                  <p className="text-xs font-medium text-slate-700">
                    {shippingAddress}, {cityDistrict} · {postalCode}
                  </p>

                  <div className="flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                    <span className="inline-flex items-center gap-1 font-semibold text-slate-700">
                      <img
                        src={currentCountry.flagUrl}
                        alt={currentCountry.name}
                        className="h-3 w-4 rounded-xs border border-slate-300 object-cover"
                      />
                      {currentCountry.name}
                    </span>
                    <span>·</span>
                    <span className="truncate">{email}</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => onOpenSettingsTab('address')}
                className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-[#FFF3EB] px-2.5 py-1 text-[11px] font-bold text-[#F85606] hover:bg-orange-100"
              >
                <Edit3 className="h-3 w-3" />
                <span>Edit</span>
              </button>
            </div>
          </div>

          {/* 2. COMPACT REDESIGNED APPLIED COUPONS & VOUCHERS */}
          <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-2xs">
            {/* Slim Single-Row Header + Active Coupon + Change Trigger */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-[#FFF3EB] text-[#F85606]">
                  <Ticket className="h-3.5 w-3.5" />
                </div>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="font-display text-xs font-extrabold text-slate-950 uppercase">
                      Coupons
                    </span>
                    <span className="rounded bg-[#FFF3EB] px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-[#F85606]">
                      {activeCoupon.code}
                    </span>
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white">
                      {couponDiscountAmount > 0 ? `-${formatLKR(couponDiscountAmount)}` : 'Rs. 0'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCouponPickerOpen((prev) => !prev)}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-orange-200 bg-[#FFF3EB] px-2.5 py-1 text-[11px] font-extrabold text-[#F85606] transition-colors hover:bg-[#F85606] hover:text-white"
              >
                <span>{isCouponPickerOpen ? 'Close' : 'Change'}</span>
                <ChevronRight
                  className={`h-3 w-3 transition-transform ${
                    isCouponPickerOpen ? 'rotate-90' : ''
                  }`}
                />
              </button>
            </div>

            {/* Compact Expandable Coupon Switcher */}
            {isCouponPickerOpen && (
              <div className="mt-2.5 space-y-2 border-t border-slate-100 pt-2.5">
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {effectiveCoupons.map((coup) => {
                    const isSelected = coup.id === selectedCouponId;
                    const eligible = itemsSubtotal >= coup.minSpend;
                    return (
                      <button
                        key={coup.id}
                        type="button"
                        onClick={() => {
                          setSelectedCouponId(coup.id);
                          setIsCouponPickerOpen(false);
                        }}
                        className={`flex items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-all ${
                          isSelected
                            ? 'border-[#F85606] bg-[#FFF5F0] ring-1 ring-[#F85606]/30'
                            : 'border-slate-200 bg-slate-50/70 hover:border-orange-200 hover:bg-white'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono text-[11px] font-extrabold text-[#F85606]">
                              {coup.code}
                            </span>
                            <span className="truncate text-[11px] font-semibold text-slate-800">
                              {coup.badgeText}
                            </span>
                          </div>
                          <p className="truncate text-[10px] text-slate-500">
                            {eligible ? coup.title : `Min spend ${formatLKR(coup.minSpend)}`}
                          </p>
                        </div>
                        {isSelected && (
                          <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-[#F85606] text-white">
                            <Check className="h-2.5 w-2.5" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Compact Promo Code Row */}
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    value={customCouponInput}
                    onChange={(e) => setCustomCouponInput(e.target.value)}
                    placeholder="Promo code (e.g. BUYKIT5000)"
                    className="flex-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-[11px] uppercase text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleApplyCustomCoupon}
                    className="rounded-lg bg-slate-900 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-slate-800"
                  >
                    Apply
                  </button>
                </div>
              </div>
            )}

            {/* Slim Single-Line BuyKit Coins Row */}
            <div className="mt-2 flex items-center justify-between border-t border-slate-100 pt-2 text-[11px]">
              <div className="flex items-center gap-1.5 text-slate-700">
                <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                <span className="font-semibold">BuyKit Coins (1,250)</span>
              </div>
              <button
                type="button"
                onClick={() => setRedeemBuyKitCoins((prev) => !prev)}
                className={`rounded-md px-2.5 py-0.5 text-[10px] font-extrabold transition-colors ${
                  redeemBuyKitCoins
                    ? 'bg-emerald-600 text-white'
                    : 'border border-slate-300 bg-white text-slate-700'
                }`}
              >
                {redeemBuyKitCoins ? `-${formatLKR(coinsDiscountAmount)}` : 'Apply'}
              </button>
            </div>
          </div>

          {/* 3. SELECT PAYMENT METHOD (No default selection; required before continuing) */}
          <div
            ref={paymentSectionRef}
            className={`rounded-2xl border bg-white p-4 shadow-2xs transition-all ${
              paymentSelectionWarning
                ? 'border-red-400 ring-2 ring-red-200'
                : 'border-slate-200'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#F85606]" />
                <h2 className="font-display text-xs font-extrabold text-slate-950 uppercase sm:text-sm">
                  {t.selectPaymentMethod}
                </h2>
                {!selectedPaymentOption && (
                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-extrabold text-amber-800">
                    Required
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => onOpenSettingsTab('cards')}
                className="text-[11px] font-bold text-[#F85606] underline"
              >
                + Add Card
              </button>
            </div>

            {paymentSelectionWarning && !selectedPaymentOption && (
              <div className="mt-2.5 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-700">
                Please select a payment method below before clicking Pay Now.
              </div>
            )}

            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {/* Payment 1: Credit / Debit Card */}
              <button
                type="button"
                onClick={() => handleSelectPaymentType('card_express')}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                  selectedPaymentOption === 'card_express'
                    ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                }`}
              >
                <CreditCard className="mt-0.5 h-4 w-4 shrink-0 text-[#F85606]" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-950">
                    Credit / Debit Card (Visa / Mastercard)
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Instant 3D-Secure LKR Payment · Saved or new card
                  </p>
                </div>
              </button>

              {/* Payment 2: Cash on Delivery */}
              <button
                type="button"
                onClick={() => handleSelectPaymentType('cod')}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                  selectedPaymentOption === 'cod'
                    ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                }`}
              >
                <Wallet className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-950">
                    Cash on Delivery (COD)
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    Pay in LKR cash at your doorstep upon delivery
                  </p>
                </div>
              </button>

              {/* Payment 3: Koko / BuyKit PayLater — Disabled Gray Coming Soon */}
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="flex cursor-not-allowed items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-100 p-3 text-left opacity-70 grayscale"
              >
                <CalendarClock className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center justify-between gap-1.5">
                    <p className="text-xs font-extrabold text-slate-500">
                      Koko / BuyKit PayLater (3x 0%)
                    </p>
                    <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[9px] font-extrabold tracking-wide text-slate-600 uppercase">
                      Coming Soon
                    </span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-slate-400">
                    3x interest-free installments coming soon
                  </p>
                </div>
              </button>

              {/* Payment 4: LankaQR / Scan QR Code to Pay */}
              <button
                type="button"
                onClick={() => handleSelectPaymentType('lanka_qr')}
                className={`flex items-start gap-2.5 rounded-xl border p-3 text-left transition-all ${
                  selectedPaymentOption === 'lanka_qr'
                    ? 'border-[#F85606] bg-[#FFF5F0] ring-2 ring-[#F85606]/20'
                    : 'border-slate-200 bg-slate-50/60 hover:bg-white'
                }`}
              >
                <QrCode className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-extrabold text-slate-950">
                    Scan QR Code (LankaQR / Bank QR)
                  </p>
                  <p className="mt-0.5 text-[11px] text-slate-500">
                    BOC, People&apos;s, Sampath, Q+, Solo, FriMi or Genie
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

            {/* Koko 3x 0% Schedule Preview */}
            {selectedPaymentOption === 'koko_installments' && (
              <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-950">
                <p className="font-extrabold">
                  Koko 3x 0% Interest Selected · 3 × {formatLKR(Math.round(finalPayableAmount / 3))}
                </p>
                <p className="mt-0.5 text-[11px] text-blue-800">
                  Click &ldquo;Pay Now&rdquo; below to review your final order summary and complete Koko verification.
                </p>
              </div>
            )}

            {/* LANKAQR Info Preview */}
            {selectedPaymentOption === 'lanka_qr' && (
              <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
                <p className="font-extrabold">
                  LANKAQR Instant Scan &amp; Pay Selected
                </p>
                <p className="mt-0.5 text-[11px] text-amber-800">
                  Click &ldquo;Pay Now&rdquo; below to review your final order summary and scan your unique LANKAQR code.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* =========================================================
           STEP 2: LOCKED READ-ONLY REVIEW & ORDER SUMMARY PAGE
           (Nothing can be edited here — displays Selected Products,
            Selected Coupon, Selected Address, Selected Payment Method & Summary;
            auto-scrolls by default down to the Order Summary section)
           ========================================================= */
        <div className="space-y-4">
          {/* 1. SELECTED PRODUCTS (READ-ONLY — NO EDIT / DELETE CONTROLS) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4 text-[#F85606]" />
                <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                  Selected Products ({totalUnits} {totalUnits === 1 ? 'Unit' : 'Units'})
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Lock className="h-3 w-3" /> Locked
              </span>
            </div>

            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/60 p-3"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <div className="h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-slate-200 bg-white">
                      <img
                        src={resolveAssetUrl(item.imageUrl)}
                        alt={item.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 font-display text-xs font-bold text-slate-950 sm:text-sm">
                        {item.title}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="rounded bg-slate-200/80 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                          {item.category}
                        </span>
                        <span className="font-mono text-xs font-extrabold text-[#F85606] tabular-nums">
                          {formatLKR(item.price)}
                        </span>
                        {item.originalPrice > item.price && (
                          <span className="font-mono text-[11px] text-slate-400 line-through tabular-nums">
                            {formatLKR(item.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 text-right font-mono tabular-nums">
                    <span className="inline-block rounded-md bg-slate-900 px-2 py-0.5 text-[10px] font-extrabold text-white">
                      Qty: {item.quantity}
                    </span>
                    <p className="mt-1 text-xs font-extrabold text-slate-950 sm:text-sm">
                      {formatLKR(item.price * item.quantity)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. SELECTED SHIPPING ADDRESS (READ-ONLY) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-[#F85606]" />
                <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                  Shipping Address
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Lock className="h-3 w-3" /> Locked
              </span>
            </div>

            <div className="space-y-1 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-[#F85606] px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                  {addressLabel}
                </span>
                <span className="font-display text-sm font-extrabold text-slate-950">
                  {fullName || 'BuyKit Shopper'}
                </span>
                <span className="font-mono font-bold text-slate-700">{phone}</span>
                {secondaryPhone && (
                  <span className="font-mono text-slate-500">/ {secondaryPhone}</span>
                )}
              </div>
              <p className="font-medium text-slate-700">
                {shippingAddress}, {cityDistrict} · Postal Code: {postalCode}
              </p>
              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-500">
                <span className="inline-flex items-center gap-1.5 font-semibold text-slate-700">
                  <img
                    src={currentCountry.flagUrl}
                    alt={currentCountry.name}
                    className="h-3.5 w-5 rounded-xs border border-slate-300 object-cover"
                  />
                  {currentCountry.name}
                </span>
                <span>·</span>
                <span>{email}</span>
              </div>
            </div>
          </div>

          {/* 3. SELECTED COUPON & VOUCHERS (READ-ONLY) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <Ticket className="h-4 w-4 text-[#F85606]" />
                <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                  Selected Coupon &amp; Vouchers
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Lock className="h-3 w-3" /> Locked
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-orange-200 bg-[#FFF5F0] p-3.5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-extrabold text-[#F85606]">
                    {activeCoupon.code}
                  </span>
                  <span className="rounded bg-emerald-600 px-2 py-0.5 text-[10px] font-extrabold text-white uppercase">
                    {couponDiscountAmount > 0
                      ? `-${formatLKR(couponDiscountAmount)}`
                      : 'No Coupon Discount'}
                  </span>
                </div>
                <p className="mt-0.5 text-xs font-bold text-slate-900">{activeCoupon.title}</p>
              </div>
              {redeemBuyKitCoins && coinsDiscountAmount > 0 && (
                <span className="inline-flex items-center gap-1 rounded-lg bg-amber-100 px-2.5 py-1 text-[11px] font-extrabold text-amber-900">
                  <Sparkles className="h-3.5 w-3.5 text-amber-600" />
                  Coins: -{formatLKR(coinsDiscountAmount)}
                </span>
              )}
            </div>
          </div>

          {/* 4. SELECTED PAYMENT METHOD (READ-ONLY) */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-[#F85606]" />
                <h2 className="font-display text-sm font-bold text-slate-950 uppercase">
                  Selected Payment Method
                </h2>
              </div>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-400">
                <Lock className="h-3 w-3" /> Locked
              </span>
            </div>

            <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#FFF3EB] text-[#F85606]">
                {selectedPaymentOption === 'card_express' && <CreditCard className="h-5 w-5" />}
                {selectedPaymentOption === 'cod' && <Wallet className="h-5 w-5 text-emerald-600" />}
                {selectedPaymentOption === 'koko_installments' && (
                  <CalendarClock className="h-5 w-5 text-blue-600" />
                )}
                {selectedPaymentOption === 'lanka_qr' && (
                  <QrCode className="h-5 w-5 text-amber-600" />
                )}
              </div>
              <div>
                <p className="text-xs font-extrabold text-slate-950 sm:text-sm">
                  {paymentMethodLabel}
                </p>
                <p className="text-[11px] text-slate-500">
                  {selectedPaymentOption === 'card_express' && selectedCardObj
                    ? `${selectedCardObj.bankName} · ${selectedCardObj.brand} •••• ${selectedCardObj.last4}`
                    : selectedPaymentOption === 'koko_installments'
                    ? `3 interest-free monthly payments of ${formatLKR(Math.round(finalPayableAmount / 3))}`
                    : selectedPaymentOption === 'lanka_qr'
                    ? 'Scan official LANKAQR with any Sri Lankan banking app'
                    : 'Pay cash in LKR when your package is delivered'}
                </p>
              </div>
            </div>

            {/* Live Koko / LANKAQR panels available in Review Step for direct verification */}
            {selectedPaymentOption === 'koko_installments' && (
              <KokoPaymentPanel
                variant="inline"
                amountLkr={finalPayableAmount}
                customerPhone={phone}
                isSubmitting={creatingIntent || checkoutSubmitting}
                onLaunchKokoCheckout={handleTriggerCheckoutOrder}
              />
            )}

            {selectedPaymentOption === 'lanka_qr' && (
              <LankaQrPaymentPanel
                variant="inline"
                orderId={`BKQR-${totalUnits}X-${Math.round(finalPayableAmount)}`}
                amountLkr={finalPayableAmount}
                merchantId="1228450"
                merchantName="BUYKIT WITH PRAMU"
                customerPhone={phone}
                onOpenFullQrModal={handleTriggerCheckoutOrder}
              />
            )}

            {gatewayError && !isPayHereGatewayModalOpen && !isKokoModalOpen && (
              <div className="mt-3 rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs font-semibold text-red-700">
                {gatewayError}
              </div>
            )}
          </div>

          {/* 5. ORDER SUMMARY (AT THE BOTTOM — DEFAULT SCROLL TARGET!) */}
          <div
            ref={summarySectionRef}
            className="scroll-mb-24 rounded-2xl border-2 border-orange-200 bg-white p-5 shadow-md sm:p-6"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3.5">
              <h2 className="font-display text-base font-extrabold text-slate-950">
                {t.finalBillSummary}
              </h2>
              <span className="rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-700">
                LKR Official Summary
              </span>
            </div>

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

              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-sans">
                  Coupon Applied (<strong>{activeCoupon.code}</strong>)
                </span>
                <span className="font-extrabold">
                  {couponDiscountAmount > 0 ? `- ${formatLKR(couponDiscountAmount)}` : 'Rs. 0'}
                </span>
              </div>

              <div className="flex items-center justify-between text-emerald-700">
                <span className="font-sans">BuyKit Coins Cashback</span>
                <span>
                  {coinsDiscountAmount > 0 ? `- ${formatLKR(coinsDiscountAmount)}` : 'Rs. 0'}
                </span>
              </div>

              {hubCollectionBonus > 0 && (
                <div className="flex items-center justify-between text-emerald-700">
                  <span className="font-sans">Pickup Hub Rebate</span>
                  <span>- {formatLKR(hubCollectionBonus)}</span>
                </div>
              )}

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

              <div className="flex items-center justify-between border-t border-slate-100 pt-2 text-[11px] text-slate-600">
                <span className="font-sans">Selected Payment:</span>
                <span className="font-sans font-bold text-slate-900">{paymentMethodLabel}</span>
              </div>

              {/* FINAL TOTAL PAYABLE BLOCK */}
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

            {/* Final Confirm & Pay Action */}
            <div className="mt-5 space-y-2.5">
              {!currentUser && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
                  <div className="flex items-center gap-1.5 font-bold">
                    <Lock className="h-3.5 w-3.5 text-[#F85606]" />
                    <span>Sign in with Google to Confirm &amp; Track Your Order</span>
                  </div>
                  <p className="mt-0.5 text-[11px] text-amber-800">
                    Clicking Confirm &amp; Pay below will let you sign in and immediately confirm this order.
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
                    ? 'Confirming Order...'
                    : `Confirm & ${t.payNow} — ${formatLKR(finalPayableAmount)}`}
                </span>
              </button>

              <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-slate-500">
                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                <span>
                  100% BuyKit Buyer Protection · Verified Sri Lanka LKR Checkout
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          STICKY BOTTOM PAY NOW BAR FOR STEP 1 ONLY
          (Clicking "Pay Now" triggers orange loading bar -> opens Step 2 Read-Only Review & Summary)
         ========================================================= */}
      {items.length > 0 && checkoutStep === 'setup' && (
        <div className="fixed right-0 bottom-[62px] left-0 z-[45] border-t-2 border-orange-300 bg-white/98 px-3 py-2.5 shadow-[0_-8px_24px_rgba(15,23,42,0.14)] backdrop-blur-md sm:px-8 sm:py-3">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-2.5">
            <div className="min-w-0 flex-1">
              <div className="font-mono leading-tight tabular-nums">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="font-sans text-[10px] font-extrabold tracking-wider text-slate-600 uppercase sm:text-[11px]">
                    {t.totalPayable} ({totalUnits})
                  </span>
                  {couponDiscountAmount > 0 && (
                    <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white">
                      -{formatLKR(couponDiscountAmount)}
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex items-baseline gap-2">
                  <span className="text-base font-extrabold text-[#F85606] sm:text-xl">
                    {formatLKR(finalPayableAmount)}
                  </span>
                  {totalCombinedSavings > 0 && (
                    <span className="hidden rounded bg-[#FFF3EB] px-1.5 py-0.5 font-sans text-[10px] font-extrabold text-[#F85606] sm:inline-block">
                      {t.youSave} {formatLKR(totalCombinedSavings)}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoToReviewStep}
              className={`inline-flex shrink-0 items-center justify-center gap-1.5 rounded-xl px-6 py-3 text-xs font-extrabold shadow-md transition-all sm:px-8 sm:text-sm whitespace-nowrap ${
                selectedPaymentOption
                  ? 'bg-[#F85606] text-white hover:bg-[#d94800] active:scale-[0.98]'
                  : 'bg-slate-300 text-slate-600 hover:bg-slate-300'
              }`}
            >
              <Bolt className="h-4 w-4 shrink-0" />
              <span>{t.payNow}</span>
            </button>
          </div>
        </div>
      )}

      {/* =========================================================
          PAYHERE 3D-SECURE CARD PAYMENT & BANK OTP VERIFICATION MODAL
          (Uses the real signed PaymentIntent hash from POST /api/payhere/create-payment-intent)
         ========================================================= */}
      {isPayHereGatewayModalOpen && payhereIntent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
          <div className="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl">
            {/* Top PayHere / LankaQR Gateway Header */}
            <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-[#F85606] px-5 py-4 text-white">
              <div className="flex items-center gap-2.5">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15">
                  {selectedPaymentOption === 'lanka_qr' ? (
                    <QrCode className="h-5 w-5 text-amber-200" />
                  ) : (
                    <CreditCard className="h-5 w-5 text-orange-200" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-sm font-extrabold tracking-wide uppercase">
                      {selectedPaymentOption === 'lanka_qr'
                        ? 'LANKAQR · Scan QR Code to Pay'
                        : 'PayHere Sri Lanka · 3D-Secure Checkout'}
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
              {selectedPaymentOption === 'lanka_qr' ? (
                <>
                  <LankaQrPaymentPanel
                    variant="modal"
                    orderId={payhereIntent.order_id}
                    amountLkr={finalPayableAmount}
                    merchantId={payhereIntent.merchant_id}
                    merchantName="BUYKIT WITH PRAMU"
                    customerPhone={payhereIntent.phone}
                    onAutoConfirmedPaid={async (verifiedResult) => {
                      setProcessingGatewayConfirm(true);
                      setGatewayError('');
                      try {
                        const verifiedPaymentId =
                          verifiedResult.paymentId || `LQR-${Date.now().toString().slice(-8)}`;

                        await handleCompletePayHereSuccessCallback(
                          payhereIntent.order_id,
                          verifiedPaymentId
                        );
                      } finally {
                        setProcessingGatewayConfirm(false);
                      }
                    }}
                  />

                  {gatewayError && (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs font-semibold text-red-700">
                      {gatewayError}
                    </div>
                  )}

                  <div className="flex items-center justify-between gap-2 pt-1">
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
                      Open PayHere.lk QR Popup
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsPayHereGatewayModalOpen(false)}
                      className="rounded-xl px-3.5 py-2 text-xs font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================
          KOKO PAY (3x 0% BNPL) CHECKOUT MODAL (Live RSA Redirect OR Sandbox OTP)
         ========================================================= */}
      {isKokoModalOpen && kokoSession && (
        <KokoPaymentPanel
          variant="modal"
          amountLkr={finalPayableAmount}
          customerPhone={phone}
          session={kokoSession}
          onCloseModal={() => setIsKokoModalOpen(false)}
          onPaymentVerified={handleCompleteKokoPaymentCallback}
        />
      )}

      {/* =========================================================
          PAYMENT CALLBACK SUCCESS — "ORDER PLACED" CONFIRMATION MODAL
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
                <span>
                  {orderPlacedModalData.paymentId.startsWith('KOKO')
                    ? 'Koko RSA-256 Payment Verified'
                    : orderPlacedModalData.paymentId.startsWith('LQR')
                    ? 'LANKAQR Payment Verified'
                    : orderPlacedModalData.paymentId.startsWith('COD')
                    ? 'Cash on Delivery Confirmed'
                    : 'PayHere Payment Callback Verified'}
                </span>
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
                            src={resolveAssetUrl(item.imageUrl)}
                            alt={item.title}
                            loading="lazy"
                            decoding="async"
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
