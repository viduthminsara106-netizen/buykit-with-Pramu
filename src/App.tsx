/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Search,
  ShoppingBag,
  User as UserIcon,
  LogOut,
  Plus,
  Minus,
  Trash2,
  Sparkles,
  MapPin,
  ShieldCheck,
  Truck,
  CheckCircle2,
  X,
  ArrowRight,
  Package,
  Lock,
  Zap,
  ChevronRight,
  ChevronLeft,
  Tag,
  Home,
  Store,
  Info,
  Bolt,
  Headphones,
  Watch,
  Camera,
  Laptop,
  Coffee,
  Gamepad2,
  LayoutGrid,
  RotateCcw,
  Clock,
  Star,
  Heart,
  SlidersHorizontal,
  ChevronDown,
  MessageSquare,
  HelpCircle,
  Scale,
  Settings,
} from 'lucide-react';
import {
  auth,
  db,
  onAuthStateChanged,
  signOutAccount,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  onSnapshot,
  serverTimestamp,
  query,
  where,
  handleFirestoreError,
  OperationType,
  sanitizeId,
  VALIDATION_LIMITS,
  User,
} from './firebase';
import {
  MARKETPLACE_PRODUCTS,
  HERO_BANNER_IMAGE,
  MarketplaceProduct,
  DealTier,
  ProductDepartment,
  formatLKR,
} from './data/catalog';
import { AuthGateModal } from './components/AuthGateModal';
import { PickupMapModal } from './components/PickupMapModal';
import {
  ProductReviewsAndQaSection,
  FirestoreProductReview,
  FirestoreReviewReply,
  FirestoreProductQuestion,
  FirestoreQuestionAnswer,
} from './components/ProductReviewsAndQaSection';
import {
  OrderTrackingModal,
  TrackableOrder,
  OrderStatusValue,
  OrderTrackingStageKey,
  ORDER_TRACKING_STAGES,
  getStageLabelFromStatus,
  mapOrderStatusToStageIndex,
} from './components/OrderTrackingModal';
import { DarazAliAccountTab } from './components/DarazAliAccountTab';
import {
  ProductComparisonModal,
  FloatingCompareBar,
  MAX_COMPARE_PRODUCTS,
} from './components/ProductComparisonModal';
import { ProductImageGallery } from './components/ProductImageGallery';
import {
  AccountSettingsModal,
  COUNTRIES_WITH_FLAGS,
  LANGUAGES_LIST,
  INITIAL_SAVED_CARDS,
  SavedPaymentCard,
  SettingsTabKey,
} from './components/AccountSettingsModal';
import {
  DarazAliCheckoutView,
  AVAILABLE_CHECKOUT_COUPONS,
} from './components/DarazAliCheckoutView';
import { getTranslations } from './utils/i18n';
import {
  INITIAL_PROMO_POSTERS,
  INITIAL_CREATIVE_SALES,
  INITIAL_ENRICHED_DESCRIPTIONS,
  PromotionalPosterCampaign,
  CreativeSaleSpotlight,
  EnrichedProductDetails,
  getDefaultEnrichedDetails,
  runDescriptionAgent,
} from './utils/multiAgentStorefront';
import { StorefrontPromoAndSalesShowcase } from './components/StorefrontPromoAndSalesShowcase';
import { AdminStorefrontStudioModal } from './components/AdminStorefrontStudioModal';
import {
  OptimizedImage,
  resolveAssetUrl,
  detectSlowConnection,
} from './utils/assetResolver';

export const BUYKIT_LOGO_ASSET = resolveAssetUrl(
  '/assets/aistudio/Screenshot_20261107_191852_81defece.jpg'
);

type BottomTab = 'home' | 'shop' | 'buykit' | 'cart' | 'account';
type SortOption = 'popular' | 'price_asc' | 'price_desc' | 'rating' | 'discount';
type PricePreset = 'all' | 'under_10k' | '10k_to_25k' | '25k_to_50k' | 'above_50k' | 'custom';

