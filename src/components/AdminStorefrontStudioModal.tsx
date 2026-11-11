import React, { useState } from 'react';
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
} from 'lucide-react';
import {
  MarketplaceProduct,
  ProductDepartment,
  DealTier,
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

interface AdminStorefrontStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: MarketplaceProduct[];
  onAddNewProductWithDetails: (
    newProduct: MarketplaceProduct,
    enrichedDetails: EnrichedProductDetails,
    optionalSale?: CreativeSaleSpotlight,
    optionalPoster?: PromotionalPosterCampaign
  ) => void;
  onPublishSaleCampaign: (
    saleSpotlight: CreativeSaleSpotlight,
    updatedPrice: number,
    updatedOriginalPrice: number,
    updatedDealLabel: string,
    updatedDealTier: DealTier
  ) => void;
  onPublishPromoPoster: (poster: PromotionalPosterCampaign) => void;
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
  'Audio & Headphones': resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
  'Smartwatches & Wearables': resolveAssetUrl('/src/assets/images/product_smartwatch_pro_1794121197679.jpg'),
  'Cameras & Drones': resolveAssetUrl('/src/assets/images/product_camera_drone_1794121198906.jpg'),
  'Computer & Office': resolveAssetUrl('/src/assets/images/product_powerbank_charger_1794123346828.jpg'),
  'Home & Lifestyle': resolveAssetUrl('/src/assets/images/product_espresso_maker_1794123345741.jpg'),
  'Mobile & Gaming Gear': resolveAssetUrl('/src/assets/images/product_gaming_controller_1794123345268.jpg'),
};

export const AdminStorefrontStudioModal: React.FC<
  AdminStorefrontStudioModalProps
