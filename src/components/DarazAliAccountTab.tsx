import React, { useState } from 'react';
import {
  User as UserIcon,
  LogOut,
  CheckCircle2,
  Heart,
  ShoppingBag,
  Bolt,
  Package,
  Truck,
  Clock,
  Trash2,
  MapPin,
  ShieldCheck,
  Star,
  Tag,
  Sparkles,
  MessageSquare,
  RotateCcw,
  Box,
  ChevronRight,
  Wallet,
  Award,
  Edit3,
  Check,
  CreditCard,
  Ticket,
  Flame,
  Scale,
  Settings,
  Globe,
  Languages,
} from 'lucide-react';
import { User } from '../firebase';
import { MarketplaceProduct, DealTier, formatLKR } from '../data/catalog';
import {
  TrackableOrder,
  ORDER_TRACKING_STAGES,
  getStageLabelFromStatus,
  mapOrderStatusToStageIndex,
} from './OrderTrackingModal';
import {
  FirestoreProductReview,
  FirestoreProductQuestion,
} from './ProductReviewsAndQaSection';
import {
  COUNTRIES_WITH_FLAGS,
  LANGUAGES_LIST,
  SettingsTabKey,
} from './AccountSettingsModal';

export interface AccountWishlistItem {
  id: string;
  userId: string;
  productId: string;
  title: string;
  category: string;
  dealType: DealTier;
  price: number;
  originalPrice: number;
  imageUrl: string;
}

interface DarazAliAccountTabProps {
  currentUser: User | null;
  newUserDealClaimed: boolean;
  orders: TrackableOrder[];
  wishlistItems: AccountWishlistItem[];
  recentlyViewedProducts: MarketplaceProduct[];
  catalog: MarketplaceProduct[];
  userReviews: FirestoreProductReview[];
  userQuestions: FirestoreProductQuestion[];
  phone: string;
  shippingAddress: string;
  postalCode: string;
  selectedHubName: string;
  onUpdatePhone: (v: string) => void;
  onUpdateShippingAddress: (v: string) => void;
  onUpdatePostalCode: (v: string) => void;
  onSaveAddressToFirestore: () => Promise<void>;
  onOpenAuthModal: () => void;
  onSignOut: () => void;
  onClaimNewUserVoucher: () => void;
  onOpenTrackingModal: (order: TrackableOrder) => void;
  onOpenDemoTrackingModal: () => void;
  onCancelOrder: (order: TrackableOrder) => void;
  onOpenProductDetails: (product: MarketplaceProduct) => void;
  onAddToCart: (product: MarketplaceProduct, qty: number) => void;
  onBuyNow: (product: MarketplaceProduct, qty: number) => void;
  onToggleWishlist: (product: MarketplaceProduct, e?: React.MouseEvent) => void;
  onRemoveWishlistItem: (itemId: string, title: string) => void;
  onClearRecentlyViewed: () => void;
  onToggleProductStock: (productId: string, e?: React.MouseEvent) => void;
  isProductWishlisted: (productId: string) => boolean;
  getEffectivePrice: (product: MarketplaceProduct) => number;
  onNavigateTab: (tab: 'home' | 'shop' | 'buykit' | 'cart' | 'account') => void;
  onOpenPickupMap: () => void;
  onOpenCompareModal: () => void;
  selectedCountryCode: string;
  selectedLanguageCode: string;
  savedCardsCount: number;
  onOpenSettingsModal: (tab?: SettingsTabKey) => void;
  onOpenAdminStudio?: () => void;
  logoBadge: React.ReactNode;
}

type OrderFilterTab = 'all' | 'to_pay' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