interface FirestoreCartItem {
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

interface FirestoreOrderRecord extends TrackableOrder {
  status: OrderStatusValue;
}

interface FirestoreWishlistItem {
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

const DEPARTMENTS: ProductDepartment[] = [
  'Audio & Headphones',
  'Smartwatches & Wearables',
  'Cameras & Drones',
  'Computer & Office',
  'Home & Lifestyle',
  'Mobile & Gaming Gear',
];

const DEPARTMENT_META: Record<
  ProductDepartment,
  {
    shortLabel: string;
    subtitle: string;
    thumbnailUrl: string;
    accentColor: string;
    icon: React.ComponentType<{ className?: string }>;
  }
> = {
  'Audio & Headphones': {
    shortLabel: 'Audio & ANC',
    subtitle: 'Hi-Res & Earbuds',
    thumbnailUrl: resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
    accentColor: 'from-orange-500 to-amber-500',
    icon: Headphones,
  },
  'Smartwatches & Wearables': {
    shortLabel: 'Smartwatches',
    subtitle: 'AMOLED & GPS',
    thumbnailUrl: resolveAssetUrl('/src/assets/images/product_smartwatch_pro_1794121197679.jpg'),
    accentColor: 'from-blue-600 to-cyan-500',
    icon: Watch,
  },
  'Cameras & Drones': {
    shortLabel: 'Cameras & Drones',
    subtitle: '4K Gimbal & Action',
    thumbnailUrl: resolveAssetUrl('/src/assets/images/product_camera_drone_1794121198906.jpg'),
    accentColor: 'from-emerald-600 to-teal-500',
    icon: Camera,
  },
  'Computer & Office': {
    shortLabel: 'Computer & Office',
    subtitle: 'GaN Hubs & Docks',
    thumbnailUrl: resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
    accentColor: 'from-slate-800 to-slate-600',
    icon: Laptop,
  },
  'Home & Lifestyle': {
    shortLabel: 'Home & Espresso',
    subtitle: 'Barista & Smart Home',
    thumbnailUrl: resolveAssetUrl('/src/assets/images/product_espresso_maker_1794123345741.jpg'),
    accentColor: 'from-amber-600 to-orange-500',
    icon: Coffee,
  },
  'Mobile & Gaming Gear': {
    shortLabel: 'Mobile & Gaming',
    subtitle: 'Mech & Controllers',
    thumbnailUrl: resolveAssetUrl('/src/assets/images/product_gaming_controller_1794123345268.jpg'),
    accentColor: 'from-rose-600 to-orange-500',
    icon: Gamepad2,
  },
};

export interface AdminPromoBanner {
  id: string;
  productId: string;
  campaignTag: string;
  discountBadge: string;
  headline: string;
  subheadline: string;
  dealPrice: number;
  originalPrice: number;
  soldLabel: string;
  imageUrl: string;
}

const INITIAL_ADMIN_PROMO_BANNERS: AdminPromoBanner[] = [
  {
    id: 'banner_bestseller_gan',
    productId: 'prod_powercore_gan_160w',
    campaignTag: '#1 Best Seller · Most Sold Product',
    discountBadge: '56% OFF · Save Rs. 15,600',
    headline: 'PowerCore 160W 4-Port GaN Prime Super Fast Charger',
    subheadline: '14,300+ Units Sold · Charges 2 Laptops & 2 Phones Simultaneously',
    dealPrice: 6900,
    originalPrice: 22500,
    soldLabel: '14,300+ Sold',
    imageUrl: resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
  },
  {
    id: 'banner_mega_discount_anc',
    productId: 'prod_sonicflow_anc_pro',
    campaignTag: 'Admin Mega Discount · 62% OFF',
    discountBadge: '62% OFF · Save Rs. 38,000',
    headline: 'SonicFlow Titanium Studio ANC Wireless Headphones',
    subheadline: 'Hybrid -48dB Noise Cancellation · 48h Battery · LDAC Hi-Res Audio',
    dealPrice: 14500,
    originalPrice: 52500,
    soldLabel: '4,820+ Sold',
    imageUrl: resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
  },
  {
    id: 'banner_bestseller_powerbank',
    productId: 'prod_powercore_140w_bank',
    campaignTag: 'Top Selling Power Pick · 50% OFF',
    discountBadge: '50% OFF · Save Rs. 22,100',
    headline: 'PowerCore 140W 27,650mAh Smart OLED Laptop Power Bank',
    subheadline: '11,240+ Units Sold · Real-Time Wattage Display · Airline Safe',
    dealPrice: 14900,
    originalPrice: 37000,
    soldLabel: '11,240+ Sold',
    imageUrl: resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
  },
  {
    id: 'banner_flash_smartwatch',
    productId: 'prod_atlas_titanium_watch',
    campaignTag: 'Flash Sale Special · 55% OFF',
    discountBadge: '55% OFF · Save Rs. 35,400',
    headline: 'Atlas Ultra Sapphire Titanium GPS Smartwatch (49mm)',
    subheadline: '2000-Nit AMOLED Sapphire Display · 100m Waterproof · 14-Day Battery',
    dealPrice: 29500,
    originalPrice: 64900,
    soldLabel: '3,190+ Sold',
    imageUrl: resolveAssetUrl('/src/assets/images/product_smartwatch_pro_1794121197679.jpg'),
  },
  {
    id: 'banner_hot_gaming_bundle',
    productId: 'prod_apex_pro_controller',
    campaignTag: 'Hot Gaming Bundle · 69% OFF',
    discountBadge: '69% OFF · Save Rs. 24,600',
    headline: 'Apex Pro Hall-Effect Wireless Controller & Mini Mech Keypad',
    subheadline: '7,340+ Units Sold · 1000Hz Polling Rate · Zero-Drift Magnetic Sticks',
    dealPrice: 10900,
    originalPrice: 35500,
    soldLabel: '7,340+ Sold',
    imageUrl: resolveAssetUrl('/src/assets/images/product_gaming_controller_1794123345268.jpg'),
  },
  {
    id: 'banner_choice_drone_4k',
    productId: 'prod_cinemax_fold_4k',
    campaignTag: 'Admin Choice Deal · Save Rs. 49,000',
    discountBadge: '42% OFF · Free Delivery',
    headline: 'CineMax Fold 4K HDR 3-Axis Gimbal Camera Drone Combo',
    subheadline: '12km HD Transmission · 38-Min Flight Time · Obstacle Sensing',
    dealPrice: 66900,
    originalPrice: 115900,
    soldLabel: '1,940+ Sold',
    imageUrl: resolveAssetUrl('/src/assets/images/product_camera_drone_1794121198906.jpg'),
  },
  {
    id: 'banner_home_espresso_sale',
    productId: 'prod_barista_pro_espresso',
    campaignTag: 'Home & Kitchen Sale · 51% OFF',
    discountBadge: '51% OFF · Save Rs. 45,100',
    headline: 'Marzocco Studio 20-Bar Stainless Steel Espresso Maker',
    subheadline: 'Italian 20-Bar Extraction Pump · PID Dual-Boiler · Walnut Portafilter',
    dealPrice: 42900,
    originalPrice: 88000,
    soldLabel: '1,680+ Sold',
    imageUrl: resolveAssetUrl('/src/assets/images/product_espresso_maker_1794123345741.jpg'),
  },
];

const QUICK_SEARCH_TAGS = [
  'ANC Headphones',
  'Smartwatch',
  '4K Drone',
  'Gaming',
  'Espresso',
  'Power Bank',
  'Keyboard',
];

/**
 * Official BuyKit Logo Emblem Component using the uploaded logo asset
 * cropped to the center logo mark.
 */
const BuyKitLogoBadge: React.FC<{ size?: 'sm' | 'md' | 'lg' }> = ({ size = 'md' }) => {
  const dimensions =
    size === 'lg'
      ? 'h-12 w-12 rounded-2xl'
      : size === 'sm'
      ? 'h-8 w-8 rounded-lg'
      : 'h-10 w-10 rounded-xl';

  return (
    <div
      className={`relative shrink-0 overflow-hidden bg-black shadow-xs ring-1 ring-orange-500/40 ${dimensions}`}
    >
      <img
        src={BUYKIT_LOGO_ASSET}
        alt="BuyKit Official Logo"
        decoding="async"
        className="h-full w-full scale-[2.15] object-cover object-center"
      />
    </div>
  );
};

const SmartImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean;
}> = ({ src, alt, className = '', priority = false }) => {
  return (
    <OptimizedImage
      src={src}
      alt={alt}
      className={className}
      priority={priority}
    />
  );
};

export default function App() {
  // Active Bottom Tab Navigation State
  const [activeBottomTab, setActiveBottomTab] = useState<BottomTab>('home');

  // Horizontal Category Scroll Ref
  const categoryScrollRef = useRef<HTMLDivElement | null>(null);

  // Auth & User Profile State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [newUserDealClaimed, setNewUserDealClaimed] = useState(false);

  // Catalog, Search & Price Filtering State
  const [catalog, setCatalog] = useState<MarketplaceProduct[]>(MARKETPLACE_PRODUCTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDealFilter, setSelectedDealFilter] = useState<'all' | DealTier>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [sortBy, setSortBy] = useState<SortOption>('popular');
  const [pricePreset, setPricePreset] = useState<PricePreset>('all');
  const [minPriceInput, setMinPriceInput] = useState<string>('');
  const [maxPriceInput, setMaxPriceInput] = useState<string>('');
  const [minRatingFilter, setMinRatingFilter] = useState<number>(0);
  const [isPriceFilterOpen, setIsPriceFilterOpen] = useState<boolean>(false);
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>('all');

  // Selected Product Modal & Recently Viewed State
  const [selectedProduct, setSelectedProduct] = useState<MarketplaceProduct | null>(null);
  const [detailQuantity, setDetailQuantity] = useState<number>(1);
  const [detailCouponId, setDetailCouponId] = useState<string>('none');
  const [isDetailCouponsOpen, setIsDetailCouponsOpen] = useState<boolean>(false);
  const [quickViewTab, setQuickViewTab] = useState<'all' | 'coupons' | 'specs' | 'reviews'>('all');
  const [recentlyViewedIds, setRecentlyViewedIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem('buykit_recently_viewed_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.filter((id): id is string => typeof id === 'string').slice(0, 12);
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });

  // Admin Featured Sales, Discounts & Best-Selling Product Banners (Ready for Admin Panel)
  const [adminBanners, setAdminBanners] = useState<AdminPromoBanner[]>(
    INITIAL_ADMIN_PROMO_BANNERS
  );
  const [promoPosters, setPromoPosters] =
    useState<PromotionalPosterCampaign[]>(INITIAL_PROMO_POSTERS);
  const [creativeSales, setCreativeSales] =
    useState<CreativeSaleSpotlight[]>(INITIAL_CREATIVE_SALES);
  const [enrichedProductMap, setEnrichedProductMap] = useState<
    Record<string, EnrichedProductDetails>
  >(INITIAL_ENRICHED_DESCRIPTIONS);
  const [isAdminStudioOpen, setIsAdminStudioOpen] = useState<boolean>(false);
  const [loadingExtendedDetailsId, setLoadingExtendedDetailsId] = useState<string | null>(
    null
  );
  const [heroSlideIndex, setHeroSlideIndex] = useState(0);
  const [countdownSeconds, setCountdownSeconds] = useState(5 * 3600 + 42 * 60 + 19);

  // Cart, Orders & Wishlist State (Synced with Firestore for authenticated users + Guest Cart for instant Buy Now Checkout)
  const [cartItems, setCartItems] = useState<FirestoreCartItem[]>([]);
  const [guestCartItems, setGuestCartItems] = useState<FirestoreCartItem[]>([]);
  const [orders, setOrders] = useState<FirestoreOrderRecord[]>([]);
  const [wishlistItems, setWishlistItems] = useState<FirestoreWishlistItem[]>([]);

  // Product Reviews, Replies & Product Q&A State (Synced with Firestore)
  const [allReviews, setAllReviews] = useState<FirestoreProductReview[]>([]);
  const [allReplies, setAllReplies] = useState<FirestoreReviewReply[]>([]);
  const [allQuestions, setAllQuestions] = useState<FirestoreProductQuestion[]>([]);
  const [allAnswers, setAllAnswers] = useState<FirestoreQuestionAnswer[]>([]);

  // Modals State
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [pendingCartProduct, setPendingCartProduct] = useState<MarketplaceProduct | null>(null);
  const [pendingWishlistProduct, setPendingWishlistProduct] =
    useState<MarketplaceProduct | null>(null);
  const [pendingBuyNowMode, setPendingBuyNowMode] = useState<boolean>(false);
  const [pendingQty, setPendingQty] = useState<number>(1);
  const [isPickupMapOpen, setIsPickupMapOpen] = useState(false);
  const [trackingOrder, setTrackingOrder] = useState<TrackableOrder | null>(null);

  // Product Comparison State (Up to 3 Products)
  const [compareIds, setCompareIds] = useState<string[]>(() => {
    try {
      const saved = window.localStorage.getItem('buykit_compare_ids');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed
            .filter((id): id is string => typeof id === 'string')
            .slice(0, MAX_COMPARE_PRODUCTS);
        }
      }
    } catch {
      // Ignore storage read errors
    }
    return [];
  });
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Checkout & Account Settings State (Profile, Address, Contact Numbers, Country with Flag, Language, Saved Credit/Debit Cards)
  const [fullName, setFullName] = useState('Pramu BuyKit Member');
  const [userEmail, setUserEmail] = useState('shopper@buykit.lk');
  const [phone, setPhone] = useState('+94 77 123 4567');
  const [secondaryPhone, setSecondaryPhone] = useState('+94 71 987 6543');
  const [shippingAddress, setShippingAddress] = useState('No. 42, Galle Road, Colombo 03');
  const [cityDistrict, setCityDistrict] = useState('Colombo 03 · Western Province');
  const [postalCode, setPostalCode] = useState('00300');
  const [addressLabel, setAddressLabel] = useState<'Home' | 'Office'>('Home');
  const [selectedCountryCode, setSelectedCountryCode] = useState<string>(() => {
    try {
      return localStorage.getItem('buykit_country_code') || 'LK';
    } catch {
      return 'LK';
    }
  });
  const [selectedLanguageCode, setSelectedLanguageCode] = useState<string>(() => {
    try {
      return localStorage.getItem('buykit_language_code') || 'en';
    } catch {
      return 'en';
    }
  });
  const [savedCards, setSavedCards] = useState<SavedPaymentCard[]>(INITIAL_SAVED_CARDS);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);
  const [settingsModalTab, setSettingsModalTab] = useState<SettingsTabKey>('profile');
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'card_express'>('card_express');
  const [selectedHubName, setSelectedHubName] = useState('BuyKit Colombo Central Hub');
  const [checkoutSubmitting, setCheckoutSubmitting] = useState(false);
  const [toastBanner, setToastBanner] = useState<string | null>(null);
  const [isLowConnectionMode, setIsLowConnectionMode] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('buykit_low_data_mode');
      if (saved === 'true') return true;
      if (saved === 'false') return false;
    } catch {
      // ignore
    }
    return detectSlowConnection();
  });

  const handleToggleLowConnectionMode = () => {
    setIsLowConnectionMode((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('buykit_low_data_mode', String(next));
      } catch {
        // ignore
      }
      showToast(
        next
          ? 'Lite / Low-Data Mode Enabled — Optimized for slow connections!'
          : 'Standard High-Speed Mode Enabled.'
      );
      return next;
    });
  };

  const openAccountSettings = (tab: SettingsTabKey = 'profile') => {
    setSettingsModalTab(tab);
    setIsSettingsModalOpen(true);
  };

  const showToast = (msg: string) => {
    setToastBanner(msg);
    window.setTimeout(() => {
      setToastBanner((prev) => (prev === msg ? null : prev));
    }, 4500);
  };

  // Horizontal Category Scroll Handler
  const handleScrollCategories = (direction: 'left' | 'right') => {
    if (!categoryScrollRef.current) return;
    const offset = direction === 'left' ? -340 : 340;
    categoryScrollRef.current.scrollBy({ left: offset, behavior: 'smooth' });
  };

  // Auto-advance Admin Promo Banner Carousel & Flash Sale Countdown (pauses auto-carousel in Low-Data Mode to save bandwidth)
  useEffect(() => {
    const slideInterval = isLowConnectionMode
      ? null
      : window.setInterval(() => {
          setHeroSlideIndex((prev) => (prev + 1) % adminBanners.length);
        }, 4800);

    const timerInterval = window.setInterval(() => {
      setCountdownSeconds((prev) => (prev > 0 ? prev - 1 : 5 * 3600));
    }, 1000);

    return () => {
      if (slideInterval) window.clearInterval(slideInterval);
      window.clearInterval(timerInterval);
    };
  }, [adminBanners.length, isLowConnectionMode]);

  // Prevent accidental pinch-zoom, trackpad Ctrl+wheel zoom, and keyboard Ctrl+/- zoom anywhere on the site
  useEffect(() => {
    const preventWheelZoom = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
      }
    };
    const preventKeyZoom = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey || e.metaKey) &&
        (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')
      ) {
        e.preventDefault();
      }
    };
    const preventMultiTouchZoom = (e: TouchEvent) => {
      if (e.touches && e.touches.length > 1) {
        e.preventDefault();
      }
    };
    const preventGestureZoom = (e: Event) => {
      e.preventDefault();
    };

    window.addEventListener('wheel', preventWheelZoom, { passive: false });
    window.addEventListener('keydown', preventKeyZoom);
    document.addEventListener('touchmove', preventMultiTouchZoom, { passive: false });
    document.addEventListener('gesturestart', preventGestureZoom);
    document.addEventListener('gesturechange', preventGestureZoom);
    document.addEventListener('gestureend', preventGestureZoom);

    return () => {
      window.removeEventListener('wheel', preventWheelZoom);
      window.removeEventListener('keydown', preventKeyZoom);
      document.removeEventListener('touchmove', preventMultiTouchZoom);
      document.removeEventListener('gesturestart', preventGestureZoom);
      document.removeEventListener('gesturechange', preventGestureZoom);
      document.removeEventListener('gestureend', preventGestureZoom);
    };
  }, []);

  const formattedCountdown = useMemo(() => {
    const hrs = String(Math.floor(countdownSeconds / 3600)).padStart(2, '0');
    const mins = String(Math.floor((countdownSeconds % 3600) / 60)).padStart(2, '0');
    const secs = String(countdownSeconds % 60).padStart(2, '0');
    return { hrs, mins, secs };
  }, [countdownSeconds]);

  // Apply Price Preset Helper
  const handleSelectPricePreset = (preset: PricePreset) => {
    setPricePreset(preset);
    if (preset === 'all') {
      setMinPriceInput('');
      setMaxPriceInput('');
    } else if (preset === 'under_10k') {
      setMinPriceInput('0');
      setMaxPriceInput('10000');
    } else if (preset === '10k_to_25k') {
      setMinPriceInput('10000');
      setMaxPriceInput('25000');
    } else if (preset === '25k_to_50k') {
      setMinPriceInput('25000');
      setMaxPriceInput('50000');
    } else if (preset === 'above_50k') {
      setMinPriceInput('50000');
      setMaxPriceInput('');
    }
  };

  const handleResetAllFilters = () => {
    setSearchQuery('');
    setSelectedCategory('all');
    setSelectedDealFilter('all');
    setPricePreset('all');
    setMinPriceInput('');
    setMaxPriceInput('');
    setMinRatingFilter(0);
    setStockFilter('all');
    setSortBy('popular');
  };

  // Toggle Product Stock Status (In Stock Green <-> Out of Stock Red) Product-by-Product
  const handleToggleProductStock = (productId: string, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setCatalog((prev) =>
      prev.map((item) => {
        if (item.id !== productId) return item;
        const nextStock = item.stockRemaining > 0 ? 0 : Math.max(12, Math.round(item.totalStock * 0.25));
        const updatedItem = { ...item, stockRemaining: nextStock };
        setSelectedProduct((curr) => (curr && curr.id === productId ? updatedItem : curr));
        showToast(
          nextStock > 0
            ? `"${item.title}" is now IN STOCK (${nextStock} units available).`
            : `"${item.title}" marked as OUT OF STOCK.`
        );
        return updatedItem;
      })
    );
  };

  // Track Recently Viewed Product Helper (persisted in local state + localStorage)
  const trackRecentlyViewed = (productId: string) => {
    setRecentlyViewedIds((prev) => {
      const updated = [productId, ...prev.filter((id) => id !== productId)].slice(0, 12);
      try {
        window.localStorage.setItem('buykit_recently_viewed_ids', JSON.stringify(updated));
      } catch {
        // Ignore storage write errors
      }
      return updated;
    });
  };

  const handleClearRecentlyViewed = () => {
    setRecentlyViewedIds([]);
    try {
      window.localStorage.removeItem('buykit_recently_viewed_ids');
    } catch {
      // Ignore storage remove errors
    }
    showToast('Cleared your Recently Viewed product history.');
  };

  // Open Product Detail Modal with reset quantity & track in Recently Viewed
  const openProductDetails = (product: MarketplaceProduct) => {
    trackRecentlyViewed(product.id);
    setDetailQuantity(1);
    setDetailCouponId('none');
    setIsDetailCouponsOpen(false);
    setQuickViewTab('all');
    setSelectedProduct(product);
  };

  // Calculate active coupon savings inside Product View
  const getDetailCouponInfo = (product: MarketplaceProduct, qty: number) => {
    const unitPrice = getEffectivePrice(product);
    const grossTotal = unitPrice * qty;
    const coupon =
      AVAILABLE_CHECKOUT_COUPONS.find((c) => c.id === detailCouponId) || null;
    if (!coupon || coupon.type === 'none' || grossTotal < coupon.minSpend) {
      return {
        coupon,
        isEligible: coupon ? grossTotal >= coupon.minSpend : false,
        couponDiscount: 0,
        finalTotal: grossTotal,
      };
    }
    let discount = 0;
    if (coupon.type === 'percent') {
      discount = Math.min(Math.round((grossTotal * coupon.value) / 100), coupon.maxCap);
    } else if (coupon.type === 'flat') {
      discount = Math.min(coupon.value, grossTotal);
    }
    return {
      coupon,
      isEligible: true,
      couponDiscount: discount,
      finalTotal: Math.max(0, grossTotal - discount),
    };
  };

  // Product Comparison Helpers (Up to 3 Products)
  const persistCompareIds = (nextIds: string[]) => {
    try {
      window.localStorage.setItem('buykit_compare_ids', JSON.stringify(nextIds));
    } catch {
      // Ignore storage write errors
    }
  };

  const isProductCompared = (productId: string): boolean => {
    return compareIds.includes(productId);
  };

  const handleToggleCompare = (product: MarketplaceProduct, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
    }
    setCompareIds((prev) => {
      if (prev.includes(product.id)) {
        const next = prev.filter((id) => id !== product.id);
        persistCompareIds(next);
        showToast(`Removed "${product.title}" from comparison board.`);
        return next;
      }
      if (prev.length >= MAX_COMPARE_PRODUCTS) {
        showToast(
          `Comparison board supports up to ${MAX_COMPARE_PRODUCTS} products. Remove an item first or open Compare Board.`
        );
        setIsCompareModalOpen(true);
        return prev;
      }
      const next = [...prev, product.id];
      persistCompareIds(next);
      showToast(
        `Added "${product.title}" to Comparison Board (${next.length}/${MAX_COMPARE_PRODUCTS}).`
      );
      return next;
    });
  };

  const handleAddToCompare = (product: MarketplaceProduct) => {
    setCompareIds((prev) => {
      if (prev.includes(product.id) || prev.length >= MAX_COMPARE_PRODUCTS) return prev;
      const next = [...prev, product.id];
      persistCompareIds(next);
      showToast(
        `Added "${product.title}" to Comparison Board (${next.length}/${MAX_COMPARE_PRODUCTS}).`
      );
      return next;
    });
  };

  const handleRemoveFromCompare = (productId: string) => {
    setCompareIds((prev) => {
      const next = prev.filter((id) => id !== productId);
      persistCompareIds(next);
      return next;
    });
  };

  const handleClearCompare = () => {
    setCompareIds([]);
    persistCompareIds([]);
    showToast('Cleared all products from the Comparison Board.');
  };

  const comparedProducts = useMemo(
    () =>
      compareIds
        .map((id) => catalog.find((p) => p.id === id))
        .filter((p): p is MarketplaceProduct => Boolean(p)),
    [compareIds, catalog]
  );

  // 1. Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setAuthReady(true);
      if (user) {
        if (user.displayName) setFullName(user.displayName);
        if (user.email) setUserEmail(user.email);
      } else {
        setCartItems([]);
        setOrders([]);
        setWishlistItems([]);
        setNewUserDealClaimed(false);
      }
    });
    return () => unsubscribe();
  }, []);

  // 2. Firestore Listeners (Only attach when authReady and currentUser is signed in)
  useEffect(() => {
    if (!authReady || !currentUser) return;

    const uid = currentUser.uid;
    const userDocPath = `users/${uid}`;
    const cartColPath = `users/${uid}/cart`;
    const ordersColPath = `users/${uid}/orders`;
    const wishlistColPath = `users/${uid}/wishlist`;

    const unsubProfile = onSnapshot(
      doc(db, 'users', uid),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setNewUserDealClaimed(Boolean(data.newUserDealClaimed));
        }
      },
      (err) => {
        handleFirestoreError(err, OperationType.GET, userDocPath);
      }
    );

    getDoc(doc(db, 'users', uid, 'private', 'info'))
      .then((snap) => {
        if (snap.exists()) {
          const d = snap.data();
          if (d.phone) setPhone(String(d.phone));
          if (d.shippingAddress) setShippingAddress(String(d.shippingAddress));
          if (d.postalCode) setPostalCode(String(d.postalCode));
        }
      })
      .catch(() => {});

    const cartQuery = query(collection(db, cartColPath), where('userId', '==', uid));
    const unsubCart = onSnapshot(
      cartQuery,
      (snapshot) => {
        const items: FirestoreCartItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userId: String(d.userId || uid),
            productId: String(d.productId || docSnap.id),
            title: String(d.title || 'Product'),
            category: String(d.category || 'General'),
            dealType: (d.dealType as DealTier) || 'standard',
            price: Number(d.price || 0),
            originalPrice: Number(d.originalPrice || 0),
            quantity: Number(d.quantity || 1),
            imageUrl: String(d.imageUrl || HERO_BANNER_IMAGE),
          };
        });
        setCartItems(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, cartColPath);
      }
    );

    const ordersQuery = query(collection(db, ordersColPath), where('userId', '==', uid));
    const unsubOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        const list: FirestoreOrderRecord[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const createdMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            userId: String(d.userId || uid),
            orderNumber: String(d.orderNumber || docSnap.id),
            summaryTitle: String(d.summaryTitle || 'Order'),
            itemCount: Number(d.itemCount || 1),
            totalAmount: Number(d.totalAmount || 0),
            paymentMethod: d.paymentMethod === 'card_express' ? 'card_express' : 'cod',
            pickupHubName: String(d.pickupHubName || 'Standard Delivery'),
            status: (d.status as OrderStatusValue) || 'processing',
            createdAtMs: createdMs,
          };
        });
        list.sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
        setOrders(list);
        setTrackingOrder((prev) => {
          if (!prev || prev.isDemoOrder) return prev;
          const updated = list.find((o) => o.id === prev.id);
          return updated || prev;
        });
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, ordersColPath);
      }
    );

    const wishlistQuery = query(collection(db, wishlistColPath), where('userId', '==', uid));
    const unsubWishlist = onSnapshot(
      wishlistQuery,
      (snapshot) => {
        const items: FirestoreWishlistItem[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          return {
            id: docSnap.id,
            userId: String(d.userId || uid),
            productId: String(d.productId || docSnap.id),
            title: String(d.title || 'Product'),
            category: String(d.category || 'General'),
            dealType: (d.dealType as DealTier) || 'standard',
            price: Number(d.price || 0),
            originalPrice: Number(d.originalPrice || 0),
            imageUrl: String(d.imageUrl || HERO_BANNER_IMAGE),
          };
        });
        setWishlistItems(items);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, wishlistColPath);
      }
    );

    return () => {
      unsubProfile();
      unsubCart();
      unsubOrders();
      unsubWishlist();
    };
  }, [authReady, currentUser]);

  // 3. Public Marketplace Reviews, Replies & Product Q&A Listeners
  useEffect(() => {
    if (!authReady) return;

    const reviewsQuery = query(
      collection(db, 'product_reviews'),
      where('visibility', '==', 'public')
    );
    const unsubReviews = onSnapshot(
      reviewsQuery,
      (snapshot) => {
        const list: FirestoreProductReview[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const createdMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            reviewId: String(d.reviewId || docSnap.id),
            productId: String(d.productId || ''),
            userId: String(d.userId || ''),
            userName: String(d.userName || 'BuyKit Shopper'),
            userPhotoUrl: String(d.userPhotoUrl || ''),
            rating: Number(d.rating || 5),
            comment: String(d.comment || ''),
            imageUrl: String(d.imageUrl || ''),
            videoUrl: String(d.videoUrl || ''),
            voiceUrl: String(d.voiceUrl || ''),
            verifiedPurchase: Boolean(d.verifiedPurchase),
            createdAtMs: createdMs,
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setAllReviews(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'product_reviews');
      }
    );

    const repliesQuery = query(
      collection(db, 'review_replies'),
      where('visibility', '==', 'public')
    );
    const unsubReplies = onSnapshot(
      repliesQuery,
      (snapshot) => {
        const list: FirestoreReviewReply[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const createdMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            replyId: String(d.replyId || docSnap.id),
            reviewId: String(d.reviewId || ''),
            productId: String(d.productId || ''),
            userId: String(d.userId || ''),
            userName: String(d.userName || 'BuyKit Shopper'),
            comment: String(d.comment || ''),
            createdAtMs: createdMs,
          };
        });
        list.sort((a, b) => a.createdAtMs - b.createdAtMs);
        setAllReplies(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'review_replies');
      }
    );

    const questionsQuery = query(
      collection(db, 'product_questions'),
      where('visibility', '==', 'public')
    );
    const unsubQuestions = onSnapshot(
      questionsQuery,
      (snapshot) => {
        const list: FirestoreProductQuestion[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const createdMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            questionId: String(d.questionId || docSnap.id),
            productId: String(d.productId || ''),
            userId: String(d.userId || ''),
            userName: String(d.userName || 'BuyKit Shopper'),
            questionText: String(d.questionText || ''),
            createdAtMs: createdMs,
          };
        });
        list.sort((a, b) => b.createdAtMs - a.createdAtMs);
        setAllQuestions(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'product_questions');
      }
    );

    const answersQuery = query(
      collection(db, 'question_answers'),
      where('visibility', '==', 'public')
    );
    const unsubAnswers = onSnapshot(
      answersQuery,
      (snapshot) => {
        const list: FirestoreQuestionAnswer[] = snapshot.docs.map((docSnap) => {
          const d = docSnap.data();
          const createdMs =
            d.createdAt && typeof d.createdAt.toMillis === 'function'
              ? d.createdAt.toMillis()
              : Date.now();
          return {
            id: docSnap.id,
            answerId: String(d.answerId || docSnap.id),
            questionId: String(d.questionId || ''),
            productId: String(d.productId || ''),
            userId: String(d.userId || ''),
            userName: String(d.userName || 'BuyKit Shopper'),
            answerText: String(d.answerText || ''),
            createdAtMs: createdMs,
          };
        });
        list.sort((a, b) => a.createdAtMs - b.createdAtMs);
        setAllAnswers(list);
      },
      (err) => {
        handleFirestoreError(err, OperationType.LIST, 'question_answers');
      }
    );

    return () => {
      unsubReviews();
      unsubReplies();
      unsubQuestions();
      unsubAnswers();
    };
  }, [authReady]);

  // Compute dynamic average star rating & review/question counts for any product
  const getProductRatingStats = (product: MarketplaceProduct) => {
    const cleanProdId = sanitizeId(product.id);
    const prodReviews = allReviews.filter((r) => r.productId === cleanProdId);
    const prodQuestions = allQuestions.filter((q) => q.productId === cleanProdId);

    if (prodReviews.length === 0) {
      return {
        averageRating: product.rating,
        userReviewCount: 0,
        totalRatingCount: Math.max(12, Math.round(product.soldCount * 0.08)),
        questionCount: prodQuestions.length,
        reviews: prodReviews,
        questions: prodQuestions,
      };
    }

    const sumUserRatings = prodReviews.reduce((acc, r) => acc + r.rating, 0);
    // Weight baseline rating (2 votes) + live Firestore user ratings so new reviews immediately update average rating
    const combinedAvg = (product.rating * 2 + sumUserRatings) / (2 + prodReviews.length);
    const baseCount = Math.max(12, Math.round(product.soldCount * 0.08));

    return {
      averageRating: Math.min(5, Math.max(1, Number(combinedAvg.toFixed(1)))),
      userReviewCount: prodReviews.length,
      totalRatingCount: baseCount + prodReviews.length,
      questionCount: prodQuestions.length,
      reviews: prodReviews,
      questions: prodQuestions,
    };
  };

  // Check if current authenticated user has purchased a specific product
  const hasUserPurchasedProduct = (product: MarketplaceProduct): boolean => {
    if (!currentUser || orders.length === 0) return false;
    const prefix = product.title.toLowerCase().slice(0, 16);
    return orders.some(
      (ord) =>
        ord.status !== 'cancelled' && ord.summaryTitle.toLowerCase().includes(prefix)
    );
  };

  // Effective unit price in LKR
  const getEffectivePrice = (product: MarketplaceProduct): number => {
    if (product.dealType === 'new_user' || newUserDealClaimed) {
      return product.newUserPrice;
    }
    return product.price;
  };

  // Filtered & Sorted Products (Includes Search, Category, Deal Tier, LKR Price Range & Rating)
  const filteredProducts = useMemo(() => {
    const minVal = minPriceInput.trim() !== '' ? Number(minPriceInput) : null;
    const maxVal = maxPriceInput.trim() !== '' ? Number(maxPriceInput) : null;

    const base = catalog.filter((item) => {
      const effectivePrice = getEffectivePrice(item);

      const matchesDeal =
        selectedDealFilter === 'all' || item.dealType === selectedDealFilter;
      const matchesCategory =
        selectedCategory === 'all' || item.category === selectedCategory;

      const matchesMinPrice =
        minVal === null || Number.isNaN(minVal) || effectivePrice >= minVal;
      const matchesMaxPrice =
        maxVal === null || Number.isNaN(maxVal) || effectivePrice <= maxVal;

      const matchesRating = minRatingFilter === 0 || item.rating >= minRatingFilter;
      const matchesStock =
        stockFilter === 'all' ||
        (stockFilter === 'in_stock' && item.stockRemaining > 0) ||
        (stockFilter === 'out_of_stock' && item.stockRemaining <= 0);

      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.tagline.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.storeName.toLowerCase().includes(q) ||
        item.dealLabel.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.specs.some((sp) => sp.toLowerCase().includes(q));

      return (
        matchesDeal &&
        matchesCategory &&
        matchesMinPrice &&
        matchesMaxPrice &&
        matchesRating &&
        matchesStock &&
        matchesSearch
      );
    });

    const sorted = [...base];
    if (sortBy === 'price_asc') {
      sorted.sort((a, b) => getEffectivePrice(a) - getEffectivePrice(b));
    } else if (sortBy === 'price_desc') {
      sorted.sort((a, b) => getEffectivePrice(b) - getEffectivePrice(a));
    } else if (sortBy === 'rating') {
      sorted.sort((a, b) => b.rating - a.rating);
    } else if (sortBy === 'discount') {
      sorted.sort((a, b) => {
        const discA = (a.originalPrice - getEffectivePrice(a)) / a.originalPrice;
        const discB = (b.originalPrice - getEffectivePrice(b)) / b.originalPrice;
        return discB - discA;
      });
    } else {
      sorted.sort((a, b) => b.soldCount - a.soldCount);
    }
    return sorted;
  }, [
    catalog,
    selectedDealFilter,
    selectedCategory,
    searchQuery,
    sortBy,
    minPriceInput,
    maxPriceInput,
    minRatingFilter,
    stockFilter,
    newUserDealClaimed,
  ]);

  // Dedicated Daraz / AliExpress-style 6-item horizontal rows
  const flashSaleItems = useMemo(
    () => catalog.filter((p) => p.dealType === 'flash_sale').slice(0, 6),
    [catalog]
  );
  const newUserRowItems = useMemo(
    () => catalog.filter((p) => p.dealType === 'new_user').slice(0, 6),
    [catalog]
  );
  const choiceBundleRowItems = useMemo(
    () => catalog.filter((p) => p.dealType === 'choice_bundle').slice(0, 6),
    [catalog]
  );

  // Resolved Recently Viewed Products List (in most-recently-clicked order)
  const recentlyViewedProducts = useMemo(
    () =>
      recentlyViewedIds
        .map((id) => catalog.find((p) => p.id === id))
        .filter((p): p is MarketplaceProduct => Boolean(p)),
    [recentlyViewedIds, catalog]
  );

  const hasActiveFilters =
    searchQuery.trim() !== '' ||
    selectedCategory !== 'all' ||
    selectedDealFilter !== 'all' ||
    minPriceInput.trim() !== '' ||
    maxPriceInput.trim() !== '' ||
    minRatingFilter > 0 ||
    stockFilter !== 'all';

  // Effective Checkout Items (Uses authenticated Firestore cart if non-empty, or guestCartItems so Buy Now works immediately for everyone)
  const effectiveCheckoutItems = useMemo(
    () => (cartItems.length > 0 ? cartItems : guestCartItems),
    [cartItems, guestCartItems]
  );

  // Add to Cart Handler — Works immediately for both guests and signed-in users, and on Buy Now takes the user straight to the Checkout Page!
  const handleAddToCart = async (
    product: MarketplaceProduct,
    qtyToAdd = 1,
    explicitUser?: User,
    goToCheckoutAfter = false
  ) => {
    // If product was marked out of stock, auto-restock it so Add Cart / Buy Now always works smoothly
    if (product.stockRemaining <= 0) {
      setCatalog((prev) =>
        prev.map((item) =>
          item.id === product.id
            ? { ...item, stockRemaining: Math.max(12, Math.round(item.totalStock * 0.25)) }
            : item
        )
      );
    }

    const activeUser = explicitUser || currentUser;
    const itemId = sanitizeId(product.id);
    const unitPrice = getEffectivePrice(product);
    const cleanQty = Math.min(99, Math.max(1, qtyToAdd));

    // Always update local guestCartItems so Checkout Page is immediately populated
    setGuestCartItems((prev) => {
      const existing = prev.find((c) => c.id === itemId);
      if (existing) {
        return prev.map((c) =>
          c.id === itemId
            ? { ...c, quantity: Math.min(99, c.quantity + cleanQty), price: unitPrice }
            : c
        );
      }
      return [
        ...prev,
        {
          id: itemId,
          userId: activeUser?.uid || 'guest_shopper',
          productId: itemId,
          title: product.title,
          category: product.category,
          dealType: product.dealType,
          price: unitPrice,
          originalPrice: product.originalPrice,
          quantity: cleanQty,
          imageUrl: product.imageUrl,
        },
      ];
    });

    if (!activeUser) {
      if (goToCheckoutAfter) {
        setSelectedProduct(null);
        setActiveBottomTab('cart');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(
          `Proceeding to Checkout for "${product.title}" — Select Payment Option, Coupons & Delivery!`
        );
      } else {
        showToast(
          `Added ${cleanQty}x "${product.title}" (${formatLKR(unitPrice)}) to your Cart!`
        );
      }
      return;
    }

    const itemPath = `users/${activeUser.uid}/cart/${itemId}`;
    const itemRef = doc(db, 'users', activeUser.uid, 'cart', itemId);

    try {
      const existingItem = cartItems.find((c) => c.id === itemId);
      if (existingItem) {
        const nextQty = Math.min(99, existingItem.quantity + cleanQty);
        await updateDoc(itemRef, {
          quantity: nextQty,
          price: unitPrice,
          dealType: product.dealType,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(itemRef, {
          userId: activeUser.uid,
          productId: sanitizeId(product.id),
          title: product.title.slice(0, VALIDATION_LIMITS.MAX_TITLE),
          category: product.category.slice(0, VALIDATION_LIMITS.MAX_CATEGORY),
          dealType: product.dealType,
          price: unitPrice,
          originalPrice: product.originalPrice,
          quantity: cleanQty,
          imageUrl: product.imageUrl.slice(0, VALIDATION_LIMITS.MAX_PHOTO_URL),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      if (goToCheckoutAfter) {
        setSelectedProduct(null);
        setActiveBottomTab('cart');
        window.scrollTo({ top: 0, behavior: 'smooth' });
        showToast(
          `Proceeding to Checkout for "${product.title}" — Select Payment Option, Coupons & Delivery!`
        );
      } else {
        showToast(`Added ${cleanQty}x "${product.title}" (${formatLKR(unitPrice)}) to your cart!`);
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, itemPath);
    }
  };

  // Buy Now Handler — Adds item and jumps straight to the Daraz / AliExpress Checkout Page
  const handleBuyNow = async (product: MarketplaceProduct, qtyToBuy = 1) => {
    await handleAddToCart(product, qtyToBuy, undefined, true);
  };

  // Wishlist Helpers — Check & Toggle Saved Status in Firestore (/users/{userId}/wishlist/{itemId})
  const isProductWishlisted = (productId: string): boolean => {
    const cleanId = sanitizeId(productId);
    return wishlistItems.some((item) => item.id === cleanId || item.productId === cleanId);
  };

  const handleToggleWishlist = async (
    product: MarketplaceProduct,
    e?: React.MouseEvent,
    explicitUser?: User
  ) => {
    if (e) {
      e.stopPropagation();
    }

    const activeUser = explicitUser || currentUser;
    if (!activeUser) {
      setPendingWishlistProduct(product);
      setPendingCartProduct(null);
      setPendingBuyNowMode(false);
      setIsAuthModalOpen(true);
      return;
    }

    const itemId = sanitizeId(product.id);
    const itemPath = `users/${activeUser.uid}/wishlist/${itemId}`;
    const itemRef = doc(db, 'users', activeUser.uid, 'wishlist', itemId);
    const alreadySaved = wishlistItems.some(
      (w) => w.id === itemId || w.productId === itemId
    );

    try {
      if (alreadySaved && !explicitUser) {
        await deleteDoc(itemRef);
        showToast(`Removed "${product.title}" from your Wishlist.`);
      } else {
        const unitPrice = getEffectivePrice(product);
        await setDoc(itemRef, {
          userId: activeUser.uid,
          productId: itemId,
          title: product.title.slice(0, VALIDATION_LIMITS.MAX_TITLE),
          category: product.category.slice(0, VALIDATION_LIMITS.MAX_CATEGORY),
          dealType: product.dealType,
          price: unitPrice,
          originalPrice: product.originalPrice,
          imageUrl: product.imageUrl.slice(0, VALIDATION_LIMITS.MAX_PHOTO_URL),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        showToast(`Saved "${product.title}" to your Wishlist!`);
      }
    } catch (err) {
      handleFirestoreError(
        err,
        alreadySaved && !explicitUser ? OperationType.DELETE : OperationType.WRITE,
        itemPath
      );
    }
  };

  const handleRemoveWishlistItem = async (itemId: string, title: string) => {
    if (!currentUser) return;
    const itemPath = `users/${currentUser.uid}/wishlist/${itemId}`;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'wishlist', itemId));
      showToast(`Removed "${title}" from your Wishlist.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, itemPath);
    }
  };

  const handleUpdateCartQuantity = async (item: FirestoreCartItem, delta: number) => {
    const nextQty = item.quantity + delta;
    setGuestCartItems((prev) => {
      if (nextQty <= 0) return prev.filter((c) => c.id !== item.id);
      return prev.map((c) =>
        c.id === item.id ? { ...c, quantity: Math.min(99, nextQty) } : c
      );
    });

    if (!currentUser) return;
    const itemPath = `users/${currentUser.uid}/cart/${item.id}`;
    const itemRef = doc(db, 'users', currentUser.uid, 'cart', item.id);

    try {
      if (nextQty <= 0) {
        await deleteDoc(itemRef);
      } else if (nextQty <= 99) {
        await updateDoc(itemRef, {
          quantity: nextQty,
          price: item.price,
          dealType: item.dealType,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, itemPath);
    }
  };

  const handleRemoveCartItem = async (itemId: string) => {
    setGuestCartItems((prev) => prev.filter((c) => c.id !== itemId));
    if (!currentUser) return;
    const itemPath = `users/${currentUser.uid}/cart/${itemId}`;
    try {
      await deleteDoc(doc(db, 'users', currentUser.uid, 'cart', itemId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, itemPath);
    }
  };

  const handleClaimNewUserVoucher = async () => {
    if (!currentUser) {
      setPendingCartProduct(null);
      setPendingBuyNowMode(false);
      setIsAuthModalOpen(true);
      return;
    }
    const userPath = `users/${currentUser.uid}`;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), {
        displayName: (
          currentUser.displayName ||
          currentUser.email?.split('@')[0] ||
          'BuyKit Shopper'
        ).slice(0, VALIDATION_LIMITS.MAX_DISPLAY_NAME),
        photoUrl: (currentUser.photoURL || '').slice(0, VALIDATION_LIMITS.MAX_PHOTO_URL),
        newUserDealClaimed: true,
        updatedAt: serverTimestamp(),
      });
      setNewUserDealClaimed(true);
      showToast('New User Welcome Voucher activated! Extra LKR discounts unlocked across all deals.');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, userPath);
    }
  };

  const [lastPlacedTrackableOrder, setLastPlacedTrackableOrder] =
    useState<TrackableOrder | null>(null);

  const handleConfirmCheckoutOrder = async (summary: {
    finalPayableAmount: number;
    couponCode: string;
    couponDiscount: number;
    deliveryFee: number;
    deliveryMethodLabel: string;
    paymentMethodLabel: string;
    suppressAutoRedirect?: boolean;
  }) => {
    if (effectiveCheckoutItems.length === 0) return;

    const cleanPhone = phone.trim().slice(0, VALIDATION_LIMITS.MAX_PHONE);
    const cleanAddress = shippingAddress.trim().slice(0, VALIDATION_LIMITS.MAX_ADDRESS);
    const cleanPostal = postalCode.trim().slice(0, VALIDATION_LIMITS.MAX_POSTAL);

    if (cleanPhone.length < 5 || cleanAddress.length < 5 || cleanPostal.length < 2) {
      showToast('Please enter a valid contact number, delivery address, and postal code.');
      openAccountSettings('address');
      return;
    }

    setCheckoutSubmitting(true);
    const orderCode = `BKP_${Date.now().toString().slice(-6)}`;
    const orderId = sanitizeId(orderCode);
    const totalItemsCount = effectiveCheckoutItems.reduce(
      (acc, item) => acc + item.quantity,
      0
    );
    const summaryText = effectiveCheckoutItems
      .map((c) => `${c.quantity}x ${c.title}`)
      .join(', ')
      .slice(0, VALIDATION_LIMITS.MAX_SUMMARY);
    const cleanItemCount = Math.min(500, Math.max(1, totalItemsCount));
    const cleanTotalAmount = Math.max(1, Math.round(summary.finalPayableAmount));
    const cleanHubName = selectedHubName.slice(0, VALIDATION_LIMITS.MAX_HUB_NAME);
    const cleanSummary = summaryText || 'BuyKit Marketplace Order';

    // If guest user clicks Place Order, create a live demo order
    if (!currentUser) {
      const guestOrder: TrackableOrder = {
        id: orderId,
        userId: 'guest_shopper',
        orderNumber: orderCode,
        summaryTitle: cleanSummary,
        itemCount: cleanItemCount,
        totalAmount: cleanTotalAmount,
        paymentMethod,
        pickupHubName: cleanHubName,
        status: 'preparing',
        createdAtMs: Date.now(),
        isDemoOrder: true,
      };
      setGuestCartItems([]);
      setCheckoutSubmitting(false);
      setLastPlacedTrackableOrder(guestOrder);

      if (!summary.suppressAutoRedirect) {
        setActiveBottomTab('account');
        setTrackingOrder(guestOrder);
      }
      showToast(
        `Order #${orderCode} Placed (${formatLKR(cleanTotalAmount)} via ${summary.paymentMethodLabel})!`
      );
      return;
    }

    const uid = currentUser.uid;
    const privatePath = `users/${uid}/private/info`;
    const orderPath = `users/${uid}/orders/${orderId}`;

    try {
      const privateRef = doc(db, 'users', uid, 'private', 'info');
      const privSnap = await getDoc(privateRef);
      const emailToSave = (userEmail || currentUser.email || 'shopper@buykit.lk').slice(
        0,
        VALIDATION_LIMITS.MAX_EMAIL
      );

      if (privSnap.exists()) {
        await updateDoc(privateRef, {
          email: emailToSave,
          phone: cleanPhone,
          shippingAddress: cleanAddress,
          postalCode: cleanPostal,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(privateRef, {
          userId: uid,
          email: emailToSave,
          phone: cleanPhone,
          shippingAddress: cleanAddress,
          postalCode: cleanPostal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }

      await setDoc(doc(db, 'users', uid, 'orders', orderId), {
        userId: uid,
        orderNumber: orderCode,
        summaryTitle: cleanSummary,
        itemCount: cleanItemCount,
        totalAmount: cleanTotalAmount,
        paymentMethod,
        pickupHubName: cleanHubName,
        status: 'preparing',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      for (const item of cartItems) {
        await deleteDoc(doc(db, 'users', uid, 'cart', item.id));
      }
      setGuestCartItems([]);

      const confirmedOrderObj: TrackableOrder = {
        id: orderId,
        userId: uid,
        orderNumber: orderCode,
        summaryTitle: cleanSummary,
        itemCount: cleanItemCount,
        totalAmount: cleanTotalAmount,
        paymentMethod,
        pickupHubName: cleanHubName,
        status: 'preparing',
        createdAtMs: Date.now(),
      };
      setLastPlacedTrackableOrder(confirmedOrderObj);

      if (!summary.suppressAutoRedirect) {
        setActiveBottomTab('account');
        setTrackingOrder(confirmedOrderObj);
      }
      showToast(
        `Order #${orderCode} Placed (${formatLKR(cleanTotalAmount)} via ${summary.paymentMethodLabel})!`
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, `${privatePath} | ${orderPath}`);
    } finally {
      setCheckoutSubmitting(false);
    }
  };

  const handleCancelOrder = async (order: TrackableOrder) => {
    if (
      !currentUser ||
      order.isDemoOrder ||
      (order.status !== 'processing' && order.status !== 'preparing')
    ) {
      return;
    }
    const orderPath = `users/${currentUser.uid}/orders/${order.id}`;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'orders', order.id), {
        status: 'cancelled',
        updatedAt: serverTimestamp(),
      });
      showToast(`Order #${order.orderNumber} has been cancelled.`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, orderPath);
    }
  };

  const handleUpdateOrderTrackingStage = async (
    order: TrackableOrder,
    nextStage: OrderTrackingStageKey
  ) => {
    if (!currentUser || order.isDemoOrder || order.status === 'cancelled') return;
    if (order.status === 'delivered') return;

    const orderPath = `users/${currentUser.uid}/orders/${order.id}`;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid, 'orders', order.id), {
        status: nextStage,
        updatedAt: serverTimestamp(),
      });
      const stageLabel = getStageLabelFromStatus(nextStage);
      showToast(`Order #${order.orderNumber} tracking updated to "${stageLabel}"!`);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, orderPath);
    }
  };

  const handleOpenDemoTrackingModal = () => {
    setTrackingOrder({
      id: 'demo_order_bkp_849201',
      userId: currentUser?.uid || 'guest_preview',
      orderNumber: 'BKP_849201',
      summaryTitle:
        '1x SonicFlow Titanium Studio ANC Wireless Headphones, 1x PowerCore 160W GaN Charger',
      itemCount: 2,
      totalAmount: 21400,
      paymentMethod: 'cod',
      pickupHubName: selectedHubName,
      status: 'in_transit',
      createdAtMs: Date.now() - 11 * 3600 * 1000,
      isDemoOrder: true,
    });
  };

  const handleSaveAddressToFirestore = async () => {
    if (!currentUser) return;
    const uid = currentUser.uid;
    const cleanPhone = phone.trim().slice(0, VALIDATION_LIMITS.MAX_PHONE);
    const cleanAddress = shippingAddress.trim().slice(0, VALIDATION_LIMITS.MAX_ADDRESS);
    const cleanPostal = postalCode.trim().slice(0, VALIDATION_LIMITS.MAX_POSTAL);

    if (cleanPhone.length < 5 || cleanAddress.length < 5 || cleanPostal.length < 2) {
      showToast('Please enter a valid Sri Lanka phone number, street address, and postal code.');
      return;
    }

    const privatePath = `users/${uid}/private/info`;
    try {
      const privateRef = doc(db, 'users', uid, 'private', 'info');
      const privSnap = await getDoc(privateRef);
      const userEmail = (currentUser.email || 'shopper@buykit.lk').slice(
        0,
        VALIDATION_LIMITS.MAX_EMAIL
      );
      if (privSnap.exists()) {
        await updateDoc(privateRef, {
          email: userEmail,
          phone: cleanPhone,
          shippingAddress: cleanAddress,
          postalCode: cleanPostal,
          updatedAt: serverTimestamp(),
        });
      } else {
        await setDoc(privateRef, {
          userId: uid,
          email: userEmail,
          phone: cleanPhone,
          shippingAddress: cleanAddress,
          postalCode: cleanPostal,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      showToast('Saved your default Sri Lanka delivery address & contact details!');
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, privatePath);
    }
  };

  const totalCartUnits = effectiveCheckoutItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const activeCountryObj =
    COUNTRIES_WITH_FLAGS.find((c) => c.code === selectedCountryCode) ||
    COUNTRIES_WITH_FLAGS[0];
  const activeLanguageObj =
    LANGUAGES_LIST.find((l) => l.code === selectedLanguageCode) ||
    LANGUAGES_LIST[0];
  const t = getTranslations(selectedLanguageCode);

  const hasActivePriceFilter =
    pricePreset !== 'all' || minPriceInput.trim() !== '' || maxPriceInput.trim() !== '';

  const activePriceFilterText = useMemo(() => {
    if (pricePreset === 'under_10k') return 'Price: Under Rs. 10,000';
    if (pricePreset === '10k_to_25k') return 'Price: Rs. 10K – 25K';
    if (pricePreset === '25k_to_50k') return 'Price: Rs. 25K – 50K';
    if (pricePreset === 'above_50k') return 'Price: Above Rs. 50,000';
    if (minPriceInput.trim() !== '' || maxPriceInput.trim() !== '') {
      return `Price: Rs. ${minPriceInput.trim() || '0'} – ${maxPriceInput.trim() || 'Any'}`;
    }
    return 'Price Filter (LKR)';
  }, [pricePreset, minPriceInput, maxPriceInput]);

  // Horizontal Scrollable Categories Strip Component
  const renderHorizontalCategoriesAndFilterBar = () => (
    <div className="mb-5">
      {/* HORIZONTAL SCROLLABLE CATEGORIES BAR ("categaris tika හරහට දාන්න, හරහට scroll කරන්නපුලුවන් වෙන්න්අ") */}
      <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
        <div className="mb-2.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <LayoutGrid className="h-4 w-4 text-[#F85606]" />
            <span className="font-display text-xs font-bold tracking-wider text-slate-900 uppercase">
              Categories · Swipe / Scroll Horizontally
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {selectedCategory !== 'all' && (
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className="mr-2 text-xs font-semibold text-[#F85606] hover:underline"
              >
                Show All ({catalog.length})
              </button>
            )}
            <button
              type="button"
              onClick={() => handleScrollCategories('left')}
              aria-label="Scroll categories left"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => handleScrollCategories('right')}
              aria-label="Scroll categories right"
              className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 transition-colors hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Single-Row Horizontal Scrollable Flex Strip with Illustrative Thumbnails & Micro-Badges */}
        <div
          ref={categoryScrollRef}
          className="flex flex-nowrap items-center gap-2.5 overflow-x-auto scroll-smooth pb-1.5"
        >
          {/* All Categories Card with Showcase Thumbnail */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedDealFilter('all');
            }}
            className={`group flex min-w-[188px] shrink-0 snap-start items-center gap-3 rounded-xl border p-2 text-left transition-all ${
              selectedCategory === 'all' && selectedDealFilter === 'all'
                ? 'border-[#F85606] bg-[#FFF3EB] text-[#F85606] shadow-2xs ring-1 ring-[#F85606]/30'
                : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-orange-300 hover:bg-white'
            }`}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
              <SmartImage
                src={HERO_BANNER_IMAGE}
                alt="All Categories"
                className="h-full w-full object-cover"
              />
              <span
                className={`absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-md shadow-2xs ${
                  selectedCategory === 'all' && selectedDealFilter === 'all'
                    ? 'bg-[#F85606] text-white'
                    : 'bg-slate-900/85 text-white'
                }`}
              >
                <LayoutGrid className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">All Categories</p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                Full Mall Directory
              </p>
              <p className="font-mono text-[10px] font-bold text-[#F85606]">
                {catalog.length} Products
              </p>
            </div>
          </motion.button>

          {/* 6 Main Product Departments with Illustrative Product Thumbnails + Corner Icon Badges */}
          {DEPARTMENTS.map((dept) => {
            const meta = DEPARTMENT_META[dept];
            const IconComponent = meta.icon;
            const deptProducts = catalog.filter((p) => p.category === dept);
            const deptCount = deptProducts.length;
            const representativeThumb = deptProducts[0]?.imageUrl || meta.thumbnailUrl;
            const isSelected = selectedCategory === dept;

            return (
              <motion.button
                key={dept}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.98 }}
                type="button"
                onClick={() => setSelectedCategory(dept)}
                className={`group flex min-w-[192px] shrink-0 snap-start items-center gap-3 rounded-xl border p-2 text-left transition-all ${
                  isSelected
                    ? 'border-[#F85606] bg-[#FFF3EB] text-[#F85606] shadow-2xs ring-1 ring-[#F85606]/30'
                    : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-orange-300 hover:bg-white'
                }`}
              >
                <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-2xs">
                  <SmartImage
                    src={representativeThumb}
                    alt={meta.shortLabel}
                    className="h-full w-full object-cover"
                  />
                  <span
                    className={`absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-md bg-gradient-to-br ${meta.accentColor} text-white shadow-2xs`}
                  >
                    <IconComponent className="h-2.5 w-2.5" />
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-extrabold">{meta.shortLabel}</p>
                  <p className="truncate text-[10px] font-medium text-slate-500">
                    {meta.subtitle}
                  </p>
                  <p className="font-mono text-[10px] font-bold text-[#F85606]">
                    {deptCount} Items
                  </p>
                </div>
              </motion.button>
            );
          })}

          {/* Extra Scrollable Deal Channels in the Same Horizontal Row with Illustrative Thumbnails */}
          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedDealFilter('flash_sale');
            }}
            className={`group flex min-w-[188px] shrink-0 snap-start items-center gap-3 rounded-xl border p-2 text-left transition-all ${
              selectedDealFilter === 'flash_sale'
                ? 'border-[#F85606] bg-[#FFF3EB] text-[#F85606] shadow-2xs ring-1 ring-[#F85606]/30'
                : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-orange-300 hover:bg-white'
            }`}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-orange-200 bg-white shadow-2xs">
              <SmartImage
                src="/src/assets/images/promo_poster_mega_sale_1794319674629.jpg"
                alt="Flash Sale"
                className="h-full w-full object-cover"
              />
              <span className="absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-md bg-[#F85606] text-white shadow-2xs">
                <Zap className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">Flash Sale</p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                Limited Time
              </p>
              <p className="font-mono text-[10px] font-bold text-[#F85606]">
                Daily SuperDeals
              </p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedDealFilter('new_user');
            }}
            className={`group flex min-w-[188px] shrink-0 snap-start items-center gap-3 rounded-xl border p-2 text-left transition-all ${
              selectedDealFilter === 'new_user'
                ? 'border-[#F85606] bg-[#FFF3EB] text-[#F85606] shadow-2xs ring-1 ring-[#F85606]/30'
                : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-orange-300 hover:bg-white'
            }`}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-orange-200 bg-white shadow-2xs">
              <SmartImage
                src="/src/assets/images/promo_poster_flash_festival_1794319675114.jpg"
                alt="New User Zone"
                className="h-full w-full object-cover"
              />
              <span className="absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-md bg-[#F85606] text-white shadow-2xs">
                <Tag className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">New User Zone</p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                Starter Perks
              </p>
              <p className="font-mono text-[10px] font-bold text-[#F85606]">
                Up to 65% Off
              </p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => {
              setSelectedCategory('all');
              setSelectedDealFilter('choice_bundle');
            }}
            className={`group flex min-w-[188px] shrink-0 snap-start items-center gap-3 rounded-xl border p-2 text-left transition-all ${
              selectedDealFilter === 'choice_bundle'
                ? 'border-[#F85606] bg-[#FFF3EB] text-[#F85606] shadow-2xs ring-1 ring-[#F85606]/30'
                : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-orange-300 hover:bg-white'
            }`}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-emerald-200 bg-white shadow-2xs">
              <SmartImage
                src="/src/assets/images/promo_poster_home_lifestyle_1794319676096.jpg"
                alt="Choice Bundles"
                className="h-full w-full object-cover"
              />
              <span className="absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-md bg-emerald-600 text-white shadow-2xs">
                <ShieldCheck className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">Choice Bundles</p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                Combo Deals
              </p>
              <p className="font-mono text-[10px] font-bold text-emerald-700">
                Free Delivery
              </p>
            </div>
          </motion.button>

          <motion.button
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.98 }}
            type="button"
            onClick={() => handleSelectPricePreset('under_10k')}
            className={`group flex min-w-[188px] shrink-0 snap-start items-center gap-3 rounded-xl border p-2 text-left transition-all ${
              pricePreset === 'under_10k'
                ? 'border-[#F85606] bg-[#FFF3EB] text-[#F85606] shadow-2xs ring-1 ring-[#F85606]/30'
                : 'border-slate-200 bg-slate-50/70 text-slate-800 hover:border-orange-300 hover:bg-white'
            }`}
          >
            <div className="relative h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-amber-200 bg-white shadow-2xs">
              <SmartImage
                src="/src/assets/images/product_powerbank_charger_1794123346828.jpg"
                alt="Under Rs. 10,000"
                className="h-full w-full object-cover"
              />
              <span className="absolute right-0.5 bottom-0.5 flex h-4 w-4 items-center justify-center rounded-md bg-amber-500 text-white shadow-2xs">
                <Star className="h-2.5 w-2.5" />
              </span>
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-extrabold">Under Rs. 10,000</p>
              <p className="truncate text-[10px] font-medium text-slate-500">
                Value Picks
              </p>
              <p className="font-mono text-[10px] font-bold text-amber-700">
                Budget Savers
              </p>
            </div>
          </motion.button>
        </div>
      </div>
    </div>
  );

  // Framer Motion Stagger Container & Card Pop-In Variants
  const gridFilterSignature = `${activeBottomTab}|${selectedCategory}|${selectedDealFilter}|${searchQuery
    .trim()
    .toLowerCase()}|${pricePreset}|${minPriceInput}|${maxPriceInput}|${minRatingFilter}|${stockFilter}|${sortBy}`;

  const productGridContainerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.045,
        delayChildren: 0.02,
      },
    },
  };

  const productCardItemVariants = {
    hidden: {
      opacity: 0,
      scale: 0.9,
      y: 20,
    },
    visible: {
      opacity: 1,
      scale: 1,
      y: 0,
      transition: {
        type: 'spring' as const,
        stiffness: 360,
        damping: 25,
        mass: 0.7,
      },
    },
  };

  // Clean Daraz / AliExpress Product Card showing in order:
  // 1. Main Image (with Top-Left Green "In Stock" / Red "Out of Stock" & Bottom-Left "-XX% OFF" badge)
  // 2. Product Name directly below the image
  // 3. Clear, prominent LKR Price right after the product name
  // 4. Discounts (Save Rs. ... + Deal discount badge)
  // 5. Free Delivery status & Stock status
  const renderProductCard = (product: MarketplaceProduct) => {
    const effectivePrice = getEffectivePrice(product);
    const discountPercent = Math.round(
      ((product.originalPrice - effectivePrice) / product.originalPrice) * 100
    );
    const discountSavings = Math.max(0, product.originalPrice - effectivePrice);
    const isInStock = product.stockRemaining > 0;

    return (
      <motion.article
        key={product.id}
        variants={productCardItemVariants}
        whileHover={{ y: -4 }}
        onClick={() => openProductDetails(product)}
        className={`group flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border bg-white transition-all duration-200 hover:shadow-lg ${
          isInStock
            ? 'border-slate-200 hover:border-[#F85606]'
            : 'border-red-200/90 bg-red-50/10 hover:border-red-400'
        }`}
      >
        {/* 1. MAIN IMAGE AT TOP + TOP-LEFT STOCK STATUS + DISCOUNT % BADGE */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#F4F3EF]">
          <SmartImage
            src={product.imageUrl}
            alt={product.title}
            className={`h-full w-full object-cover ${
              !isInStock ? 'opacity-80 grayscale-[20%]' : ''
            }`}
          />

          {/* TOP-LEFT CORNER: IN STOCK (Green) / OUT OF STOCK (Red) Badge */}
          <button
            type="button"
            onClick={(e) => handleToggleProductStock(product.id, e)}
            title="Click to toggle In Stock (Green) / Out of Stock (Red)"
            className={`absolute top-2 left-2 z-10 inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-extrabold tracking-wide text-white uppercase shadow-sm transition-colors ${
              isInStock
                ? 'border border-emerald-300/70 bg-emerald-600 hover:bg-emerald-700'
                : 'border border-red-300/70 bg-red-600 hover:bg-red-700'
            }`}
          >
            <span>{isInStock ? t.inStock : t.outOfStock}</span>
          </button>

          {/* BOTTOM-LEFT: Discount Percentage Badge */}
          <div className="absolute bottom-2 left-2 rounded-md bg-[#F85606] px-2 py-0.5 font-mono text-[11px] font-extrabold text-white shadow-2xs">
            -{discountPercent}% OFF
          </div>
        </div>

        {/* 2. PRODUCT NAME DIRECTLY BELOW IMAGE, FOLLOWED CLEARLY BY PRICE, DISCOUNTS & FREE DELIVERY */}
        <div className="flex flex-1 flex-col justify-between space-y-2 p-3">
          {/* Product Name right below the image */}
          <h3 className="line-clamp-2 min-h-[2.25rem] font-display text-xs font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#F85606] sm:text-sm">
            {product.title}
          </h3>

          {/* Clear Prominent Price right below Product Name */}
          <div className="font-mono tabular-nums">
            <div className="flex flex-wrap items-baseline gap-1.5">
              <span className="text-lg font-extrabold tracking-tight text-[#F85606] sm:text-xl">
                {formatLKR(effectivePrice)}
              </span>
              {product.originalPrice > effectivePrice && (
                <span className="text-xs font-medium text-slate-400 line-through">
                  {formatLKR(product.originalPrice)}
                </span>
              )}
            </div>
          </div>

          {/* Discounts (වට්ටම් ටික) */}
          <div className="flex flex-wrap items-center gap-1">
            <span className="inline-flex items-center rounded-md bg-[#FFF3EB] px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-[#F85606]">
              {t.youSave} {formatLKR(discountSavings)}
            </span>
            <span className="inline-flex items-center rounded-md bg-orange-50 px-1.5 py-0.5 text-[10px] font-bold text-orange-700">
              {product.dealLabel}
            </span>
          </div>

          {/* Free Delivery Status & Stock Status Row */}
          <div className="flex items-center justify-between gap-1.5 border-t border-slate-100 pt-2">
            {product.freeShipping ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-extrabold text-emerald-700">
                <Truck className="h-3 w-3 shrink-0 text-emerald-600" />
                <span>{t.freeDelivery}</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                <Truck className="h-3 w-3 shrink-0 text-slate-500" />
                <span>{t.paidDelivery}</span>
              </span>
            )}

            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-extrabold uppercase ${
                isInStock
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'bg-red-50 text-red-700'
              }`}
            >
              {isInStock ? t.inStock : t.outOfStock}
            </span>
          </div>
        </div>
      </motion.article>
    );
  };

  // Staggered Product Grid Wrapper — pops cards in sequence on category/search/filter navigation
  const renderStaggeredProductGrid = (
    products: MarketplaceProduct[],
    sectionId: string,
    columnsClass = 'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6'
  ) => (
    <motion.div
      key={`${sectionId}-${gridFilterSignature}`}
      variants={productGridContainerVariants}
      initial="hidden"
      animate="visible"
      className={columnsClass}
    >
      {products.map((product) => renderProductCard(product))}
    </motion.div>
  );

  const activeBanner = adminBanners[heroSlideIndex] || adminBanners[0];
  const topSellingShowcaseProducts = useMemo(
    () => [...catalog].sort((a, b) => b.soldCount - a.soldCount).slice(0, 4),
    [catalog]
  );

  const handleOpenBannerProduct = (banner: AdminPromoBanner) => {
    const matched = catalog.find((p) => p.id === banner.productId) || catalog[0];
    openProductDetails(matched);
  };

  return (
    <div className="min-h-screen bg-[#F5F5F7] pb-24 text-slate-900">
      {/* Dismissible Notification Toast */}
      <AnimatePresence>
        {toastBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="sticky top-0 z-50 flex items-center justify-between border-b border-orange-200 bg-[#FFF3EB] px-6 py-2.5 text-xs font-medium text-slate-900 shadow-xs"
          >
            <span>{toastBanner}</span>
            <button
              onClick={() => setToastBanner(null)}
              className="ml-4 text-slate-600 hover:text-slate-950"
            >
              <X className="h-4 w-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Navigation Bar with Official BuyKit Logo */}
      <header className="sticky top-0 z-40 flex items-center justify-between gap-6 border-b border-slate-200 bg-white px-4 py-2.5 shadow-2xs sm:px-6 lg:px-10">
        {/* Zone 1: Official BuyKit Logo + Wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveBottomTab('home');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className="flex items-center gap-2.5 whitespace-nowrap shrink-0"
        >
          <BuyKitLogoBadge size="md" />
          <div className="flex flex-col">
            <span className="font-display text-xl font-extrabold tracking-tight text-slate-950 sm:text-2xl">
              buy<span className="text-[#F85606]">kit</span>{' '}
              <span className="text-sm font-semibold text-slate-500">with Pramu</span>
            </span>
          </div>
        </a>

        {/* Zone 2: 5 concise single-line text navigation links */}
        <nav className="hidden items-center gap-7 text-sm font-medium text-slate-700 md:flex">
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('home');
              setSelectedDealFilter('flash_sale');
            }}
            className="transition-colors hover:text-[#F85606] hover:underline whitespace-nowrap shrink-0"
          >
            Flash Sale
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('shop');
              setSelectedDealFilter('all');
            }}
            className="transition-colors hover:text-[#F85606] hover:underline whitespace-nowrap shrink-0"
          >
            {t.allProducts} ({catalog.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveBottomTab('buykit')}
            className="transition-colors hover:text-[#F85606] hover:underline whitespace-nowrap shrink-0"
          >
            {t.buykitHub}
          </button>
          <button
            type="button"
            onClick={() => setIsCompareModalOpen(true)}
            className="transition-colors hover:text-[#F85606] hover:underline whitespace-nowrap shrink-0"
          >
            {t.compare} ({compareIds.length}/{MAX_COMPARE_PRODUCTS})
          </button>
          <button
            type="button"
            onClick={() => setIsPickupMapOpen(true)}
            className="transition-colors hover:text-[#F85606] hover:underline whitespace-nowrap shrink-0"
          >
            {t.pickupHubs}
          </button>
        </nav>

        {/* Zone 3: Top-Right Low-Data Mode Toggle, Country Flag + Language, Settings & Cart / Login CTA */}
        <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
          <button
            type="button"
            onClick={handleToggleLowConnectionMode}
            title="Toggle Lite / Low-Connection Data Saver Mode"
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-[11px] font-extrabold transition-colors whitespace-nowrap shrink-0 ${
              isLowConnectionMode
                ? 'border-emerald-300 bg-emerald-50 text-emerald-800'
                : 'border-slate-200 bg-slate-50 text-slate-600 hover:border-[#F85606] hover:text-[#F85606]'
            }`}
          >
            <Zap className={`h-3.5 w-3.5 ${isLowConnectionMode ? 'text-emerald-600' : 'text-[#F85606]'}`} />
            <span>{isLowConnectionMode ? 'Lite: ON' : 'Lite Mode'}</span>
          </button>

          <button
            type="button"
            onClick={() => openAccountSettings('country_language')}
            title="Select Country (with Flag) & Language"
            className="hidden items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-bold text-slate-700 transition-colors hover:border-[#F85606] hover:bg-[#FFF3EB] sm:inline-flex"
          >
            <img
              src={activeCountryObj.flagUrl}
              alt={activeCountryObj.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              className="h-3.5 w-5 rounded-xs object-cover"
            />
            <span>{activeCountryObj.code}</span>
            <span className="text-slate-300">|</span>
            <span className="text-[#F85606]">{activeLanguageObj.nativeLabel}</span>
          </button>

          <button
            type="button"
            onClick={() => openAccountSettings('profile')}
            aria-label="Account Settings"
            title="Account Settings: Profile, Address, Country, Language & Credit/Debit Cards"
            className="inline-flex items-center justify-center rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-700 transition-colors hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]"
          >
            <Settings className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => setActiveBottomTab('cart')}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFB800] px-3 py-2 text-xs font-extrabold text-slate-950 transition-colors hover:bg-[#e5a600] whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="h-4 w-4" />
            <span>{t.checkout} ({totalCartUnits})</span>
          </button>

          {currentUser ? (
            <button
              type="button"
              onClick={() => setActiveBottomTab('account')}
              className="hidden items-center gap-1.5 rounded-lg bg-[#F85606] px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0 md:inline-flex"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>{currentUser.displayName?.split(' ')[0] || t.account}</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setPendingCartProduct(null);
                setPendingBuyNowMode(false);
                setIsAuthModalOpen(true);
              }}
              className="hidden items-center gap-1.5 rounded-lg bg-[#F85606] px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0 md:inline-flex"
            >
              <UserIcon className="h-3.5 w-3.5" />
              <span>{t.signIn}</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Wide Daraz / AliExpress Storefront Container */}
      <main id="top" className="mx-auto max-w-[1540px] px-3 py-5 sm:px-6 lg:px-8">
        {/* Global Search Bar + Tools + Filters (Hidden on Account & Cart/Checkout Tabs) */}
        {activeBottomTab !== 'account' && activeBottomTab !== 'cart' && (
          <div className="mb-4 rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 items-center overflow-hidden rounded-lg border-2 border-[#F85606] bg-white">
              <Search className="ml-3.5 h-4 w-4 shrink-0 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (activeBottomTab !== 'home' && activeBottomTab !== 'shop') {
                    setActiveBottomTab('shop');
                  }
                }}
                placeholder={t.searchPlaceholder}
                className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 focus:outline-none"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="px-2 text-xs font-medium text-slate-400 hover:text-slate-700"
                >
                  {t.clearBtn}
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const catalogEl = document.getElementById('catalog');
                  if (catalogEl) {
                    catalogEl.scrollIntoView({ behavior: 'smooth' });
                  }
                }}
                className="bg-[#F85606] px-5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0"
              >
                {t.searchBtn}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setIsPickupMapOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-medium text-slate-700 hover:bg-slate-100 whitespace-nowrap shrink-0"
              >
                <MapPin className="h-3.5 w-3.5 text-[#F85606]" />
                <span>Hub: {selectedHubName}</span>
              </button>

              {currentUser && (
                <button
                  type="button"
                  onClick={() => signOutAccount()}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 whitespace-nowrap shrink-0"
                >
                  <LogOut className="h-3.5 w-3.5" />
                  <span>{t.logout}</span>
                </button>
              )}
            </div>
          </div>

          {/* Price Filter Button, Stock Availability Filters & Quick Search Keywords right below the Search Bar */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
            {/* Left: Price Filter Toggle Button + In Stock (Green) / Out of Stock (Red) Filter Buttons */}
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setIsPriceFilterOpen((prev) => !prev)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  isPriceFilterOpen || hasActivePriceFilter
                    ? 'border-[#F85606] bg-[#F85606] text-white shadow-2xs'
                    : 'border-orange-200 bg-[#FFF3EB] text-[#F85606] hover:bg-orange-100'
                }`}
              >
                <SlidersHorizontal className="h-3.5 w-3.5" />
                <span>{activePriceFilterText}</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform duration-200 ${
                    isPriceFilterOpen ? 'rotate-180' : ''
                  }`}
                />
              </button>

              {/* In Stock (Green) & Out of Stock (Red) Quick Filter Buttons */}
              <button
                type="button"
                onClick={() =>
                  setStockFilter((prev) => (prev === 'in_stock' ? 'all' : 'in_stock'))
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  stockFilter === 'in_stock'
                    ? 'border-emerald-600 bg-emerald-600 text-white shadow-2xs'
                    : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                }`}
              >
                <span>
                  {t.inStock} ({catalog.filter((p) => p.stockRemaining > 0).length})
                </span>
              </button>

              <button
                type="button"
                onClick={() =>
                  setStockFilter((prev) =>
                    prev === 'out_of_stock' ? 'all' : 'out_of_stock'
                  )
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  stockFilter === 'out_of_stock'
                    ? 'border-red-600 bg-red-600 text-white shadow-2xs'
                    : 'border-red-200 bg-red-50 text-red-700 hover:bg-red-100'
                }`}
              >
                <span>
                  {t.outOfStock} ({catalog.filter((p) => p.stockRemaining <= 0).length})
                </span>
              </button>

              <button
                type="button"
                onClick={() => setIsCompareModalOpen(true)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-bold transition-all whitespace-nowrap shrink-0 ${
                  compareIds.length > 0
                    ? 'border-[#F85606] bg-[#F85606] text-white shadow-2xs'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:bg-[#FFF3EB] hover:text-[#F85606]'
                }`}
              >
                <Scale className="h-3.5 w-3.5" />
                <span>
                  {t.compare} ({compareIds.length}/{MAX_COMPARE_PRODUCTS})
                </span>
              </button>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 whitespace-nowrap shrink-0"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  <span>{t.resetFilters}</span>
                </button>
              )}
            </div>

            {/* Right: Popular Searches */}
            <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
              <span className="font-semibold text-slate-400">{t.popularSearches}</span>
              {QUICK_SEARCH_TAGS.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setSearchQuery(tag === searchQuery ? '' : tag)}
                  className={`rounded-md px-2 py-0.5 font-medium transition-colors whitespace-nowrap shrink-0 ${
                    searchQuery.toLowerCase() === tag.toLowerCase()
                      ? 'bg-[#F85606] text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-[#F85606]'
                  }`}
                >
                  {tag}
                </button>
              ))}
            </div>
          </div>

          {/* Collapsible LKR Price Filter & Sort Panel right under the Price Filter button */}
          <AnimatePresence>
            {isPriceFilterOpen && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.16 }}
                className="mt-3 rounded-xl border border-orange-200 bg-[#FFF8F4] p-3.5"
              >
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-12 lg:items-center">
                  {/* LKR Price Range Presets */}
                  <div className="space-y-1.5 lg:col-span-6">
                    <span className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                      LKR Price Filter (Quick Ranges)
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {(
                        [
                          { id: 'all', label: 'All Prices' },
                          { id: 'under_10k', label: 'Under Rs. 10,000' },
                          { id: '10k_to_25k', label: 'Rs. 10K – 25K' },
                          { id: '25k_to_50k', label: 'Rs. 25K – 50K' },
                          { id: 'above_50k', label: 'Above Rs. 50,000' },
                        ] as const
                      ).map((preset) => (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => handleSelectPricePreset(preset.id)}
                          className={`rounded-lg px-2.5 py-1.5 text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                            pricePreset === preset.id
                              ? 'bg-[#F85606] text-white shadow-2xs'
                              : 'border border-slate-200 bg-white text-slate-700 hover:border-orange-300'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Exact Min / Max LKR Price Inputs */}
                  <div className="space-y-1.5 lg:col-span-3">
                    <span className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                      Custom Price Range (Rs.)
                    </span>
                    <div className="flex items-center gap-2 font-mono text-xs tabular-nums">
                      <input
                        type="number"
                        min={0}
                        placeholder="Min Rs."
                        value={minPriceInput}
                        onChange={(e) => {
                          setPricePreset('custom');
                          setMinPriceInput(e.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                      <span className="text-slate-400">–</span>
                      <input
                        type="number"
                        min={0}
                        placeholder="Max Rs."
                        value={maxPriceInput}
                        onChange={(e) => {
                          setPricePreset('custom');
                          setMaxPriceInput(e.target.value);
                        }}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Sort & Rating Filter */}
                  <div className="space-y-1.5 lg:col-span-3">
                    <span className="block text-[11px] font-bold tracking-wider text-slate-600 uppercase">
                      Sort & Rating Filter
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-800 focus:border-[#F85606] focus:outline-none"
                      >
                        <option value="popular">Sort: Best Selling</option>
                        <option value="price_asc">Price: Low to High (LKR)</option>
                        <option value="price_desc">Price: High to Low (LKR)</option>
                        <option value="discount">Biggest Discount %</option>
                        <option value="rating">Highest Rated (★)</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => setMinRatingFilter((prev) => (prev === 4.9 ? 0 : 4.9))}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap shrink-0 transition-colors ${
                          minRatingFilter >= 4.9
                            ? 'border-amber-500 bg-amber-50 text-amber-800'
                            : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        ★ 4.9+
                      </button>

                      <button
                        type="button"
                        onClick={() => setIsPriceFilterOpen(false)}
                        className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
                      >
                        Done
                      </button>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          </div>
        )}

        {/* =========================================================
            TAB 1: HOME TAB (Horizontal Scrollable Categories + Admin Visual Deal & Best-Seller Showcase + Dense Rows)
           ========================================================= */}
        {activeBottomTab === 'home' && (
          <>
            {/* Horizontal Scrollable Categories Row & Price/Search Filter Bar */}
            {renderHorizontalCategoriesAndFilterBar()}

            {/* Admin-Curated Featured Sales, Discounts & Top-Selling Products Visual Banner Showcase */}
            <section className="mb-8 grid grid-cols-1 gap-4 lg:grid-cols-12">
              {/* Left 7 Columns: Image-First Admin Featured Deal & Best-Seller Photo Slider + Thumbnail Strip */}
              <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-3 shadow-2xs sm:p-4 lg:col-span-7">
                <div className="mb-2.5 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Zap className="h-4 w-4 text-[#F85606]" />
                    <span className="font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                      Featured Sales, Mega Discounts & Best-Selling Products
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        setHeroSlideIndex(
                          (prev) => (prev - 1 + adminBanners.length) % adminBanners.length
                        )
                      }
                      aria-label="Previous sale banner"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#F85606] hover:text-[#F85606]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setHeroSlideIndex((prev) => (prev + 1) % adminBanners.length)
                      }
                      aria-label="Next sale banner"
                      className="flex h-7 w-7 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#F85606] hover:text-[#F85606]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Main Clickable Product / Discount Visual Banner */}
                <div className="relative overflow-hidden rounded-xl border border-orange-200/80 bg-[#FFF8F4]">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeBanner.id}
                      initial={{ opacity: 0, x: 18 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -18 }}
                      transition={{ duration: 0.28 }}
                      onClick={() => handleOpenBannerProduct(activeBanner)}
                      className="group grid cursor-pointer grid-cols-1 items-center sm:grid-cols-12"
                    >
                      {/* Prominent Product Photo Showcase */}
                      <div className="relative aspect-16/10 w-full overflow-hidden bg-[#F4F3EF] sm:col-span-6 sm:aspect-4/3">
                        <SmartImage
                          src={activeBanner.imageUrl}
                          alt={activeBanner.headline}
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute top-2.5 left-2.5 rounded-lg bg-[#F85606] px-2.5 py-1 font-mono text-xs font-extrabold text-white shadow-sm">
                          {activeBanner.discountBadge}
                        </div>
                        <div className="absolute right-2.5 bottom-2.5 rounded-md bg-slate-950/85 px-2.5 py-1 font-mono text-[11px] font-bold text-amber-300">
                          🔥 {activeBanner.soldLabel}
                        </div>
                      </div>

                      {/* Deal Price, Discount & Quick Action Card */}
                      <div className="flex flex-col justify-between p-4 sm:col-span-6 sm:p-5">
                        <div className="space-y-2">
                          <span className="inline-block rounded-md bg-orange-100 px-2.5 py-0.5 text-[11px] font-extrabold tracking-wide text-[#F85606] uppercase">
                            {activeBanner.campaignTag}
                          </span>
                          <h2 className="line-clamp-2 font-display text-lg font-extrabold leading-snug text-slate-950 group-hover:text-[#F85606] sm:text-xl">
                            {activeBanner.headline}
                          </h2>
                          <p className="line-clamp-2 text-xs text-slate-600">
                            {activeBanner.subheadline}
                          </p>
                        </div>

                        <div className="mt-4 border-t border-orange-200/60 pt-3">
                          <div className="flex items-baseline gap-2 font-mono tabular-nums">
                            <span className="text-xl font-extrabold text-[#F85606] sm:text-2xl">
                              {formatLKR(activeBanner.dealPrice)}
                            </span>
                            <span className="text-xs text-slate-400 line-through">
                              {formatLKR(activeBanner.originalPrice)}
                            </span>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const prod =
                                  catalog.find((p) => p.id === activeBanner.productId) ||
                                  catalog[0];
                                handleAddToCart(prod, 1);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#FFB800] px-3 py-2 text-xs font-extrabold text-slate-950 shadow-2xs hover:bg-[#e5a600]"
                            >
                              <ShoppingBag className="h-3.5 w-3.5" />
                              <span>Add Cart</span>
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const prod =
                                  catalog.find((p) => p.id === activeBanner.productId) ||
                                  catalog[0];
                                handleBuyNow(prod, 1);
                              }}
                              className="inline-flex items-center justify-center gap-1 rounded-lg bg-[#F85606] px-3 py-2 text-xs font-extrabold text-white shadow-2xs hover:bg-[#d94800]"
                            >
                              <Bolt className="h-3.5 w-3.5" />
                              <span>Buy Now</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  </AnimatePresence>
                </div>

                {/* Clickable Horizontal Thumbnail Strip of All Admin Featured Deals & Best-Selling Products */}
                <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
                  {adminBanners.map((banner, idx) => {
                    const isCurrent = idx === heroSlideIndex;
                    return (
                      <button
                        key={banner.id}
                        type="button"
                        onClick={() => setHeroSlideIndex(idx)}
                        className={`flex min-w-[145px] shrink-0 items-center gap-2 rounded-lg border p-1.5 text-left transition-all ${
                          isCurrent
                            ? 'border-[#F85606] bg-[#FFF3EB] shadow-2xs'
                            : 'border-slate-200 bg-slate-50/70 hover:border-orange-300 hover:bg-white'
                        }`}
                      >
                        <SmartImage
                          src={banner.imageUrl}
                          alt={banner.headline}
                          className="h-10 w-10 shrink-0 rounded-md object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[11px] font-bold text-slate-900">
                            {banner.headline}
                          </p>
                          <p className="font-mono text-[10px] font-extrabold text-[#F85606]">
                            {formatLKR(banner.dealPrice)}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right 5 Columns: Top-Selling Products Photo Grid ("වැඩිපුර විකිනෙන products") + New User Voucher */}
              <div className="flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs sm:p-4 lg:col-span-5">
                <div>
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                      🔥 Most Sold Products & Top Discounts
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        setSortBy('popular');
                        setActiveBottomTab('shop');
                      }}
                      className="text-xs font-semibold text-[#F85606] hover:underline"
                    >
                      View All →
                    </button>
                  </div>

                  {/* 2x2 Visual Photo Grid of the 4 Highest-Selling Products (Image -> Product Name -> Clear Price -> Discounts & Free Delivery) */}
                  <div className="grid grid-cols-2 gap-2.5">
                    {topSellingShowcaseProducts.map((prod) => {
                      const effPrice = getEffectivePrice(prod);
                      const discPct = Math.round(
                        ((prod.originalPrice - effPrice) / prod.originalPrice) * 100
                      );
                      const isInStock = prod.stockRemaining > 0;
                      return (
                        <div
                          key={prod.id}
                          onClick={() => openProductDetails(prod)}
                          className="group flex cursor-pointer flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-slate-50/60 p-2.5 transition-all hover:border-[#F85606] hover:bg-white hover:shadow-xs"
                        >
                          <div className="relative aspect-16/10 w-full overflow-hidden rounded-lg bg-white">
                            <SmartImage
                              src={prod.imageUrl}
                              alt={prod.title}
                              className="h-full w-full object-cover"
                            />
                            <span
                              className={`absolute top-1.5 left-1.5 rounded px-1.5 py-0.5 text-[10px] font-extrabold text-white uppercase shadow-2xs ${
                                isInStock ? 'bg-emerald-600' : 'bg-red-600'
                              }`}
                            >
                              {isInStock ? 'In Stock' : 'Out of Stock'}
                            </span>
                            <span className="absolute bottom-1.5 left-1.5 rounded bg-[#F85606] px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white">
                              -{discPct}% OFF
                            </span>
                          </div>
                          <h3 className="mt-2 line-clamp-2 min-h-[2rem] font-display text-xs font-bold leading-snug text-slate-900 transition-colors group-hover:text-[#F85606]">
                            {prod.title}
                          </h3>
                          <div className="mt-1 flex items-baseline gap-1.5 font-mono tabular-nums">
                            <span className="text-sm font-extrabold text-[#F85606] sm:text-base">
                              {formatLKR(effPrice)}
                            </span>
                            <span className="text-[10px] text-slate-400 line-through">
                              {formatLKR(prod.originalPrice)}
                            </span>
                          </div>
                          <div className="mt-1 flex items-center justify-between gap-1">
                            {prod.freeShipping ? (
                              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-700">
                                <Truck className="h-2.5 w-2.5" />
                                <span>Free Delivery</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                                <span>Paid Delivery</span>
                              </span>
                            )}
                            <span className="rounded bg-[#FFF3EB] px-1.5 py-0.5 font-mono text-[9px] font-bold text-[#F85606]">
                              Save {formatLKR(prod.originalPrice - effPrice)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Compact New User Starter Voucher Strip */}
                <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-[#FFF3EB] p-3">
                  <div>
                    <p className="text-xs font-extrabold text-[#F85606] uppercase">
                      New User Exclusive · Up to 65% Off
                    </p>
                    <p className="text-[11px] text-slate-600">
                      Save up to Rs. 41,000 across all {catalog.length}+ LKR deals
                    </p>
                  </div>
                  {newUserDealClaimed ? (
                    <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span>Pass Active</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={handleClaimNewUserVoucher}
                      className="rounded-lg bg-[#F85606] px-3.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#d94800]"
                    >
                      {currentUser ? 'Claim Pass' : 'Login to Claim'}
                    </button>
                  )}
                </div>
              </div>
            </section>

            {/* Animated Promotional Posters & Creative Sales Spotlight (Daraz / AliExpress Storefront Vibe) */}
            <StorefrontPromoAndSalesShowcase
              promoPosters={promoPosters}
              creativeSales={creativeSales}
              catalog={catalog}
              onOpenProduct={(prod) => openProductDetails(prod)}
              onAddToCart={(prod, q) => handleAddToCart(prod, q)}
              onBuyNow={(prod, q) => handleBuyNow(prod, q)}
            />

            {/* If user is actively filtering/searching by price or keyword, show filtered results immediately at top! */}
            {hasActiveFilters && (
              <section className="mb-8 rounded-xl border-2 border-[#F85606] bg-white p-4 sm:p-5">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
                  <div>
                    <h2 className="font-display text-lg font-bold text-slate-950 sm:text-xl">
                      Filtered Search & LKR Price Results ({filteredProducts.length} Products Found)
                    </h2>
                    <p className="text-xs text-slate-500">
                      Showing matching products for your selected category, search query, and LKR price range
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Clear Filters</span>
                  </button>
                </div>

                {filteredProducts.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="font-display text-base font-semibold text-slate-800">
                      No products matched your exact LKR price or search criteria.
                    </p>
                    <button
                      type="button"
                      onClick={handleResetAllFilters}
                      className="mt-3 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-semibold text-white"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  renderStaggeredProductGrid(filteredProducts, 'home-active-filters')
                )}
              </section>
            )}

            {/* ROW 1: Daraz-Style 6-Column Flash Sale Strip with Live Countdown */}
            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Zap className="h-5 w-5 text-[#F85606]" />
                    <h2 className="font-display text-lg font-bold text-slate-950 sm:text-xl">
                      {t.flashSaleTitle}
                    </h2>
                  </div>

                  {/* Animated Live Countdown Timer */}
                  <div className="flex items-center gap-1.5 font-mono text-xs font-bold">
                    <Clock className="h-3.5 w-3.5 text-[#F85606]" />
                    <span className="text-slate-600 font-sans font-medium">Ending in:</span>
                    <span className="rounded bg-[#F85606] px-1.5 py-0.5 text-white">
                      {formattedCountdown.hrs}
                    </span>
                    <span className="text-[#F85606]">:</span>
                    <span className="rounded bg-[#F85606] px-1.5 py-0.5 text-white">
                      {formattedCountdown.mins}
                    </span>
                    <span className="text-[#F85606]">:</span>
                    <span className="rounded bg-[#F85606] px-1.5 py-0.5 text-white">
                      {formattedCountdown.secs}
                    </span>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDealFilter('flash_sale');
                    setActiveBottomTab('shop');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-[#F85606] px-3 py-1.5 text-xs font-semibold text-[#F85606] transition-colors hover:bg-[#FFF3EB] whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <span>SHOP ALL FLASH DEALS</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* 6-in-a-row on large screens like Daraz & AliExpress */}
              {renderStaggeredProductGrid(
                flashSaleItems,
                'home-flash-row',
                'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              )}
            </section>

            {/* ROW 2: AliExpress-Style 6-Column New User Deals Row */}
            <section className="mb-8 rounded-xl border border-orange-200 bg-gradient-to-b from-[#FFF6F0] to-white p-4 sm:p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 border-b border-orange-200/70 pb-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-3">
                  <Tag className="h-5 w-5 text-[#F85606]" />
                  <h2 className="font-display text-lg font-bold text-slate-950 sm:text-xl">
                    {t.newUserZoneTitle}
                  </h2>
                  <span className="text-xs font-medium text-slate-600">
                    Special LKR welcome pricing for newly registered BuyKit accounts
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDealFilter('new_user');
                    setActiveBottomTab('shop');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-[#F85606] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <span>VIEW ALL NEW USER DEALS</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {renderStaggeredProductGrid(
                newUserRowItems,
                'home-newuser-row',
                'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              )}
            </section>

            {/* ROW 3: BuyKit Choice Bundles 6-Column Row */}
            <section className="mb-8 rounded-xl border border-slate-200 bg-white p-4 sm:p-5">
              <div className="mb-4 flex flex-col justify-between gap-2 border-b border-slate-200 pb-3 sm:flex-row sm:items-center">
                <div className="flex flex-wrap items-center gap-3">
                  <ShieldCheck className="h-5 w-5 text-emerald-600" />
                  <h2 className="font-display text-lg font-bold text-slate-950 sm:text-xl">
                    BuyKit Choice · Free Islandwide Express Delivery
                  </h2>
                  <span className="text-xs font-medium text-emerald-700">
                    Direct Factory Price · Cash on Delivery Eligible
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setSelectedDealFilter('choice_bundle');
                    setActiveBottomTab('shop');
                  }}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 whitespace-nowrap shrink-0 self-start sm:self-auto"
                >
                  <span>EXPLORE CHOICE BUNDLES</span>
                  <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>

              {renderStaggeredProductGrid(
                choiceBundleRowItems,
                'home-choice-row',
                'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              )}
            </section>

            {/* ROW 4+: Just For You — Full Dense 6-Column Product Feed */}
            <section id="catalog" className="mb-10">
              <div className="mb-4 flex flex-col justify-between gap-4 border-b border-slate-200 pb-3 lg:flex-row lg:items-end">
                <div>
                  <h2 className="font-display text-2xl font-bold text-slate-950">
                    Just For You · All {filteredProducts.length} Products & Deals
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-600">
                    Every product includes full specifications, Details view, Add to Cart, and instant Buy Now in Sri Lankan Rupees (LKR).
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-white p-1">
                  {(
                    [
                      { id: 'all', label: 'All Deals' },
                      { id: 'new_user', label: 'New User Deals' },
                      { id: 'flash_sale', label: 'Flash Sale' },
                      { id: 'choice_bundle', label: 'Choice Bundles' },
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedDealFilter(tab.id)}
                      className={`rounded-lg px-3.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        selectedDealFilter === tab.id
                          ? 'bg-[#F85606] text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-950'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dense Daraz / AliExpress Multi-Column Grid: up to 6 products per row */}
              {renderStaggeredProductGrid(filteredProducts, 'home-just-for-you')}
            </section>
          </>
        )}

        {/* =========================================================
            TAB 2: SHOP TAB (Full All-Products Dense Storefront Directory)
           ========================================================= */}
        {activeBottomTab === 'shop' && (
          <section className="space-y-5">
            {renderHorizontalCategoriesAndFilterBar()}

            <div className="flex flex-col justify-between gap-4 rounded-xl border border-slate-200 bg-white p-4 sm:flex-row sm:items-center">
              <div>
                <h1 className="font-display text-xl font-bold text-slate-950 sm:text-2xl">
                  BuyKit Official Mall · Showing {filteredProducts.length} of {catalog.length} Products
                </h1>
                <p className="mt-0.5 text-xs text-slate-600">
                  Official BuyKit product rows with instant Details, Add to Cart, and Buy Now
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                {(
                  [
                    { id: 'all', label: 'All Tiers' },
                    { id: 'new_user', label: 'New User Deals' },
                    { id: 'flash_sale', label: 'Flash Sale' },
                    { id: 'choice_bundle', label: 'Choice Bundles' },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setSelectedDealFilter(tab.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                      selectedDealFilter === tab.id
                        ? 'bg-[#F85606] text-white'
                        : 'text-slate-600 hover:text-slate-950'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {filteredProducts.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                <p className="font-display text-lg font-semibold text-slate-900">
                  No products matched your current search or LKR price filter
                </p>
                <button
                  type="button"
                  onClick={handleResetAllFilters}
                  className="mt-4 rounded-lg bg-[#F85606] px-4 py-2 text-xs font-semibold text-white"
                >
                  Reset All Filters
                </button>
              </div>
            ) : (
              renderStaggeredProductGrid(filteredProducts, 'shop-directory')
            )}
          </section>
        )}

        {/* =========================================================
            TAB 3: BUYKIT LOGO TAB (Super Hub — Exclusive Deals & Choice Bundles)
           ========================================================= */}
        {activeBottomTab === 'buykit' && (
          <section className="space-y-8">
            <div className="overflow-hidden rounded-2xl border border-orange-200 bg-gradient-to-r from-slate-950 via-slate-900 to-[#F85606] p-6 text-white sm:p-8">
              <div className="grid grid-cols-1 gap-6 lg:grid-cols-12 lg:items-center">
                <div className="space-y-3 lg:col-span-7">
                  <div className="flex items-center gap-3">
                    <BuyKitLogoBadge size="lg" />
                    <div>
                      <span className="text-xs font-bold tracking-wider text-orange-300 uppercase">
                        BuyKit with Pramu · Official Super Hub
                      </span>
                      <h1 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
                        Exclusive New User Zone & Choice Bundles
                      </h1>
                    </div>
                  </div>
                  <p className="max-w-xl text-sm leading-relaxed text-orange-50">
                    Claim your New User Starter Pass to unlock up to 65% off across all {catalog.length}+ flagship products in LKR, compare products side by side, or select a verified Google Maps pickup hub.
                  </p>
                  <div className="flex flex-wrap gap-3 pt-2">
                    <button
                      type="button"
                      onClick={handleClaimNewUserVoucher}
                      className="rounded-xl bg-[#F85606] px-5 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#d94800] whitespace-nowrap shrink-0"
                    >
                      {newUserDealClaimed
                        ? 'Starter Pass Active (Up to 65% Off)'
                        : 'Activate New User Starter Pass'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsCompareModalOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/25 whitespace-nowrap shrink-0"
                    >
                      <Scale className="h-4 w-4 text-orange-300" />
                      <span>Open Product Comparison Board</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsPickupMapOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-white/15 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-xs transition-colors hover:bg-white/25 whitespace-nowrap shrink-0"
                    >
                      <MapPin className="h-4 w-4 text-orange-300" />
                      <span>Google Maps Pickup Locator</span>
                    </button>
                  </div>
                </div>

                <div className="rounded-xl border border-white/15 bg-white/10 p-5 backdrop-blur-xs lg:col-span-5">
                  <p className="text-xs font-bold tracking-wider text-orange-200 uppercase">
                    BuyKit Super Guarantee
                  </p>
                  <div className="mt-3 space-y-2.5 text-xs text-white">
                    <div className="flex items-center justify-between border-b border-white/15 pb-2">
                      <span>New User Starter Discount</span>
                      <span className="font-mono font-bold">Up to Rs. 41,000 Off</span>
                    </div>
                    <div className="flex items-center justify-between border-b border-white/15 pb-2">
                      <span>Islandwide Cash on Delivery</span>
                      <span className="font-mono font-bold">Supported (LKR)</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Cart & Buy Now Protection</span>
                      <span className="font-mono font-bold">Verified Accounts Only</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-950">
                  New User Exclusive Deals (Up to 65% Off in LKR)
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDealFilter('new_user');
                    setActiveBottomTab('shop');
                  }}
                  className="text-xs font-semibold text-[#F85606] hover:underline"
                >
                  View All in Shop →
                </button>
              </div>
              {renderStaggeredProductGrid(
                catalog.filter((p) => p.dealType === 'new_user'),
                'buykit-newuser-grid',
                'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              )}
            </div>

            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold text-slate-950">
                  BuyKit Choice Bundles · Free Express Delivery
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedDealFilter('choice_bundle');
                    setActiveBottomTab('shop');
                  }}
                  className="text-xs font-semibold text-[#F85606] hover:underline"
                >
                  View All Bundles →
                </button>
              </div>
              {renderStaggeredProductGrid(
                catalog.filter((p) => p.dealType === 'choice_bundle'),
                'buykit-choice-grid',
                'grid grid-cols-2 gap-3.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6'
              )}
            </div>
          </section>
        )}

        {/* =========================================================
            TAB 4: DARAZ / ALIEXPRESS CHECKOUT PAGE (Payment Option, Applied Coupons, Delivery Fee vs Free Delivery & Final Total Payable)
           ========================================================= */}
        {activeBottomTab === 'cart' && (
          <DarazAliCheckoutView
            currentUser={currentUser}
            items={effectiveCheckoutItems}
            fullName={fullName}
            email={userEmail}
            phone={phone}
            secondaryPhone={secondaryPhone}
            shippingAddress={shippingAddress}
            cityDistrict={cityDistrict}
            postalCode={postalCode}
            addressLabel={addressLabel}
            selectedHubName={selectedHubName}
            selectedCountryCode={selectedCountryCode}
            selectedLanguageCode={selectedLanguageCode}
            savedCards={savedCards}
            paymentMethod={paymentMethod}
            checkoutSubmitting={checkoutSubmitting}
            onSelectPaymentMethod={setPaymentMethod}
            onUpdateItemQuantity={handleUpdateCartQuantity}
            onRemoveItem={handleRemoveCartItem}
            onOpenSettingsTab={(tab) => openAccountSettings(tab)}
            onOpenPickupMap={() => setIsPickupMapOpen(true)}
            onContinueShopping={() => setActiveBottomTab('shop')}
            onOpenAuthModal={() => {
              setPendingCartProduct(null);
              setPendingBuyNowMode(false);
              setIsAuthModalOpen(true);
            }}
            onConfirmCheckoutOrder={handleConfirmCheckoutOrder}
            onViewPlacedOrderTracking={() => {
              setActiveBottomTab('account');
              if (lastPlacedTrackableOrder) {
                setTrackingOrder(lastPlacedTrackableOrder);
              }
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {/* =========================================================
            TAB 5: DARAZ / ALIEXPRESS ACCOUNT CENTER TAB
           ========================================================= */}
        {activeBottomTab === 'account' && (
          <DarazAliAccountTab
            currentUser={currentUser}
            newUserDealClaimed={newUserDealClaimed}
            orders={orders}
            wishlistItems={wishlistItems}
            recentlyViewedProducts={recentlyViewedProducts}
            catalog={catalog}
            userReviews={
              currentUser
                ? allReviews.filter((r) => r.userId === currentUser.uid)
                : []
            }
            userQuestions={
              currentUser
                ? allQuestions.filter((q) => q.userId === currentUser.uid)
                : []
            }
            phone={phone}
            shippingAddress={shippingAddress}
            postalCode={postalCode}
            selectedHubName={selectedHubName}
            onUpdatePhone={setPhone}
            onUpdateShippingAddress={setShippingAddress}
            onUpdatePostalCode={setPostalCode}
            onSaveAddressToFirestore={handleSaveAddressToFirestore}
            onOpenAuthModal={() => {
              setPendingCartProduct(null);
              setPendingBuyNowMode(false);
              setIsAuthModalOpen(true);
            }}
            onSignOut={() => signOutAccount()}
            onClaimNewUserVoucher={handleClaimNewUserVoucher}
            onOpenTrackingModal={(ord) => setTrackingOrder(ord)}
            onOpenDemoTrackingModal={handleOpenDemoTrackingModal}
            onCancelOrder={handleCancelOrder}
            onOpenProductDetails={openProductDetails}
            onAddToCart={(prod, q) => handleAddToCart(prod, q)}
            onBuyNow={(prod, q) => handleBuyNow(prod, q)}
            onToggleWishlist={handleToggleWishlist}
            onRemoveWishlistItem={handleRemoveWishlistItem}
            onClearRecentlyViewed={handleClearRecentlyViewed}
            onToggleProductStock={handleToggleProductStock}
            isProductWishlisted={isProductWishlisted}
            getEffectivePrice={getEffectivePrice}
            onNavigateTab={(tab) => {
              setActiveBottomTab(tab);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onOpenPickupMap={() => setIsPickupMapOpen(true)}
            onOpenCompareModal={() => setIsCompareModalOpen(true)}
            selectedCountryCode={selectedCountryCode}
            selectedLanguageCode={selectedLanguageCode}
            savedCardsCount={savedCards.length}
            onOpenSettingsModal={(tab) => openAccountSettings(tab || 'profile')}
            onOpenAdminStudio={() => setIsAdminStudioOpen(true)}
            logoBadge={<BuyKitLogoBadge size="md" />}
          />
        )}
      </main>

      {/* Quiet Footer with BuyKit Logo */}
      <footer className="border-t border-slate-200 bg-white px-6 py-8 text-xs text-slate-500 lg:px-10">
        <div className="mx-auto flex max-w-[1540px] flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2.5">
            <BuyKitLogoBadge size="sm" />
            <p className="font-semibold text-slate-900">
              BuyKit with Pramu — Sri Lanka Online Marketplace (LKR)
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={() => setIsPickupMapOpen(true)}
              className="hover:text-[#F85606] hover:underline"
            >
              Google Maps Pickup Hubs
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => setIsCompareModalOpen(true)}
              className="hover:text-[#F85606] hover:underline"
            >
              Compare Products ({compareIds.length}/{MAX_COMPARE_PRODUCTS})
            </button>
            <span aria-hidden="true">·</span>
            <button
              type="button"
              onClick={() => {
                setPendingCartProduct(null);
                setPendingBuyNowMode(false);
                setIsAuthModalOpen(true);
              }}
              className="hover:text-[#F85606] hover:underline"
            >
              {currentUser ? `Signed in as ${currentUser.email}` : 'Login / Create Account'}
            </button>
          </div>
        </div>
      </footer>

      {/* =========================================================
          FIXED 5-TAB BOTTOM NAVIGATION BAR
          (Home | Shop | Large Official BuyKit Center Logo Tab | Cart | Account)
         ========================================================= */}
      <nav
        aria-label="Primary bottom navigation"
        className="fixed right-0 bottom-0 left-0 z-40 border-t border-slate-200 bg-white/95 px-2 py-1.5 shadow-lg backdrop-blur-md"
      >
        <div className="mx-auto grid max-w-xl grid-cols-5 items-end">
          {/* 1. Home Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeBottomTab === 'home'
                ? 'font-semibold text-[#F85606]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Home className="h-5 w-5" />
            <span>{t.home}</span>
          </button>

          {/* 2. Shop Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('shop');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeBottomTab === 'shop'
                ? 'font-semibold text-[#F85606]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Store className="h-5 w-5" />
            <span>{t.shop}</span>
          </button>

          {/* 3. Prominent Large Center Official BuyKit Logo Tab */}
          <div className="flex flex-col items-center justify-center">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              type="button"
              onClick={() => {
                setActiveBottomTab('buykit');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className={`${
                activeBottomTab === 'cart' ? 'mt-0 p-1' : '-mt-7 p-1.5'
              } flex items-center justify-center rounded-2xl border-4 border-white bg-black shadow-lg ring-2 transition-all whitespace-nowrap shrink-0 ${
                activeBottomTab === 'buykit'
                  ? 'ring-[#F85606]'
                  : 'ring-orange-400/70 hover:ring-[#F85606]'
              }`}
            >
              <div
                className={`${
                  activeBottomTab === 'cart' ? 'h-8 w-8' : 'h-11 w-11'
                } overflow-hidden rounded-xl bg-black`}
              >
                <img
                  src={BUYKIT_LOGO_ASSET}
                  alt="BuyKit Logo"
                  className="h-full w-full scale-[2.2] object-cover object-center"
                />
              </div>
            </motion.button>
          </div>

          {/* 4. Cart Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('cart');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`relative flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeBottomTab === 'cart'
                ? 'font-semibold text-[#F85606]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <div className="relative">
              <ShoppingBag className="h-5 w-5" />
              {totalCartUnits > 0 && (
                <span className="absolute -top-1.5 -right-2.5 font-mono text-[10px] font-bold text-[#F85606] tabular-nums">
                  ({totalCartUnits})
                </span>
              )}
            </div>
            <span>{t.cart}</span>
          </button>

          {/* 5. Account Tab */}
          <button
            type="button"
            onClick={() => {
              setActiveBottomTab('account');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex flex-col items-center justify-center gap-0.5 py-1 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              activeBottomTab === 'account'
                ? 'font-semibold text-[#F85606]'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <UserIcon className="h-5 w-5" />
            <span>{t.account}</span>
          </button>
        </div>
      </nav>

      {/* =========================================================
          DARAZ / ALIEXPRESS FULL PRODUCT DETAILS MODAL
          (Full Specs, Quantity Selector, Large Add to Cart & Large Buy Now)
         ========================================================= */}
      <AnimatePresence>
        {selectedProduct && (() => {
          const unitEffectivePrice = getEffectivePrice(selectedProduct);
          const grossSubtotal = unitEffectivePrice * detailQuantity;
          const originalSubtotal = selectedProduct.originalPrice * detailQuantity;
          const {
            coupon: activeDetailCoupon,
            isEligible: isDetailCouponEligible,
            couponDiscount: detailCouponDiscount,
            finalTotal: detailNetPrice,
          } = getDetailCouponInfo(selectedProduct, detailQuantity);
          const ratingStats = getProductRatingStats(selectedProduct);

          return (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex h-screen w-screen flex-col overflow-hidden bg-[#F4F3EF]"
            >
              {/* 1. FULL-WIDTH TOP NAVIGATION & QUICK TABS BAR */}
              <header className="shrink-0 border-b border-slate-200 bg-white px-4 py-2.5 shadow-2xs sm:px-6 lg:px-10">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
                  {/* Left: Back to Storefront Button + Store Breadcrumb */}
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-extrabold text-slate-800 shadow-2xs transition-colors hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606] sm:text-sm"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span>{t.backToShop}</span>
                    </button>

                    <div className="hidden items-center gap-2 text-xs text-slate-600 md:flex">
                      <span className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 font-display text-[11px] font-extrabold tracking-wide text-white uppercase">
                        <Store className="h-3 w-3 text-[#FFB800]" />
                        <span>{selectedProduct.storeName}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-semibold text-slate-700">{selectedProduct.category}</span>
                      <span aria-hidden="true">·</span>
                      <span className="rounded-md bg-[#FFF3EB] px-2.5 py-0.5 font-bold text-[#F85606]">
                        {selectedProduct.dealLabel}
                      </span>
                    </div>
                  </div>

                  {/* Center: User-Friendly Section Tabs */}
                  <div className="flex items-center gap-1.5 overflow-x-auto">
                    {(
                      [
                        { id: 'all', label: t.fullProductView },
                        {
                          id: 'coupons',
                          label: `${t.couponsAndPrice} (${AVAILABLE_CHECKOUT_COUPONS.length})`,
                        },
                        {
                          id: 'specs',
                          label: `${t.detailsAndSpecs} (${selectedProduct.specs.length})`,
                        },
                        {
                          id: 'reviews',
                          label: `${t.reviewsAndQa} (${
                            ratingStats.userReviewCount + ratingStats.questionCount
                          })`,
                        },
                      ] as const
                    ).map((tab) => {
                      const active = quickViewTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setQuickViewTab(tab.id)}
                          className={`shrink-0 rounded-xl px-3.5 py-1.5 text-xs font-extrabold transition-all ${
                            active
                              ? 'bg-[#F85606] text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
                          }`}
                        >
                          {tab.label}
                        </button>
                      );
                    })}
                  </div>

                  {/* Right: Compare, Wishlist & Close */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={(e) => handleToggleCompare(selectedProduct, e)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                        isProductCompared(selectedProduct.id)
                          ? 'border-[#F85606] bg-[#F85606] text-white'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-orange-300 hover:text-[#F85606]'
                      }`}
                    >
                      <Scale className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">
                        {isProductCompared(selectedProduct.id) ? 'Comparing' : 'Compare'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={(e) => handleToggleWishlist(selectedProduct, e)}
                      className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-bold transition-colors ${
                        isProductWishlisted(selectedProduct.id)
                          ? 'border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-rose-200 hover:text-rose-500'
                      }`}
                    >
                      <Heart
                        className={`h-3.5 w-3.5 ${
                          isProductWishlisted(selectedProduct.id)
                            ? 'fill-rose-500 text-rose-500'
                            : ''
                        }`}
                      />
                      <span className="hidden sm:inline">
                        {isProductWishlisted(selectedProduct.id) ? 'Saved' : 'Wishlist'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSelectedProduct(null)}
                      className="rounded-xl bg-slate-100 p-2 text-slate-600 transition-colors hover:bg-slate-200 hover:text-slate-950"
                      aria-label="Close product view"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>
              </header>

              {/* 2. SPACIOUS FULL-SCREEN SCROLLABLE PRODUCT WORKSPACE */}
              <div className="flex-1 overflow-y-auto px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
                <div className="mx-auto max-w-[1440px] space-y-8">
                  {/* TOP HERO GRID: Generous Two-Column Layout on Desktop, Clean Vertical Flow on Mobile */}
                  <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12 lg:gap-8">
                    {/* LEFT COLUMN (5 Cols on Desktop): Large Main Product Images + Compact Slide Strip */}
                    <div className="space-y-4 lg:col-span-5 lg:sticky lg:top-2">
                      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                        <ProductImageGallery
                          product={selectedProduct}
                          discountPercent={Math.round(
                            ((selectedProduct.originalPrice - unitEffectivePrice) /
                              selectedProduct.originalPrice) *
                              100
                          )}
                          onToggleStock={handleToggleProductStock}
                        />
                      </div>
                    </div>

                    {/* RIGHT COLUMN (7 Cols on Desktop): Large Product Name, Clear Price, Addable Coupons, Overview & Specs */}
                    <div className="space-y-6 lg:col-span-7">
                      {/* (A) LARGE PRODUCT NAME, STOCK STATUS & RATINGS CARD */}
                      <div className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex flex-wrap items-center gap-2">
                            {selectedProduct.stockRemaining > 0 ? (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 bg-emerald-600 px-3 py-1 text-xs font-extrabold text-white uppercase">
                                In Stock ({selectedProduct.stockRemaining} units available)
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg border border-red-300 bg-red-600 px-3 py-1 text-xs font-extrabold text-white uppercase">
                                Out of Stock
                              </span>
                            )}

                            {selectedProduct.freeShipping ? (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700">
                                <Truck className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Free Delivery</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">
                                <Truck className="h-3.5 w-3.5 text-slate-500" />
                                <span>Paid Delivery</span>
                              </span>
                            )}

                            <span className="rounded-lg bg-[#FFF3EB] px-2.5 py-1 text-xs font-extrabold text-[#F85606]">
                              {selectedProduct.dealLabel}
                            </span>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => handleToggleProductStock(selectedProduct.id, e)}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-sans text-[11px] font-semibold text-slate-700 hover:border-[#F85606] hover:text-[#F85606]"
                          >
                            {selectedProduct.stockRemaining > 0
                              ? 'Switch to Out of Stock'
                              : 'Switch to In Stock'}
                          </button>
                        </div>

                        <h1 className="font-display text-2xl leading-tight font-extrabold text-slate-950 sm:text-3xl lg:text-4xl">
                          {selectedProduct.title}
                        </h1>

                        <p className="text-sm font-medium text-slate-600 sm:text-base">
                          {selectedProduct.tagline}
                        </p>

                        <div className="flex flex-wrap items-center gap-3 border-t border-slate-100 pt-3 text-xs font-mono tabular-nums text-slate-600 sm:text-sm">
                          <span className="font-bold text-amber-600">
                            ★ {ratingStats.averageRating.toFixed(1)} Rating
                          </span>
                          <span>·</span>
                          <span>
                            {ratingStats.userReviewCount} Verified Reviews &{' '}
                            {ratingStats.questionCount} Q&A
                          </span>
                          <span>·</span>
                          <span>{selectedProduct.soldCount.toLocaleString()} Sold</span>
                          <span>·</span>
                          <span className="font-sans font-semibold text-slate-700">
                            Store: {selectedProduct.storeName}
                          </span>
                        </div>
                      </div>

                      {/* (B) CLEAR PRICE BREAKDOWN & INTERACTIVE ADDABLE COUPONS ("add වන copuens") */}
                      {(quickViewTab === 'all' || quickViewTab === 'coupons') && (
                        <div className="space-y-5 rounded-2xl border-2 border-orange-200 bg-gradient-to-br from-[#FFF6F0] via-white to-orange-50/50 p-5 shadow-xs sm:p-6">
                          <div className="flex flex-wrap items-baseline justify-between gap-4 border-b border-orange-200/70 pb-4 font-mono tabular-nums">
                            <div>
                              <span className="block font-sans text-xs font-extrabold tracking-wider text-slate-500 uppercase">
                                Final Price (With Active Deal & Selected Coupon)
                              </span>
                              <div className="mt-1.5 flex flex-wrap items-baseline gap-3">
                                <span className="text-3xl font-extrabold text-[#F85606] sm:text-4xl">
                                  {formatLKR(detailNetPrice)}
                                </span>
                                <span className="text-base text-slate-400 line-through">
                                  {formatLKR(originalSubtotal)}
                                </span>
                                <span className="rounded-lg bg-[#F85606] px-2.5 py-1 text-xs font-extrabold text-white">
                                  You Save{' '}
                                  {formatLKR(Math.max(0, originalSubtotal - detailNetPrice))}
                                </span>
                              </div>
                            </div>

                            {detailCouponDiscount > 0 && activeDetailCoupon && (
                              <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-emerald-600 px-3.5 py-2 font-mono text-xs font-extrabold text-white shadow-2xs">
                                <Tag className="h-4 w-4" />
                                <span>
                                  {activeDetailCoupon.code}: -{formatLKR(detailCouponDiscount)} OFF
                                </span>
                              </span>
                            )}
                          </div>

                          {/* OPTIONAL COUPONS ARROW BAR ("Product එකක copunces select කරන්නෙ කැමති නම් විතරයි, ඒක arow bar එක්කින් තමයි බලන්නෙ") */}
                          <div className="space-y-3">
                            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-orange-200 bg-white px-4 py-3 shadow-2xs transition-colors hover:border-[#F85606]">
                              <button
                                type="button"
                                onClick={() => setIsDetailCouponsOpen((prev) => !prev)}
                                className="flex flex-1 items-center justify-between gap-3 text-left"
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#FFF3EB] px-2.5 py-1 text-xs font-extrabold text-[#F85606]">
                                    <Tag className="h-3.5 w-3.5" />
                                    <span>
                                      Coupons & Vouchers ({AVAILABLE_CHECKOUT_COUPONS.length}{' '}
                                      Available · Optional)
                                    </span>
                                  </span>

                                  {activeDetailCoupon && isDetailCouponEligible ? (
                                    <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2.5 py-0.5 font-mono text-xs font-bold text-emerald-700">
                                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                                      <span>
                                        Selected: {activeDetailCoupon.code} (-
                                        {formatLKR(detailCouponDiscount)})
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="text-xs font-medium text-slate-500">
                                      Optional — Click arrow to view &amp; select a coupon if you
                                      want
                                    </span>
                                  )}
                                </div>

                                <div className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#F85606] hover:text-[#F85606]">
                                  <span>
                                    {isDetailCouponsOpen ? 'Hide Coupons' : 'View Coupons'}
                                  </span>
                                  <ChevronDown
                                    className={`h-4 w-4 text-[#F85606] transition-transform duration-200 ${
                                      isDetailCouponsOpen ? 'rotate-180' : ''
                                    }`}
                                  />
                                </div>
                              </button>

                              {detailCouponId !== 'none' && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setDetailCouponId('none');
                                    showToast('Removed coupon selection.');
                                  }}
                                  className="ml-2 text-xs font-bold text-rose-600 underline hover:text-rose-700"
                                >
                                  Clear
                                </button>
                              )}
                            </div>

                            {/* Collapsible Coupons List (Shown ONLY when Arrow Bar is clicked) */}
                            {isDetailCouponsOpen && (
                              <div className="grid grid-cols-1 gap-3 pt-1 sm:grid-cols-2">
                                {AVAILABLE_CHECKOUT_COUPONS.map((cp) => {
                                  const isSelected = detailCouponId === cp.id;
                                  const meetsMin = grossSubtotal >= cp.minSpend;
                                  const estimatedSave = !meetsMin
                                    ? 0
                                    : cp.type === 'percent'
                                    ? Math.min(
                                        Math.round((grossSubtotal * cp.value) / 100),
                                        cp.maxCap
                                      )
                                    : Math.min(cp.value, grossSubtotal);

                                  return (
                                    <button
                                      key={cp.id}
                                      type="button"
                                      onClick={() => {
                                        if (!meetsMin) {
                                          showToast(
                                            `Coupon ${cp.code} requires a minimum order of ${formatLKR(
                                              cp.minSpend
                                            )}. Increase quantity to unlock!`
                                          );
                                          return;
                                        }
                                        setDetailCouponId((prev) =>
                                          prev === cp.id ? 'none' : cp.id
                                        );
                                        showToast(
                                          detailCouponId === cp.id
                                            ? `Coupon ${cp.code} removed.`
                                            : `Coupon ${cp.code} selected! Extra ${formatLKR(
                                                estimatedSave
                                              )} OFF applied.`
                                        );
                                      }}
                                      className={`flex items-center justify-between gap-3 rounded-xl border-2 p-3.5 text-left transition-all ${
                                        isSelected && meetsMin
                                          ? 'border-[#F85606] bg-[#FFF3EB] shadow-xs'
                                          : meetsMin
                                          ? 'border-orange-200/80 bg-white hover:border-[#F85606]'
                                          : 'border-slate-200 bg-slate-50 opacity-75'
                                      }`}
                                    >
                                      <div className="min-w-0">
                                        <div className="flex flex-wrap items-center gap-1.5">
                                          <span className="rounded bg-[#F85606] px-2 py-0.5 font-mono text-[11px] font-extrabold text-white">
                                            {cp.code}
                                          </span>
                                          <span className="truncate text-xs font-extrabold text-slate-900 sm:text-sm">
                                            {cp.badgeText}
                                          </span>
                                        </div>
                                        <p className="mt-1 text-xs text-slate-600">{cp.subtitle}</p>
                                        {meetsMin ? (
                                          <p className="mt-1 font-mono text-xs font-bold text-emerald-700">
                                            Instant Save: {formatLKR(estimatedSave)}
                                          </p>
                                        ) : (
                                          <p className="mt-1 font-mono text-[11px] font-semibold text-amber-700">
                                            Min. spend {formatLKR(cp.minSpend)}
                                          </p>
                                        )}
                                      </div>

                                      <span
                                        className={`shrink-0 rounded-xl px-3 py-1.5 text-xs font-extrabold uppercase ${
                                          isSelected && meetsMin
                                            ? 'bg-emerald-600 text-white'
                                            : meetsMin
                                            ? 'border border-[#F85606] bg-white text-[#F85606]'
                                            : 'bg-slate-200 text-slate-500'
                                        }`}
                                      >
                                        {isSelected && meetsMin
                                          ? 'Selected ✓'
                                          : meetsMin
                                          ? 'Select'
                                          : 'Locked'}
                                      </span>
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* (C) FULL PRODUCT DESCRIPTION, GOOGLE-ENRICHED KEY FEATURES & MORE DETAILS */}
                      {(quickViewTab === 'all' || quickViewTab === 'specs') && (() => {
                        const enrichedDetails =
                          enrichedProductMap[selectedProduct.id] ||
                          getDefaultEnrichedDetails(
                            selectedProduct.id,
                            selectedProduct.title,
                            selectedProduct.category,
                            selectedProduct.description,
                            selectedProduct.specs
                          );
                        const isEnrichingThis =
                          loadingExtendedDetailsId === selectedProduct.id;

                        return (
                          <div className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6">
                            <div>
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <h3 className="font-display text-sm font-extrabold tracking-wide text-slate-900 uppercase">
                                  {t.productOverview}
                                </h3>
                                <button
                                  type="button"
                                  disabled={isEnrichingThis}
                                  onClick={async () => {
                                    setLoadingExtendedDetailsId(selectedProduct.id);
                                    try {
                                      const fresh = await runDescriptionAgent({
                                        productTitle: selectedProduct.title,
                                        category: selectedProduct.category,
                                        adminNotes: selectedProduct.description,
                                        adminSpecs: selectedProduct.specs,
                                      });
                                      setEnrichedProductMap((prev) => ({
                                        ...prev,
                                        [selectedProduct.id]: {
                                          productId: selectedProduct.id,
                                          ...fresh,
                                        },
                                      }));
                                      showToast(
                                        'Updated extended product specifications and key features!'
                                      );
                                    } catch {
                                      showToast(
                                        'Showing complete official specifications and product details.'
                                      );
                                    } finally {
                                      setLoadingExtendedDetailsId(null);
                                    }
                                  }}
                                  className="inline-flex items-center gap-1 rounded-lg border border-orange-200 bg-[#FFF3EB] px-2.5 py-1 text-[11px] font-bold text-[#F85606] transition-colors hover:bg-orange-100 disabled:opacity-50"
                                >
                                  <Sparkles className="h-3 w-3" />
                                  <span>
                                    {isEnrichingThis
                                      ? 'Loading More Details...'
                                      : 'Refresh More Details'}
                                  </span>
                                </button>
                              </div>

                              <p className="mt-2 text-sm leading-relaxed text-slate-700 sm:text-base">
                                {selectedProduct.description}
                              </p>

                              {/* Extended Multi-Paragraph Description ("admin add කරන විස්තර වලට අමතරව more details, description එකක්") */}
                              {enrichedDetails.extendedDescription &&
                                enrichedDetails.extendedDescription !==
                                  selectedProduct.description && (
                                  <div className="mt-3.5 rounded-xl border border-orange-100 bg-[#FFF9F5] p-4">
                                    <p className="text-xs font-extrabold tracking-wider text-[#F85606] uppercase">
                                      More Details &amp; Extended Product Guide
                                    </p>
                                    <p className="mt-1.5 whitespace-pre-line text-xs leading-relaxed text-slate-700 sm:text-sm">
                                      {enrichedDetails.extendedDescription}
                                    </p>
                                    {enrichedDetails.proBuyerTips && (
                                      <p className="mt-2.5 border-t border-orange-200/60 pt-2 text-xs font-semibold text-emerald-800">
                                        ✓ Buyer Tip: {enrichedDetails.proBuyerTips}
                                      </p>
                                    )}
                                  </div>
                                )}
                            </div>

                            {/* Key Features & Specifications in the Box */}
                            <div className="border-t border-slate-100 pt-4">
                              <h3 className="mb-3 font-display text-sm font-extrabold tracking-wide text-slate-900 uppercase">
                                {t.keySpecifications}
                              </h3>
                              <ul className="grid grid-cols-1 gap-2.5 text-xs text-slate-800 sm:grid-cols-2 sm:text-sm">
                                {(enrichedDetails.keyFeatures.length > 0
                                  ? enrichedDetails.keyFeatures
                                  : selectedProduct.specs
                                ).map((sp, i) => (
                                  <li
                                    key={i}
                                    className="flex items-start gap-2.5 rounded-xl border border-slate-100 bg-slate-50/80 px-3.5 py-2.5 font-medium"
                                  >
                                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[#F85606]" />
                                    <span>{sp}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Structured Technical Highlights Table */}
                            {enrichedDetails.moreDetailsHighlights.length > 0 && (
                              <div className="border-t border-slate-100 pt-4">
                                <h4 className="mb-2.5 font-display text-xs font-extrabold tracking-wider text-slate-700 uppercase">
                                  Technical Breakdown &amp; Package Specifications
                                </h4>
                                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                                  {enrichedDetails.moreDetailsHighlights.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex items-center justify-between gap-2 rounded-lg border border-slate-200/80 bg-white px-3 py-2 text-xs"
                                    >
                                      <span className="font-semibold text-slate-500">
                                        {item.label}
                                      </span>
                                      <span className="text-right font-bold text-slate-900">
                                        {item.value}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Verified Web Reference Links when available */}
                            {enrichedDetails.searchSources &&
                              enrichedDetails.searchSources.length > 0 && (
                                <div className="border-t border-slate-100 pt-3">
                                  <p className="text-[11px] font-semibold text-slate-500">
                                    Verified Product Reference Links:
                                  </p>
                                  <div className="mt-1.5 flex flex-wrap gap-2">
                                    {enrichedDetails.searchSources.map((src, idx) => (
                                      <a
                                        key={idx}
                                        href={src.uri}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-medium text-[#F85606] hover:underline"
                                      >
                                        {src.title}
                                      </a>
                                    ))}
                                  </div>
                                </div>
                              )}
                          </div>
                        );
                      })()}
                    </div>
                  </div>

                  {/* BUYKIT MALL BUYER PROTECTION & DELIVERY (Positioned directly above Review Section) */}
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs sm:p-5">
                    <p className="mb-3 font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                      BuyKit Mall Buyer Protection & Delivery
                    </p>
                    <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
                      <div className="flex items-start gap-2.5 rounded-xl bg-emerald-50/80 p-3.5 text-slate-700">
                        <Truck className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
                        <div>
                          <p className="font-bold text-slate-900">
                            {selectedProduct.freeShipping
                              ? 'Free Islandwide Express Delivery (1–3 Days)'
                              : 'Standard Islandwide Delivery (Rs. 450)'}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-600">
                            Dispatched from: {selectedHubName}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-start gap-2.5 rounded-xl bg-orange-50/80 p-3.5 text-slate-700">
                        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#F85606]" />
                        <div>
                          <p className="font-bold text-slate-900">
                            100% Authentic · 1-Year Official Warranty
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-600">
                            Cash on Delivery & Visa/Mastercard Supported · 14-Day Easy Returns
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* (D) FULL-WIDTH CUSTOMER REVIEWS (5-STAR MEDIA) & PRODUCT Q&A */}
                  {(quickViewTab === 'all' || quickViewTab === 'reviews') && (
                    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
                      <ProductReviewsAndQaSection
                        product={selectedProduct}
                        currentUser={currentUser}
                        hasPurchased={hasUserPurchasedProduct(selectedProduct)}
                        reviews={ratingStats.reviews}
                        replies={allReplies.filter(
                          (r) => r.productId === sanitizeId(selectedProduct.id)
                        )}
                        questions={ratingStats.questions}
                        answers={allAnswers.filter(
                          (a) => a.productId === sanitizeId(selectedProduct.id)
                        )}
                        averageRating={ratingStats.averageRating}
                        totalReviewCount={ratingStats.totalRatingCount}
                        onRequireAuth={() => {
                          setPendingCartProduct(null);
                          setPendingWishlistProduct(null);
                          setPendingBuyNowMode(false);
                          setIsAuthModalOpen(true);
                        }}
                        onBuyNowProduct={() => {
                          const prod = selectedProduct;
                          const q = detailQuantity;
                          handleBuyNow(prod, q);
                        }}
                        onShowToast={showToast}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* 3. BALANCED, CLEAR STICKY BOTTOM BAR: ALWAYS VISIBLE WHEN SCROLLING DOWN (Price + Quantity + Add to Cart + Buy Now) */}
              <div className="shrink-0 border-t-2 border-orange-200 bg-white px-4 py-2.5 shadow-[0_-8px_22px_rgba(15,23,42,0.1)] sm:px-8 sm:py-3">
                <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3">
                  {/* Left: Clear Live Price + Coupon Tag + Medium Quantity Stepper */}
                  <div className="flex items-center gap-3 sm:gap-4">
                    <div className="font-mono leading-tight tabular-nums">
                      <div className="flex items-center gap-1.5">
                        <span className="font-sans text-[10px] font-extrabold tracking-wider text-slate-500 uppercase sm:text-[11px]">
                          Total Price ({detailQuantity} {detailQuantity > 1 ? 'items' : 'item'})
                        </span>
                        {detailCouponDiscount > 0 && activeDetailCoupon && (
                          <span className="rounded bg-emerald-600 px-1.5 py-0.5 font-mono text-[10px] font-extrabold text-white">
                            {activeDetailCoupon.code} -{formatLKR(detailCouponDiscount)}
                          </span>
                        )}
                      </div>
                      <div className="mt-0.5 flex flex-wrap items-baseline gap-2">
                        <span className="text-lg font-extrabold text-[#F85606] sm:text-xl">
                          {formatLKR(detailNetPrice)}
                        </span>
                        <span className="text-xs text-slate-400 line-through">
                          {formatLKR(originalSubtotal)}
                        </span>
                      </div>
                    </div>

                    {/* Medium Quantity Stepper */}
                    <div className="flex shrink-0 items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2 py-1">
                      <button
                        type="button"
                        onClick={() => setDetailQuantity((q) => Math.max(1, q - 1))}
                        className="rounded-lg bg-white p-1.5 text-slate-700 shadow-2xs hover:bg-slate-100"
                        aria-label="Decrease quantity"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>
                      <span className="w-6 text-center font-mono text-sm font-extrabold text-slate-950 tabular-nums">
                        {detailQuantity}
                      </span>
                      <button
                        type="button"
                        onClick={() =>
                          setDetailQuantity((q) =>
                            Math.min(Math.max(1, selectedProduct.stockRemaining), q + 1)
                          )
                        }
                        className="rounded-lg bg-white p-1.5 text-slate-700 shadow-2xs hover:bg-slate-100"
                        aria-label="Increase quantity"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Right: Clear Medium-Sized Add to Cart & Buy Now Buttons */}
                  {selectedProduct.stockRemaining > 0 ? (
                    <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                      <button
                        type="button"
                        onClick={() => {
                          const prod = selectedProduct;
                          const q = detailQuantity;
                          setSelectedProduct(null);
                          handleAddToCart(prod, q, undefined, false);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#FFB800] px-4 py-2.5 text-xs font-extrabold text-slate-950 shadow-xs transition-colors hover:bg-[#e5a600] sm:px-5 sm:text-sm"
                      >
                        <ShoppingBag className="h-4 w-4 shrink-0" />
                        <span>{t.addToCart}</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          const prod = selectedProduct;
                          const q = detailQuantity;
                          handleBuyNow(prod, q);
                        }}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-[#F85606] px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-[#d94800] sm:px-5 sm:text-sm"
                      >
                        <Bolt className="h-4 w-4 shrink-0" />
                        <span>{t.buyNow}</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex shrink-0 items-center gap-2 sm:gap-2.5">
                      <button
                        type="button"
                        disabled
                        className="inline-flex cursor-not-allowed items-center justify-center gap-1.5 rounded-xl border border-red-300 bg-red-600 px-4 py-2.5 text-xs font-extrabold text-white opacity-90 sm:text-sm"
                      >
                        <span>Out of Stock</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleToggleProductStock(selectedProduct.id, e)}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-extrabold text-white shadow-xs transition-colors hover:bg-emerald-700 sm:text-sm"
                      >
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                        <span>Restock Item</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })()}
      </AnimatePresence>

      {/* Auth Gate & Registration Modal */}
      <AuthGateModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingCartProduct(null);
          setPendingWishlistProduct(null);
          setPendingBuyNowMode(false);
        }}
        pendingProductName={
          pendingCartProduct?.title || pendingWishlistProduct?.title || null
        }
        onSuccess={(loggedInUser) => {
          if (pendingCartProduct) {
            const toAdd = pendingCartProduct;
            const qty = pendingQty;
            const shouldGoCheckout = pendingBuyNowMode;
            setPendingCartProduct(null);
            setPendingBuyNowMode(false);
            handleAddToCart(toAdd, qty, loggedInUser, shouldGoCheckout);
          } else if (pendingWishlistProduct) {
            const toWish = pendingWishlistProduct;
            setPendingWishlistProduct(null);
            handleToggleWishlist(toWish, undefined, loggedInUser);
          } else {
            showToast(`Welcome to BuyKit with Pramu, ${loggedInUser.displayName || 'Shopper'}!`);
          }
        }}
      />

      {/* Google Maps Pickup Hub Locator Modal */}
      <PickupMapModal
        isOpen={isPickupMapOpen}
        onClose={() => setIsPickupMapOpen(false)}
        selectedHubName={selectedHubName}
        onSelectHub={(hub) => {
          setSelectedHubName(hub);
          showToast(`Selected "${hub}" as your preferred delivery/pickup hub.`);
        }}
      />

      {/* Order Tracking Modal (Progress Bar + 4-Stage Timeline: Preparing, Dispatched, In Transit, Delivered) */}
      <OrderTrackingModal
        isOpen={Boolean(trackingOrder)}
        order={trackingOrder}
        onClose={() => setTrackingOrder(null)}
        onUpdateOrderStage={handleUpdateOrderTrackingStage}
        onCancelOrder={handleCancelOrder}
      />

      {/* Floating Comparison Bar (Shows when 1–3 products are added to Compare) */}
      <FloatingCompareBar
        comparedProducts={comparedProducts}
        getEffectivePrice={getEffectivePrice}
        onOpenCompareModal={() => setIsCompareModalOpen(true)}
        onRemoveFromCompare={handleRemoveFromCompare}
        onClearCompare={handleClearCompare}
      />

      {/* Side-by-Side Product Comparison Modal (Up to 3 Products: Specs, LKR Prices & Ratings) */}
      <ProductComparisonModal
        isOpen={isCompareModalOpen}
        onClose={() => setIsCompareModalOpen(false)}
        comparedProducts={comparedProducts}
        catalog={catalog}
        currentUser={currentUser}
        getEffectivePrice={getEffectivePrice}
        getProductRatingStats={getProductRatingStats}
        onRemoveFromCompare={handleRemoveFromCompare}
        onAddToCompare={handleAddToCompare}
        onClearCompare={handleClearCompare}
        onAddToCart={(prod, qty) => handleAddToCart(prod, qty)}
        onBuyNow={(prod, qty) => handleBuyNow(prod, qty)}
        onOpenProductDetails={(prod) => openProductDetails(prod)}
      />

      {/* Daraz / AliExpress Account Settings Modal (Profile, Address, Contact Numbers, Country with Flag, Language & Add Credit/Debit Card) */}
      <AccountSettingsModal
        isOpen={isSettingsModalOpen}
        initialTab={settingsModalTab}
        onClose={() => setIsSettingsModalOpen(false)}
        fullName={fullName}
        email={userEmail}
        phone={phone}
        secondaryPhone={secondaryPhone}
        shippingAddress={shippingAddress}
        cityDistrict={cityDistrict}
        postalCode={postalCode}
        addressLabel={addressLabel}
        selectedHubName={selectedHubName}
        selectedCountryCode={selectedCountryCode}
        selectedLanguageCode={selectedLanguageCode}
        savedCards={savedCards}
        onUpdateFullName={setFullName}
        onUpdateEmail={setUserEmail}
        onUpdatePhone={setPhone}
        onUpdateSecondaryPhone={setSecondaryPhone}
        onUpdateShippingAddress={setShippingAddress}
        onUpdateCityDistrict={setCityDistrict}
        onUpdatePostalCode={setPostalCode}
        onUpdateAddressLabel={setAddressLabel}
        onUpdateCountryCode={(code) => {
          setSelectedCountryCode(code);
          try {
            localStorage.setItem('buykit_country_code', code);
          } catch {
            // ignore storage errors
          }
          const found = COUNTRIES_WITH_FLAGS.find((c) => c.code === code);
          if (found) {
            showToast(
              `Shipping country updated to ${found.name} (${found.shippingZone}).`
            );
          }
        }}
        onUpdateLanguageCode={(langCode) => {
          setSelectedLanguageCode(langCode);
          try {
            localStorage.setItem('buykit_language_code', langCode);
          } catch {
            // ignore storage errors
          }
          const found = LANGUAGES_LIST.find((l) => l.code === langCode);
          if (found) {
            showToast(`Display language set to ${found.nativeLabel} (${found.label}).`);
          }
        }}
        onAddCard={(newCard) => {
          setSavedCards((prev) => [
            newCard,
            ...prev.map((c) => (newCard.isDefault ? { ...c, isDefault: false } : c)),
          ]);
          showToast(
            `Added ${newCard.brand} ${newCard.cardType} Card (•••• ${newCard.last4}) to your BuyKit Wallet!`
          );
        }}
        onRemoveCard={(cardId) => {
          setSavedCards((prev) => prev.filter((c) => c.id !== cardId));
          showToast('Removed card from your BuyKit Payment Wallet.');
        }}
        onSetDefaultCard={(cardId) => {
          setSavedCards((prev) =>
            prev.map((c) => ({ ...c, isDefault: c.id === cardId }))
          );
          showToast('Updated your default checkout Credit/Debit card.');
        }}
        onOpenPickupMap={() => {
          setIsSettingsModalOpen(false);
          setIsPickupMapOpen(true);
        }}
        onSaveAllSettings={async () => {
          if (currentUser) {
            await handleSaveAddressToFirestore();
          } else {
            showToast(
              'Saved your Profile, Shipping Address, Country Flag, Language & Card Settings!'
            );
          }
        }}
      />

      {/* Admin Storefront & Campaign Studio Modal (Add Products with Google Details, Launch Animated Sales, Create Promotional Posters) */}
      <AdminStorefrontStudioModal
        isOpen={isAdminStudioOpen}
        onClose={() => setIsAdminStudioOpen(false)}
        catalog={catalog}
        onAddNewProductWithDetails={(newProd, enriched, optionalSale, optionalPoster) => {
          setCatalog((prev) => [newProd, ...prev]);
          setEnrichedProductMap((prev) => ({
            ...prev,
            [newProd.id]: enriched,
          }));
          if (optionalSale) {
            setCreativeSales((prev) => [optionalSale, ...prev]);
          }
          if (optionalPoster) {
            setPromoPosters((prev) => [optionalPoster, ...prev]);
            setAdminBanners((prev) => [
              {
                id: optionalPoster.id,
                productId: newProd.id,
                campaignTag: optionalPoster.campaignTag,
                discountBadge: optionalPoster.discountBadge,
                headline: optionalPoster.headline,
                subheadline: optionalPoster.subheadline,
                dealPrice: optionalPoster.dealPrice,
                originalPrice: optionalPoster.originalPrice,
                soldLabel: 'New Arrival',
                imageUrl: optionalPoster.imageUrl,
              },
              ...prev,
            ]);
          }
          showToast(
            `Added "${newProd.title}" with extended specifications and storefront promotions!`
          );
        }}
        onPublishSaleCampaign={(
          saleSpotlight,
          updatedPrice,
          updatedOriginalPrice,
          updatedDealLabel,
          updatedDealTier
        ) => {
          setCreativeSales((prev) => [
            saleSpotlight,
            ...prev.filter((s) => s.productId !== saleSpotlight.productId),
          ]);
          setCatalog((prev) =>
            prev.map((p) =>
              p.id === saleSpotlight.productId
                ? {
                    ...p,
                    price: updatedPrice,
                    originalPrice: updatedOriginalPrice,
                    dealLabel: updatedDealLabel,
                    dealType: updatedDealTier,
                    tagline: saleSpotlight.creativeTagline,
                  }
                : p
            )
          );
          showToast(
            `Published animated sale "${saleSpotlight.saleBannerTitle}" to the User Dashboard!`
          );
        }}
        onPublishPromoPoster={(poster) => {
          setPromoPosters((prev) => [poster, ...prev]);
          setAdminBanners((prev) => [
            {
              id: poster.id,
              productId: poster.productId,
              campaignTag: poster.campaignTag,
              discountBadge: poster.discountBadge,
              headline: poster.headline,
              subheadline: poster.subheadline,
              dealPrice: poster.dealPrice,
              originalPrice: poster.originalPrice,
              soldLabel: 'Featured Campaign',
              imageUrl: poster.imageUrl,
            },
            ...prev,
          ]);
          setHeroSlideIndex(0);
          showToast('Published new promotional poster to the User Dashboard!');
        }}
      />
    </div>
  );
}
