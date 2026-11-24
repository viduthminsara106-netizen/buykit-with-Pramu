import React, { useState } from 'react';
import {
  User as UserIcon,
  LogOut,
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
  MessageSquare,
  RotateCcw,
  ChevronRight,
  Wallet,
  Edit3,
  Check,
  CreditCard,
  Ticket,
  Flame,
  Scale,
  Settings,
  FileDown,
  Search,
  Copy,
  Store,
  ChevronDown,
  ChevronUp,
  Share2,
} from 'lucide-react';
import { User } from '../firebase';
import { MarketplaceProduct, DealTier, formatLKR } from '../data/catalog';
import {
  downloadOrderInvoicePdf,
  loadOrderInvoiceMetadata,
} from '../utils/invoicePdfGenerator';
import { resolveAssetUrl } from '../utils/assetResolver';
import {
  TrackableOrder,
  OrderInvoiceLineItem,
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
import { HorizontalAutoScrollRail } from './HorizontalAutoScrollRail';
import {
  DEFAULT_CARRIER_NAME,
  lookupRealTrackingRecord,
  resolveOrderTrackingNumber,
  validateTrackingNumber,
} from '../utils/trackingSystem';

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
  onShareProduct?: (product: MarketplaceProduct, e?: React.MouseEvent) => void;
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
  isAdmin?: boolean;
  unreadAdminNotificationCount?: number;
  onOpenAdminStudio?: () => void;
  logoBadge: React.ReactNode;
}

type OrderFilterTab = 'all' | 'to_pay' | 'paid' | 'shipped' | 'delivered' | 'cancelled';