export const DarazAliAccountTab: React.FC<DarazAliAccountTabProps> = ({
  currentUser,
  newUserDealClaimed,
  orders,
  wishlistItems,
  recentlyViewedProducts,
  catalog,
  userReviews,
  userQuestions,
  phone,
  shippingAddress,
  postalCode,
  selectedHubName,
  onUpdatePhone,
  onUpdateShippingAddress,
  onUpdatePostalCode,
  onSaveAddressToFirestore,
  onOpenAuthModal,
  onSignOut,
  onClaimNewUserVoucher,
  onOpenTrackingModal,
  onOpenDemoTrackingModal,
  onCancelOrder,
  onOpenProductDetails,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onRemoveWishlistItem,
  onClearRecentlyViewed,
  onToggleProductStock,
  isProductWishlisted,
  getEffectivePrice,
  onNavigateTab,
  onOpenPickupMap,
  onOpenCompareModal,
  selectedCountryCode,
  selectedLanguageCode,
  savedCardsCount,
  onOpenSettingsModal,
  onOpenAdminStudio,
  logoBadge,
}) => {
  const [orderFilter, setOrderFilter] = useState<OrderFilterTab>('all');
  const [isAddressDrawerOpen, setIsAddressDrawerOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [showReviewsPanel, setShowReviewsPanel] = useState(false);
  const [showBuyerProtectionDrawer, setShowBuyerProtectionDrawer] = useState(false);
  const [showCouponsDrawer, setShowCouponsDrawer] = useState(false);

  const activeCountry =
    COUNTRIES_WITH_FLAGS.find((c) => c.code === selectedCountryCode) ||
    COUNTRIES_WITH_FLAGS[0];
  const activeLanguage =
    LANGUAGES_LIST.find((l) => l.code === selectedLanguageCode) ||
    LANGUAGES_LIST[0];

  // Order status counts for Daraz / AliExpress Compact Strip
  const toPayCount = orders.filter(
    (o) =>
      o.paymentMethod === 'cod' &&
      (o.status === 'processing' || o.status === 'preparing')
  ).length;
  const paidCount = orders.filter(
    (o) =>
      o.paymentMethod === 'card_express' ||
      o.status === 'processing' ||
      o.status === 'preparing'
  ).length;
  const shippedCount = orders.filter(
    (o) =>
      o.status === 'dispatched' || o.status === 'in_transit' || o.status === 'shipped'
  ).length;
  const deliveredCount = orders.filter((o) => o.status === 'delivered').length;
  const cancelledCount = orders.filter((o) => o.status === 'cancelled').length;

  const filteredOrders = orders.filter((o) => {
    if (orderFilter === 'all') return true;
    if (orderFilter === 'to_pay') {
      return (
        o.paymentMethod === 'cod' &&
        (o.status === 'processing' || o.status === 'preparing')
      );
    }
    if (orderFilter === 'paid') {
      return (
        o.paymentMethod === 'card_express' ||
        o.status === 'processing' ||
        o.status === 'preparing'
      );
    }
    if (orderFilter === 'shipped') {
      return (
        o.status === 'dispatched' || o.status === 'in_transit' || o.status === 'shipped'
      );
    }
    if (orderFilter === 'delivered') return o.status === 'delivered';
    if (orderFilter === 'cancelled') return o.status === 'cancelled';
    return true;
  });

  const scrollToSection = (elementId: string) => {
    const el = document.getElementById(elementId);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSaveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingAddress(true);
    try {
      await onSaveAddressToFirestore();
      setIsAddressDrawerOpen(false);
    } finally {
      setIsSavingAddress(false);
    }
  };

  // Stock Label Badge Helper (Green for In Stock, Red for Out of Stock)
  const renderStockBadge = (product: MarketplaceProduct | undefined) => {
    const stockCount = product ? product.stockRemaining : 10;
    const isInStock = stockCount > 0;
    return (
      <span
        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide uppercase shadow-2xs ${
          isInStock
            ? 'border border-emerald-300 bg-emerald-600 text-white'
            : 'border border-red-300 bg-red-600 text-white'
        }`}
      >
        <span>{isInStock ? `In Stock (${stockCount})` : 'Out of Stock'}</span>
      </span>
    );
  };

  return (
    <section className="mx-auto max-w-6xl space-y-5">
      {/* =========================================================
          1. DARAZ / ALIEXPRESS HERO MEMBER HEADER & 4-STAT BAR
         ========================================================= */}
      <div className="overflow-hidden rounded-2xl border border-orange-300/60 bg-gradient-to-r from-[#F85606] via-[#ff6a00] to-[#e03e00] text-white shadow-md">
        <div className="p-5 sm:p-6">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div className="flex items-center gap-4">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Shopper'}
                  referrerPolicy="no-referrer"
                  className="h-16 w-16 shrink-0 rounded-full border-2 border-white object-cover shadow-md"
                />
              ) : (
                <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border-2 border-white/80 bg-black/30 p-1 shadow-md">
                  {logoBadge}
                </div>
              )}

              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1 rounded-md bg-black/25 px-2.5 py-0.5 text-[11px] font-bold text-amber-200">
                    <Award className="h-3.5 w-3.5 text-amber-300" />
                    <span>
                      {currentUser ? 'BuyKit Choice Gold Member' : 'BuyKit Guest Visitor'}
                    </span>
                  </span>
                  {newUserDealClaimed && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500 px-2.5 py-0.5 text-[11px] font-bold text-white">
                      <CheckCircle2 className="h-3 w-3" />
                      <span>Starter Pass Active</span>
                    </span>
                  )}
                </div>

                <h1 className="mt-1 font-display text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
                  {currentUser
                    ? currentUser.displayName || 'BuyKit Shopper'
                    : 'Welcome to BuyKit with Pramu'}
                </h1>

                <p className="mt-0.5 text-xs text-orange-100">
                  {currentUser
                    ? `${currentUser.email} · Delivery Hub: ${selectedHubName}`
                    : 'Sign in or register in one click to sync your Cart, Wishlist, Orders & LKR Vouchers'}
                </p>
              </div>
            </div>

            {/* Right Action Buttons: Country Flag, Language, Cards, Settings Icon & Sign In/Out */}
            <div className="flex flex-wrap items-center gap-2">
              {/* Country Flag + Language Pill Button */}
              <button
                type="button"
                onClick={() => onOpenSettingsModal('country_language')}
                title="Change Shipping Country (with Flag) & Store Language"
                className="inline-flex items-center gap-2 rounded-xl border border-white/35 bg-black/25 px-3 py-2 text-xs font-bold text-white backdrop-blur-xs transition-colors hover:bg-black/40"
              >
                <img
                  src={activeCountry.flagUrl}
                  alt={activeCountry.name}
                  referrerPolicy="no-referrer"
                  className="h-4 w-6 rounded-xs object-cover shadow-2xs"
                />
                <span>{activeCountry.name}</span>
                <span className="text-orange-200">·</span>
                <span className="text-amber-300">{activeLanguage.nativeLabel}</span>
              </button>

              {/* Credit / Debit Cards Wallet Button */}
              <button
                type="button"
                onClick={() => onOpenSettingsModal('cards')}
                title="Manage or Add Credit / Debit Card"
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/35 bg-white/15 px-3 py-2 text-xs font-bold text-white backdrop-blur-xs transition-colors hover:bg-white/25"
              >
                <CreditCard className="h-3.5 w-3.5 text-amber-300" />
                <span>Cards ({savedCardsCount})</span>
              </button>

              {/* Prominent Settings Gear Icon Button in Account Tab Header */}
              <button
                type="button"
                onClick={() => onOpenSettingsModal('profile')}
                aria-label="Open Account Settings"
                title="Account Settings: Profile, Address, Contact Numbers, Country, Language & Credit/Debit Cards"
                className="inline-flex items-center gap-1.5 rounded-xl border-2 border-white bg-white px-3.5 py-2 text-xs font-extrabold text-[#F85606] shadow-md transition-transform hover:scale-[1.03]"
              >
                <Settings className="h-4 w-4 text-[#F85606]" />
                <span>Settings</span>
              </button>

              {onOpenAdminStudio && (
                <button
                  type="button"
                  onClick={onOpenAdminStudio}
                  title="Admin Studio: Add Products (Google Enriched), Launch Creative Sales & Promotional Posters"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-300/80 bg-slate-950/90 px-3.5 py-2 text-xs font-extrabold text-amber-300 shadow-md transition-transform hover:scale-[1.03]"
                >
                  <Sparkles className="h-4 w-4 text-amber-300" />
                  <span>Admin Studio (+Product / Sale / Poster)</span>
                </button>
              )}

              {currentUser ? (
                <>
                  {!newUserDealClaimed && (
                    <button
                      type="button"
                      onClick={onClaimNewUserVoucher}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-[#FFB800] px-3.5 py-2 text-xs font-extrabold text-slate-950 shadow-sm transition-colors hover:bg-[#e5a600]"
                    >
                      <Tag className="h-3.5 w-3.5" />
                      <span>Claim Rs. 5,000</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={onSignOut}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/30 bg-black/20 px-3 py-2 text-xs font-semibold text-white transition-colors hover:bg-black/35"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                    <span>Sign Out</span>
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={onOpenAuthModal}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2 text-xs font-extrabold text-white shadow-md transition-transform hover:scale-[1.02]"
                  >
                    <UserIcon className="h-3.5 w-3.5 text-amber-400" />
                    <span>Sign In / Register</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Daraz / AliExpress 4-Metric Quick Bar inside Header */}
          <div className="mt-5 grid grid-cols-2 gap-2.5 rounded-xl bg-black/20 p-3 backdrop-blur-xs sm:grid-cols-4">
            <button
              type="button"
              onClick={() => scrollToSection('account-wishlist-section')}
              className="flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-lg font-extrabold text-white tabular-nums">
                {wishlistItems.length}
              </span>
              <span className="text-[11px] font-medium text-orange-100">My Wishlist</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('account-footprint-section')}
              className="flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-lg font-extrabold text-white tabular-nums">
                {recentlyViewedProducts.length}
              </span>
              <span className="text-[11px] font-medium text-orange-100">
                Viewed Footprints
              </span>
            </button>

            <button
              type="button"
              onClick={onClaimNewUserVoucher}
              className="flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-lg font-extrabold text-amber-300 tabular-nums">
                {newUserDealClaimed ? 'Active' : '3 Vouchers'}
              </span>
              <span className="text-[11px] font-medium text-orange-100">
                Vouchers & Deals
              </span>
            </button>

            <button
              type="button"
              onClick={() => setShowReviewsPanel((prev) => !prev)}
              className="flex flex-col items-center justify-center rounded-lg py-1.5 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-lg font-extrabold text-white tabular-nums">
                {userReviews.length + userQuestions.length}
              </span>
              <span className="text-[11px] font-medium text-orange-100">
                My Reviews & Q&A
              </span>
            </button>
          </div>
        </div>

        {/* Bottom VIP Membership Strip */}
        <div className="flex flex-wrap items-center justify-between gap-2 bg-slate-950/90 px-5 py-2.5 text-xs text-amber-200">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-400" />
            <span className="font-semibold">
              BuyKit Choice Club: Free Islandwide Express Delivery + Up to 65% LKR SuperDeals
            </span>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('buykit')}
            className="inline-flex items-center gap-1 font-bold text-amber-400 hover:underline"
          >
            <span>Explore Choice Hub</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================
          OPTIONAL INLINE SHIPPING ADDRESS & HUB EDITOR DRAWER
         ========================================================= */}
      {isAddressDrawerOpen && currentUser && (
        <form
          onSubmit={handleSaveAddress}
          className="rounded-2xl border border-orange-200 bg-[#FFF9F5] p-5 shadow-xs"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#F85606]" />
              <h3 className="font-display text-sm font-bold text-slate-950">
                Default Sri Lanka Delivery Address & Contact Info
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setIsAddressDrawerOpen(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Close
            </button>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Phone Number (Sri Lanka)
              </label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => onUpdatePhone(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Street & City Address
              </label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => onUpdateShippingAddress(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Postal Code
              </label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => onUpdatePostalCode(e.target.value)}
                className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900"
              />
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-2">
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <span>Selected Pickup Hub:</span>
              <strong className="text-slate-900">{selectedHubName}</strong>
              <button
                type="button"
                onClick={onOpenPickupMap}
                className="font-semibold text-[#F85606] underline"
              >
                Change on Map
              </button>
            </div>

            <button
              type="submit"
              disabled={isSavingAddress}
              className="inline-flex items-center gap-1.5 rounded-xl bg-[#F85606] px-4 py-2 text-xs font-bold text-white hover:bg-[#d94800] disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSavingAddress ? 'Saving...' : 'Save Address'}</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================
          2. UNIFIED DARAZ / ALIEXPRESS "MY ORDERS, COUPONS, DEALS & TOOLS" CARD
             (Compact Small Icons: To Pay, Paid, Track My Order, Shipped, Coupons, New Deals & Tools all together)
         ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#F85606]" />
            <h2 className="font-display text-base font-bold text-slate-950">
              My Orders & Services
            </h2>
            <span className="font-mono text-[11px] text-slate-500 tabular-nums">
              ({orders.length} orders)
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOrderFilter('all')}
            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-[#F85606]"
          >
            <span>View All Orders ({orders.length})</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* COMPACT ICON GRID: To Pay, Paid, Track My Order, Shipped, Coupons, New Deals, and Tools ALL TOGETHER */}
        <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {/* 1. To Pay */}
          <button
            type="button"
            onClick={() => setOrderFilter('to_pay')}
            className={`group flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
              orderFilter === 'to_pay'
                ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606]'
                : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-orange-200 hover:bg-white'
            }`}
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Wallet className="h-4 w-4 text-[#F85606]" />
              {toPayCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#F85606] px-1 font-mono text-[9px] font-bold text-white tabular-nums">
                  {toPayCount}
                </span>
              )}
            </div>
            <span className="truncate text-[11px] font-bold">To Pay</span>
          </button>

          {/* 2. Paid */}
          <button
            type="button"
            onClick={() => setOrderFilter('paid')}
            className={`group flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
              orderFilter === 'paid'
                ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606]'
                : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-orange-200 hover:bg-white'
            }`}
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <CreditCard className="h-4 w-4 text-emerald-600" />
              {paidCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 font-mono text-[9px] font-bold text-white tabular-nums">
                  {paidCount}
                </span>
              )}
            </div>
            <span className="truncate text-[11px] font-bold">Paid</span>
          </button>

          {/* 3. Track My Order */}
          <button
            type="button"
            onClick={() => {
              if (orders.length > 0) {
                onOpenTrackingModal(orders[0]);
              } else {
                onOpenDemoTrackingModal();
              }
            }}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-[#FFF3EB] shadow-2xs">
              <MapPin className="h-4 w-4 text-[#F85606]" />
            </div>
            <span className="truncate text-[11px] font-bold text-[#F85606]">
              Track Order
            </span>
          </button>

          {/* 4. Shipped */}
          <button
            type="button"
            onClick={() => setOrderFilter('shipped')}
            className={`group flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
              orderFilter === 'shipped'
                ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606]'
                : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-orange-200 hover:bg-white'
            }`}
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Truck className="h-4 w-4 text-blue-600" />
              {shippedCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 font-mono text-[9px] font-bold text-white tabular-nums">
                  {shippedCount}
                </span>
              )}
            </div>
            <span className="truncate text-[11px] font-bold">Shipped</span>
          </button>

          {/* 5. Coupons */}
          <button
            type="button"
            onClick={() => setShowCouponsDrawer((prev) => !prev)}
            className={`group flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
              showCouponsDrawer
                ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606]'
                : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-orange-200 hover:bg-white'
            }`}
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Ticket className="h-4 w-4 text-amber-500" />
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-500 px-1 font-mono text-[9px] font-bold text-white">
                3
              </span>
            </div>
            <span className="truncate text-[11px] font-bold">Coupons</span>
          </button>

          {/* 6. New Deals */}
          <button
            type="button"
            onClick={() => onNavigateTab('buykit')}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Flame className="h-4 w-4 text-rose-600" />
            </div>
            <span className="truncate text-[11px] font-bold">New Deals</span>
          </button>

          {/* 7. To Review (Delivered) */}
          <button
            type="button"
            onClick={() => setOrderFilter('delivered')}
            className={`group flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
              orderFilter === 'delivered'
                ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606]'
                : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-orange-200 hover:bg-white'
            }`}
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Star className="h-4 w-4 text-emerald-600" />
              {deliveredCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-emerald-600 px-1 font-mono text-[9px] font-bold text-white tabular-nums">
                  {deliveredCount}
                </span>
              )}
            </div>
            <span className="truncate text-[11px] font-bold">To Review</span>
          </button>

          {/* 8. Returns & Cancel */}
          <button
            type="button"
            onClick={() => setOrderFilter('cancelled')}
            className={`group flex flex-col items-center justify-center rounded-xl border p-2 text-center transition-all ${
              orderFilter === 'cancelled'
                ? 'border-[#F85606] bg-[#FFF5F0] text-[#F85606]'
                : 'border-slate-100 bg-slate-50/70 text-slate-700 hover:border-orange-200 hover:bg-white'
            }`}
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <RotateCcw className="h-4 w-4 text-rose-600" />
              {cancelledCount > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-600 px-1 font-mono text-[9px] font-bold text-white tabular-nums">
                  {cancelledCount}
                </span>
              )}
            </div>
            <span className="truncate text-[11px] font-bold">Returns</span>
          </button>

          {/* 9. Tool: Wishlist */}
          <button
            type="button"
            onClick={() => scrollToSection('account-wishlist-section')}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Heart className="h-4 w-4 text-rose-500" />
              {wishlistItems.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 font-mono text-[9px] font-bold text-white tabular-nums">
                  {wishlistItems.length}
                </span>
              )}
            </div>
            <span className="truncate text-[11px] font-bold">Wishlist</span>
          </button>

          {/* 10. Tool: Viewed Footprints */}
          <button
            type="button"
            onClick={() => scrollToSection('account-footprint-section')}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Clock className="h-4 w-4 text-amber-600" />
              {recentlyViewedProducts.length > 0 && (
                <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-amber-600 px-1 font-mono text-[9px] font-bold text-white tabular-nums">
                  {recentlyViewedProducts.length}
                </span>
              )}
            </div>
            <span className="truncate text-[11px] font-bold">Footprints</span>
          </button>

          {/* 11. Tool: My Reviews & Q&A */}
          <button
            type="button"
            onClick={() => setShowReviewsPanel((prev) => !prev)}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <MessageSquare className="h-4 w-4 text-blue-600" />
            </div>
            <span className="truncate text-[11px] font-bold">My Reviews</span>
          </button>

          {/* 12. Tool: Address Book */}
          <button
            type="button"
            onClick={() => onOpenSettingsModal('address')}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Edit3 className="h-4 w-4 text-emerald-600" />
            </div>
            <span className="truncate text-[11px] font-bold">Addresses</span>
          </button>

          {/* 13. Tool: Country & Language (with Flag) */}
          <button
            type="button"
            onClick={() => onOpenSettingsModal('country_language')}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <img
                src={activeCountry.flagUrl}
                alt={activeCountry.name}
                referrerPolicy="no-referrer"
                className="h-4 w-5 rounded-xs object-cover"
              />
            </div>
            <span className="truncate text-[11px] font-bold">
              {activeCountry.code} · {activeLanguage.code.toUpperCase()}
            </span>
          </button>

          {/* 14. Tool: Add Credit/Debit Card */}
          <button
            type="button"
            onClick={() => onOpenSettingsModal('cards')}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <CreditCard className="h-4 w-4 text-[#F85606]" />
              <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-slate-900 px-1 font-mono text-[9px] font-bold text-white">
                {savedCardsCount}
              </span>
            </div>
            <span className="truncate text-[11px] font-bold">Add Card</span>
          </button>

          {/* 15. Tool: Compare Products */}
          <button
            type="button"
            onClick={onOpenCompareModal}
            className="group flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 p-2 text-center text-slate-700 transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Scale className="h-4 w-4 text-[#F85606]" />
            </div>
            <span className="truncate text-[11px] font-bold">Compare</span>
          </button>

          {/* 16. Tool: Account Settings */}
          <button
            type="button"
            onClick={() => onOpenSettingsModal('profile')}
            className="group flex flex-col items-center justify-center rounded-xl border border-orange-200 bg-[#FFF5F0] p-2 text-center text-[#F85606] transition-all hover:border-[#F85606] hover:bg-white"
          >
            <div className="relative mb-1 flex h-8 w-8 items-center justify-center rounded-lg bg-white shadow-2xs">
              <Settings className="h-4 w-4 text-[#F85606]" />
            </div>
            <span className="truncate text-[11px] font-bold">Settings</span>
          </button>
        </div>

        {/* Inline Coupons & LKR Vouchers Drawer when "Coupons" icon is clicked */}
        {showCouponsDrawer && (
          <div className="mt-3.5 rounded-xl border border-orange-200 bg-[#FFF8F4] p-3.5">
            <div className="flex items-center justify-between">
              <span className="font-display text-xs font-bold text-slate-900">
                Active Coupons, Vouchers & BuyKit Coins
              </span>
              <button
                type="button"
                onClick={() => setShowCouponsDrawer(false)}
                className="text-[11px] font-semibold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <div className="mt-2.5 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-lg border border-orange-200 bg-white p-2.5">
                <div>
                  <p className="font-mono text-xs font-extrabold text-[#F85606]">
                    Rs. 5,000 OFF
                  </p>
                  <p className="text-[10px] text-slate-500">New User Starter Pass</p>
                </div>
                <button
                  type="button"
                  onClick={onClaimNewUserVoucher}
                  className="rounded-md bg-[#F85606] px-2.5 py-1 text-[10px] font-bold text-white"
                >
                  {newUserDealClaimed ? 'Claimed' : 'Claim'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                <div>
                  <p className="font-mono text-xs font-extrabold text-emerald-700">
                    Free Shipping
                  </p>
                  <p className="text-[10px] text-slate-500">3x Islandwide Hub Coupons</p>
                </div>
                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                  Active
                </span>
              </div>

              <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-2.5">
                <div>
                  <p className="font-mono text-xs font-extrabold text-amber-600">
                    1,250 Coins
                  </p>
                  <p className="text-[10px] text-slate-500">Worth Rs. 1,250 Cashback</p>
                </div>
                <span className="rounded bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-700">
                  Ready
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Filtered Orders List Below the Compact Icons */}
        <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-3.5">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-600">
              <span>
                {orders.length === 0
                  ? 'No orders placed yet. Click Track Order to preview the 4-stage timeline.'
                  : `No orders in "${orderFilter.replace('_', ' ')}" filter.`}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onOpenDemoTrackingModal}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-3 py-1.5 text-[11px] font-bold text-white hover:bg-[#d94800]"
                >
                  <Truck className="h-3 w-3" />
                  <span>Track My Order</span>
                </button>
                {orderFilter !== 'all' && orders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setOrderFilter('all')}
                    className="rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    Show All ({orders.length})
                  </button>
                )}
              </div>
            </div>
          ) : (
            filteredOrders.map((ord) => {
              const stageIdx = mapOrderStatusToStageIndex(ord.status);
              const stageLabel = getStageLabelFromStatus(ord.status);
              const stagePercent =
                ord.status === 'cancelled'
                  ? 0
                  : ORDER_TRACKING_STAGES[stageIdx]?.progressPercent || 25;

              return (
                <div
                  key={ord.id}
                  className="rounded-xl border border-slate-200 bg-slate-50/40 p-3.5 transition-all hover:border-[#F85606] hover:bg-white hover:shadow-xs"
                >
                  <div className="flex flex-col justify-between gap-2.5 sm:flex-row sm:items-center">
                    <div className="space-y-0.5">
                      <div className="flex flex-wrap items-center gap-2 font-mono text-[11px] text-slate-500 tabular-nums">
                        <span className="font-bold text-slate-900">#{ord.orderNumber}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={`font-semibold ${
                            ord.status === 'cancelled'
                              ? 'text-red-600'
                              : ord.status === 'delivered'
                              ? 'text-emerald-700'
                              : 'text-[#F85606]'
                          }`}
                        >
                          {stageLabel} ({stagePercent}%)
                        </span>
                        <span aria-hidden="true">·</span>
                        <span>
                          {ord.paymentMethod === 'cod' ? 'To Pay (COD)' : 'Paid (Card)'}
                        </span>
                      </div>
                      <p className="text-xs font-semibold text-slate-900 sm:text-sm">
                        {ord.summaryTitle}
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      <span className="font-mono text-sm font-bold text-[#F85606] tabular-nums">
                        {formatLKR(ord.totalAmount)}
                      </span>

                      <button
                        type="button"
                        onClick={() => onOpenTrackingModal(ord)}
                        className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-3 py-1.5 text-[11px] font-bold text-white shadow-2xs transition-colors hover:bg-[#d94800]"
                      >
                        <Truck className="h-3 w-3" />
                        <span>Track Order</span>
                      </button>

                      {(ord.status === 'processing' || ord.status === 'preparing') && (
                        <button
                          type="button"
                          onClick={() => onCancelOrder(ord)}
                          className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-red-700 hover:bg-red-50"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Optional My Reviews & Q&A Drawer */}
      {showReviewsPanel && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-display text-base font-bold text-slate-950">
              My Published 5-Star Reviews ({userReviews.length}) & Questions ({userQuestions.length})
            </h3>
            <button
              type="button"
              onClick={() => setShowReviewsPanel(false)}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800"
            >
              Hide
            </button>
          </div>
          {userReviews.length === 0 && userQuestions.length === 0 ? (
            <p className="mt-3 text-xs text-slate-500">
              You have not posted any product reviews or questions yet. Open any product card and click "Reviews & Q&A" to add a 5-star rating, photo, video, voice review, or product question.
            </p>
          ) : (
            <div className="mt-3 space-y-2.5">
              {userReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-amber-600">
                      {'★'.repeat(rev.rating)} ({rev.rating}/5)
                    </span>
                    <span className="font-mono text-[11px] text-slate-500">
                      Product ID: {rev.productId}
                    </span>
                  </div>
                  <p className="mt-1 text-slate-800">{rev.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Optional Buyer Protection Info Drawer */}
      {showBuyerProtectionDrawer && (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-5 text-xs text-emerald-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span>BuyKit with Pramu · Official Mall Buyer Protection Guarantee</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBuyerProtectionDrawer(false)}
              className="font-semibold text-emerald-700 underline"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-1.5 text-emerald-800">
            Every order is backed by 100% Genuine Brand Verification, 7-Day Free Return & Replacement, Cash on Delivery inspection across Sri Lanka, and 1-Year Official Local Warranty.
          </p>
        </div>
      )}

      {/* =========================================================
          4. MY WISHLIST SECTION (With Green In Stock / Red Out of Stock Badges)
         ========================================================= */}
      <div
        id="account-wishlist-section"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 fill-rose-500 text-rose-500" />
            <h2 className="font-display text-lg font-bold text-slate-950">
              My Wishlist ({wishlistItems.length})
            </h2>
          </div>
          {wishlistItems.length > 0 && (
            <button
              type="button"
              onClick={() => onNavigateTab('shop')}
              className="text-xs font-semibold text-[#F85606] hover:underline"
            >
              Explore More Deals →
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Saved items with real-time LKR deal pricing and live In Stock (Green) / Out of Stock (Red) status
        </p>

        {wishlistItems.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 py-10 text-center text-slate-500">
            <Heart className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            <p className="text-xs font-medium text-slate-700">
              Your Wishlist is currently empty.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Tap the heart icon on any product card to save items here for quick checkout later.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('home')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-semibold text-white hover:bg-[#d94800]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Browse Products</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
            {wishlistItems.map((wishItem) => {
              const matchedProduct = catalog.find(
                (p) =>
                  p.id === wishItem.productId ||
                  p.id.replace(/[^a-zA-Z0-9_-]/g, '_') === wishItem.id
              );
              const displayPrice = matchedProduct
                ? getEffectivePrice(matchedProduct)
                : wishItem.price;
              const displayOriginal = matchedProduct
                ? matchedProduct.originalPrice
                : wishItem.originalPrice;
              const isInStock = matchedProduct ? matchedProduct.stockRemaining > 0 : true;

              return (
                <div
                  key={wishItem.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-all hover:border-[#F85606] hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      onClick={() => {
                        if (matchedProduct) onOpenProductDetails(matchedProduct);
                      }}
                      className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white"
                    >
                      <img
                        src={wishItem.imageUrl}
                        alt={wishItem.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        {renderStockBadge(matchedProduct)}
                        <button
                          type="button"
                          onClick={() =>
                            onRemoveWishlistItem(wishItem.id, wishItem.title)
                          }
                          aria-label="Remove from Wishlist"
                          className="rounded-md p-1 text-rose-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                        >
                          <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
                        </button>
                      </div>

                      <h3
                        onClick={() => {
                          if (matchedProduct) onOpenProductDetails(matchedProduct);
                        }}
                        className="mt-1 line-clamp-2 cursor-pointer font-display text-sm font-semibold text-slate-900 hover:text-[#F85606]"
                      >
                        {wishItem.title}
                      </h3>

                      <div className="mt-1.5 flex items-baseline gap-2 font-mono tabular-nums">
                        <span className="text-sm font-extrabold text-[#F85606]">
                          {formatLKR(displayPrice)}
                        </span>
                        {displayOriginal > displayPrice && (
                          <span className="text-[11px] text-slate-400 line-through">
                            {formatLKR(displayOriginal)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2.5">
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => {
                        if (matchedProduct && isInStock) {
                          onAddToCart(matchedProduct, 1);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-3 py-2 text-xs font-extrabold text-slate-950 shadow-2xs transition-colors hover:bg-[#e5a600] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{isInStock ? 'Add Cart' : 'Out of Stock'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => {
                        if (matchedProduct && isInStock) {
                          onBuyNow(matchedProduct, 1);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F85606] px-3 py-2 text-xs font-extrabold text-white shadow-2xs transition-colors hover:bg-[#d94800] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Bolt className="h-3.5 w-3.5" />
                      <span>{isInStock ? 'Buy Now' : 'Unavailable'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          5. RECENTLY VIEWED ("FOOTPRINTS") SECTION (With Green/Red Stock Badges)
         ========================================================= */}
      <div
        id="account-footprint-section"
        className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-[#F85606]" />
            <h2 className="font-display text-lg font-bold text-slate-950">
              Recently Viewed Footprints ({recentlyViewedProducts.length})
            </h2>
          </div>
          {recentlyViewedProducts.length > 0 && (
            <button
              type="button"
              onClick={onClearRecentlyViewed}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>
        <p className="mt-0.5 text-xs text-slate-500">
          Products you recently clicked on while browsing BuyKit with Pramu
        </p>

        {recentlyViewedProducts.length === 0 ? (
          <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50 py-10 text-center text-slate-500">
            <Clock className="mx-auto mb-2 h-7 w-7 text-slate-400" />
            <p className="text-xs font-medium text-slate-700">
              You have not viewed any products yet.
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Click on any product card to inspect its details and it will appear here automatically.
            </p>
          </div>
        ) : (
          <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3">
            {recentlyViewedProducts.map((prod) => {
              const effectivePrice = getEffectivePrice(prod);
              const isSaved = isProductWishlisted(prod.id);
              const isInStock = prod.stockRemaining > 0;

              return (
                <div
                  key={prod.id}
                  className="flex flex-col justify-between rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 transition-all hover:border-[#F85606] hover:bg-white hover:shadow-xs"
                >
                  <div className="flex items-start gap-3">
                    <div
                      onClick={() => onOpenProductDetails(prod)}
                      className="relative h-20 w-20 shrink-0 cursor-pointer overflow-hidden rounded-lg border border-slate-200 bg-white"
                    >
                      <img
                        src={prod.imageUrl}
                        alt={prod.title}
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1.5">
                        {renderStockBadge(prod)}
                        <button
                          type="button"
                          onClick={(e) => onToggleWishlist(prod, e)}
                          className="rounded-md p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600"
                        >
                          <Heart
                            className={`h-4 w-4 ${
                              isSaved ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                        </button>
                      </div>

                      <h3
                        onClick={() => onOpenProductDetails(prod)}
                        className="mt-1 line-clamp-2 cursor-pointer font-display text-sm font-semibold text-slate-900 hover:text-[#F85606]"
                      >
                        {prod.title}
                      </h3>

                      <div className="mt-1 flex items-baseline gap-2 font-mono tabular-nums">
                        <span className="text-sm font-extrabold text-[#F85606]">
                          {formatLKR(effectivePrice)}
                        </span>
                        <span className="text-[11px] text-slate-400 line-through">
                          {formatLKR(prod.originalPrice)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-200/80 pt-2.5">
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => onAddToCart(prod, 1)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-3 py-2 text-xs font-extrabold text-slate-950 shadow-2xs transition-colors hover:bg-[#e5a600] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <ShoppingBag className="h-3.5 w-3.5" />
                      <span>{isInStock ? 'Add Cart' : 'Out of Stock'}</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => onBuyNow(prod, 1)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F85606] px-3 py-2 text-xs font-extrabold text-white shadow-2xs transition-colors hover:bg-[#d94800] disabled:cursor-not-allowed disabled:opacity-45"
                    >
                      <Bolt className="h-3.5 w-3.5" />
                      <span>{isInStock ? 'Buy Now' : 'Unavailable'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* =========================================================
          6. DARAZ / ALIEXPRESS "JUST FOR YOU" RECOMMENDATIONS IN ACCOUNT TAB
         ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-lg font-bold text-slate-950">
              Picked Just For You · BuyKit SuperDeals
            </h2>
            <p className="text-xs text-slate-500">
              Product-by-product live stock status (Green = In Stock · Red = Out of Stock)
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigateTab('shop')}
            className="text-xs font-bold text-[#F85606] hover:underline"
          >
            View All {catalog.length} Products →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
          {catalog.slice(0, 6).map((prod) => {
            const effectivePrice = getEffectivePrice(prod);
            const discountPercent = Math.round(
              ((prod.originalPrice - effectivePrice) / prod.originalPrice) * 100
            );
            const discountSavings = Math.max(0, prod.originalPrice - effectivePrice);
            const isInStock = prod.stockRemaining > 0;

            return (
              <div
                key={prod.id}
                onClick={() => onOpenProductDetails(prod)}
                className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-[#F85606] hover:shadow-md"
              >
                {/* 1. Main Image + Top-Left Stock Status + Discount % Badge */}
                <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                  <img
                    src={prod.imageUrl}
                    alt={prod.title}
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-2 left-2">
                    {renderStockBadge(prod)}
                  </div>
                  <div className="absolute bottom-2 left-2 rounded-md bg-[#F85606] px-2 py-0.5 font-mono text-[10px] font-extrabold text-white shadow-2xs">
                    -{discountPercent}% OFF
                  </div>
                </div>

                {/* 2. Product Name Directly Below Image, Followed Clearly by Price, Discounts & Free Delivery */}
                <div className="flex flex-1 flex-col justify-between space-y-1.5 p-3">
                  <h3 className="line-clamp-2 min-h-[2.25rem] font-display text-xs font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#F85606] sm:text-sm">
                    {prod.title}
                  </h3>

                  <div className="flex flex-wrap items-baseline gap-1.5 font-mono tabular-nums">
                    <span className="text-base font-extrabold text-[#F85606]">
                      {formatLKR(effectivePrice)}
                    </span>
                    <span className="text-[10px] text-slate-400 line-through">
                      {formatLKR(prod.originalPrice)}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-1">
                    <span className="rounded bg-[#FFF3EB] px-1.5 py-0.5 font-mono text-[9px] font-extrabold text-[#F85606]">
                      Save {formatLKR(discountSavings)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between gap-1 border-t border-slate-100 pt-1.5">
                    {prod.freeShipping ? (
                      <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                        <Truck className="h-3 w-3 shrink-0 text-emerald-600" />
                        <span>Free Delivery</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                        <span>Paid Delivery</span>
                      </span>
                    )}
                    <span
                      className={`text-[9px] font-extrabold uppercase ${
                        isInStock ? 'text-emerald-700' : 'text-red-600'
                      }`}
                    >
                      {isInStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
