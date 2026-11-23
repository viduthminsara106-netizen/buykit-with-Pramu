import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Plus,
  Sparkles,
  Tag,
  Package,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Flame,
  Search,
  Edit3,
  Trash2,
  Upload,
  Layers,
  Ticket,
  ShieldCheck,
  Bell,
  Truck,
  HelpCircle,
  UserPlus,
  Clock,
  Eye,
  Send,
  ShoppingCart,
  ShoppingBag,
  Star,
  Megaphone,
  CheckCheck,
  AlertCircle,
  Lock,
  Power,
  Play,
  Square,
  MapPin,
  Phone,
  Mail,
} from 'lucide-react';
import {
  MarketplaceProduct,
  ProductDepartment,
  DealTier,
  ProductCouponOffer,
  formatLKR,
} from '../data/catalog';
import {
  PromotionalPosterCampaign,
  CreativeSaleSpotlight,
  EnrichedProductDetails,
  runPromotionAgent,
  runSalesAgent,
  runDescriptionAgent,
} from '../utils/multiAgentStorefront';
import { resolveAssetUrl } from '../utils/assetResolver';
import {
  AdminEmailRecord,
  AdminNotificationRecord,
  AdminNotificationType,
  AdminOrderRecord,
  ROOT_ADMIN_EMAILS,
  isRootAdminEmail,
  User,
} from '../firebase';
import { CouponOption } from './DarazAliCheckoutView';
import { WelcomePopupPosterConfig } from './WelcomePopupPosterModal';
import {
  FirestoreProductQuestion,
  FirestoreQuestionAnswer,
} from './ProductReviewsAndQaSection';
import { OrderStatusValue } from './OrderTrackingModal';

export interface AdminBannerItem {
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

export type AdminDashboardTabKey =
  | 'products'
  | 'sales'
  | 'promo'
  | 'notifications'
  | 'orders'
  | 'qa_admins';

interface AdminDashboardModalProps {
  isOpen: boolean;
  isAdmin: boolean;
  currentUser: User | null;
  initialTab?: AdminDashboardTabKey;
  initialEditProduct?: MarketplaceProduct | null;
  onClose: () => void;

  // Products
  catalog: MarketplaceProduct[];
  onAddNewProductWithDetails: (
    newProduct: MarketplaceProduct,
    enrichedDetails: EnrichedProductDetails,
    optionalSale?: CreativeSaleSpotlight,
    optionalPoster?: PromotionalPosterCampaign
  ) => void;
  onUpdateProduct: (
    updatedProduct: MarketplaceProduct,
    enrichedDetails?: EnrichedProductDetails
  ) => void;
  onDeleteProduct: (productId: string) => void;
  onToggleProductStock: (productId: string) => void;

  // Sales & Countdown
  creativeSales: CreativeSaleSpotlight[];
  countdownSeconds: number;
  onPublishSaleCampaign: (
    saleSpotlight: CreativeSaleSpotlight,
    updatedPrice: number,
    updatedOriginalPrice: number,
    updatedDealLabel: string,
    updatedDealTier: DealTier
  ) => void;
  onDeleteSaleCampaign: (saleId: string) => void;
  onSetFlashCountdown: (totalSeconds: number, title?: string) => void;
  onEndFlashSaleNow: () => void;

  // Promo: Coupons, Posters, Banners, Welcome Popup
  storeCoupons: CouponOption[];
  onSaveCoupon: (coupon: CouponOption) => void;
  onDeleteCoupon: (couponId: string) => void;
  promoPosters: PromotionalPosterCampaign[];
  adminBanners: AdminBannerItem[];
  onPublishPromoPoster: (poster: PromotionalPosterCampaign) => void;
  onUpdatePromoPoster: (poster: PromotionalPosterCampaign) => void;
  onDeletePromoPoster: (posterId: string) => void;
  onDeleteAdminBanner: (bannerId: string) => void;
  welcomePopupConfig: WelcomePopupPosterConfig;
  onSaveWelcomePopupConfig: (config: WelcomePopupPosterConfig) => void;
  onPreviewWelcomePopup: () => void;

  // Notifications
  notifications: AdminNotificationRecord[];
  onMarkNotificationRead: (notifId: string) => void;
  onMarkAllNotificationsRead: () => void;
  onDeleteNotification: (notifId: string) => void;

  // Orders Tracking (All users)
  adminOrders: AdminOrderRecord[];
  onUpdateAdminOrderStatus: (order: AdminOrderRecord, nextStatus: OrderStatusValue) => Promise<void>;

  // Q&A (Admin-only replies) & Admin Gmail Access Management
  allQuestions: FirestoreProductQuestion[];
  allAnswers: FirestoreQuestionAnswer[];
  onAdminAnswerQuestion: (question: FirestoreProductQuestion, answerText: string) => Promise<void>;
  onAdminDeleteQuestion: (questionId: string) => Promise<void>;
  onAdminDeleteAnswer: (answerId: string) => Promise<void>;
  adminEmails: AdminEmailRecord[];
  onAddAdminEmail: (email: string) => Promise<void>;
  onRemoveAdminEmail: (record: AdminEmailRecord) => Promise<void>;
}

const DEPARTMENTS: ProductDepartment[] = [
  'Audio & Headphones',
  'Smartwatches & Wearables',
  'Cameras & Drones',
  'Computer & Office',
  'Home & Lifestyle',
  'Mobile & Gaming Gear',
];

const DEFAULT_CATEGORY_IMAGES: Record<ProductDepartment, string> = {
  'Audio & Headphones': resolveAssetUrl(
    '/src/assets/images/product_audio_headphones_1794121197272.jpg'
  ),
  'Smartwatches & Wearables': resolveAssetUrl(
    '/src/assets/images/product_smartwatch_pro_1794121197679.jpg'
  ),
  'Cameras & Drones': resolveAssetUrl(
    '/src/assets/images/product_camera_drone_1794121198906.jpg'
  ),
  'Computer & Office': resolveAssetUrl(
    '/src/assets/images/product_powerbank_charger_1794123346828.jpg'
  ),
  'Home & Lifestyle': resolveAssetUrl(
    '/src/assets/images/product_espresso_maker_1794123345741.jpg'
  ),
  'Mobile & Gaming Gear': resolveAssetUrl(
    '/src/assets/images/product_gaming_controller_1794123345268.jpg'
  ),
};

const ORDER_STATUS_OPTIONS: { value: OrderStatusValue; label: string; colorClass: string }[] = [
  { value: 'processing', label: 'Processing', colorClass: 'bg-slate-100 text-slate-700' },
  { value: 'preparing', label: 'Preparing', colorClass: 'bg-amber-100 text-amber-800' },
  { value: 'dispatched', label: 'Dispatched', colorClass: 'bg-blue-100 text-blue-800' },
  { value: 'in_transit', label: 'In Transit', colorClass: 'bg-indigo-100 text-indigo-800' },
  { value: 'shipped', label: 'Shipped', colorClass: 'bg-sky-100 text-sky-800' },
  { value: 'delivered', label: 'Delivered', colorClass: 'bg-emerald-100 text-emerald-800' },
  { value: 'cancelled', label: 'Cancelled', colorClass: 'bg-red-100 text-red-700' },
];

async function compressImageFileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxDim = 900;
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(String(reader.result));
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.84));
      };
      img.onerror = () => resolve(String(reader.result));
      img.src = String(reader.result);
    };
    reader.onerror = () => reject(new Error('Image read failed'));
    reader.readAsDataURL(file);
  });
}