interface ResolvedOrderCardItem {
  title: string;
  quantity: number;
  unitPrice: number;
  imageUrl?: string;
  category?: string;
  catalogProduct?: MarketplaceProduct;
}

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
  onShareProduct,
  onAddToCart,
  onBuyNow,
  onToggleWishlist,
  onRemoveWishlistItem,
  onClearRecentlyViewed,
  isProductWishlisted,
  getEffectivePrice,
  onNavigateTab,
  onOpenCompareModal,
  selectedCountryCode,
  selectedLanguageCode,
  savedCardsCount,
  onOpenSettingsModal,
  isAdmin = false,
  unreadAdminNotificationCount = 0,
  onOpenAdminStudio,
  logoBadge,
}) => {
  const [orderFilter, setOrderFilter] = useState<OrderFilterTab>('all');
  const [isAddressDrawerOpen, setIsAddressDrawerOpen] = useState(false);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [showReviewsPanel, setShowReviewsPanel] = useState(false);
  const [showBuyerProtectionDrawer, setShowBuyerProtectionDrawer] = useState(false);
  const [showCouponsDrawer, setShowCouponsDrawer] = useState(false);
  const [trackingLookupInput, setTrackingLookupInput] = useState('');
  const [trackingLookupMessage, setTrackingLookupMessage] = useState<{
    type: 'error' | 'info';
    text: string;
  } | null>(null);
  const [copiedOrderTrackingId, setCopiedOrderTrackingId] = useState<string | null>(null);
  const [expandedOrderIds, setExpandedOrderIds] = useState<Record<string, boolean>>({});

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

  const handleCopyTrackingNumber = (orderId: string, trackingNo: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(trackingNo).catch(() => {});
    }
    setCopiedOrderTrackingId(orderId);
    window.setTimeout(() => {
      setCopiedOrderTrackingId((prev) => (prev === orderId ? null : prev));
    }, 1800);
  };

  // Real Tracking Number Lookup (Matches user orders & real persisted tracking registry)
  const handleTrackingNumberLookup = (e: React.FormEvent) => {
    e.preventDefault();
    const raw = trackingLookupInput.trim();
    if (!raw) {
      setTrackingLookupMessage({
        type: 'info',
        text: 'Enter a Tracking Number (e.g. BKEX-LK-261123-482917-5) or Order # to track.',
      });
      return;
    }

    const normalized = raw.toUpperCase().replace(/^#/, '');

    // 1. Match directly against user's loaded Firestore orders by trackingNumber or orderNumber
    const matchedOrder = orders.find((ord) => {
      const ordTracking = resolveOrderTrackingNumber(ord).toUpperCase();
      return (
        ordTracking === normalized ||
        ord.orderNumber.toUpperCase() === normalized
      );
    });

    if (matchedOrder) {
      setTrackingLookupMessage(null);
      onOpenTrackingModal({
        ...matchedOrder,
        trackingNumber: resolveOrderTrackingNumber(matchedOrder),
      });
      return;
    }

    // 2. Match against persisted real tracking registry (including guest/recent orders)
    const registryRecord = lookupRealTrackingRecord(normalized);
    if (registryRecord) {
      setTrackingLookupMessage(null);
      onOpenTrackingModal({
        id: registryRecord.orderId,
        userId: currentUser?.uid || 'guest_shopper',
        orderNumber: registryRecord.orderNumber,
        trackingNumber: registryRecord.trackingNumber,
        summaryTitle: registryRecord.summaryTitle,
        itemCount: registryRecord.itemCount,
        totalAmount: registryRecord.totalAmount,
        paymentMethod: registryRecord.paymentMethod,
        pickupHubName: registryRecord.destinationHub,
        status: registryRecord.status,
        createdAtMs: registryRecord.createdAtMs,
      });
      return;
    }

    // 3. Validate checksum format and give accurate feedback
    const check = validateTrackingNumber(normalized);
    if (check.isValid) {
      setTrackingLookupMessage({
        type: 'info',
        text: `Waybill ${check.normalizedCode} has a valid ${check.carrierName} checksum (${check.dispatchDateFormatted || 'verified'}), but no order matching this account was found.`,
      });
    } else {
      setTrackingLookupMessage({
        type: 'error',
        text: check.reason || `No shipment found for "${raw}". Check your Tracking Number or Order #.`,
      });
    }
  };

  // Resolve itemized thumbnails & quantities for Daraz / AliExpress Order Cards
  const resolveOrderCardItems = (ord: TrackableOrder): ResolvedOrderCardItem[] => {
    const storedMeta = loadOrderInvoiceMetadata(ord.id, ord.orderNumber);
    const sourceItems: OrderInvoiceLineItem[] =
      ord.invoiceItems && ord.invoiceItems.length > 0
        ? ord.invoiceItems
        : storedMeta?.items && storedMeta.items.length > 0
        ? storedMeta.items
        : [];

    if (sourceItems.length > 0) {
      return sourceItems.map((item) => {
        const matchedCatalog = catalog.find(
          (p) =>
            (item.productId && p.id === item.productId) ||
            p.title.toLowerCase() === item.title.toLowerCase() ||
            p.title.toLowerCase().includes(item.title.toLowerCase().slice(0, 20))
        );
        return {
          title: item.title,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          imageUrl: item.imageUrl || matchedCatalog?.imageUrl,
          category: item.category || matchedCatalog?.category,
          catalogProduct: matchedCatalog,
        };
      });
    }

    // Fallback: parse "2x Product A, 1x Product B" and match against live catalog for thumbnails
    const segments = ord.summaryTitle
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (segments.length === 0) {
      return [
        {
          title: ord.summaryTitle || 'BuyKit Marketplace Order',
          quantity: Math.max(1, ord.itemCount || 1),
          unitPrice: Math.round(ord.totalAmount / Math.max(1, ord.itemCount || 1)),
        },
      ];
    }

    const totalUnits = segments.reduce((acc, seg) => {
      const m = seg.match(/^(\d+)\s*x\s+/i);
      return acc + (m ? Math.max(1, parseInt(m[1], 10)) : 1);
    }, 0);

    return segments.map((seg) => {
      const match = seg.match(/^(\d+)\s*x\s+(.+)$/i);
      const qty = match ? Math.max(1, parseInt(match[1], 10) || 1) : 1;
      const cleanTitle = match ? match[2].trim() : seg;
      const matchedCatalog = catalog.find(
        (p) =>
          p.title.toLowerCase() === cleanTitle.toLowerCase() ||
          p.title.toLowerCase().includes(cleanTitle.toLowerCase().slice(0, 18)) ||
          cleanTitle.toLowerCase().includes(p.title.toLowerCase().slice(0, 18))
      );
      return {
        title: cleanTitle,
        quantity: qty,
        unitPrice: matchedCatalog
          ? getEffectivePrice(matchedCatalog)
          : Math.round(ord.totalAmount / Math.max(1, totalUnits)),
        imageUrl: matchedCatalog?.imageUrl,
        category: matchedCatalog?.category,
        catalogProduct: matchedCatalog,
      };
    });
  };

  const formatOrderDate = (timestampMs?: number) => {
    if (!timestampMs) return 'Recent Order';
    return new Date(timestampMs).toLocaleString('en-LK', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderDarazStatusText = (status: TrackableOrder['status']) => {
    switch (status) {
      case 'processing':
      case 'preparing':
        return { label: 'To Ship · Preparing', colorClass: 'text-[#F85606]' };
      case 'dispatched':
        return { label: 'Dispatched · Express', colorClass: 'text-blue-600' };
      case 'in_transit':
      case 'shipped':
        return { label: 'In Transit · On the Way', colorClass: 'text-blue-700' };
      case 'delivered':
        return { label: 'Delivered', colorClass: 'text-emerald-700' };
      case 'cancelled':
        return { label: 'Cancelled', colorClass: 'text-red-600' };
      default:
        return { label: getStageLabelFromStatus(status), colorClass: 'text-slate-700' };
    }
  };

  return (
    <section className="mx-auto max-w-6xl space-y-4">
      {/* =========================================================
          1. DARAZ / ALIEXPRESS ACCOUNT HEADER BANNER
         ========================================================= */}
      <div className="overflow-hidden rounded-2xl border border-orange-300/60 bg-gradient-to-r from-[#F85606] via-[#ff6a00] to-[#e64600] text-white shadow-sm">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col justify-between gap-3.5 sm:flex-row sm:items-center">
            {/* Left: User Avatar & Identity */}
            <div className="flex items-center gap-3.5">
              {currentUser?.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'Shopper'}
                  referrerPolicy="no-referrer"
                  className="h-14 w-14 shrink-0 rounded-full border-2 border-white object-cover shadow-sm"
                />
              ) : (
                <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full border-2 border-white/80 bg-black/25 p-1 shadow-sm">
                  {logoBadge}
                </div>
              )}

              <div className="min-w-0">
                <h1 className="truncate font-display text-xl font-extrabold tracking-tight text-white sm:text-2xl">
                  {currentUser
                    ? currentUser.displayName || 'BuyKit Shopper'
                    : 'Sign in / Register'}
                </h1>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-orange-100">
                  <span>
                    {currentUser ? 'BuyKit Choice Member' : 'Guest Visitor'}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="truncate">
                    {currentUser?.email || 'Sync orders, wishlist & LKR vouchers'}
                  </span>
                  {newUserDealClaimed && (
                    <>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-amber-200">
                        Starter Pass Active
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Clean Daraz / AliExpress Top Utility Controls */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onOpenSettingsModal('country_language')}
                title="Country & Language"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/30 bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black/35 whitespace-nowrap shrink-0"
              >
                <img
                  src={activeCountry.flagUrl}
                  alt={activeCountry.name}
                  referrerPolicy="no-referrer"
                  className="h-3.5 w-5 rounded-xs object-cover"
                />
                <span>{activeCountry.code}</span>
                <span aria-hidden="true" className="opacity-60">
                  /
                </span>
                <span>{activeLanguage.code.toUpperCase()}</span>
              </button>

              <button
                type="button"
                onClick={() => onOpenSettingsModal('profile')}
                aria-label="Account Settings"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-[#F85606] shadow-2xs transition-colors hover:bg-orange-50 whitespace-nowrap shrink-0"
              >
                <Settings className="h-3.5 w-3.5" />
                <span>Settings</span>
              </button>

              {isAdmin && onOpenAdminStudio && (
                <button
                  type="button"
                  onClick={onOpenAdminStudio}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300/70 bg-slate-950 px-3 py-1.5 text-xs font-bold text-amber-300 transition-colors hover:bg-slate-900 whitespace-nowrap shrink-0"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Admin</span>
                  {unreadAdminNotificationCount > 0 && (
                    <span className="ml-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-600 px-1 font-mono text-[10px] font-bold text-white">
                      {unreadAdminNotificationCount > 99 ? '99+' : unreadAdminNotificationCount}
                    </span>
                  )}
                </button>
              )}

              {currentUser ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="inline-flex items-center gap-1 rounded-lg border border-white/30 bg-black/20 px-2.5 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-black/35 whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>Sign Out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onOpenAuthModal}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-950 px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-slate-900 whitespace-nowrap shrink-0"
                >
                  <UserIcon className="h-3.5 w-3.5 text-amber-400" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>

          {/* Daraz / AliExpress 4-Stat Quick Bar */}
          <div className="mt-4 grid grid-cols-4 divide-x divide-white/15 rounded-xl bg-black/15 py-2">
            <button
              type="button"
              onClick={() => scrollToSection('account-wishlist-section')}
              className="flex flex-col items-center justify-center px-2 py-1 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-base font-extrabold text-white tabular-nums sm:text-lg">
                {wishlistItems.length}
              </span>
              <span className="text-[11px] font-medium text-orange-100">Wishlist</span>
            </button>

            <button
              type="button"
              onClick={() => scrollToSection('account-footprint-section')}
              className="flex flex-col items-center justify-center px-2 py-1 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-base font-extrabold text-white tabular-nums sm:text-lg">
                {recentlyViewedProducts.length}
              </span>
              <span className="text-[11px] font-medium text-orange-100">Footprints</span>
            </button>

            <button
              type="button"
              onClick={() => setShowCouponsDrawer((prev) => !prev)}
              className="flex flex-col items-center justify-center px-2 py-1 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-base font-extrabold text-amber-200 tabular-nums sm:text-lg">
                {newUserDealClaimed ? 'Active' : '3'}
              </span>
              <span className="text-[11px] font-medium text-orange-100">Vouchers</span>
            </button>

            <button
              type="button"
              onClick={() => setShowReviewsPanel((prev) => !prev)}
              className="flex flex-col items-center justify-center px-2 py-1 transition-colors hover:bg-white/10"
            >
              <span className="font-mono text-base font-extrabold text-white tabular-nums sm:text-lg">
                {userReviews.length + userQuestions.length}
              </span>
              <span className="text-[11px] font-medium text-orange-100">Reviews</span>
            </button>
          </div>
        </div>
      </div>

      {/* Optional Inline Address Drawer */}
      {isAddressDrawerOpen && currentUser && (
        <form
          onSubmit={handleSaveAddress}
          className="rounded-2xl border border-orange-200 bg-[#FFF9F5] p-5"
        >
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-[#F85606]" />
              <h3 className="font-display text-sm font-bold text-slate-950">
                Default Sri Lanka Delivery Address
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
              <label className="mb-1 block text-xs font-medium text-slate-700">Phone</label>
              <input
                type="text"
                required
                value={phone}
                onChange={(e) => onUpdatePhone(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">
                Street & City
              </label>
              <input
                type="text"
                required
                value={shippingAddress}
                onChange={(e) => onUpdateShippingAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-slate-700">Postal Code</label>
              <input
                type="text"
                required
                value={postalCode}
                onChange={(e) => onUpdatePostalCode(e.target.value)}
                className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900"
              />
            </div>
          </div>
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={isSavingAddress}
              className="inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-bold text-white hover:bg-[#d94800] disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              <span>{isSavingAddress ? 'Saving...' : 'Save Address'}</span>
            </button>
          </div>
        </form>
      )}

      {/* =========================================================
          2. 100% DARAZ / ALIEXPRESS "MY ORDERS & SERVICES" HUB
             (All 16 Original Options Preserved + Tracking Search + Horizontal Auto-Scrolling Orders)
         ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        {/* Top Row: Title + View All */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-[#F85606]" />
            <h2 className="font-display text-base font-bold text-slate-950 sm:text-lg">
              My Orders & Services
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              · {orders.length} {orders.length === 1 ? 'order' : 'orders'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setOrderFilter('all')}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-slate-600 transition-colors hover:text-[#F85606] whitespace-nowrap shrink-0"
          >
            <span>View All Orders ({orders.length})</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* ALL 16 ORIGINAL DARAZ / ALIEXPRESS MY ORDERS & TOOLS OPTIONS PRESERVED */}
        <div className="mt-3.5 grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
          {/* 1. To Pay */}
          <button
            type="button"
            onClick={() => setOrderFilter(orderFilter === 'to_pay' ? 'all' : 'to_pay')}
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
            onClick={() => setOrderFilter(orderFilter === 'paid' ? 'all' : 'paid')}
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

          {/* 3. Track Order */}
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
            onClick={() => setOrderFilter(orderFilter === 'shipped' ? 'all' : 'shipped')}
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
            onClick={() => setOrderFilter(orderFilter === 'delivered' ? 'all' : 'delivered')}
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
            onClick={() => setOrderFilter(orderFilter === 'cancelled' ? 'all' : 'cancelled')}
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

          {/* 9. Wishlist */}
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

          {/* 10. Footprints */}
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

          {/* 11. My Reviews */}
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

          {/* 12. Addresses */}
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

          {/* 13. Country & Language */}
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

          {/* 14. Add Card */}
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

          {/* 15. Compare */}
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

          {/* 16. Settings */}
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

        {/* Inline Coupons & Vouchers Drawer when "Coupons" icon is clicked */}
        {showCouponsDrawer && (
          <div className="mt-3.5 rounded-xl border border-orange-200 bg-[#FFF8F4] p-3.5">
            <div className="mb-2.5 flex items-center justify-between">
              <span className="font-display text-xs font-bold text-slate-900">
                Active Coupons, Vouchers & BuyKit Coins
              </span>
              <button
                type="button"
                onClick={() => setShowCouponsDrawer(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close
              </button>
            </div>
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
              <div className="flex items-center justify-between rounded-xl border border-orange-200 bg-white p-3">
                <div>
                  <p className="font-mono text-xs font-extrabold text-[#F85606]">
                    Rs. 5,000 OFF
                  </p>
                  <p className="text-[11px] text-slate-600">New User Starter Pass</p>
                </div>
                <button
                  type="button"
                  onClick={onClaimNewUserVoucher}
                  className="rounded-lg bg-[#F85606] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#d94800]"
                >
                  {newUserDealClaimed ? 'Claimed' : 'Claim'}
                </button>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="font-mono text-xs font-extrabold text-emerald-700">
                    Free Shipping
                  </p>
                  <p className="text-[11px] text-slate-600">3x Islandwide Hub Coupons</p>
                </div>
                <span className="text-[11px] font-bold text-emerald-700">Active</span>
              </div>

              <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3">
                <div>
                  <p className="font-mono text-xs font-extrabold text-amber-600">
                    1,250 Coins
                  </p>
                  <p className="text-[11px] text-slate-600">Worth Rs. 1,250 Cashback</p>
                </div>
                <span className="text-[11px] font-bold text-amber-700">Ready</span>
              </div>
            </div>
          </div>
        )}

        {/* Real-Time Tracking Number Lookup Bar */}
        <form
          onSubmit={handleTrackingNumberLookup}
          className="mt-3.5 flex flex-col gap-2 border-t border-slate-100 pt-3.5 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={trackingLookupInput}
              onChange={(e) => {
                setTrackingLookupInput(e.target.value);
                if (trackingLookupMessage) setTrackingLookupMessage(null);
              }}
              placeholder="Track shipment by Tracking Number (e.g. BKEX-LK-261123-...) or Order #"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 font-mono text-xs text-slate-900 placeholder:font-sans placeholder:text-slate-400 focus:border-[#F85606] focus:bg-white focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0"
          >
            <Truck className="h-3.5 w-3.5" />
            <span>Track Shipment</span>
          </button>
        </form>

        {trackingLookupMessage && (
          <div
            className={`mt-2 rounded-lg px-3 py-2 text-xs ${
              trackingLookupMessage.type === 'error'
                ? 'bg-red-50 text-red-700'
                : 'bg-amber-50 text-amber-800'
            }`}
          >
            {trackingLookupMessage.text}
          </div>
        )}

        {/* Active Filter Indicator */}
        {orderFilter !== 'all' && (
          <div className="mt-3 flex items-center justify-between text-xs text-slate-600">
            <span>
              Showing <strong className="text-slate-900">{filteredOrders.length}</strong> orders in{' '}
              <strong className="capitalize text-[#F85606]">
                {orderFilter.replace('_', ' ')}
              </strong>
            </span>
            <button
              type="button"
              onClick={() => setOrderFilter('all')}
              className="font-semibold text-[#F85606] hover:underline"
            >
              Show All Orders
            </button>
          </div>
        )}

        {/* =========================================================
            HORIZONTAL AUTO-SCROLLING DARAZ / ALIEXPRESS PLACED ORDERS RAIL
           ========================================================= */}
        <div className="mt-4">
          {filteredOrders.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border border-slate-100 bg-slate-50/70 px-4 py-8 text-center">
              <Package className="mb-2 h-8 w-8 text-slate-300" />
              <p className="text-sm font-semibold text-slate-800">
                {orders.length === 0
                  ? 'You have not placed any orders yet'
                  : `No orders in "${orderFilter.replace('_', ' ')}"`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {orders.length === 0
                  ? 'Place an order to receive a real BuyKit Express tracking number and downloadable PDF invoice.'
                  : 'Switch to All Orders to view your complete purchase history.'}
              </p>
              <div className="mt-3.5 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateTab('shop')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-bold text-white hover:bg-[#d94800]"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Start Shopping</span>
                </button>
                <button
                  type="button"
                  onClick={onOpenDemoTrackingModal}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-[#F85606] hover:text-[#F85606]"
                >
                  <Truck className="h-3.5 w-3.5" />
                  <span>Preview Tracking</span>
                </button>
              </div>
            </div>
          ) : (
            <HorizontalAutoScrollRail
              ariaLabel="Placed Orders"
              itemCount={filteredOrders.length}
              speedPxPerSec={18}
            >
              {filteredOrders.map((ord) => {
                const trackingCode = resolveOrderTrackingNumber(ord);
                const stageIdx = mapOrderStatusToStageIndex(ord.status);
                const stagePercent =
                  ord.status === 'cancelled'
                    ? 0
                    : ORDER_TRACKING_STAGES[stageIdx]?.progressPercent || 25;
                const statusDisplay = renderDarazStatusText(ord.status);
                const storedMeta = loadOrderInvoiceMetadata(ord.id, ord.orderNumber);
                const resolvedItems = resolveOrderCardItems(ord);
                const isExpanded = Boolean(expandedOrderIds[ord.id]);
                const visibleItems = isExpanded ? resolvedItems : resolvedItems.slice(0, 2);
                const hiddenCount = Math.max(0, resolvedItems.length - 2);
                const appliedCoupon =
                  ord.couponCode && ord.couponCode !== 'NO_COUPON'
                    ? ord.couponCode
                    : storedMeta?.couponCode && storedMeta.couponCode !== 'NO_COUPON'
                    ? storedMeta.couponCode
                    : null;

                return (
                  <article
                    key={ord.id}
                    className="flex w-[320px] shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-colors hover:border-[#F85606] sm:w-[390px] lg:w-[420px]"
                  >
                    <div>
                      {/* Row 1: Daraz / AliExpress Store & Order Status Header */}
                      <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-3.5 py-2.5">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-xs">
                            <Store className="h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                            <span className="truncate font-display font-bold text-slate-900">
                              BuyKit Mall
                            </span>
                            <span aria-hidden="true" className="text-slate-300">
                              ·
                            </span>
                            <span className="truncate font-mono text-[11px] font-semibold text-slate-700 tabular-nums">
                              #{ord.orderNumber}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[10px] text-slate-500">
                            {formatOrderDate(ord.createdAtMs)}
                          </p>
                        </div>

                        <div className="shrink-0 text-right">
                          <span className={`block text-[11px] font-bold ${statusDisplay.colorClass}`}>
                            {statusDisplay.label}
                          </span>
                          {ord.status !== 'cancelled' && (
                            <span className="font-mono text-[10px] font-medium text-slate-400 tabular-nums">
                              {stagePercent}% complete
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Row 2: Real Waybill Tracking Number Bar */}
                      <div className="flex flex-wrap items-center justify-between gap-1.5 border-b border-slate-100 bg-[#FFFDFB] px-3.5 py-2 text-[11px]">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Truck className="h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                          <span className="truncate font-mono text-[11px] font-bold tracking-tight text-slate-900 tabular-nums">
                            {trackingCode}
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleCopyTrackingNumber(ord.id, trackingCode)}
                          className="inline-flex shrink-0 items-center gap-1 rounded border border-slate-200 bg-white px-1.5 py-0.5 text-[10px] font-semibold text-slate-600 transition-colors hover:border-[#F85606] hover:text-[#F85606]"
                        >
                          {copiedOrderTrackingId === ord.id ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              <span>Copy</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Row 3: Daraz / AliExpress Itemized Product List */}
                      <div className="divide-y divide-slate-100 px-3.5">
                        {visibleItems.map((item, idx) => (
                          <div
                            key={`${ord.id}-item-${idx}`}
                            className="flex items-center gap-3 py-2.5"
                          >
                            {/* Product Thumbnail */}
                            <div
                              onClick={() => {
                                if (item.catalogProduct) {
                                  onOpenProductDetails(item.catalogProduct);
                                }
                              }}
                              className={`relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-50 ${
                                item.catalogProduct ? 'cursor-pointer' : ''
                              }`}
                            >
                              {item.imageUrl ? (
                                <img
                                  src={resolveAssetUrl(item.imageUrl)}
                                  alt={item.title}
                                  loading="lazy"
                                  decoding="async"
                                  referrerPolicy="no-referrer"
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-slate-300">
                                  <Package className="h-5 w-5" />
                                </div>
                              )}
                            </div>

                            {/* Product Title & Meta */}
                            <div className="min-w-0 flex-1">
                              <h3
                                onClick={() => {
                                  if (item.catalogProduct) {
                                    onOpenProductDetails(item.catalogProduct);
                                  }
                                }}
                                className={`line-clamp-2 text-xs font-semibold leading-snug text-slate-900 ${
                                  item.catalogProduct
                                    ? 'cursor-pointer hover:text-[#F85606]'
                                    : ''
                                }`}
                              >
                                {item.title}
                              </h3>
                              <p className="mt-0.5 truncate text-[10px] text-slate-500">
                                {item.category || DEFAULT_CARRIER_NAME}
                              </p>
                            </div>

                            {/* Right: Unit Price & Qty */}
                            <div className="shrink-0 text-right font-mono tabular-nums">
                              <p className="text-xs font-bold text-slate-900">
                                {formatLKR(item.unitPrice)}
                              </p>
                              <p className="mt-0.5 text-[10px] text-slate-500">
                                × {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}

                        {hiddenCount > 0 && (
                          <div className="py-1.5 text-center">
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedOrderIds((prev) => ({
                                  ...prev,
                                  [ord.id]: !prev[ord.id],
                                }))
                              }
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-[#F85606]"
                            >
                              {isExpanded ? (
                                <>
                                  <span>Show fewer</span>
                                  <ChevronUp className="h-3 w-3" />
                                </>
                              ) : (
                                <>
                                  <span>
                                    +{hiddenCount} more {hiddenCount === 1 ? 'item' : 'items'}
                                  </span>
                                  <ChevronDown className="h-3 w-3" />
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Row 4: Daraz / AliExpress Order Total & Action Buttons Footer */}
                    <div className="space-y-2.5 border-t border-slate-100 bg-slate-50/50 px-3.5 py-3">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[11px] text-slate-600">
                        <div className="flex flex-wrap items-center gap-x-1.5">
                          <span className="font-mono tabular-nums">
                            {ord.itemCount} {ord.itemCount === 1 ? 'item' : 'items'}
                          </span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {ord.paymentMethod === 'cod' ? 'COD' : 'Card Paid'}
                          </span>
                          {appliedCoupon && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="font-mono font-semibold text-emerald-700">
                                {appliedCoupon}
                              </span>
                            </>
                          )}
                        </div>
                        <div className="flex items-baseline gap-1">
                          <span className="text-[11px] text-slate-500">Total:</span>
                          <span className="font-mono text-sm font-extrabold text-[#F85606] tabular-nums">
                            {formatLKR(ord.totalAmount)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() =>
                            downloadOrderInvoicePdf(
                              { ...ord, trackingNumber: trackingCode },
                              {
                                customerName:
                                  currentUser?.displayName ||
                                  currentUser?.email?.split('@')[0] ||
                                  'BuyKit Shopper',
                                customerEmail: currentUser?.email || undefined,
                                customerPhone: phone || undefined,
                                shippingAddress: shippingAddress
                                  ? `${shippingAddress}${postalCode ? ` (${postalCode})` : ''}`
                                  : selectedHubName,
                              }
                            )
                          }
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition-colors hover:border-[#F85606] hover:text-[#F85606] whitespace-nowrap shrink-0"
                        >
                          <FileDown className="h-3 w-3" />
                          <span>Invoice</span>
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            onOpenTrackingModal({ ...ord, trackingNumber: trackingCode })
                          }
                          className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-3 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0"
                        >
                          <Truck className="h-3 w-3" />
                          <span>Track Order</span>
                        </button>

                        {resolvedItems[0]?.catalogProduct &&
                          resolvedItems[0].catalogProduct.stockRemaining > 0 && (
                            <button
                              type="button"
                              onClick={() => {
                                const firstProd = resolvedItems[0]?.catalogProduct;
                                if (firstProd) onAddToCart(firstProd, 1);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-[#FFF5F0] px-2.5 py-1.5 text-[11px] font-semibold text-[#F85606] transition-colors hover:bg-[#F85606] hover:text-white whitespace-nowrap shrink-0"
                            >
                              <span>Buy Again</span>
                            </button>
                          )}

                        {(ord.status === 'processing' || ord.status === 'preparing') && (
                          <button
                            type="button"
                            onClick={() => onCancelOrder(ord)}
                            className="rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-red-600 transition-colors hover:bg-red-50 whitespace-nowrap shrink-0"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                );
              })}
            </HorizontalAutoScrollRail>
          )}
        </div>
      </div>

      {/* Optional My Reviews & Q&A Drawer */}
      {showReviewsPanel && (
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-display text-base font-bold text-slate-950">
              My Reviews ({userReviews.length}) & Questions ({userQuestions.length})
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
              You have not posted any product reviews or questions yet. Open any product to add a review.
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
                      Product: {rev.productId}
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
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-4 text-xs text-emerald-950">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold">
              <ShieldCheck className="h-4 w-4 text-emerald-600" />
              <span>BuyKit Buyer Protection Guarantee</span>
            </div>
            <button
              type="button"
              onClick={() => setShowBuyerProtectionDrawer(false)}
              className="font-semibold text-emerald-700 hover:underline"
            >
              Dismiss
            </button>
          </div>
          <p className="mt-1.5 text-emerald-800">
            Every order includes verified authenticity, 7-day free return & replacement, Cash on Delivery inspection across Sri Lanka, and 1-year official warranty.
          </p>
        </div>
      )}

      {/* =========================================================
          4. MY WISHLIST — HORIZONTAL SCROLL + SLOW AUTO-SCROLL
         ========================================================= */}
      <div
        id="account-wishlist-section"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Heart className="h-4 w-4 fill-rose-500 text-rose-500" />
            <h2 className="font-display text-base font-bold text-slate-950 sm:text-lg">
              My Wishlist
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              · {wishlistItems.length} {wishlistItems.length === 1 ? 'item' : 'items'}
            </span>
          </div>

          <button
            type="button"
            onClick={() => onNavigateTab('shop')}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#F85606] hover:underline whitespace-nowrap shrink-0"
          >
            <span>Explore More</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {wishlistItems.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 py-8 text-center text-slate-500">
            <Heart className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">
              Your Wishlist is empty
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Tap the heart icon on any product to save it here.
            </p>
            <button
              type="button"
              onClick={() => onNavigateTab('home')}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-bold text-white hover:bg-[#d94800]"
            >
              <ShoppingBag className="h-3.5 w-3.5" />
              <span>Browse Deals</span>
            </button>
          </div>
        ) : (
          <HorizontalAutoScrollRail
            ariaLabel="My Wishlist"
            itemCount={wishlistItems.length}
            speedPxPerSec={20}
          >
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
                  className="flex w-[196px] shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-[#F85606] hover:shadow-sm sm:w-[214px]"
                >
                  <div>
                    <div
                      onClick={() => {
                        if (matchedProduct) onOpenProductDetails(matchedProduct);
                      }}
                      className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-50"
                    >
                      <img
                        src={resolveAssetUrl(wishItem.imageUrl)}
                        alt={wishItem.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {matchedProduct && onShareProduct && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareProduct(matchedProduct, e);
                            }}
                            aria-label={`Share ${wishItem.title}`}
                            title="Share product link"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-xs transition-colors hover:bg-[#F85606] hover:text-white"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveWishlistItem(wishItem.id, wishItem.title);
                          }}
                          aria-label="Remove from Wishlist"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-rose-500 shadow-xs transition-colors hover:bg-rose-50"
                        >
                          <Heart className="h-3.5 w-3.5 fill-rose-500 text-rose-500" />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 pb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <span className={isInStock ? 'text-emerald-700' : 'text-red-600'}>
                          {isInStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="truncate text-slate-500">{wishItem.category}</span>
                      </div>

                      <h3
                        onClick={() => {
                          if (matchedProduct) onOpenProductDetails(matchedProduct);
                        }}
                        className="mt-1 line-clamp-2 min-h-[2.25rem] cursor-pointer text-xs font-semibold leading-snug text-slate-900 hover:text-[#F85606]"
                      >
                        {wishItem.title}
                      </h3>

                      <div className="mt-1.5 flex items-baseline gap-1.5 font-mono tabular-nums">
                        <span className="text-sm font-extrabold text-[#F85606]">
                          {formatLKR(displayPrice)}
                        </span>
                        {displayOriginal > displayPrice && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {formatLKR(displayOriginal)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 p-2.5 pt-2">
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => {
                        if (matchedProduct && isInStock) {
                          onAddToCart(matchedProduct, 1);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-2 py-1.5 text-[11px] font-bold text-slate-950 transition-colors hover:bg-[#e5a600] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      <span>Add Cart</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => {
                        if (matchedProduct && isInStock) {
                          onBuyNow(matchedProduct, 1);
                        }
                      }}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F85606] px-2 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#d94800] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                    >
                      <Bolt className="h-3 w-3" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </HorizontalAutoScrollRail>
        )}
      </div>

      {/* =========================================================
          5. RECENTLY VIEWED (FOOTPRINTS) — HORIZONTAL SCROLL + SLOW AUTO-SCROLL
         ========================================================= */}
      <div
        id="account-footprint-section"
        className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5"
      >
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-[#F85606]" />
            <h2 className="font-display text-base font-bold text-slate-950 sm:text-lg">
              Recently Viewed Footprints
            </h2>
            <span className="font-mono text-xs text-slate-500 tabular-nums">
              · {recentlyViewedProducts.length}
            </span>
          </div>

          {recentlyViewedProducts.length > 0 && (
            <button
              type="button"
              onClick={onClearRecentlyViewed}
              className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-red-600 whitespace-nowrap shrink-0"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear History</span>
            </button>
          )}
        </div>

        {recentlyViewedProducts.length === 0 ? (
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 py-8 text-center text-slate-500">
            <Clock className="mx-auto mb-2 h-7 w-7 text-slate-300" />
            <p className="text-xs font-semibold text-slate-700">
              No recently viewed products yet
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Products you open while shopping appear here automatically.
            </p>
          </div>
        ) : (
          <HorizontalAutoScrollRail
            ariaLabel="Recently Viewed Footprints"
            itemCount={recentlyViewedProducts.length}
            speedPxPerSec={18}
          >
            {recentlyViewedProducts.map((prod) => {
              const effectivePrice = getEffectivePrice(prod);
              const isSaved = isProductWishlisted(prod.id);
              const isInStock = prod.stockRemaining > 0;

              return (
                <div
                  key={prod.id}
                  className="flex w-[196px] shrink-0 flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-[#F85606] hover:shadow-sm sm:w-[214px]"
                >
                  <div>
                    <div
                      onClick={() => onOpenProductDetails(prod)}
                      className="relative aspect-[4/3] w-full cursor-pointer overflow-hidden bg-slate-50"
                    >
                      <img
                        src={resolveAssetUrl(prod.imageUrl)}
                        alt={prod.title}
                        loading="lazy"
                        decoding="async"
                        referrerPolicy="no-referrer"
                        className="h-full w-full object-cover"
                      />
                      <div className="absolute top-2 right-2 flex items-center gap-1">
                        {onShareProduct && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onShareProduct(prod, e);
                            }}
                            aria-label={`Share ${prod.title}`}
                            title="Share product link"
                            className="flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-xs transition-colors hover:bg-[#F85606] hover:text-white"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleWishlist(prod, e);
                          }}
                          aria-label="Toggle Wishlist"
                          className="flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-slate-500 shadow-xs transition-colors hover:bg-rose-50 hover:text-rose-500"
                        >
                          <Heart
                            className={`h-3.5 w-3.5 ${
                              isSaved ? 'fill-rose-500 text-rose-500' : ''
                            }`}
                          />
                        </button>
                      </div>
                    </div>

                    <div className="p-3 pb-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-semibold">
                        <span className={isInStock ? 'text-emerald-700' : 'text-red-600'}>
                          {isInStock ? 'In Stock' : 'Out of Stock'}
                        </span>
                        <span aria-hidden="true" className="text-slate-300">
                          ·
                        </span>
                        <span className="truncate text-slate-500">{prod.category}</span>
                      </div>

                      <h3
                        onClick={() => onOpenProductDetails(prod)}
                        className="mt-1 line-clamp-2 min-h-[2.25rem] cursor-pointer text-xs font-semibold leading-snug text-slate-900 hover:text-[#F85606]"
                      >
                        {prod.title}
                      </h3>

                      <div className="mt-1.5 flex items-baseline gap-1.5 font-mono tabular-nums">
                        <span className="text-sm font-extrabold text-[#F85606]">
                          {formatLKR(effectivePrice)}
                        </span>
                        {prod.originalPrice > effectivePrice && (
                          <span className="text-[10px] text-slate-400 line-through">
                            {formatLKR(prod.originalPrice)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5 border-t border-slate-100 p-2.5 pt-2">
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => onAddToCart(prod, 1)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-2 py-1.5 text-[11px] font-bold text-slate-950 transition-colors hover:bg-[#e5a600] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                    >
                      <ShoppingBag className="h-3 w-3" />
                      <span>Add Cart</span>
                    </button>
                    <button
                      type="button"
                      disabled={!isInStock}
                      onClick={() => onBuyNow(prod, 1)}
                      className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F85606] px-2 py-1.5 text-[11px] font-bold text-white transition-colors hover:bg-[#d94800] disabled:cursor-not-allowed disabled:opacity-45 whitespace-nowrap"
                    >
                      <Bolt className="h-3 w-3" />
                      <span>Buy Now</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </HorizontalAutoScrollRail>
        )}
      </div>

      {/* =========================================================
          6. DARAZ / ALIEXPRESS "MORE TO LOVE / JUST FOR YOU"
         ========================================================= */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5">
        <div className="mb-3.5 flex items-center justify-between gap-2">
          <h2 className="font-display text-base font-bold text-slate-950 sm:text-lg">
            More to Love
          </h2>
          <button
            type="button"
            onClick={() => onNavigateTab('shop')}
            className="inline-flex items-center gap-0.5 text-xs font-semibold text-[#F85606] hover:underline whitespace-nowrap shrink-0"
          >
            <span>View All ({catalog.length})</span>
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {catalog.slice(0, 6).map((prod) => {
            const effectivePrice = getEffectivePrice(prod);
            const discountPercent = Math.round(
              ((prod.originalPrice - effectivePrice) / prod.originalPrice) * 100
            );
            const isInStock = prod.stockRemaining > 0;

            return (
              <div
                key={prod.id}
                onClick={() => onOpenProductDetails(prod)}
                className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white transition-all hover:border-[#F85606] hover:shadow-sm"
              >
                <div className="relative aspect-square w-full overflow-hidden bg-slate-50">
                  <img
                    src={resolveAssetUrl(prod.imageUrl)}
                    alt={prod.title}
                    loading="lazy"
                    decoding="async"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition-transform duration-200 group-hover:scale-[1.03]"
                  />
                  {onShareProduct && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onShareProduct(prod, e);
                      }}
                      aria-label={`Share ${prod.title}`}
                      title="Share product link"
                      className="absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-slate-700 shadow-xs transition-colors hover:bg-[#F85606] hover:text-white"
                    >
                      <Share2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {discountPercent > 0 && (
                    <span className="absolute bottom-2 left-2 rounded bg-[#F85606] px-1.5 py-0.5 font-mono text-[10px] font-bold text-white">
                      -{discountPercent}%
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col justify-between space-y-1.5 p-2.5">
                  <h3 className="line-clamp-2 min-h-[2.25rem] text-xs font-semibold leading-snug text-slate-900 group-hover:text-[#F85606]">
                    {prod.title}
                  </h3>

                  <div className="flex flex-wrap items-baseline gap-1.5 font-mono tabular-nums">
                    <span className="text-sm font-extrabold text-[#F85606]">
                      {formatLKR(effectivePrice)}
                    </span>
                    {prod.originalPrice > effectivePrice && (
                      <span className="text-[10px] text-slate-400 line-through">
                        {formatLKR(prod.originalPrice)}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1.5 text-[10px] font-medium text-slate-500">
                    <span className={isInStock ? 'text-emerald-700' : 'text-red-600'}>
                      {isInStock ? 'In Stock' : 'Out of Stock'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{prod.freeShipping ? 'Free Delivery' : 'Express'}</span>
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