> = ({
  isOpen,
  onClose,
  catalog,
  onAddNewProductWithDetails,
  onPublishSaleCampaign,
  onPublishPromoPoster,
}) => {
  const [activeTab, setActiveTab] = useState<'add_product' | 'launch_sale' | 'create_poster'>(
    'add_product'
  );

  // Tab 1: Add Product (Auto-Enriched by Google Description Agent + Sales + Promo)
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<ProductDepartment>('Audio & Headphones');
  const [newPrice, setNewPrice] = useState('18500');
  const [newOriginalPrice, setNewOriginalPrice] = useState('39900');
  const [newStoreName, setNewStoreName] = useState('BuyKit Official Mall');
  const [newAdminNotes, setNewAdminNotes] = useState('');
  const [newSpecsInput, setNewSpecsInput] = useState(
    'Official 1-Year Warranty, Islandwide Express Delivery'
  );
  const [newImageUrl, setNewImageUrl] = useState('');
  const [autoLaunchSaleForNew, setAutoLaunchSaleForNew] = useState(true);
  const [autoCreatePosterForNew, setAutoCreatePosterForNew] = useState(true);
  const [addingProduct, setAddingProduct] = useState(false);

  // Tab 2: Launch Sale on Existing / New Product (Sales Agent)
  const [selectedSaleProductId, setSelectedSaleProductId] = useState(
    catalog[0]?.id || 'prod_sonicflow_anc_pro'
  );
  const [saleEventTitle, setSaleEventTitle] = useState('Mega Flash Festival');
  const [saleDiscountPercent, setSaleDiscountPercent] = useState('55');
  const [saleDealTier, setSaleDealTier] = useState<DealTier>('flash_sale');
  const [launchingSale, setLaunchingSale] = useState(false);

  // Tab 3: Create Promotional Ad Poster (Promotion Agent)
  const [posterTheme, setPosterTheme] = useState('Super Weekend Tech & Lifestyle Sale');
  const [posterProductId, setPosterProductId] = useState(
    catalog[0]?.id || 'prod_sonicflow_anc_pro'
  );
  const [generateAiPosterImg, setGenerateAiPosterImg] = useState(true);
  const [creatingPoster, setCreatingPoster] = useState(false);

  const [statusFeedback, setStatusFeedback] = useState<string>('');

  if (!isOpen) return null;

  const handleAddProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setAddingProduct(true);
    setStatusFeedback(
      'Researching product specifications on Google, building Extended Details, and preparing storefront display...'
    );

    try {
      const numericPrice = Math.max(500, Number(newPrice) || 15000);
      const numericOriginal = Math.max(
        numericPrice + 1000,
        Number(newOriginalPrice) || Math.round(numericPrice * 1.6)
      );
      const newProdId = `prod_custom_${Date.now().toString().slice(-6)}`;
      const baseSpecs = newSpecsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      // 1. Run Description Agent (Google Search Grounded)
      const enriched = await runDescriptionAgent({
        productTitle: newTitle.trim(),
        category: newCategory,
        adminNotes: newAdminNotes.trim() || `Official ${newCategory} flagship item`,
        adminSpecs: baseSpecs,
      });

      const resolvedImage =
        newImageUrl.trim() || DEFAULT_CATEGORY_IMAGES[newCategory];

      const discountPct = Math.round(
        ((numericOriginal - numericPrice) / numericOriginal) * 100
      );

      let optionalSale: CreativeSaleSpotlight | undefined;
      let dealLabel = `Flash Sale · ${discountPct}% Off`;

      // 2. Optionally run Sales Agent to present the new product's sale with animations
      if (autoLaunchSaleForNew) {
        const saleResult = await runSalesAgent({
          saleName: 'New Arrival Launch Sale',
          discountPercent: discountPct,
          dealTier: 'flash_sale',
          productTitle: newTitle.trim(),
          currentPrice: numericPrice,
          originalPrice: numericOriginal,
          isNewProduct: true,
        });
        dealLabel = saleResult.dealLabel;
        optionalSale = {
          id: `sale_${Date.now()}`,
          productId: newProdId,
          productTitle: newTitle.trim(),
          productImageUrl: resolvedImage,
          category: newCategory,
          saleBannerTitle: saleResult.saleBannerTitle,
          dealLabel: saleResult.dealLabel,
          animatedRibbonText: saleResult.animatedRibbonText,
          creativeTagline: saleResult.creativeTagline,
          urgencyHighlight: saleResult.urgencyHighlight,
          salePrice: numericPrice,
          originalPrice: numericOriginal,
          discountPercent: discountPct,
          dealTier: 'flash_sale',
          isNewProduct: true,
          claimedPercent: 76,
        };
      }

      // 3. Optionally run Promotion Agent to create an AI promotional poster on the User Dashboard
      let optionalPoster: PromotionalPosterCampaign | undefined;
      if (autoCreatePosterForNew) {
        const promoResult = await runPromotionAgent({
          campaignTheme: `New Arrival Spotlight · ${newCategory}`,
          productTitle: newTitle.trim(),
          category: newCategory,
          dealPrice: numericPrice,
          originalPrice: numericOriginal,
          generateAiPoster: true,
          fallbackImageUrl: '/src/assets/images/promo_poster_mega_sale_1794319674629.jpg',
        });
        optionalPoster = {
          id: `poster_${Date.now()}`,
          productId: newProdId,
          campaignTag: promoResult.campaignTag,
          discountBadge: promoResult.discountBadge,
          headline: promoResult.headline,
          subheadline: promoResult.subheadline,
          ctaLabel: promoResult.ctaLabel,
          dealPrice: numericPrice,
          originalPrice: numericOriginal,
          accentTheme:
            (promoResult.accentTheme as PromotionalPosterCampaign['accentTheme']) ||
            'orange_gold',
          imageUrl: promoResult.imageUrl,
          createdAt: new Date().toISOString().slice(0, 10),
        };
      }

      const createdProduct: MarketplaceProduct = {
        id: newProdId,
        title: newTitle.trim(),
        tagline: enriched.enhancedTagline,
        category: newCategory,
        dealType: 'flash_sale',
        dealLabel,
        price: numericPrice,
        originalPrice: numericOriginal,
        newUserPrice: Math.max(500, Math.round(numericPrice * 0.9)),
        rating: 4.9,
        soldCount: 120,
        stockRemaining: 25,
        totalStock: 50,
        freeShipping: true,
        codEligible: true,
        storeName: newStoreName.trim() || 'BuyKit Official Mall',
        imageUrl: resolvedImage,
        specs:
          enriched.keyFeatures.length > 0
            ? enriched.keyFeatures.slice(0, 6)
            : baseSpecs,
        description:
          newAdminNotes.trim() ||
          enriched.extendedDescription.split('\n\n')[0] ||
          `${newTitle.trim()} available now with official warranty and islandwide delivery.`,
      };

      onAddNewProductWithDetails(
        createdProduct,
        {
          productId: newProdId,
          ...enriched,
        },
        optionalSale,
        optionalPoster
      );

      setNewTitle('');
      setNewAdminNotes('');
      setStatusFeedback(
        'Product added with Google-researched Extended Details, Key Features, and live Storefront Promotions!'
      );
    } catch (err: unknown) {
      setStatusFeedback(
        err instanceof Error ? err.message : 'Could not complete product enrichment.'
      );
    } finally {
      setAddingProduct(false);
    }
  };

  const handleLaunchSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd = catalog.find((p) => p.id === selectedSaleProductId) || catalog[0];
    if (!targetProd) return;

    setLaunchingSale(true);
    setStatusFeedback('Formatting creative animated sale presentation for storefront...');

    try {
      const disc = Math.min(85, Math.max(5, Number(saleDiscountPercent) || 50));
      const saleResult = await runSalesAgent({
        saleName: saleEventTitle.trim() || 'Super Flash Sale',
        discountPercent: disc,
        dealTier: saleDealTier,
        productTitle: targetProd.title,
        currentPrice: targetProd.price,
        originalPrice: targetProd.originalPrice,
        isNewProduct: false,
      });

      const newSpotlight: CreativeSaleSpotlight = {
        id: `sale_${Date.now()}`,
        productId: targetProd.id,
        productTitle: targetProd.title,
        productImageUrl: targetProd.imageUrl,
        category: targetProd.category,
        saleBannerTitle: saleResult.saleBannerTitle,
        dealLabel: saleResult.dealLabel,
        animatedRibbonText: saleResult.animatedRibbonText,
        creativeTagline: saleResult.creativeTagline,
        urgencyHighlight: saleResult.urgencyHighlight,
        salePrice: saleResult.computedSalePrice,
        originalPrice: saleResult.originalPrice,
        discountPercent: saleResult.discountPercent,
        dealTier: saleDealTier,
        isNewProduct: false,
        claimedPercent: 88,
      };

      onPublishSaleCampaign(
        newSpotlight,
        saleResult.computedSalePrice,
        saleResult.originalPrice,
        saleResult.dealLabel,
        saleDealTier
      );

      setStatusFeedback(
        `Animated sale launched for "${targetProd.title}" at ${formatLKR(
          saleResult.computedSalePrice
        )} (-${saleResult.discountPercent}% OFF)!`
      );
    } catch (err: unknown) {
      setStatusFeedback(
        err instanceof Error ? err.message : 'Failed to launch sale campaign.'
      );
    } finally {
      setLaunchingSale(false);
    }
  };

  const handleCreatePosterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd = catalog.find((p) => p.id === posterProductId) || catalog[0];
    if (!targetProd) return;

    setCreatingPoster(true);
    setStatusFeedback(
      'Generating promotional campaign poster and AI artwork for the User Dashboard...'
    );

    try {
      const promoResult = await runPromotionAgent({
        campaignTheme: posterTheme.trim() || 'Mega Flash Festival',
        productTitle: targetProd.title,
        category: targetProd.category,
        dealPrice: targetProd.price,
        originalPrice: targetProd.originalPrice,
        generateAiPoster: generateAiPosterImg,
        fallbackImageUrl: '/src/assets/images/promo_poster_flash_festival_1794319675114.jpg',
      });

      const createdPoster: PromotionalPosterCampaign = {
        id: `poster_${Date.now()}`,
        productId: targetProd.id,
        campaignTag: promoResult.campaignTag,
        discountBadge: promoResult.discountBadge,
        headline: promoResult.headline,
        subheadline: promoResult.subheadline,
        ctaLabel: promoResult.ctaLabel,
        dealPrice: targetProd.price,
        originalPrice: targetProd.originalPrice,
        accentTheme:
          (promoResult.accentTheme as PromotionalPosterCampaign['accentTheme']) ||
          'orange_gold',
        imageUrl: promoResult.imageUrl,
        createdAt: new Date().toISOString().slice(0, 10),
      };

      onPublishPromoPoster(createdPoster);
      setStatusFeedback(
        'Promotional poster generated and published to the User Dashboard!'
      );
    } catch (err: unknown) {
      setStatusFeedback(
        err instanceof Error ? err.message : 'Failed to generate promotional poster.'
      );
    } finally {
      setCreatingPoster(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-xs">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-[#F85606] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                BuyKit Admin Storefront &amp; Campaign Studio
              </h2>
              <p className="text-xs text-orange-100">
                Add products (auto-enriched via Google), launch animated sales, and publish promotional posters
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-white/10 p-2 text-white hover:bg-white/20"
            aria-label="Close studio"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* 3 Studio Tabs */}
        <div className="grid grid-cols-3 gap-2 border-b border-slate-200 bg-slate-50 p-3">
          <button
            type="button"
            onClick={() => {
              setActiveTab('add_product');
              setStatusFeedback('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${
              activeTab === 'add_product'
                ? 'bg-[#F85606] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
            }`}
          >
            <Package className="h-4 w-4 shrink-0" />
            <span>1. Add Product (+Google Details)</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('launch_sale');
              setStatusFeedback('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${
              activeTab === 'launch_sale'
                ? 'bg-[#F85606] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
            }`}
          >
            <Tag className="h-4 w-4 shrink-0" />
            <span>2. Add Creative Sale</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('create_poster');
              setStatusFeedback('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${
              activeTab === 'create_poster'
                ? 'bg-[#F85606] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
            }`}
          >
            <ImageIcon className="h-4 w-4 shrink-0" />
            <span>3. Promotional Posters</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-5 sm:p-6">
          {statusFeedback && (
            <div className="mb-4 flex items-center gap-2 rounded-xl border border-orange-200 bg-[#FFF5F0] px-4 py-3 text-xs font-bold text-slate-900">
              {addingProduct || launchingSale || creatingPoster ? (
                <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#F85606]" />
              ) : (
                <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
              )}
              <span>{statusFeedback}</span>
            </div>
          )}

          {/* TAB 1: ADD PRODUCT (DESCRIPTION AGENT + SALES + PROMO) */}
          {activeTab === 'add_product' && (
            <form onSubmit={handleAddProductSubmit} className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                <p className="font-bold text-slate-900">
                  Automatic Google Product Research &amp; Storefront Publishing
                </p>
                <p className="mt-0.5">
                  When you add a product below, the system automatically searches Google for real specifications, extracts Key Features &amp; More Details, and formats animated sales and promotional posters for the shopper dashboard.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Product Name / Model (Searched on Google for Extra Details) *
                  </label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g., Sony WH-1000XM5 Wireless Noise Cancelling Headphones"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Department / Category
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as ProductDepartment)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Official Store Name
                  </label>
                  <input
                    type="text"
                    value={newStoreName}
                    onChange={(e) => setNewStoreName(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Sale / Deal Price (LKR / Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    value={newPrice}
                    onChange={(e) => setNewPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Original Retail Price (LKR / Rs.) *
                  </label>
                  <input
                    type="number"
                    required
                    min={500}
                    value={newOriginalPrice}
                    onChange={(e) => setNewOriginalPrice(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Admin Base Description / Notes (Extended with Google Key Features &amp; More Details)
                  </label>
                  <textarea
                    rows={2}
                    value={newAdminNotes}
                    onChange={(e) => setNewAdminNotes(e.target.value)}
                    placeholder="Enter your base summary (additional specs, key features, and extended description will be fetched automatically)..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Initial Specs (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={newSpecsInput}
                    onChange={(e) => setNewSpecsInput(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Custom Product Image URL (Optional — defaults to category studio photo)
                  </label>
                  <input
                    type="text"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    placeholder="https://... or leave blank for studio product photo"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex flex-wrap gap-4 rounded-xl border border-orange-200 bg-[#FFF5F0] p-3.5 text-xs font-semibold text-slate-800">
                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoLaunchSaleForNew}
                    onChange={(e) => setAutoLaunchSaleForNew(e.target.checked)}
                    className="h-4 w-4 accent-[#F85606]"
                  />
                  <span>Also feature in Animated SuperDeals Sale Spotlight</span>
                </label>

                <label className="inline-flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={autoCreatePosterForNew}
                    onChange={(e) => setAutoCreatePosterForNew(e.target.checked)}
                    className="h-4 w-4 accent-[#F85606]"
                  />
                  <span>Generate Promotional Ad Poster for User Dashboard</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={addingProduct}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-6 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#d94800] disabled:opacity-50"
              >
                {addingProduct ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Enriching Product Details from Google &amp; Publishing...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4" />
                    <span>Add Product + Fetch Google Key Features &amp; Extended Details</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 2: LAUNCH SALE ON EXISTING OR NEW PRODUCTS */}
          {activeTab === 'launch_sale' && (
            <form onSubmit={handleLaunchSaleSubmit} className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                <p className="font-bold text-slate-900">
                  Creative Animated Sale Presentation for Existing &amp; New Products
                </p>
                <p className="mt-0.5">
                  Select any product below and set a discount percentage. The system will craft animated ribbons, urgency highlights, and update the storefront deal price immediately.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Select Product from Catalog ({catalog.length} Products)
                  </label>
                  <select
                    value={selectedSaleProductId}
                    onChange={(e) => setSelectedSaleProductId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  >
                    {catalog.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.title} — Current: {formatLKR(prod.price)} (Orig:{' '}
                        {formatLKR(prod.originalPrice)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Sale Event Name
                    </label>
                    <input
                      type="text"
                      value={saleEventTitle}
                      onChange={(e) => setSaleEventTitle(e.target.value)}
                      placeholder="e.g., 11.11 Mega Flash Sale"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Discount Percentage (%)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={85}
                      value={saleDiscountPercent}
                      onChange={(e) => setSaleDiscountPercent(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 font-mono text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Deal Tier Badge
                    </label>
                    <select
                      value={saleDealTier}
                      onChange={(e) => setSaleDealTier(e.target.value as DealTier)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    >
                      <option value="flash_sale">Flash Sale</option>
                      <option value="new_user">New User Exclusive</option>
                      <option value="choice_bundle">BuyKit Choice Bundle</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={launchingSale}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-6 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#d94800] disabled:opacity-50"
              >
                {launchingSale ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Creating Animated Sale Spotlight...</span>
                  </>
                ) : (
                  <>
                    <Flame className="h-4 w-4" />
                    <span>Launch Animated Sale on User Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* TAB 3: CREATE PROMOTIONAL AD POSTER */}
          {activeTab === 'create_poster' && (
            <form onSubmit={handleCreatePosterSubmit} className="space-y-4">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs text-slate-600">
                <p className="font-bold text-slate-900">
                  AI Promotional Poster &amp; Campaign Banner Creator
                </p>
                <p className="mt-0.5">
                  Generates creative promotional posters with AI-crafted imagery and smooth animations for the User Dashboard without interrupting shoppers.
                </p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Promotional Campaign Theme / Offer Headline
                  </label>
                  <input
                    type="text"
                    value={posterTheme}
                    onChange={(e) => setPosterTheme(e.target.value)}
                    placeholder="e.g., Year-End Mega Tech & Home Appliance Festival · Up to 65% Off"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Featured Product Linked to Poster
                  </label>
                  <select
                    value={posterProductId}
                    onChange={(e) => setPosterProductId(e.target.value)}
                    className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  >
                    {catalog.map((prod) => (
                      <option key={prod.id} value={prod.id}>
                        {prod.title} ({formatLKR(prod.price)})
                      </option>
                    ))}
                  </select>
                </div>

                <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-orange-200 bg-[#FFF5F0] px-3.5 py-2.5 text-xs font-bold text-slate-800">
                  <input
                    type="checkbox"
                    checked={generateAiPosterImg}
                    onChange={(e) => setGenerateAiPosterImg(e.target.checked)}
                    className="h-4 w-4 accent-[#F85606]"
                  />
                  <span>Generate Custom AI Promotional Poster Background Image</span>
                </label>
              </div>

              <button
                type="submit"
                disabled={creatingPoster}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-6 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#d94800] disabled:opacity-50"
              >
                {creatingPoster ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Generating AI Promotional Poster...</span>
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    <span>Generate &amp; Publish Promotional Poster to Dashboard</span>
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