function formatRelativeTime(ms: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ms) / 1000));
  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export const AdminDashboardModal: React.FC<AdminDashboardModalProps> = ({
  isOpen,
  isAdmin,
  currentUser,
  initialTab = 'products',
  initialEditProduct,
  onClose,
  catalog,
  onAddNewProductWithDetails,
  onUpdateProduct,
  onDeleteProduct,
  onToggleProductStock,
  creativeSales,
  countdownSeconds,
  onPublishSaleCampaign,
  onDeleteSaleCampaign,
  onSetFlashCountdown,
  onEndFlashSaleNow,
  storeCoupons,
  onSaveCoupon,
  onDeleteCoupon,
  promoPosters,
  adminBanners,
  onPublishPromoPoster,
  onUpdatePromoPoster,
  onDeletePromoPoster,
  onDeleteAdminBanner,
  welcomePopupConfig,
  onSaveWelcomePopupConfig,
  onPreviewWelcomePopup,
  notifications,
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onDeleteNotification,
  adminOrders,
  onUpdateAdminOrderStatus,
  allQuestions,
  allAnswers,
  onAdminAnswerQuestion,
  onAdminDeleteQuestion,
  onAdminDeleteAnswer,
  adminEmails,
  onAddAdminEmail,
  onRemoveAdminEmail,
}) => {
  const [activeTab, setActiveTab] = useState<AdminDashboardTabKey>(initialTab);

  // ========================
  // TAB 1: PRODUCTS STATE
  // ========================
  const [productSubView, setProductSubView] = useState<'list' | 'form'>('list');
  const [productSearch, setProductSearch] = useState('');
  const [productStockFilter, setProductStockFilter] = useState<'all' | 'in_stock' | 'out_of_stock'>(
    'all'
  );
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [pTitle, setPTitle] = useState('');
  const [pCategory, setPCategory] = useState<ProductDepartment>('Audio & Headphones');
  const [pPrice, setPPrice] = useState('18900');
  const [pOriginalPrice, setPOriginalPrice] = useState('34500');
  const [pDealTier, setPDealTier] = useState<DealTier>('flash_sale');
  const [pDealLabel, setPDealLabel] = useState('Flash SuperDeal');
  const [pTagline, setPTagline] = useState('');
  const [pStoreName, setPStoreName] = useState('BuyKit Official Mall');
  const [pStockRemaining, setPStockRemaining] = useState('25');
  const [pTotalStock, setPTotalStock] = useState('120');
  const [pMaxOrder, setPMaxOrder] = useState('5');
  const [pFreeShipping, setPFreeShipping] = useState(true);
  const [pImageUrl, setPImageUrl] = useState('');
  const [pExtraImages, setPExtraImages] = useState<string[]>([]);
  const [extraImgInput, setExtraImgInput] = useState('');
  const [pDescription, setPDescription] = useState('');
  const [pSpecsText, setPSpecsText] = useState('');
  const [pCoupons, setPCoupons] = useState<ProductCouponOffer[]>([]);
  const [newProdCouponCode, setNewProdCouponCode] = useState('');
  const [newProdCouponVal, setNewProdCouponVal] = useState('1500');
  const [newProdCouponType, setNewProdCouponType] = useState<'flat' | 'percent'>('flat');
  const [autoGenerateLaunchSale, setAutoGenerateLaunchSale] = useState(true);
  const [autoGenerateLaunchPoster, setAutoGenerateLaunchPoster] = useState(true);
  const [runningProductAgent, setRunningProductAgent] = useState(false);
  const [agentEnrichedPreview, setAgentEnrichedPreview] = useState<EnrichedProductDetails | null>(
    null
  );

  // ========================
  // TAB 2: SALES & COUNTDOWN STATE
  // ========================
  const [cdHours, setCdHours] = useState('4');
  const [cdMins, setCdMins] = useState('30');
  const [cdSecs, setCdSecs] = useState('0');
  const [cdTitle, setCdTitle] = useState('BuyKit Mega Flash Sale');
  const [saleProductId, setSaleProductId] = useState(catalog[0]?.id || '');
  const [salePrice, setSalePrice] = useState('14900');
  const [saleOriginalPrice, setSaleOriginalPrice] = useState('32000');
  const [saleDealLabel, setSaleDealLabel] = useState('Mega Flash Sale');
  const [saleDealTier, setSaleDealTier] = useState<DealTier>('flash_sale');
  const [salePromoNote, setSalePromoNote] = useState(
    'Limited-time Sri Lanka Flash Offer with Free Express Hub Pickup & Extra LKR Cashback'
  );
  const [runningSalesAgent, setRunningSalesAgent] = useState(false);

  // ========================
  // TAB 3: PROMO (COUPONS, POSTERS/BANNERS, WELCOME POPUP) STATE
  // ========================
  const [promoSubTab, setPromoSubTab] = useState<'coupons' | 'posters' | 'welcome_popup'>(
    'coupons'
  );
  // Coupons form
  const [editingCouponId, setEditingCouponId] = useState<string | null>(null);
  const [cCode, setCCode] = useState('');
  const [cTitle, setCTitle] = useState('');
  const [cSubtitle, setCSubtitle] = useState('');
  const [cType, setCType] = useState<'flat' | 'percent'>('flat');
  const [cValue, setCValue] = useState('2000');
  const [cMaxCap, setCMaxCap] = useState('5000');
  const [cMinSpend, setCMinSpend] = useState('5000');
  // Posters & Banners form + Promotion Agent
  const [editingPosterId, setEditingPosterId] = useState<string | null>(null);
  const [posterProductId, setPosterProductId] = useState(catalog[0]?.id || '');
  const [posterHeadline, setPosterHeadline] = useState('');
  const [posterSubheadline, setPosterSubheadline] = useState('');
  const [posterCampaignTag, setPosterCampaignTag] = useState('ADMIN PROMO CAMPAIGN');
  const [posterDiscountBadge, setPosterDiscountBadge] = useState('UP TO 60% OFF');
  const [posterCtaLabel, setPosterCtaLabel] = useState('Shop Deal Now');
  const [posterImageUrl, setPosterImageUrl] = useState('');
  const [posterBrief, setPosterBrief] = useState(
    'Create an eye-catching Daraz/AliExpress mega festival ad poster with urgent LKR savings'
  );
  const [runningPromoAgent, setRunningPromoAgent] = useState(false);
  // Welcome Popup Poster form
  const [popupDraft, setPopupDraft] = useState<WelcomePopupPosterConfig>(welcomePopupConfig);

  // ========================
  // TAB 4: NOTIFICATIONS STATE
  // ========================
  const [notifFilter, setNotifFilter] = useState<'all' | AdminNotificationType>('all');

  // ========================
  // TAB 5: ORDER TRACKING STATE
  // ========================
  const [orderSearch, setOrderSearch] = useState('');
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | OrderStatusValue>('all');
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  // ========================
  // TAB 6: Q&A & ADMINS STATE
  // ========================
  const [qaFilter, setQaFilter] = useState<'unanswered' | 'all'>('unanswered');
  const [qaAnswerDrafts, setQaAnswerDrafts] = useState<Record<string, string>>({});
  const [submittingQaId, setSubmittingQaId] = useState<string | null>(null);
  const [newAdminEmailInput, setNewAdminEmailInput] = useState('');
  const [addingAdminEmail, setAddingAdminEmail] = useState(false);
  const [adminEmailError, setAdminEmailError] = useState('');

  // Sync welcomePopupConfig into draft whenever prop updates
  useEffect(() => {
    setPopupDraft(welcomePopupConfig);
  }, [welcomePopupConfig]);

  // Populate product editor if opened with initialEditProduct
  useEffect(() => {
    if (!isOpen) return;
    if (initialEditProduct) {
      setActiveTab('products');
      loadProductIntoForm(initialEditProduct);
    } else {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialEditProduct, initialTab]);

  // Keep selected product ID valid for sales/poster dropdowns
  useEffect(() => {
    if (catalog.length > 0) {
      if (!saleProductId || !catalog.some((p) => p.id === saleProductId)) {
        setSaleProductId(catalog[0].id);
      }
      if (!posterProductId || !catalog.some((p) => p.id === posterProductId)) {
        setPosterProductId(catalog[0].id);
      }
    }
  }, [catalog, saleProductId, posterProductId]);

  const unreadNotifCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  const unansweredQuestionsCount = useMemo(() => {
    const answeredIds = new Set(allAnswers.map((a) => a.questionId));
    return allQuestions.filter((q) => !answeredIds.has(q.questionId)).length;
  }, [allQuestions, allAnswers]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return catalog.filter((p) => {
      if (productStockFilter === 'in_stock' && p.stockRemaining <= 0) return false;
      if (productStockFilter === 'out_of_stock' && p.stockRemaining > 0) return false;
      if (!q) return true;
      return (
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.storeName.toLowerCase().includes(q)
      );
    });
  }, [catalog, productSearch, productStockFilter]);

  const filteredNotifications = useMemo(() => {
    if (notifFilter === 'all') return notifications;
    return notifications.filter((n) => n.type === notifFilter);
  }, [notifications, notifFilter]);

  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return adminOrders.filter((ord) => {
      if (orderStatusFilter !== 'all' && ord.status !== orderStatusFilter) return false;
      if (!q) return true;
      return (
        ord.orderNumber.toLowerCase().includes(q) ||
        ord.customerName.toLowerCase().includes(q) ||
        ord.customerEmail.toLowerCase().includes(q) ||
        ord.customerPhone.toLowerCase().includes(q) ||
        ord.summaryTitle.toLowerCase().includes(q) ||
        ord.shippingAddress.toLowerCase().includes(q)
      );
    });
  }, [adminOrders, orderSearch, orderStatusFilter]);

  const filteredQuestions = useMemo(() => {
    const answeredIds = new Set(allAnswers.map((a) => a.questionId));
    if (qaFilter === 'unanswered') {
      return allQuestions.filter((q) => !answeredIds.has(q.questionId));
    }
    return allQuestions;
  }, [allQuestions, allAnswers, qaFilter]);

  if (!isOpen || !isAdmin) return null;

  // ========================
  // PRODUCT FORM HELPERS
  // ========================
  const resetProductForm = () => {
    setEditingProductId(null);
    setPTitle('');
    setPCategory('Audio & Headphones');
    setPPrice('18900');
    setPOriginalPrice('34500');
    setPDealTier('flash_sale');
    setPDealLabel('Flash SuperDeal');
    setPTagline('');
    setPStoreName('BuyKit Official Mall');
    setPStockRemaining('25');
    setPTotalStock('120');
    setPMaxOrder('5');
    setPFreeShipping(true);
    setPImageUrl('');
    setPExtraImages([]);
    setExtraImgInput('');
    setPDescription('');
    setPSpecsText('');
    setPCoupons([]);
    setAgentEnrichedPreview(null);
  };

  function loadProductIntoForm(prod: MarketplaceProduct) {
    setEditingProductId(prod.id);
    setPTitle(prod.title);
    setPCategory(prod.category);
    setPPrice(String(prod.price));
    setPOriginalPrice(String(prod.originalPrice));
    setPDealTier(prod.dealType);
    setPDealLabel(prod.dealLabel);
    setPTagline(prod.tagline);
    setPStoreName(prod.storeName);
    setPStockRemaining(String(prod.stockRemaining));
    setPTotalStock(String(prod.totalStock));
    setPMaxOrder(String(prod.maxOrderQuota || 5));
    setPFreeShipping(prod.freeShipping);
    setPImageUrl(prod.imageUrl);
    setPExtraImages(prod.extraImages || []);
    setPDescription(prod.description);
    setPSpecsText((prod.specs || []).join('\n'));
    setPCoupons(prod.productCoupons || []);
    setAgentEnrichedPreview(null);
    setProductSubView('form');
  }

  const handleUploadMainImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPImageUrl(dataUrl);
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadExtraImages = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const urls: string[] = [];
    for (const f of files.slice(0, 5)) {
      const dataUrl = await compressImageFileToDataUrl(f);
      urls.push(dataUrl);
    }
    setPExtraImages((prev) => [...prev, ...urls].slice(0, 8));
    e.target.value = '';
  };

  const handleRunProductAddAgent = async () => {
    if (!pTitle.trim()) return;
    setRunningProductAgent(true);
    try {
      const specsArr = pSpecsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const targetId = editingProductId || `prod_admin_${Date.now()}`;
      const enrichedBody = await runDescriptionAgent({
        productTitle: pTitle.trim(),
        category: pCategory,
        adminNotes: pDescription.trim() || `${pTitle.trim()} — Official BuyKit Mall listing`,
        adminSpecs: specsArr,
      });
      const fullEnriched: EnrichedProductDetails = {
        productId: targetId,
        ...enrichedBody,
      };
      setAgentEnrichedPreview(fullEnriched);
      if (!pTagline.trim() && fullEnriched.enhancedTagline) {
        setPTagline(fullEnriched.enhancedTagline.slice(0, 110));
      }
      if (!pDescription.trim() && fullEnriched.extendedDescription) {
        setPDescription(fullEnriched.extendedDescription);
      }
      if (specsArr.length === 0 && fullEnriched.keyFeatures.length > 0) {
        setPSpecsText(fullEnriched.keyFeatures.join('\n'));
      }
    } finally {
      setRunningProductAgent(false);
    }
  };

  const handleAddProductCoupon = () => {
    const cleanCode = newProdCouponCode.trim().toUpperCase();
    const val = Math.max(1, Number(newProdCouponVal) || 500);
    if (!cleanCode) return;
    const newCoupon: ProductCouponOffer = {
      id: `pc_${Date.now()}`,
      code: cleanCode,
      badgeText: newProdCouponType === 'percent' ? `${val}% OFF` : `Rs. ${val.toLocaleString()} OFF`,
      subtitle:
        newProdCouponType === 'percent'
          ? `Instant ${val}% product voucher`
          : `Instant Rs. ${val.toLocaleString()} OFF this item`,
      type: newProdCouponType,
      value: val,
      maxCap: newProdCouponType === 'percent' ? 5000 : val,
      minSpend: 0,
    };
    setPCoupons((prev) => [...prev, newCoupon]);
    setNewProdCouponCode('');
  };

  const handleSaveProductForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = pTitle.trim();
    if (!cleanTitle) return;

    const dealPriceNum = Math.max(100, Number(pPrice) || 12500);
    const origPriceNum = Math.max(dealPriceNum, Number(pOriginalPrice) || Math.round(dealPriceNum * 1.4));
    const stockRem = Math.max(0, Number(pStockRemaining) || 0);
    const totalStk = Math.max(stockRem, Number(pTotalStock) || 100);
    const maxOrd = Math.max(1, Number(pMaxOrder) || 5);
    const finalImg = pImageUrl.trim() || DEFAULT_CATEGORY_IMAGES[pCategory];
    const specsList = pSpecsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const finalSpecs =
      specsList.length > 0
        ? specsList
        : ['100% Genuine BuyKit Mall Certified', '1-Year Sri Lanka Official Warranty', 'Islandwide Express Delivery'];

    if (editingProductId) {
      const existing = catalog.find((c) => c.id === editingProductId);
      const updatedProduct: MarketplaceProduct = {
        ...(existing || {
          id: editingProductId,
          rating: 4.9,
          soldCount: 120,
          newUserPrice: Math.max(100, Math.round(dealPriceNum * 0.9)),
          codEligible: true,
          stockRemaining: stockRem,
          totalStock: totalStk,
        }),
        title: cleanTitle,
        category: pCategory,
        price: dealPriceNum,
        originalPrice: origPriceNum,
        newUserPrice: existing
          ? Math.min(dealPriceNum, existing.newUserPrice)
          : Math.max(100, Math.round(dealPriceNum * 0.9)),
        dealType: pDealTier,
        dealLabel: pDealLabel.trim() || 'SuperDeal',
        tagline: pTagline.trim() || `${cleanTitle} — Genuine BuyKit Mall Selection`,
        storeName: pStoreName.trim() || 'BuyKit Official Mall',
        stockRemaining: stockRem,
        totalStock: totalStk,
        maxOrderQuota: maxOrd,
        freeShipping: pFreeShipping,
        imageUrl: finalImg,
        extraImages: pExtraImages,
        description: pDescription.trim() || `${cleanTitle} available now at BuyKit with Pramu.`,
        specs: finalSpecs,
        productCoupons: pCoupons,
      };
      onUpdateProduct(updatedProduct, agentEnrichedPreview || undefined);
      resetProductForm();
      setProductSubView('list');
      return;
    }

    // Creating a NEW product
    setRunningProductAgent(true);
    try {
      const newProdId = `prod_admin_${Date.now()}`;
      const newProduct: MarketplaceProduct = {
        id: newProdId,
        title: cleanTitle,
        category: pCategory,
        price: dealPriceNum,
        originalPrice: origPriceNum,
        newUserPrice: Math.max(100, Math.round(dealPriceNum * 0.9)),
        dealType: pDealTier,
        dealLabel: pDealLabel.trim() || 'New Arrival Deal',
        tagline: pTagline.trim() || `${cleanTitle} — Genuine BuyKit Mall Selection`,
        storeName: pStoreName.trim() || 'BuyKit Official Mall',
        rating: 4.9,
        soldCount: 42,
        stockRemaining: stockRem,
        totalStock: totalStk,
        maxOrderQuota: maxOrd,
        freeShipping: pFreeShipping,
        codEligible: true,
        imageUrl: finalImg,
        extraImages: pExtraImages,
        description: pDescription.trim() || `${cleanTitle} — officially available at BuyKit with Pramu.`,
        specs: finalSpecs,
        productCoupons: pCoupons,
      };

      const enriched: EnrichedProductDetails = agentEnrichedPreview
        ? { ...agentEnrichedPreview, productId: newProdId }
        : {
            productId: newProdId,
            ...(await runDescriptionAgent({
              productTitle: cleanTitle,
              category: pCategory,
              adminNotes: newProduct.description,
              adminSpecs: finalSpecs,
            })),
          };

      const discountPct = Math.max(
        5,
        Math.round(((origPriceNum - dealPriceNum) / Math.max(1, origPriceNum)) * 100)
      );

      let optionalSale: CreativeSaleSpotlight | undefined;
      if (autoGenerateLaunchSale) {
        const salesRes = await runSalesAgent({
          saleName: `${pDealLabel || 'Launch'} Offer`,
          discountPercent: discountPct,
          dealTier: pDealTier,
          productTitle: cleanTitle,
          currentPrice: dealPriceNum,
          originalPrice: origPriceNum,
          isNewProduct: true,
        });
        optionalSale = {
          id: `sale_${Date.now()}`,
          productId: newProdId,
          productTitle: cleanTitle,
          productImageUrl: finalImg,
          category: pCategory,
          saleBannerTitle: salesRes.saleBannerTitle,
          dealLabel: salesRes.dealLabel,
          animatedRibbonText: salesRes.animatedRibbonText,
          creativeTagline: salesRes.creativeTagline,
          urgencyHighlight: salesRes.urgencyHighlight,
          salePrice: salesRes.computedSalePrice || dealPriceNum,
          originalPrice: salesRes.originalPrice || origPriceNum,
          discountPercent: salesRes.discountPercent || discountPct,
          dealTier: pDealTier,
          isNewProduct: true,
          claimedPercent: 68,
        };
      }

      let optionalPoster: PromotionalPosterCampaign | undefined;
      if (autoGenerateLaunchPoster) {
        const promoRes = await runPromotionAgent({
          campaignTheme: `Launch ${cleanTitle} with high-impact LKR deal poster`,
          productTitle: cleanTitle,
          category: pCategory,
          dealPrice: dealPriceNum,
          originalPrice: origPriceNum,
          generateAiPoster: false,
          fallbackImageUrl: finalImg,
        });
        optionalPoster = {
          id: `poster_${Date.now()}`,
          productId: newProdId,
          dealPrice: dealPriceNum,
          originalPrice: origPriceNum,
          createdAt: new Date().toISOString().slice(0, 10),
          ...promoRes,
        };
      }

      onAddNewProductWithDetails(newProduct, enriched, optionalSale, optionalPoster);
      resetProductForm();
      setProductSubView('list');
    } finally {
      setRunningProductAgent(false);
    }
  };

  // ========================
  // SALES TAB HANDLERS
  // ========================
  const handleRunSalesAgentAndPublish = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd = catalog.find((p) => p.id === saleProductId);
    if (!targetProd) return;
    setRunningSalesAgent(true);
    try {
      const nextPrice = Math.max(100, Number(salePrice) || targetProd.price);
      const nextOrig = Math.max(nextPrice, Number(saleOriginalPrice) || targetProd.originalPrice);
      const discountPct = Math.max(
        5,
        Math.round(((nextOrig - nextPrice) / Math.max(1, nextOrig)) * 100)
      );
      const salesRes = await runSalesAgent({
        saleName: salePromoNote.trim() || saleDealLabel || 'Mega Flash Sale',
        discountPercent: discountPct,
        dealTier: saleDealTier,
        productTitle: targetProd.title,
        currentPrice: nextPrice,
        originalPrice: nextOrig,
        isNewProduct: false,
      });
      const spotlight: CreativeSaleSpotlight = {
        id: `sale_${targetProd.id}_${Date.now()}`,
        productId: targetProd.id,
        productTitle: targetProd.title,
        productImageUrl: targetProd.imageUrl,
        category: targetProd.category,
        saleBannerTitle: salesRes.saleBannerTitle,
        dealLabel: salesRes.dealLabel,
        animatedRibbonText: salesRes.animatedRibbonText,
        creativeTagline: salesRes.creativeTagline,
        urgencyHighlight: salesRes.urgencyHighlight,
        salePrice: nextPrice,
        originalPrice: nextOrig,
        discountPercent: discountPct,
        dealTier: saleDealTier,
        isNewProduct: false,
        claimedPercent: 82,
      };
      onPublishSaleCampaign(
        spotlight,
        nextPrice,
        nextOrig,
        saleDealLabel.trim() || salesRes.dealLabel || 'Flash Sale',
        saleDealTier
      );
    } finally {
      setRunningSalesAgent(false);
    }
  };

  const handleApplyCountdownTimer = (e: React.FormEvent) => {
    e.preventDefault();
    const h = Math.max(0, Number(cdHours) || 0);
    const m = Math.max(0, Number(cdMins) || 0);
    const s = Math.max(0, Number(cdSecs) || 0);
    const total = Math.max(10, h * 3600 + m * 60 + s);
    onSetFlashCountdown(total, cdTitle.trim() || 'BuyKit Flash Sale');
  };

  // ========================
  // PROMO TAB HANDLERS
  // ========================
  const handleSaveCouponForm = (e: React.FormEvent) => {
    e.preventDefault();
    const code = cCode.trim().toUpperCase();
    if (!code) return;
    const val = Math.max(1, Number(cValue) || 1000);
    const cap = cType === 'percent' ? Math.max(val, Number(cMaxCap) || 5000) : val;
    const minSp = Math.max(0, Number(cMinSpend) || 0);

    const couponObj: CouponOption = {
      id: editingCouponId || `coupon_admin_${Date.now()}`,
      code,
      title: cTitle.trim() || `${code} Special Voucher`,
      subtitle:
        cSubtitle.trim() ||
        (cType === 'percent'
          ? `${val}% OFF (Max Rs. ${cap.toLocaleString()})`
          : `Flat Rs. ${val.toLocaleString()} OFF orders over Rs. ${minSp.toLocaleString()}`),
      type: cType,
      value: val,
      maxCap: cap,
      minSpend: minSp,
      badgeText:
        cType === 'percent' ? `${val}% OFF · Max Rs. ${cap.toLocaleString()}` : `Flat Rs. ${val.toLocaleString()} OFF`,
    };
    onSaveCoupon(couponObj);
    setEditingCouponId(null);
    setCCode('');
    setCTitle('');
    setCSubtitle('');
    setCValue('2000');
    setCMaxCap('5000');
    setCMinSpend('5000');
  };

  const handleRunPromoAgent = async () => {
    const prod = catalog.find((p) => p.id === posterProductId) || catalog[0];
    if (!prod) return;
    setRunningPromoAgent(true);
    try {
      const generated = await runPromotionAgent({
        campaignTheme: posterBrief.trim() || 'Mega Festival Sale',
        productTitle: prod.title,
        category: prod.category,
        dealPrice: prod.price,
        originalPrice: prod.originalPrice,
        generateAiPoster: false,
        fallbackImageUrl: posterImageUrl.trim() || prod.imageUrl,
      });
      setPosterHeadline(generated.headline);
      setPosterSubheadline(generated.subheadline);
      setPosterCampaignTag(generated.campaignTag);
      setPosterDiscountBadge(generated.discountBadge);
      setPosterCtaLabel(generated.ctaLabel);
      if (!posterImageUrl.trim()) {
        setPosterImageUrl(generated.imageUrl);
      }
    } finally {
      setRunningPromoAgent(false);
    }
  };

  const handleUploadPosterImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPosterImageUrl(dataUrl);
    } finally {
      e.target.value = '';
    }
  };

  const handleUploadWelcomePopupImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setPopupDraft((prev) => ({ ...prev, imageUrl: dataUrl }));
    } finally {
      e.target.value = '';
    }
  };

  const handleSavePosterForm = (e: React.FormEvent) => {
    e.preventDefault();
    const prod = catalog.find((p) => p.id === posterProductId) || catalog[0];
    if (!prod || !posterHeadline.trim()) return;
    const posterObj: PromotionalPosterCampaign = {
      id: editingPosterId || `poster_admin_${Date.now()}`,
      productId: prod.id,
      campaignTag: posterCampaignTag.trim() || 'ADMIN PROMO',
      headline: posterHeadline.trim(),
      subheadline: posterSubheadline.trim() || prod.tagline,
      discountBadge: posterDiscountBadge.trim() || 'HOT DEAL',
      ctaLabel: posterCtaLabel.trim() || 'Shop Now',
      dealPrice: prod.price,
      originalPrice: prod.originalPrice,
      accentTheme: 'orange_gold',
      imageUrl: posterImageUrl.trim() || prod.imageUrl,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    if (editingPosterId) {
      onUpdatePromoPoster(posterObj);
    } else {
      onPublishPromoPoster(posterObj);
    }
    setEditingPosterId(null);
    setPosterHeadline('');
    setPosterSubheadline('');
    setPosterImageUrl('');
  };

  // ========================
  // Q&A & ADMINS HANDLERS
  // ========================
  const handlePostQaAnswer = async (question: FirestoreProductQuestion) => {
    const text = (qaAnswerDrafts[question.questionId] || '').trim();
    if (!text) return;
    setSubmittingQaId(question.questionId);
    try {
      await onAdminAnswerQuestion(question, text);
      setQaAnswerDrafts((prev) => ({ ...prev, [question.questionId]: '' }));
    } finally {
      setSubmittingQaId(null);
    }
  };

  const handleAddAdminEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminEmailError('');
    const clean = newAdminEmailInput.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setAdminEmailError('Please enter a valid Gmail / email address.');
      return;
    }
    if (isRootAdminEmail(clean)) {
      setAdminEmailError(`${clean} is already a permanent Root Admin.`);
      return;
    }
    if (adminEmails.some((a) => a.email.toLowerCase() === clean)) {
      setAdminEmailError('This email already has Admin access.');
      return;
    }
    setAddingAdminEmail(true);
    try {
      await onAddAdminEmail(clean);
      setNewAdminEmailInput('');
    } catch (err) {
      setAdminEmailError(err instanceof Error ? err.message : 'Failed to add Admin Gmail.');
    } finally {
      setAddingAdminEmail(false);
    }
  };

  const formatCountdownDisplay = () => {
    const h = String(Math.floor(countdownSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((countdownSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(countdownSeconds % 60).padStart(2, '0');
    return `${h}:${m}:${s}`;
  };

  const renderNotificationIcon = (type: AdminNotificationType) => {
    switch (type) {
      case 'cart_add':
        return <ShoppingCart className="h-4 w-4 text-amber-600" />;
      case 'order_placed':
        return <ShoppingBag className="h-4 w-4 text-emerald-600" />;
      case 'review_added':
        return <Star className="h-4 w-4 text-yellow-500" />;
      case 'question_asked':
        return <HelpCircle className="h-4 w-4 text-blue-600" />;
      case 'sale_started':
        return <Flame className="h-4 w-4 text-[#F85606]" />;
      case 'sale_ended':
        return <Clock className="h-4 w-4 text-rose-600" />;
      case 'promo_updated':
        return <Megaphone className="h-4 w-4 text-purple-600" />;
      default:
        return <Bell className="h-4 w-4 text-slate-600" />;
    }
  };

  const totalOrderRevenue = adminOrders
    .filter((o) => o.status !== 'cancelled')
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div className="fixed inset-0 z-[65] flex flex-col bg-slate-950/80 backdrop-blur-xs sm:p-4">
      <div className="mx-auto flex h-full w-full max-w-[1440px] flex-col overflow-hidden bg-[#F8F9FB] shadow-2xl sm:rounded-3xl sm:border sm:border-slate-700/60">
        {/* ======================================================
            TOP EXECUTIVE ADMIN HEADER
           ====================================================== */}
        <header className="shrink-0 bg-slate-950 px-4 py-3.5 text-white sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[#F85606] to-amber-500 text-white shadow-md">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="font-display text-lg font-extrabold tracking-tight text-white sm:text-xl">
                    BuyKit Admin Panel Dashboard
                  </h2>
                  <span className="rounded-md bg-emerald-500/20 px-2 py-0.5 font-mono text-[10px] font-extrabold text-emerald-300 uppercase">
                    Admin Only
                  </span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Signed in as{' '}
                  <span className="font-semibold text-amber-300">{currentUser?.email}</span>
                  {isRootAdminEmail(currentUser?.email) && (
                    <span className="ml-1.5 rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                      Root Admin
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-200 transition-colors hover:border-[#F85606] hover:bg-[#F85606] hover:text-white"
            >
              <X className="h-4 w-4" />
              <span>Exit Admin</span>
            </button>
          </div>

          {/* 6 ADMIN TABS BAR */}
          <nav className="mt-3.5 flex gap-1.5 overflow-x-auto pb-1">
            {[
              {
                key: 'products' as AdminDashboardTabKey,
                label: 'Products',
                icon: Package,
                badge: String(catalog.length),
                badgeAlert: false,
              },
              {
                key: 'sales' as AdminDashboardTabKey,
                label: 'Sales',
                icon: Flame,
                badge: countdownSeconds > 0 ? formatCountdownDisplay() : 'Ended',
                badgeAlert: false,
              },
              {
                key: 'promo' as AdminDashboardTabKey,
                label: 'Promo',
                icon: Megaphone,
                badge: `${storeCoupons.length}C · ${promoPosters.length}P`,
                badgeAlert: false,
              },
              {
                key: 'notifications' as AdminDashboardTabKey,
                label: 'Notifications',
                icon: Bell,
                badge: unreadNotifCount > 0 ? String(unreadNotifCount) : String(notifications.length),
                badgeAlert: unreadNotifCount > 0,
              },
              {
                key: 'orders' as AdminDashboardTabKey,
                label: 'Order Tracking',
                icon: Truck,
                badge: String(adminOrders.length),
                badgeAlert: adminOrders.some(
                  (o) => o.status === 'processing' || o.status === 'preparing'
                ),
              },
              {
                key: 'qa_admins' as AdminDashboardTabKey,
                label: 'Q&A & Admins',
                icon: ShieldCheck,
                badge:
                  unansweredQuestionsCount > 0
                    ? `${unansweredQuestionsCount} Q`
                    : `${adminEmails.length + 1} Admins`,
                badgeAlert: unansweredQuestionsCount > 0,
              },
            ].map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setActiveTab(tab.key)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-extrabold whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#F85606] text-white shadow-sm'
                      : 'bg-slate-900/90 text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span>{tab.label}</span>
                  <span
                    className={`rounded-md px-1.5 py-0.5 font-mono text-[10px] font-extrabold ${
                      tab.badgeAlert
                        ? 'bg-red-600 text-white'
                        : isActive
                        ? 'bg-black/25 text-white'
                        : 'bg-slate-800 text-slate-300'
                    }`}
                  >
                    {tab.badge}
                  </span>
                </button>
              );
            })}
          </nav>
        </header>

        {/* ======================================================
            SCROLLABLE TAB BODY
           ====================================================== */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* ====================================================
              TAB 1: PRODUCTS TAB (Add / Edit / Delete + In Stock/Out of Stock + Product Add Agent)
             ==================================================== */}
          {activeTab === 'products' && (
            <div className="space-y-5">
              {/* Top Action Bar & KPI Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setProductSubView('list')}
                    className={`rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                      productSubView === 'list'
                        ? 'bg-slate-950 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-700 hover:border-[#F85606]'
                    }`}
                  >
                    All Products ({catalog.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetProductForm();
                      setProductSubView('form');
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                      productSubView === 'form'
                        ? 'bg-[#F85606] text-white'
                        : 'bg-[#FFF3EB] text-[#F85606] hover:bg-[#F85606] hover:text-white'
                    }`}
                  >
                    <Plus className="h-4 w-4" />
                    <span>{editingProductId ? 'Editing Product' : 'Add Product + AI Agent'}</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2 font-mono text-xs">
                  <span className="rounded-lg bg-emerald-50 px-2.5 py-1 font-bold text-emerald-700">
                    In Stock: {catalog.filter((p) => p.stockRemaining > 0).length}
                  </span>
                  <span className="rounded-lg bg-red-50 px-2.5 py-1 font-bold text-red-700">
                    Out of Stock: {catalog.filter((p) => p.stockRemaining <= 0).length}
                  </span>
                </div>
              </div>

              {productSubView === 'list' ? (
                <div className="space-y-4">
                  {/* Search & Stock Filter */}
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="relative flex-1 min-w-[220px]">
                      <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        type="text"
                        value={productSearch}
                        onChange={(e) => setProductSearch(e.target.value)}
                        placeholder="Search products by name, category, or store..."
                        className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>
                    <div className="flex items-center gap-1.5">
                      {(
                        [
                          { id: 'all', label: 'All' },
                          { id: 'in_stock', label: 'In Stock' },
                          { id: 'out_of_stock', label: 'Out of Stock' },
                        ] as const
                      ).map((flt) => (
                        <button
                          key={flt.id}
                          type="button"
                          onClick={() => setProductStockFilter(flt.id)}
                          className={`rounded-xl px-3 py-2 text-xs font-bold transition-colors ${
                            productStockFilter === flt.id
                              ? 'bg-[#F85606] text-white'
                              : 'border border-slate-200 bg-white text-slate-600 hover:border-orange-300'
                          }`}
                        >
                          {flt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Products Grid */}
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {filteredProducts.map((prod) => {
                      const inStock = prod.stockRemaining > 0;
                      return (
                        <div
                          key={prod.id}
                          className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs transition-all hover:border-orange-300"
                        >
                          <div className="flex items-start gap-3">
                            <img
                              src={resolveAssetUrl(prod.imageUrl)}
                              alt={prod.title}
                              referrerPolicy="no-referrer"
                              className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 object-cover"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="truncate text-[10px] font-bold text-slate-500 uppercase">
                                  {prod.category}
                                </span>
                                <span
                                  className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${
                                    inStock
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-red-100 text-red-700'
                                  }`}
                                >
                                  {inStock ? `In Stock (${prod.stockRemaining})` : 'Out of Stock'}
                                </span>
                              </div>
                              <h3 className="mt-1 line-clamp-2 font-display text-sm font-bold text-slate-900">
                                {prod.title}
                              </h3>
                              <div className="mt-1 flex items-baseline gap-2 font-mono">
                                <span className="text-sm font-extrabold text-[#F85606]">
                                  {formatLKR(prod.price)}
                                </span>
                                <span className="text-[11px] text-slate-400 line-through">
                                  {formatLKR(prod.originalPrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Admin-Only Product Actions: In Stock/Out of Stock Toggle, Edit, Delete */}
                          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-2.5">
                            <button
                              type="button"
                              onClick={() => onToggleProductStock(prod.id)}
                              className={`inline-flex flex-1 items-center justify-center gap-1 rounded-xl px-2.5 py-2 text-[11px] font-extrabold transition-colors ${
                                inStock
                                  ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-600 hover:text-white'
                                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white'
                              }`}
                            >
                              <Power className="h-3.5 w-3.5" />
                              <span>{inStock ? 'Set Out of Stock' : 'Set In Stock'}</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => loadProductIntoForm(prod)}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] font-bold text-slate-700 hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => onDeleteProduct(prod.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-white px-2.5 py-2 text-[11px] font-bold text-red-600 hover:bg-red-600 hover:text-white"
                              title="Delete Product"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                /* ADD / EDIT PRODUCT FORM + PRODUCT ADD AGENT */
                <form
                  onSubmit={handleSaveProductForm}
                  className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                      <h3 className="font-display text-base font-extrabold text-slate-950">
                        {editingProductId ? 'Edit Product Details' : 'Add New Product with Product Add Agent'}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Enter product details or click "Run Product Add Agent" to auto-generate descriptions & specs.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRunProductAddAgent}
                      disabled={runningProductAgent || !pTitle.trim()}
                      className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-4 py-2 text-xs font-extrabold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                    >
                      {runningProductAgent ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Sparkles className="h-4 w-4 text-amber-300" />
                      )}
                      <span>Run Product Add Agent (AI Enrich)</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div className="md:col-span-2">
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Product Name *
                      </label>
                      <input
                        type="text"
                        required
                        value={pTitle}
                        onChange={(e) => setPTitle(e.target.value)}
                        placeholder="e.g., Sony WH-1000XM5 Wireless ANC Headphones"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Department / Category
                      </label>
                      <select
                        value={pCategory}
                        onChange={(e) => setPCategory(e.target.value as ProductDepartment)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      >
                        {DEPARTMENTS.map((dept) => (
                          <option key={dept} value={dept}>
                            {dept}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Selling Price (LKR) *
                      </label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={pPrice}
                        onChange={(e) => setPPrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Original MRP Price (LKR) *
                      </label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={pOriginalPrice}
                        onChange={(e) => setPOriginalPrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Stock Quantity (0 = Out of Stock)
                      </label>
                      <input
                        type="number"
                        min={0}
                        value={pStockRemaining}
                        onChange={(e) => setPStockRemaining(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Deal Tier
                      </label>
                      <select
                        value={pDealTier}
                        onChange={(e) => setPDealTier(e.target.value as DealTier)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                      >
                        <option value="flash_sale">Flash Sale</option>
                        <option value="new_user">New User Deal</option>
                        <option value="choice_bundle">Choice Bundle</option>
                        <option value="standard">Standard Mall</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Deal Badge Label
                      </label>
                      <input
                        type="text"
                        value={pDealLabel}
                        onChange={(e) => setPDealLabel(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Max Order / User & Store
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1}
                          value={pMaxOrder}
                          onChange={(e) => setPMaxOrder(e.target.value)}
                          className="w-20 rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs"
                          title="Max Order Per User"
                        />
                        <input
                          type="text"
                          value={pStoreName}
                          onChange={(e) => setPStoreName(e.target.value)}
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                          placeholder="Store Name"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Main Image + Extra Gallery Images */}
                  <div className="grid grid-cols-1 gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Main Product Photo (URL or Upload)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={pImageUrl}
                          onChange={(e) => setPImageUrl(e.target.value)}
                          placeholder="https://... or upload image"
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-[#F85606]">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadMainImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {pImageUrl && (
                        <img
                          src={resolveAssetUrl(pImageUrl)}
                          alt="Main preview"
                          className="mt-2 h-20 w-20 rounded-xl border border-slate-200 object-cover"
                        />
                      )}
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Extra Gallery Images ({pExtraImages.length}/8)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={extraImgInput}
                          onChange={(e) => setExtraImgInput(e.target.value)}
                          placeholder="Paste extra image URL..."
                          className="flex-1 rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            if (extraImgInput.trim()) {
                              setPExtraImages((prev) => [...prev, extraImgInput.trim()].slice(0, 8));
                              setExtraImgInput('');
                            }
                          }}
                          className="rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#F85606]"
                        >
                          Add
                        </button>
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-[#F85606]">
                          <Layers className="h-3.5 w-3.5" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleUploadExtraImages}
                            className="hidden"
                          />
                        </label>
                      </div>
                      {pExtraImages.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {pExtraImages.map((u, idx) => (
                            <div key={idx} className="relative h-12 w-12 overflow-hidden rounded-lg border">
                              <img src={resolveAssetUrl(u)} alt="" className="h-full w-full object-cover" />
                              <button
                                type="button"
                                onClick={() =>
                                  setPExtraImages((prev) => prev.filter((_, i) => i !== idx))
                                }
                                className="absolute top-0 right-0 bg-red-600 p-0.5 text-white"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Description, Specs & Product Coupons */}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Short Tagline & Product Description
                      </label>
                      <input
                        type="text"
                        value={pTagline}
                        onChange={(e) => setPTagline(e.target.value)}
                        placeholder="Short punchy tagline..."
                        className="mb-2 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                      <textarea
                        rows={4}
                        value={pDescription}
                        onChange={(e) => setPDescription(e.target.value)}
                        placeholder="Detailed product description..."
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Key Specifications (One per line)
                      </label>
                      <textarea
                        rows={4}
                        value={pSpecsText}
                        onChange={(e) => setPSpecsText(e.target.value)}
                        placeholder={'Bluetooth 5.3 · 45h Battery\nUSB-C Fast Charging\n1-Year Official Warranty'}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                      {/* Product-specific coupon quick add */}
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <input
                          type="text"
                          value={newProdCouponCode}
                          onChange={(e) => setNewProdCouponCode(e.target.value)}
                          placeholder="Product Coupon Code"
                          className="w-36 rounded-lg border border-slate-300 px-2.5 py-1.5 font-mono text-xs uppercase"
                        />
                        <select
                          value={newProdCouponType}
                          onChange={(e) => setNewProdCouponType(e.target.value as 'flat' | 'percent')}
                          className="rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs"
                        >
                          <option value="flat">Rs. Flat</option>
                          <option value="percent">% Off</option>
                        </select>
                        <input
                          type="number"
                          value={newProdCouponVal}
                          onChange={(e) => setNewProdCouponVal(e.target.value)}
                          className="w-20 rounded-lg border border-slate-300 px-2 py-1.5 font-mono text-xs"
                        />
                        <button
                          type="button"
                          onClick={handleAddProductCoupon}
                          className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-[#F85606]"
                        >
                          + Coupon
                        </button>
                      </div>
                      {pCoupons.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          {pCoupons.map((c) => (
                            <span
                              key={c.id}
                              className="inline-flex items-center gap-1 rounded-md bg-orange-50 px-2 py-0.5 font-mono text-[10px] font-bold text-[#F85606]"
                            >
                              {c.code} ({c.badgeText})
                              <button
                                type="button"
                                onClick={() =>
                                  setPCoupons((prev) => prev.filter((x) => x.id !== c.id))
                                }
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Checkboxes & Submit */}
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                    <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-slate-700">
                      <label className="inline-flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={pFreeShipping}
                          onChange={(e) => setPFreeShipping(e.target.checked)}
                          className="h-4 w-4 accent-[#F85606]"
                        />
                        <span>Free Delivery</span>
                      </label>
                      {!editingProductId && (
                        <>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={autoGenerateLaunchSale}
                              onChange={(e) => setAutoGenerateLaunchSale(e.target.checked)}
                              className="h-4 w-4 accent-[#F85606]"
                            />
                            <span>Auto-launch Sales Agent Spotlight</span>
                          </label>
                          <label className="inline-flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={autoGenerateLaunchPoster}
                              onChange={(e) => setAutoGenerateLaunchPoster(e.target.checked)}
                              className="h-4 w-4 accent-[#F85606]"
                            />
                            <span>Auto-publish Promo Poster</span>
                          </label>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          resetProductForm();
                          setProductSubView('list');
                        }}
                        className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={runningProductAgent}
                        className="inline-flex items-center gap-2 rounded-xl bg-[#F85606] px-6 py-2.5 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800] disabled:opacity-50"
                      >
                        {runningProductAgent ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        <span>{editingProductId ? 'Save Product Changes' : 'Publish Product'}</span>
                      </button>
                    </div>
                  </div>
                </form>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 2: SALES TAB (Sales/Offers + Countdown Timer + Sales Agent)
             ==================================================== */}
          {activeTab === 'sales' && (
            <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
              {/* Left 5 Cols: Live Flash Sale Countdown Controller + Sales Agent Builder */}
              <div className="space-y-5 lg:col-span-5">
                {/* Countdown Timer Control */}
                <form
                  onSubmit={handleApplyCountdownTimer}
                  className="rounded-2xl border border-orange-200 bg-gradient-to-br from-slate-950 via-slate-900 to-[#2b1003] p-5 text-white shadow-md"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Clock className="h-5 w-5 text-amber-400" />
                      <h3 className="font-display text-base font-extrabold">
                        Flash Sale Countdown Control
                      </h3>
                    </div>
                    <span className="rounded-lg bg-[#F85606] px-2.5 py-1 font-mono text-sm font-extrabold">
                      {countdownSeconds > 0 ? formatCountdownDisplay() : 'ENDED'}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-300">
                    Starting or ending a Flash Sale automatically logs an alert in the Notifications tab.
                  </p>

                  <div className="mt-3 space-y-3">
                    <input
                      type="text"
                      value={cdTitle}
                      onChange={(e) => setCdTitle(e.target.value)}
                      placeholder="Flash Sale Campaign Name"
                      className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs text-white placeholder:text-slate-400"
                    />
                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-slate-300 uppercase">
                          Hours
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={99}
                          value={cdHours}
                          onChange={(e) => setCdHours(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 font-mono text-sm font-bold text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-slate-300 uppercase">
                          Minutes
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={cdMins}
                          onChange={(e) => setCdMins(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 font-mono text-sm font-bold text-white"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[10px] font-bold text-slate-300 uppercase">
                          Seconds
                        </label>
                        <input
                          type="number"
                          min={0}
                          max={59}
                          value={cdSecs}
                          onChange={(e) => setCdSecs(e.target.value)}
                          className="w-full rounded-xl border border-white/15 bg-white/10 px-3 py-2 font-mono text-sm font-bold text-white"
                        />
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="submit"
                        className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#F85606] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#d94800]"
                      >
                        <Play className="h-3.5 w-3.5" />
                        <span>Start / Update Countdown</span>
                      </button>
                      <button
                        type="button"
                        onClick={onEndFlashSaleNow}
                        className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-red-400/50 bg-red-500/20 px-3.5 py-2.5 text-xs font-extrabold text-red-200 hover:bg-red-600 hover:text-white"
                      >
                        <Square className="h-3.5 w-3.5" />
                        <span>End Sale Now</span>
                      </button>
                    </div>
                  </div>
                </form>

                {/* Sales Agent Builder */}
                <form
                  onSubmit={handleRunSalesAgentAndPublish}
                  className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs"
                >
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-[#F85606]" />
                    <h3 className="font-display text-base font-extrabold text-slate-950">
                      Sales Agent · Create / Edit Sale Offer
                    </h3>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Select Target Product
                    </label>
                    <select
                      value={saleProductId}
                      onChange={(e) => {
                        const id = e.target.value;
                        setSaleProductId(id);
                        const found = catalog.find((p) => p.id === id);
                        if (found) {
                          setSalePrice(String(found.price));
                          setSaleOriginalPrice(String(found.originalPrice));
                        }
                      }}
                      className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs text-slate-900"
                    >
                      {catalog.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.title} ({formatLKR(p.price)})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        New Sale Price (LKR)
                      </label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={salePrice}
                        onChange={(e) => setSalePrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Original Price (LKR)
                      </label>
                      <input
                        type="number"
                        required
                        min={100}
                        value={saleOriginalPrice}
                        onChange={(e) => setSaleOriginalPrice(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Offer Label
                      </label>
                      <input
                        type="text"
                        value={saleDealLabel}
                        onChange={(e) => setSaleDealLabel(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Deal Tier
                      </label>
                      <select
                        value={saleDealTier}
                        onChange={(e) => setSaleDealTier(e.target.value as DealTier)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                      >
                        <option value="flash_sale">Flash Sale</option>
                        <option value="new_user">New User Deal</option>
                        <option value="choice_bundle">Choice Bundle</option>
                        <option value="standard">Standard Offer</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs font-bold text-slate-700">
                      Sales Agent Campaign Brief
                    </label>
                    <textarea
                      rows={2}
                      value={salePromoNote}
                      onChange={(e) => setSalePromoNote(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={runningSalesAgent}
                    className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#F85606] to-amber-500 px-4 py-3 text-xs font-extrabold text-white shadow-sm hover:opacity-95 disabled:opacity-50"
                  >
                    {runningSalesAgent ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Flame className="h-4 w-4" />
                    )}
                    <span>Run Sales Agent & Launch Sale Offer</span>
                  </button>
                </form>
              </div>

              {/* Right 7 Cols: Active Sales & Offers Management */}
              <div className="space-y-3 lg:col-span-7">
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-base font-extrabold text-slate-950">
                    Active Storefront Sales & Offers ({creativeSales.length})
                  </h3>
                </div>

                {creativeSales.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                    No active sales spotlights yet. Use the Sales Agent on the left to launch one!
                  </div>
                ) : (
                  <div className="space-y-3">
                    {creativeSales.map((sale) => {
                      const matchedProd = catalog.find((p) => p.id === sale.productId);
                      return (
                        <div
                          key={sale.id}
                          className="flex flex-col justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:flex-row sm:items-center"
                        >
                          <div className="flex items-start gap-3">
                            {matchedProd && (
                              <img
                                src={resolveAssetUrl(matchedProd.imageUrl)}
                                alt={matchedProd.title}
                                className="h-16 w-16 shrink-0 rounded-xl border object-cover"
                              />
                            )}
                            <div>
                              <div className="flex flex-wrap items-center gap-2">
                                <span className="rounded bg-[#FFF3EB] px-2 py-0.5 font-mono text-[10px] font-extrabold text-[#F85606] uppercase">
                                  {sale.discountPercent}% OFF
                                </span>
                                <span className="rounded bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                                  {sale.urgencyHighlight}
                                </span>
                              </div>
                              <h4 className="mt-1 font-display text-sm font-extrabold text-slate-950">
                                {sale.saleBannerTitle}
                              </h4>
                              <p className="text-xs text-slate-600">{sale.creativeTagline}</p>
                              <div className="mt-1 flex items-baseline gap-2 font-mono text-xs">
                                <span className="font-extrabold text-[#F85606]">
                                  {formatLKR(sale.salePrice)}
                                </span>
                                <span className="text-slate-400 line-through">
                                  {formatLKR(sale.originalPrice)}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex shrink-0 items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setSaleProductId(sale.productId);
                                setSalePrice(String(sale.salePrice));
                                setSaleOriginalPrice(String(sale.originalPrice));
                                setSaleDealLabel(sale.saleBannerTitle);
                                setSalePromoNote(sale.creativeTagline);
                              }}
                              className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 hover:border-[#F85606] hover:text-[#F85606]"
                            >
                              <Edit3 className="h-3.5 w-3.5" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteSaleCampaign(sale.id)}
                              className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                              <span>End / Delete</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ====================================================
              TAB 3: PROMO TAB (Coupons, Posters/Banners + Promotion Agent, Startup Welcome Popup Poster)
             ==================================================== */}
          {activeTab === 'promo' && (
            <div className="space-y-5">
              {/* Sub-Navigation Pills */}
              <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-200 bg-white p-3 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setPromoSubTab('coupons')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                    promoSubTab === 'coupons'
                      ? 'bg-[#F85606] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
                  }`}
                >
                  <Ticket className="h-4 w-4" />
                  <span>Checkout Coupons ({storeCoupons.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoSubTab('posters')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                    promoSubTab === 'posters'
                      ? 'bg-[#F85606] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
                  }`}
                >
                  <ImageIcon className="h-4 w-4" />
                  <span>Posters, Banners & Promo Agent ({promoPosters.length + adminBanners.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPromoSubTab('welcome_popup')}
                  className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                    promoSubTab === 'welcome_popup'
                      ? 'bg-[#F85606] text-white'
                      : 'bg-slate-100 text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
                  }`}
                >
                  <Sparkles className="h-4 w-4" />
                  <span>
                    Startup Welcome Popup Poster ({welcomePopupConfig.enabled ? 'ON' : 'OFF'})
                  </span>
                </button>
              </div>

              {/* SUB-TAB A: COUPONS MANAGER */}
              {promoSubTab === 'coupons' && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                  <form
                    onSubmit={handleSaveCouponForm}
                    className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5"
                  >
                    <h3 className="font-display text-base font-extrabold text-slate-950">
                      {editingCouponId ? 'Edit Checkout Coupon' : 'Add New Checkout Coupon'}
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Coupon Code *
                        </label>
                        <input
                          type="text"
                          required
                          value={cCode}
                          onChange={(e) => setCCode(e.target.value.toUpperCase())}
                          placeholder="FESTIVAL3000"
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs uppercase"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Discount Type
                        </label>
                        <select
                          value={cType}
                          onChange={(e) => setCType(e.target.value as 'flat' | 'percent')}
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                        >
                          <option value="flat">Flat LKR (Rs.)</option>
                          <option value="percent">Percentage (%)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Coupon Title
                      </label>
                      <input
                        type="text"
                        value={cTitle}
                        onChange={(e) => setCTitle(e.target.value)}
                        placeholder="Avurudu Super Savings Voucher"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Subtitle / Terms
                      </label>
                      <input
                        type="text"
                        value={cSubtitle}
                        onChange={(e) => setCSubtitle(e.target.value)}
                        placeholder="Flat Rs. 2,000 OFF on orders above Rs. 5,000"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-2">
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-700">
                          {cType === 'percent' ? '% Off' : 'Rs. Value'}
                        </label>
                        <input
                          type="number"
                          min={1}
                          value={cValue}
                          onChange={(e) => setCValue(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-700">
                          Max Cap (Rs.)
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={cMaxCap}
                          onChange={(e) => setCMaxCap(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-[11px] font-bold text-slate-700">
                          Min Spend
                        </label>
                        <input
                          type="number"
                          min={0}
                          value={cMinSpend}
                          onChange={(e) => setCMinSpend(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 pt-1">
                      <button
                        type="submit"
                        className="flex-1 rounded-xl bg-[#F85606] px-4 py-2.5 text-xs font-extrabold text-white hover:bg-[#d94800]"
                      >
                        {editingCouponId ? 'Update Coupon' : 'Add Coupon to Checkout'}
                      </button>
                      {editingCouponId && (
                        <button
                          type="button"
                          onClick={() => {
                            setEditingCouponId(null);
                            setCCode('');
                            setCTitle('');
                            setCSubtitle('');
                          }}
                          className="rounded-xl border border-slate-300 px-3 py-2.5 text-xs font-bold text-slate-600"
                        >
                          Cancel
                        </button>
                      )}
                    </div>
                  </form>

                  <div className="space-y-2.5 lg:col-span-7">
                    {storeCoupons.map((coup) => (
                      <div
                        key={coup.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="rounded-md bg-[#FFF3EB] px-2.5 py-0.5 font-mono text-xs font-extrabold text-[#F85606]">
                              {coup.code}
                            </span>
                            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                              {coup.badgeText}
                            </span>
                          </div>
                          <p className="mt-1 text-sm font-bold text-slate-900">{coup.title}</p>
                          <p className="text-xs text-slate-500">
                            {coup.subtitle} · Min Spend: {formatLKR(coup.minSpend)}
                          </p>
                        </div>

                        {coup.type !== 'none' && (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setEditingCouponId(coup.id);
                                setCCode(coup.code);
                                setCTitle(coup.title);
                                setCSubtitle(coup.subtitle);
                                setCType(coup.type === 'percent' ? 'percent' : 'flat');
                                setCValue(String(coup.value));
                                setCMaxCap(String(coup.maxCap));
                                setCMinSpend(String(coup.minSpend));
                              }}
                              className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:border-[#F85606] hover:text-[#F85606]"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => onDeleteCoupon(coup.id)}
                              className="rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SUB-TAB B: PROMOTION POSTERS, BANNERS & PROMOTION AGENT */}
              {promoSubTab === 'posters' && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                  <form
                    onSubmit={handleSavePosterForm}
                    className="space-y-3.5 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-display text-base font-extrabold text-slate-950">
                        {editingPosterId ? 'Edit Promo Poster' : 'Promotion Agent · Poster & Banner'}
                      </h3>
                      <button
                        type="button"
                        onClick={handleRunPromoAgent}
                        disabled={runningPromoAgent}
                        className="inline-flex items-center gap-1 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 px-3 py-1.5 text-[11px] font-extrabold text-white"
                      >
                        {runningPromoAgent ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="h-3.5 w-3.5 text-amber-300" />
                        )}
                        <span>Run Promo Agent</span>
                      </button>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Linked Product
                      </label>
                      <select
                        value={posterProductId}
                        onChange={(e) => setPosterProductId(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                      >
                        {catalog.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.title} ({formatLKR(p.price)})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Promotion Agent Brief
                      </label>
                      <input
                        type="text"
                        value={posterBrief}
                        onChange={(e) => setPosterBrief(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Poster Headline *
                      </label>
                      <input
                        type="text"
                        required
                        value={posterHeadline}
                        onChange={(e) => setPosterHeadline(e.target.value)}
                        placeholder="Mega Tech Festival — Save Up to 60%"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Subheadline
                      </label>
                      <textarea
                        rows={2}
                        value={posterSubheadline}
                        onChange={(e) => setPosterSubheadline(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Campaign Tag
                        </label>
                        <input
                          type="text"
                          value={posterCampaignTag}
                          onChange={(e) => setPosterCampaignTag(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Discount Badge
                        </label>
                        <input
                          type="text"
                          value={posterDiscountBadge}
                          onChange={(e) => setPosterDiscountBadge(e.target.value)}
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Poster Image (URL or Upload)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={posterImageUrl}
                          onChange={(e) => setPosterImageUrl(e.target.value)}
                          placeholder="Leave empty to use product photo"
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-[#F85606]">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadPosterImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full rounded-xl bg-[#F85606] px-4 py-3 text-xs font-extrabold text-white hover:bg-[#d94800]"
                    >
                      {editingPosterId ? 'Update Poster & Banner' : 'Publish Poster & Hero Banner'}
                    </button>
                  </form>

                  <div className="space-y-4 lg:col-span-7">
                    <div>
                      <h4 className="mb-2 font-display text-sm font-extrabold text-slate-900">
                        Published Promotion Posters ({promoPosters.length})
                      </h4>
                      <div className="space-y-2.5">
                        {promoPosters.map((poster) => (
                          <div
                            key={poster.id}
                            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs"
                          >
                            <div className="flex items-center gap-3">
                              <img
                                src={resolveAssetUrl(poster.imageUrl)}
                                alt={poster.headline}
                                className="h-14 w-20 shrink-0 rounded-xl object-cover"
                              />
                              <div>
                                <span className="rounded bg-[#FFF3EB] px-2 py-0.5 text-[10px] font-extrabold text-[#F85606]">
                                  {poster.discountBadge}
                                </span>
                                <p className="mt-0.5 text-xs font-extrabold text-slate-900">
                                  {poster.headline}
                                </p>
                                <p className="line-clamp-1 text-[11px] text-slate-500">
                                  {poster.subheadline}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingPosterId(poster.id);
                                  setPosterProductId(poster.productId);
                                  setPosterHeadline(poster.headline);
                                  setPosterSubheadline(poster.subheadline);
                                  setPosterCampaignTag(poster.campaignTag);
                                  setPosterDiscountBadge(poster.discountBadge);
                                  setPosterCtaLabel(poster.ctaLabel);
                                  setPosterImageUrl(poster.imageUrl);
                                }}
                                className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:border-[#F85606]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeletePromoPoster(poster.id)}
                                className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-600 hover:text-white"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-display text-sm font-extrabold text-slate-900">
                        Active Homepage Hero Banners ({adminBanners.length})
                      </h4>
                      <div className="space-y-2">
                        {adminBanners.map((b) => (
                          <div
                            key={b.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                          >
                            <div className="flex items-center gap-2.5">
                              <img
                                src={resolveAssetUrl(b.imageUrl)}
                                alt={b.headline}
                                className="h-11 w-16 rounded-lg object-cover"
                              />
                              <div>
                                <p className="text-xs font-bold text-slate-900">{b.headline}</p>
                                <p className="text-[11px] text-slate-500">
                                  {b.campaignTag} · {formatLKR(b.dealPrice)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              disabled={adminBanners.length <= 1}
                              onClick={() => onDeleteAdminBanner(b.id)}
                              className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-40"
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* SUB-TAB C: STARTUP WELCOME POPUP POSTER */}
              {promoSubTab === 'welcome_popup' && (
                <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
                  <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs lg:col-span-7">
                    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
                      <div>
                        <h3 className="font-display text-base font-extrabold text-slate-950">
                          Startup Welcome Popup Poster (Site Entry Popup)
                        </h3>
                        <p className="text-xs text-slate-500">
                          When enabled, visitors automatically see this promotional poster popup when entering BuyKit with Pramu.
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          setPopupDraft((prev) => ({ ...prev, enabled: !prev.enabled }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-xl px-4 py-2 text-xs font-extrabold transition-colors ${
                          popupDraft.enabled
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-700'
                        }`}
                      >
                        <Power className="h-4 w-4" />
                        <span>{popupDraft.enabled ? 'Popup Enabled (LIVE)' : 'Popup Disabled'}</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Top Badge Text
                        </label>
                        <input
                          type="text"
                          value={popupDraft.badgeText}
                          onChange={(e) =>
                            setPopupDraft((prev) => ({ ...prev, badgeText: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Promo Coupon Code
                        </label>
                        <input
                          type="text"
                          value={popupDraft.couponCode}
                          onChange={(e) =>
                            setPopupDraft((prev) => ({
                              ...prev,
                              couponCode: e.target.value.toUpperCase(),
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-xs uppercase"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Popup Headline
                      </label>
                      <input
                        type="text"
                        value={popupDraft.headline}
                        onChange={(e) =>
                          setPopupDraft((prev) => ({ ...prev, headline: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Popup Description
                      </label>
                      <textarea
                        rows={2}
                        value={popupDraft.subheadline}
                        onChange={(e) =>
                          setPopupDraft((prev) => ({ ...prev, subheadline: e.target.value }))
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          CTA Button Text
                        </label>
                        <input
                          type="text"
                          value={popupDraft.ctaLabel}
                          onChange={(e) =>
                            setPopupDraft((prev) => ({ ...prev, ctaLabel: e.target.value }))
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-bold text-slate-700">
                          Link CTA to Product (Optional)
                        </label>
                        <select
                          value={popupDraft.targetProductId || ''}
                          onChange={(e) =>
                            setPopupDraft((prev) => ({
                              ...prev,
                              targetProductId: e.target.value,
                            }))
                          }
                          className="w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs"
                        >
                          <option value="">Open Deals / Shop Tab</option>
                          {catalog.map((p) => (
                            <option key={p.id} value={p.id}>
                              {p.title}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-bold text-slate-700">
                        Popup Poster Image (URL or Upload)
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={popupDraft.imageUrl}
                          onChange={(e) =>
                            setPopupDraft((prev) => ({ ...prev, imageUrl: e.target.value }))
                          }
                          className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs"
                        />
                        <label className="inline-flex cursor-pointer items-center gap-1 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white hover:bg-[#F85606]">
                          <Upload className="h-3.5 w-3.5" />
                          <span>Upload</span>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleUploadWelcomePopupImage}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-2">
                      <button
                        type="button"
                        onClick={() =>
                          onSaveWelcomePopupConfig({
                            ...popupDraft,
                            campaignVersion: `v_${Date.now()}`,
                          })
                        }
                        className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#F85606] px-5 py-3 text-xs font-extrabold text-white shadow-sm hover:bg-[#d94800]"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Save & Publish Welcome Popup</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onSaveWelcomePopupConfig(popupDraft);
                          onPreviewWelcomePopup();
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-50 px-4 py-3 text-xs font-extrabold text-slate-800 hover:border-[#F85606] hover:text-[#F85606]"
                      >
                        <Eye className="h-4 w-4" />
                        <span>Preview Popup</span>
                      </button>
                    </div>
                  </div>

                  {/* Live Mini Preview Card */}
                  <div className="lg:col-span-5">
                    <div className="overflow-hidden rounded-3xl border-2 border-orange-400/60 bg-slate-950 text-white shadow-lg">
                      <div className="relative h-44 w-full bg-slate-900">
                        <img
                          src={resolveAssetUrl(
                            popupDraft.imageUrl ||
                              '/src/assets/images/hero_marketplace_showcase_1794121196938.jpg'
                          )}
                          alt="Popup preview"
                          className="h-full w-full object-cover"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/30 to-transparent" />
                        <span className="absolute top-3 left-3 rounded-full bg-[#F85606] px-2.5 py-0.5 text-[10px] font-extrabold uppercase">
                          {popupDraft.badgeText || 'PROMO'}
                        </span>
                      </div>
                      <div className="space-y-3 p-5">
                        <h4 className="font-display text-lg font-extrabold">
                          {popupDraft.headline || 'Popup Headline'}
                        </h4>
                        <p className="text-xs text-slate-300">{popupDraft.subheadline}</p>
                        {popupDraft.couponCode && (
                          <div className="rounded-xl border border-amber-400/30 bg-amber-500/10 px-3 py-2 font-mono text-xs font-extrabold text-amber-300">
                            Code: {popupDraft.couponCode}
                          </div>
                        )}
                        <div className="rounded-xl bg-[#F85606] py-2.5 text-center text-xs font-extrabold text-white">
                          {popupDraft.ctaLabel || 'Shop Offer'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 4: NOTIFICATIONS TAB (Cart Adds, Buys, Reviews, Q&A, Sales Start/End, Promos)
             ==================================================== */}
          {activeTab === 'notifications' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { key: 'all', label: `All (${notifications.length})` },
                      { key: 'order_placed', label: 'Orders / Buys' },
                      { key: 'cart_add', label: 'Cart Adds' },
                      { key: 'review_added', label: 'Reviews' },
                      { key: 'question_asked', label: 'Questions' },
                      { key: 'sale_started', label: 'Sale Started' },
                      { key: 'sale_ended', label: 'Sale Ended' },
                      { key: 'promo_updated', label: 'Promos' },
                    ] as const
                  ).map((f) => (
                    <button
                      key={f.key}
                      type="button"
                      onClick={() => setNotifFilter(f.key)}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-colors ${
                        notifFilter === f.key
                          ? 'bg-[#F85606] text-white'
                          : 'bg-slate-100 text-slate-600 hover:bg-orange-50 hover:text-[#F85606]'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>

                {unreadNotifCount > 0 && (
                  <button
                    type="button"
                    onClick={onMarkAllNotificationsRead}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#F85606]"
                  >
                    <CheckCheck className="h-4 w-4" />
                    <span>Mark All Read ({unreadNotifCount})</span>
                  </button>
                )}
              </div>

              {filteredNotifications.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <Bell className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="font-display text-sm font-bold text-slate-800">
                    No notifications in this category yet.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    Cart additions, purchases, reviews, questions, and Flash Sale start/end alerts appear here in real time.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredNotifications.map((n) => (
                    <div
                      key={n.id}
                      className={`flex flex-col justify-between gap-3 rounded-2xl border p-4 transition-all sm:flex-row sm:items-center ${
                        n.read
                          ? 'border-slate-200 bg-white'
                          : 'border-orange-300 bg-[#FFF9F5] shadow-xs'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-white shadow-2xs ring-1 ring-slate-200">
                          {renderNotificationIcon(n.type)}
                        </div>
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            {!n.read && (
                              <span className="h-2 w-2 rounded-full bg-[#F85606]" />
                            )}
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 uppercase">
                              {n.type.replace('_', ' ')}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {formatRelativeTime(n.createdAtMs)}
                            </span>
                          </div>
                          <h4 className="mt-1 text-sm font-extrabold text-slate-900">
                            {n.title}
                          </h4>
                          <p className="mt-0.5 text-xs text-slate-600">{n.message}</p>
                          <p className="mt-1 text-[11px] text-slate-500">
                            By <strong className="text-slate-700">{n.actorName}</strong> (
                            {n.actorEmail})
                          </p>
                        </div>
                      </div>

                      <div className="flex shrink-0 items-center gap-2 self-end sm:self-center">
                        {!n.read && (
                          <button
                            type="button"
                            onClick={() => onMarkNotificationRead(n.id)}
                            className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-600 hover:text-white"
                          >
                            Mark Read
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => onDeleteNotification(n.id)}
                          className="rounded-xl border border-slate-200 p-1.5 text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                          title="Delete notification"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 5: ORDER TRACKING TAB (All Users' Orders + Full Details + Admin Status Updater)
             ==================================================== */}
          {activeTab === 'orders' && (
            <div className="space-y-4">
              {/* KPI Cards */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <p className="text-[11px] font-bold text-slate-500 uppercase">Total Orders</p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-slate-950">
                    {adminOrders.length}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <p className="text-[11px] font-bold text-amber-600 uppercase">Preparing / Pending</p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-amber-600">
                    {
                      adminOrders.filter(
                        (o) => o.status === 'processing' || o.status === 'preparing'
                      ).length
                    }
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase">Delivered</p>
                  <p className="mt-1 font-mono text-2xl font-extrabold text-emerald-600">
                    {adminOrders.filter((o) => o.status === 'delivered').length}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <p className="text-[11px] font-bold text-[#F85606] uppercase">Gross Revenue</p>
                  <p className="mt-1 font-mono text-xl font-extrabold text-[#F85606]">
                    {formatLKR(totalOrderRevenue)}
                  </p>
                </div>
              </div>

              {/* Search & Status Filter */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[220px]">
                  <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={orderSearch}
                    onChange={(e) => setOrderSearch(e.target.value)}
                    placeholder="Search by Order #, customer name, email, phone, or item..."
                    className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pr-3 pl-9 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>
                <select
                  value={orderStatusFilter}
                  onChange={(e) => setOrderStatusFilter(e.target.value as 'all' | OrderStatusValue)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700"
                >
                  <option value="all">All Statuses</option>
                  {ORDER_STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Orders List */}
              {filteredOrders.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
                  <Truck className="mx-auto mb-2 h-8 w-8 text-slate-300" />
                  <p className="font-display text-sm font-bold text-slate-800">
                    No customer orders found.
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    When users place orders (via LANKAQR, Card, Koko, or COD), full order & customer details appear here for Admin status management.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {filteredOrders.map((ord) => {
                    const statusMeta =
                      ORDER_STATUS_OPTIONS.find((s) => s.value === ord.status) ||
                      ORDER_STATUS_OPTIONS[0];
                    return (
                      <div
                        key={ord.id}
                        className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs sm:p-5"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-mono text-sm font-extrabold text-slate-950">
                                #{ord.orderNumber}
                              </span>
                              <span
                                className={`rounded-md px-2.5 py-0.5 text-[11px] font-extrabold uppercase ${statusMeta.colorClass}`}
                              >
                                {statusMeta.label}
                              </span>
                              <span className="text-[11px] text-slate-400">
                                {formatRelativeTime(ord.createdAtMs)}
                              </span>
                            </div>
                            <p className="mt-1 text-sm font-bold text-slate-900">
                              {ord.summaryTitle}
                            </p>
                          </div>

                          <div className="text-right font-mono">
                            <p className="text-lg font-extrabold text-[#F85606]">
                              {formatLKR(ord.totalAmount)}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-500">
                              {ord.itemCount} {ord.itemCount > 1 ? 'items' : 'item'} · {ord.paymentLabel}
                            </p>
                          </div>
                        </div>

                        {/* Full Customer & Shipping Details */}
                        <div className="mt-3 grid grid-cols-1 gap-2.5 rounded-xl bg-slate-50 p-3 text-xs text-slate-700 sm:grid-cols-2 lg:grid-cols-4">
                          <div className="flex items-start gap-2">
                            <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#F85606]" />
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Customer
                              </span>
                              <strong className="text-slate-900">{ord.customerName}</strong>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Mail className="mt-0.5 h-3.5 w-3.5 shrink-0 text-blue-600" />
                            <div className="min-w-0">
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Email
                              </span>
                              <span className="truncate block font-medium">{ord.customerEmail}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <Phone className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-600" />
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Contact Phone
                              </span>
                              <span className="font-mono font-bold">{ord.customerPhone}</span>
                            </div>
                          </div>
                          <div className="flex items-start gap-2">
                            <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-rose-600" />
                            <div>
                              <span className="block text-[10px] font-bold text-slate-400 uppercase">
                                Address & Hub
                              </span>
                              <span>
                                {ord.shippingAddress} ({ord.pickupHubName})
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Admin Order Status Changer */}
                        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 pt-1">
                          <span className="text-xs font-bold text-slate-600">
                            Change Order Status (Admin Only):
                          </span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {ORDER_STATUS_OPTIONS.map((opt) => {
                              const active = ord.status === opt.value;
                              return (
                                <button
                                  key={opt.value}
                                  type="button"
                                  disabled={updatingOrderId === ord.id || active}
                                  onClick={async () => {
                                    setUpdatingOrderId(ord.id);
                                    try {
                                      await onUpdateAdminOrderStatus(ord, opt.value);
                                    } finally {
                                      setUpdatingOrderId(null);
                                    }
                                  }}
                                  className={`rounded-lg px-2.5 py-1.5 text-[11px] font-extrabold transition-all ${
                                    active
                                      ? 'bg-[#F85606] text-white shadow-xs'
                                      : 'border border-slate-200 bg-white text-slate-600 hover:border-[#F85606] hover:text-[#F85606] disabled:opacity-50'
                                  }`}
                                >
                                  {opt.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ====================================================
              TAB 6: Q&A DESK (ADMIN-ONLY REPLIES) & ADMIN GMAIL ACCESS CONTROL
             ==================================================== */}
          {activeTab === 'qa_admins' && (
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
              {/* Left 7 Cols: Customer Product Q&A Admin Desk */}
              <div className="space-y-4 lg:col-span-7">
                <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
                  <div>
                    <h3 className="font-display text-base font-extrabold text-slate-950">
                      Customer Product Questions (Admin-Only Replies)
                    </h3>
                    <p className="text-xs text-slate-500">
                      Only authorized Admins can answer customer questions. Replies appear with an "Official Admin Reply" badge.
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setQaFilter('unanswered')}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                        qaFilter === 'unanswered'
                          ? 'bg-[#F85606] text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      Unanswered ({unansweredQuestionsCount})
                    </button>
                    <button
                      type="button"
                      onClick={() => setQaFilter('all')}
                      className={`rounded-xl px-3 py-1.5 text-xs font-bold ${
                        qaFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      All ({allQuestions.length})
                    </button>
                  </div>
                </div>

                {filteredQuestions.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-xs text-slate-500">
                    {qaFilter === 'unanswered'
                      ? 'All customer product questions have been answered!'
                      : 'No customer product questions yet.'}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {filteredQuestions.map((q) => {
                      const prod = catalog.find(
                        (p) => p.id === q.productId || p.id.replace(/[^a-zA-Z0-9_-]/g, '_') === q.productId
                      );
                      const qAnswers = allAnswers.filter((a) => a.questionId === q.questionId);
                      return (
                        <div
                          key={q.id}
                          className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-start gap-2.5">
                              {prod && (
                                <img
                                  src={resolveAssetUrl(prod.imageUrl)}
                                  alt={prod.title}
                                  className="h-11 w-11 shrink-0 rounded-lg border object-cover"
                                />
                              )}
                              <div>
                                <span className="text-[11px] font-bold text-[#F85606]">
                                  {prod?.title || `Product: ${q.productId}`}
                                </span>
                                <p className="mt-0.5 text-sm font-bold text-slate-900">
                                  Q: {q.questionText}
                                </p>
                                <p className="text-[11px] text-slate-500">
                                  Asked by {q.userName} · {formatRelativeTime(q.createdAtMs)}
                                </p>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => onAdminDeleteQuestion(q.questionId)}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              title="Delete Question"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>

                          {/* Existing Answers */}
                          {qAnswers.length > 0 && (
                            <div className="mt-3 space-y-1.5 border-t border-slate-100 pt-2.5">
                              {qAnswers.map((ans) => (
                                <div
                                  key={ans.id}
                                  className="flex items-start justify-between gap-2 rounded-xl bg-emerald-50 p-2.5 text-xs"
                                >
                                  <div>
                                    <p className="font-semibold text-emerald-950">{ans.answerText}</p>
                                    <p className="text-[10px] text-emerald-700">
                                      Official Admin Reply · {ans.userName}
                                    </p>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => onAdminDeleteAnswer(ans.answerId)}
                                    className="text-red-500 hover:text-red-700"
                                    title="Delete Answer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Official Admin Answer Input */}
                          <div className="mt-3 flex items-center gap-2 border-t border-slate-100 pt-3">
                            <input
                              type="text"
                              value={qaAnswerDrafts[q.questionId] || ''}
                              onChange={(e) =>
                                setQaAnswerDrafts((prev) => ({
                                  ...prev,
                                  [q.questionId]: e.target.value,
                                }))
                              }
                              placeholder="Type Official Admin Answer..."
                              className="flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs focus:border-[#F85606] focus:outline-none"
                            />
                            <button
                              type="button"
                              disabled={submittingQaId === q.questionId}
                              onClick={() => handlePostQaAnswer(q)}
                              className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-[#F85606] px-4 py-2 text-xs font-extrabold text-white hover:bg-[#d94800] disabled:opacity-50"
                            >
                              <Send className="h-3.5 w-3.5" />
                              <span>Post Reply</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Right 5 Cols: Multi-Admin Gmail Access Manager */}
              <div className="space-y-4 lg:col-span-5">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-5 w-5 text-[#F85606]" />
                    <h3 className="font-display text-base font-extrabold text-slate-950">
                      Authorized Admin Gmail Accounts
                    </h3>
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    Add another Admin Gmail below. Authorized Gmail accounts unlock the full Admin Panel Dashboard upon Google sign-in.
                  </p>

                  {/* Add Admin Gmail Form */}
                  <form onSubmit={handleAddAdminEmailSubmit} className="mt-4 space-y-2.5">
                    <div className="flex gap-2">
                      <input
                        type="email"
                        required
                        value={newAdminEmailInput}
                        onChange={(e) => {
                          setNewAdminEmailInput(e.target.value);
                          setAdminEmailError('');
                        }}
                        placeholder="newadmin@gmail.com"
                        className="flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                      <button
                        type="submit"
                        disabled={addingAdminEmail}
                        className="inline-flex shrink-0 items-center gap-1.5 rounded-xl bg-slate-950 px-4 py-2.5 text-xs font-extrabold text-amber-300 hover:bg-[#F85606] hover:text-white disabled:opacity-50"
                      >
                        {addingAdminEmail ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Plus className="h-3.5 w-3.5" />
                        )}
                        <span>Add Admin</span>
                      </button>
                    </div>
                    {adminEmailError && (
                      <p className="flex items-center gap-1 text-xs font-semibold text-red-600">
                        <AlertCircle className="h-3.5 w-3.5" />
                        <span>{adminEmailError}</span>
                      </p>
                    )}
                  </form>

                  {/* List of Admins */}
                  <div className="mt-4 space-y-2">
                    {/* Permanent Root Admins (Protected) */}
                    {ROOT_ADMIN_EMAILS.map((rootEmail) => (
                      <div
                        key={rootEmail}
                        className="flex items-center justify-between gap-2 rounded-xl border border-amber-300 bg-amber-50/70 p-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <Lock className="h-3.5 w-3.5 text-amber-700" />
                            <span className="truncate font-mono text-xs font-extrabold text-slate-950">
                              {rootEmail}
                            </span>
                          </div>
                          <p className="mt-0.5 text-[11px] font-semibold text-amber-800">
                            Root Super Admin · Permanent Full Access
                          </p>
                        </div>
                        <span className="shrink-0 rounded-md bg-slate-950 px-2 py-0.5 text-[10px] font-extrabold text-amber-300 uppercase">
                          Protected
                        </span>
                      </div>
                    ))}

                    {/* Additional Admins from Firestore */}
                    {adminEmails
                      .filter((a) => !isRootAdminEmail(a.email))
                      .map((adm) => (
                        <div
                          key={adm.id}
                          className="flex items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3"
                        >
                          <div className="min-w-0">
                            <p className="truncate font-mono text-xs font-bold text-slate-900">
                              {adm.email}
                            </p>
                            <p className="text-[10px] text-slate-500">
                              Added by {adm.addedByEmail}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onRemoveAdminEmail(adm)}
                            className="shrink-0 rounded-lg border border-red-200 bg-white px-2.5 py-1 text-[11px] font-bold text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
