import React, { useState, useEffect } from 'react';
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

interface AdminStorefrontStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  catalog: MarketplaceProduct[];
  initialEditProduct?: MarketplaceProduct | null;
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

// Compress uploaded image file into a clean JPEG DataURL
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
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
}

export const AdminStorefrontStudioModal: React.FC<
  AdminStorefrontStudioModalProps
> = ({
  isOpen,
  onClose,
  catalog,
  initialEditProduct = null,
  onAddNewProductWithDetails,
  onUpdateProduct,
  onDeleteProduct,
  onPublishSaleCampaign,
  onPublishPromoPoster,
}) => {
  const [activeTab, setActiveTab] = useState<
    'manage_catalog' | 'product_editor' | 'launch_sale' | 'create_poster'
  >('product_editor');

  // Search inside Manage Catalog tab
  const [adminCatalogSearch, setAdminCatalogSearch] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Product Editor Mode: null = Add New Product, string = Editing existing product ID
  const [editingProductId, setEditingProductId] = useState<string | null>(null);

  // Basic Info
  const [newTitle, setNewTitle] = useState('');
  const [newTagline, setNewTagline] = useState('');
  const [newCategory, setNewCategory] = useState<ProductDepartment>(
    'Audio & Headphones'
  );
  const [newStoreName, setNewStoreName] = useState('BuyKit Official Mall');

  // Pricing, Sales & Offers
  const [newPrice, setNewPrice] = useState('18500');
  const [newOriginalPrice, setNewOriginalPrice] = useState('39900');
  const [newUserSpecialPrice, setNewUserSpecialPrice] = useState('16500');
  const [newDealTier, setNewDealTier] = useState<DealTier>('flash_sale');
  const [newDealLabel, setNewDealLabel] = useState('');
  const [newSpecialOfferText, setNewSpecialOfferText] = useState(
    'Official 1-Year Warranty · Free Islandwide Express Delivery · Cash on Delivery Eligible'
  );

  // Stock Quota & Inventory
  const [newStockRemaining, setNewStockRemaining] = useState('25');
  const [newTotalStockQuota, setNewTotalStockQuota] = useState('60');
  const [newMaxOrderQuota, setNewMaxOrderQuota] = useState('5');
  const [newSoldCount, setNewSoldCount] = useState('120');
  const [newRating, setNewRating] = useState('4.9');
  const [newFreeShipping, setNewFreeShipping] = useState(true);
  const [newCodEligible, setNewCodEligible] = useState(true);

  // Main Image & Extra Images
  const [newImageUrl, setNewImageUrl] = useState('');
  const [extraImages, setExtraImages] = useState<string[]>([]);
  const [extraImageInput, setExtraImageInput] = useState('');

  // Description & Specs
  const [newAdminNotes, setNewAdminNotes] = useState('');
  const [newSpecsInput, setNewSpecsInput] = useState(
    'Official 1-Year Warranty, Islandwide Express Delivery, 100% Authentic BuyKit Mall Item'
  );
  const [enrichWithGoogleAi, setEnrichWithGoogleAi] = useState(true);

  // Product-Specific Coupons
  const [productCoupons, setProductCoupons] = useState<ProductCouponOffer[]>([
    {
      id: 'cp_prod_default_1',
      code: 'PRODUCT1500',
      badgeText: 'Rs. 1,500 OFF Product Voucher',
      subtitle: 'Exclusive store voucher for this product',
      type: 'flat',
      value: 1500,
      minSpend: 10000,
      maxCap: 1500,
    },
  ]);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [couponTypeInput, setCouponTypeInput] = useState<'flat' | 'percent'>('flat');
  const [couponValueInput, setCouponValueInput] = useState('2000');
  const [couponMinSpendInput, setCouponMinSpendInput] = useState('12000');
  const [couponSubtitleInput, setCouponSubtitleInput] = useState(
    'Special Admin Product Discount Voucher'
  );

  // Multi-Agent Campaign Toggles when adding/saving product
  const [autoLaunchSaleForNew, setAutoLaunchSaleForNew] = useState(true);
  const [autoCreatePosterForNew, setAutoCreatePosterForNew] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);

  // Tab 3: Launch Sale on Existing / New Product (Sales Agent)
  const [selectedSaleProductId, setSelectedSaleProductId] = useState(
    catalog[0]?.id || 'prod_sonicflow_anc_pro'
  );
  const [saleEventTitle, setSaleEventTitle] = useState('Mega Flash Festival');
  const [saleDiscountPercent, setSaleDiscountPercent] = useState('55');
  const [saleDealTier, setSaleDealTier] = useState<DealTier>('flash_sale');
  const [launchingSale, setLaunchingSale] = useState(false);

  // Tab 4: Create Promotional Ad Poster (Promotion Agent)
  const [posterTheme, setPosterTheme] = useState(
    'Super Weekend Tech & Lifestyle Sale'
  );
  const [posterProductId, setPosterProductId] = useState(
    catalog[0]?.id || 'prod_sonicflow_anc_pro'
  );
  const [generateAiPosterImg, setGenerateAiPosterImg] = useState(true);
  const [creatingPoster, setCreatingPoster] = useState(false);

  const [statusFeedback, setStatusFeedback] = useState<string>('');

  // Populate editor when initialEditProduct is passed or user clicks Edit on a product
  const loadProductIntoEditor = (product: MarketplaceProduct) => {
    setEditingProductId(product.id);
    setNewTitle(product.title);
    setNewTagline(product.tagline);
    setNewCategory(product.category);
    setNewStoreName(product.storeName);
    setNewPrice(String(product.price));
    setNewOriginalPrice(String(product.originalPrice));
    setNewUserSpecialPrice(String(product.newUserPrice));
    setNewDealTier(product.dealType);
    setNewDealLabel(product.dealLabel);
    setNewSpecialOfferText(
      product.specialOfferText ||
        'Official 1-Year Warranty · Free Islandwide Express Delivery'
    );
    setNewStockRemaining(String(product.stockRemaining));
    setNewTotalStockQuota(String(product.totalStock));
    setNewMaxOrderQuota(String(product.maxOrderQuota || 5));
    setNewSoldCount(String(product.soldCount));
    setNewRating(String(product.rating));
    setNewFreeShipping(product.freeShipping);
    setNewCodEligible(product.codEligible);
    setNewImageUrl(product.imageUrl);
    setExtraImages(product.extraImages || []);
    setNewAdminNotes(product.description);
    setNewSpecsInput(product.specs.join(', '));
    setProductCoupons(product.productCoupons || []);
    setEnrichWithGoogleAi(false);
    setAutoLaunchSaleForNew(false);
    setAutoCreatePosterForNew(false);
    setActiveTab('product_editor');
    setStatusFeedback(`Editing "${product.title}"`);
  };

  const resetFormForNewProduct = () => {
    setEditingProductId(null);
    setNewTitle('');
    setNewTagline('');
    setNewCategory('Audio & Headphones');
    setNewStoreName('BuyKit Official Mall');
    setNewPrice('18500');
    setNewOriginalPrice('39900');
    setNewUserSpecialPrice('16500');
    setNewDealTier('flash_sale');
    setNewDealLabel('');
    setNewSpecialOfferText(
      'Official 1-Year Warranty · Free Islandwide Express Delivery · Cash on Delivery Eligible'
    );
    setNewStockRemaining('25');
    setNewTotalStockQuota('60');
    setNewMaxOrderQuota('5');
    setNewSoldCount('120');
    setNewRating('4.9');
    setNewFreeShipping(true);
    setNewCodEligible(true);
    setNewImageUrl('');
    setExtraImages([]);
    setExtraImageInput('');
    setNewAdminNotes('');
    setNewSpecsInput(
      'Official 1-Year Warranty, Islandwide Express Delivery, 100% Authentic BuyKit Mall Item'
    );
    setProductCoupons([
      {
        id: `cp_prod_${Date.now()}`,
        code: 'SAVE1500',
        badgeText: 'Rs. 1,500 OFF Product Voucher',
        subtitle: 'Exclusive voucher for this product',
        type: 'flat',
        value: 1500,
        minSpend: 10000,
        maxCap: 1500,
      },
    ]);
    setEnrichWithGoogleAi(true);
    setAutoLaunchSaleForNew(true);
    setAutoCreatePosterForNew(false);
    setActiveTab('product_editor');
    setStatusFeedback('');
  };

  useEffect(() => {
    if (!isOpen) return;
    if (initialEditProduct) {
      loadProductIntoEditor(initialEditProduct);
    }
  }, [isOpen, initialEditProduct]);

  if (!isOpen) return null;

  const handleMainImageFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const dataUrl = await compressImageFileToDataUrl(file);
      setNewImageUrl(dataUrl);
      setStatusFeedback('Uploaded main product image from your device.');
    } catch {
      setStatusFeedback('Could not read main image file.');
    }
  };

  const handleExtraImagesFileUpload = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    try {
      const uploadedUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        const dataUrl = await compressImageFileToDataUrl(files[i]);
        uploadedUrls.push(dataUrl);
      }
      setExtraImages((prev) => [...prev, ...uploadedUrls]);
      setStatusFeedback(
        `Added ${uploadedUrls.length} extra gallery image(s) to this product.`
      );
    } catch {
      setStatusFeedback('Could not read extra image files.');
    }
  };

  const handleAddExtraImageUrl = () => {
    const trimmed = extraImageInput.trim();
    if (!trimmed) return;
    setExtraImages((prev) => [...prev, trimmed]);
    setExtraImageInput('');
  };

  const handleAddProductCoupon = () => {
    const cleanCode =
      couponCodeInput.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') ||
      `DEAL${Math.floor(100 + Math.random() * 900)}`;
    const val = Math.max(1, Number(couponValueInput) || 1000);
    const minSp = Math.max(0, Number(couponMinSpendInput) || 5000);
    const badge =
      couponTypeInput === 'percent'
        ? `${val}% OFF Product Coupon`
        : `${formatLKR(val)} OFF Product Voucher`;
    const newCp: ProductCouponOffer = {
      id: `cp_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      code: cleanCode,
      badgeText: badge,
      subtitle:
        couponSubtitleInput.trim() ||
        `Exclusive voucher for this product (Min. spend ${formatLKR(minSp)})`,
      type: couponTypeInput,
      value: val,
      minSpend: minSp,
      maxCap: couponTypeInput === 'percent' ? Math.max(val * 500, 10000) : val,
    };
    setProductCoupons((prev) => [...prev, newCp]);
    setCouponCodeInput('');
  };

  const handleRemoveProductCoupon = (couponId: string) => {
    setProductCoupons((prev) => prev.filter((c) => c.id !== couponId));
  };

  const handleSaveProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setSavingProduct(true);
    setStatusFeedback(
      editingProductId
        ? 'Saving product updates, images, stock quota, coupons & offers...'
        : 'Creating product, enriching details, and publishing to storefront...'
    );

    try {
      const numericPrice = Math.max(100, Number(newPrice) || 15000);
      const numericOriginal = Math.max(
        numericPrice,
        Number(newOriginalPrice) || Math.round(numericPrice * 1.4)
      );
      const numericNewUser = Math.max(
        100,
        Number(newUserSpecialPrice) || Math.round(numericPrice * 0.9)
      );
      const numericStockRemaining = Math.max(0, Number(newStockRemaining) || 0);
      const numericTotalStock = Math.max(
        numericStockRemaining,
        Number(newTotalStockQuota) || 50
      );
      const numericMaxOrderQuota = Math.max(1, Number(newMaxOrderQuota) || 5);
      const numericSold = Math.max(0, Number(newSoldCount) || 0);
      const numericRating = Math.min(5, Math.max(1, Number(newRating) || 4.9));

      const targetProdId =
        editingProductId || `prod_custom_${Date.now().toString().slice(-6)}`;

      const baseSpecs = newSpecsInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);

      const resolvedMainImage =
        newImageUrl.trim() || DEFAULT_CATEGORY_IMAGES[newCategory];

      const discountPct =
        numericOriginal > numericPrice
          ? Math.round(((numericOriginal - numericPrice) / numericOriginal) * 100)
          : 15;

      let computedDealLabel =
        newDealLabel.trim() ||
        (newDealTier === 'new_user'
          ? `New User · ${discountPct}% Off`
          : newDealTier === 'choice_bundle'
          ? `Choice · Save ${formatLKR(Math.max(0, numericOriginal - numericPrice))}`
          : `Flash Sale · ${discountPct}% Off`);

      let enrichedResult:
        | (Omit<EnrichedProductDetails, 'productId'> & { productId?: string })
        | null = null;

      if (enrichWithGoogleAi) {
        enrichedResult = await runDescriptionAgent({
          productTitle: newTitle.trim(),
          category: newCategory,
          adminNotes:
            newAdminNotes.trim() || `Official ${newCategory} flagship item`,
          adminSpecs: baseSpecs,
        });
      }

      const finalProduct: MarketplaceProduct = {
        id: targetProdId,
        title: newTitle.trim(),
        tagline:
          newTagline.trim() ||
          enrichedResult?.enhancedTagline ||
          `${newStoreName.trim()} · ${computedDealLabel}`,
        category: newCategory,
        dealType: newDealTier,
        dealLabel: computedDealLabel,
        price: numericPrice,
        originalPrice: numericOriginal,
        newUserPrice: numericNewUser,
        rating: numericRating,
        soldCount: numericSold,
        stockRemaining: numericStockRemaining,
        totalStock: numericTotalStock,
        maxOrderQuota: numericMaxOrderQuota,
        freeShipping: newFreeShipping,
        codEligible: newCodEligible,
        storeName: newStoreName.trim() || 'BuyKit Official Mall',
        imageUrl: resolvedMainImage,
        extraImages: extraImages.filter(Boolean),
        specs:
          baseSpecs.length > 0
            ? baseSpecs
            : enrichedResult?.keyFeatures?.slice(0, 6) || [
                'Official 1-Year Warranty',
                'Islandwide Express Delivery',
              ],
        description:
          newAdminNotes.trim() ||
          enrichedResult?.extendedDescription?.split('\n\n')[0] ||
          `${newTitle.trim()} available now at ${newStoreName.trim()} with official warranty and islandwide delivery.`,
        specialOfferText: newSpecialOfferText.trim(),
        productCoupons,
      };

      if (editingProductId) {
        onUpdateProduct(
          finalProduct,
          enrichedResult
            ? {
                productId: targetProdId,
                enhancedTagline: enrichedResult.enhancedTagline,
                extendedDescription: enrichedResult.extendedDescription,
                keyFeatures: enrichedResult.keyFeatures,
                moreDetailsHighlights: enrichedResult.moreDetailsHighlights,
                proBuyerTips: enrichedResult.proBuyerTips,
                searchSources: enrichedResult.searchSources,
              }
            : undefined
        );
        setStatusFeedback(
          `Updated "${finalProduct.title}" (Main + ${extraImages.length} Extra Images, Stock Quota: ${numericStockRemaining}/${numericTotalStock}, ${productCoupons.length} Coupons)!`
        );
      } else {
        // Creating a brand new product
        let optionalSale: CreativeSaleSpotlight | undefined;
        if (autoLaunchSaleForNew) {
          const saleResult = await runSalesAgent({
            saleName: 'New Arrival Launch Sale',
            discountPercent: discountPct,
            dealTier: newDealTier,
            productTitle: finalProduct.title,
            currentPrice: numericPrice,
            originalPrice: numericOriginal,
            isNewProduct: true,
          });
          optionalSale = {
            id: `sale_${Date.now()}`,
            productId: targetProdId,
            productTitle: finalProduct.title,
            productImageUrl: resolvedMainImage,
            category: newCategory,
            saleBannerTitle: saleResult.saleBannerTitle,
            dealLabel: computedDealLabel,
            animatedRibbonText: saleResult.animatedRibbonText,
            creativeTagline: saleResult.creativeTagline,
            urgencyHighlight: saleResult.urgencyHighlight,
            salePrice: numericPrice,
            originalPrice: numericOriginal,
            discountPercent: discountPct,
            dealTier: newDealTier,
            isNewProduct: true,
            claimedPercent: 76,
          };
        }

        let optionalPoster: PromotionalPosterCampaign | undefined;
        if (autoCreatePosterForNew) {
          const promoResult = await runPromotionAgent({
            campaignTheme: `New Arrival Spotlight · ${newCategory}`,
            productTitle: finalProduct.title,
            category: newCategory,
            dealPrice: numericPrice,
            originalPrice: numericOriginal,
            generateAiPoster: true,
            fallbackImageUrl:
              '/src/assets/images/promo_poster_mega_sale_1794319674629.jpg',
          });
          optionalPoster = {
            id: `poster_${Date.now()}`,
            productId: targetProdId,
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

        const defaultEnriched: EnrichedProductDetails = enrichedResult
          ? {
              productId: targetProdId,
              enhancedTagline: enrichedResult.enhancedTagline,
              extendedDescription: enrichedResult.extendedDescription,
              keyFeatures: enrichedResult.keyFeatures,
              moreDetailsHighlights: enrichedResult.moreDetailsHighlights,
              proBuyerTips: enrichedResult.proBuyerTips,
              searchSources: enrichedResult.searchSources,
            }
          : {
              productId: targetProdId,
              enhancedTagline: finalProduct.tagline,
              extendedDescription: finalProduct.description,
              keyFeatures: finalProduct.specs,
              moreDetailsHighlights: [
                { label: 'Category', value: finalProduct.category },
                { label: 'Official Store', value: finalProduct.storeName },
                {
                  label: 'Stock Quota',
                  value: `${finalProduct.stockRemaining} / ${finalProduct.totalStock} Units`,
                },
                {
                  label: 'Max Order Limit',
                  value: `${finalProduct.maxOrderQuota || 5} Units per Order`,
                },
              ],
              proBuyerTips:
                finalProduct.specialOfferText ||
                'Apply product coupons on the product page for extra savings.',
            };

        onAddNewProductWithDetails(
          finalProduct,
          defaultEnriched,
          optionalSale,
          optionalPoster
        );
        resetFormForNewProduct();
        setStatusFeedback(
          `Added "${finalProduct.title}" with ${extraImages.length} extra images, stock quota (${numericStockRemaining}/${numericTotalStock}), and ${productCoupons.length} product coupon(s)!`
        );
      }
    } catch (err: unknown) {
      setStatusFeedback(
        err instanceof Error ? err.message : 'Could not save product changes.'
      );
    } finally {
      setSavingProduct(false);
    }
  };

  const handleLaunchSaleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProd =
      catalog.find((p) => p.id === selectedSaleProductId) || catalog[0];
    if (!targetProd) return;

    setLaunchingSale(true);
    setStatusFeedback(
      'Formatting creative animated sale presentation for storefront...'
    );

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
    const targetProd =
      catalog.find((p) => p.id === posterProductId) || catalog[0];
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
        fallbackImageUrl:
          '/src/assets/images/promo_poster_flash_festival_1794319675114.jpg',
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
        err instanceof Error
          ? err.message
          : 'Failed to generate promotional poster.'
      );
    } finally {
      setCreatingPoster(false);
    }
  };

  const filteredAdminCatalog = catalog.filter((p) => {
    if (!adminCatalogSearch.trim()) return true;
    const q = adminCatalogSearch.toLowerCase();
    return (
      p.title.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.storeName.toLowerCase().includes(q)
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-xs sm:p-4">
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        {/* Top Modal Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-[#F85606] px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <Sparkles className="h-5 w-5 text-amber-300" />
            </div>
            <div>
              <h2 className="font-display text-base font-extrabold tracking-tight sm:text-lg">
                BuyKit Admin Product &amp; Campaign Manager
              </h2>
              <p className="text-xs text-orange-100">
                Add, Edit, or Delete any product · Main &amp; Extra Images, Stock Quota, Product Coupons, Sales &amp; Offers
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

        {/* 4 Studio Tabs */}
        <div className="grid grid-cols-2 gap-2 border-b border-slate-200 bg-slate-50 p-3 sm:grid-cols-4">
          <button
            type="button"
            onClick={() => {
              setActiveTab('product_editor');
              setStatusFeedback('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${
              activeTab === 'product_editor'
                ? 'bg-[#F85606] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
            }`}
          >
            <Package className="h-4 w-4 shrink-0" />
            <span>
              {editingProductId ? '1. Edit Product' : '1. Add New Product'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              setActiveTab('manage_catalog');
              setStatusFeedback('');
            }}
            className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-extrabold transition-all ${
              activeTab === 'manage_catalog'
                ? 'bg-[#F85606] text-white shadow-xs'
                : 'bg-white text-slate-700 hover:bg-orange-50 hover:text-[#F85606]'
            }`}
          >
            <Layers className="h-4 w-4 shrink-0" />
            <span>2. Edit / Delete ({catalog.length})</span>
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
            <span>3. Launch Sale</span>
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
            <span>4. Promo Posters</span>
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {statusFeedback && (
            <div className="mb-4 flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-[#FFF5F0] px-4 py-3 text-xs font-bold text-slate-900">
              <div className="flex items-center gap-2">
                {savingProduct || launchingSale || creatingPoster ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#F85606]" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                )}
                <span>{statusFeedback}</span>
              </div>
              {editingProductId && (
                <button
                  type="button"
                  onClick={resetFormForNewProduct}
                  className="rounded-lg bg-slate-900 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-slate-800"
                >
                  + Switch to Add New Product
                </button>
              )}
            </div>
          )}

          {/* =========================================================
              TAB 1: ADD OR EDIT PRODUCT (MAIN + EXTRA IMAGES, DESCRIPTION, STOCK QUOTA, COUPONS, SALES & OFFERS)
             ========================================================= */}
          {activeTab === 'product_editor' && (
            <form onSubmit={handleSaveProductSubmit} className="space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                <div>
                  <span className="font-extrabold text-slate-900">
                    {editingProductId
                      ? `Editing Existing Product (ID: ${editingProductId})`
                      : 'Add New Product to BuyKit Catalog'}
                  </span>
                  <p className="mt-0.5 text-slate-600">
                    Configure Main Image, Extra Gallery Images, Description, Stock Quota, Deal Price, Special Offers, and Product-Specific Coupons.
                  </p>
                </div>
                {editingProductId && (
                  <button
                    type="button"
                    onClick={resetFormForNewProduct}
                    className="inline-flex items-center gap-1 rounded-xl border border-orange-300 bg-white px-3 py-1.5 font-bold text-[#F85606] hover:bg-orange-50"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Create New Product Instead</span>
                  </button>
                )}
              </div>

              {/* SECTION A: BASIC PRODUCT INFO & CATEGORY */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
                <h3 className="font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                  A. Product Title, Category &amp; Merchant Store
                </h3>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Product Name / Title *
                    </label>
                    <input
                      type="text"
                      required
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g., Sony WH-1000XM5 Wireless Noise Cancelling Headphones"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Product Subtitle / Tagline
                    </label>
                    <input
                      type="text"
                      value={newTagline}
                      onChange={(e) => setNewTagline(e.target.value)}
                      placeholder="e.g., BuyKit Mall Flagship · 40h Battery · LDAC Hi-Res Audio"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Category / Department
                    </label>
                    <select
                      value={newCategory}
                      onChange={(e) =>
                        setNewCategory(e.target.value as ProductDepartment)
                      }
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
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
                      Official Store / Merchant Name
                    </label>
                    <input
                      type="text"
                      value={newStoreName}
                      onChange={(e) => setNewStoreName(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION B: MAIN IMAGE & MULTIPLE EXTRA IMAGES */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                    B. Main Product Image &amp; Extra Gallery Images ({1 + extraImages.length} Photos)
                  </h3>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Paste URLs or Upload directly from your phone / computer
                  </span>
                </div>

                {/* Main Image Row */}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-12 sm:items-center">
                  <div className="sm:col-span-9">
                    <label className="block text-xs font-bold text-slate-700">
                      Main Product Image (URL or Upload File)
                    </label>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <input
                        type="text"
                        value={newImageUrl}
                        onChange={(e) => setNewImageUrl(e.target.value)}
                        placeholder="https://... or upload an image file →"
                        className="min-w-[200px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                      />
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-bold text-white hover:bg-slate-800">
                        <Upload className="h-3.5 w-3.5" />
                        <span>Upload Main Photo</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleMainImageFileUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:col-span-3 sm:justify-end">
                    <div className="h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
                      <img
                        src={resolveAssetUrl(
                          newImageUrl || DEFAULT_CATEGORY_IMAGES[newCategory]
                        )}
                        alt="Main preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <span className="text-[11px] font-bold text-slate-500">
                      Main Photo
                    </span>
                  </div>
                </div>

                {/* Extra Images Builder */}
                <div className="border-t border-slate-100 pt-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Extra Product Gallery Images (Shown in Product Slider &amp; Fullscreen Gallery)
                  </label>
                  <div className="mt-1.5 flex flex-wrap gap-2">
                    <input
                      type="text"
                      value={extraImageInput}
                      onChange={(e) => setExtraImageInput(e.target.value)}
                      placeholder="Paste extra image URL (https://...) and click + Add URL"
                      className="min-w-[200px] flex-1 rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddExtraImageUrl}
                      className="inline-flex items-center gap-1 rounded-xl border border-[#F85606] bg-[#FFF3EB] px-3.5 py-2 text-xs font-extrabold text-[#F85606] hover:bg-[#F85606] hover:text-white"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Image URL</span>
                    </button>

                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl bg-[#F85606] px-3.5 py-2 text-xs font-extrabold text-white hover:bg-[#d94800]">
                      <Upload className="h-3.5 w-3.5" />
                      <span>Upload Extra Photos</span>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleExtraImagesFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>

                  {extraImages.length > 0 ? (
                    <div className="mt-3 flex flex-wrap items-center gap-2.5">
                      {extraImages.map((imgUrl, idx) => (
                        <div
                          key={idx}
                          className="group relative h-16 w-16 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xs"
                        >
                          <img
                            src={resolveAssetUrl(imgUrl)}
                            alt={`Extra ${idx + 1}`}
                            className="h-full w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setExtraImages((prev) =>
                                prev.filter((_, i) => i !== idx)
                              )
                            }
                            title="Remove extra image"
                            className="absolute top-1 right-1 rounded-md bg-red-600/90 p-0.5 text-white hover:bg-red-700"
                          >
                            <X className="h-3 w-3" />
                          </button>
                          <span className="absolute bottom-0 left-0 right-0 bg-slate-950/75 py-0.5 text-center font-mono text-[9px] font-bold text-white">
                            #{idx + 2}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-slate-500">
                      No extra images added yet. Upload or paste URLs above to add multiple gallery angles.
                    </p>
                  )}
                </div>
              </div>

              {/* SECTION C: PRICING, SALES, OFFERS & STOCK QUOTA */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-4">
                <h3 className="font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                  C. Pricing, Sales, Offers &amp; Stock Quota
                </h3>

                <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Sale / Deal Price (LKR) *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newPrice}
                      onChange={(e) => setNewPrice(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Original Price (LKR) *
                    </label>
                    <input
                      type="number"
                      required
                      min={100}
                      value={newOriginalPrice}
                      onChange={(e) => setNewOriginalPrice(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      New User Deal Price (LKR)
                    </label>
                    <input
                      type="number"
                      min={100}
                      value={newUserSpecialPrice}
                      onChange={(e) => setNewUserSpecialPrice(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 font-mono text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700">
                      Sale / Deal Tier
                    </label>
                    <select
                      value={newDealTier}
                      onChange={(e) => setNewDealTier(e.target.value as DealTier)}
                      className="mt-1 w-full rounded-xl border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-900 focus:border-[#F85606] focus:outline-none"
                    >
                      <option value="flash_sale">Flash Sale</option>
                      <option value="new_user">New User Exclusive Deal</option>
                      <option value="choice_bundle">BuyKit Choice Bundle</option>
                      <option value="standard">Standard Catalog Deal</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700">
                      Custom Sale / Offer Badge Label (Optional)
                    </label>
                    <input
                      type="text"
                      value={newDealLabel}
                      onChange={(e) => setNewDealLabel(e.target.value)}
                      placeholder="e.g., Flash Sale · 55% Off or Buy 1 Get Free Gift"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-3">
                    <label className="block text-xs font-bold text-slate-700">
                      Special Offer Highlight / Bundle Perks Banner
                    </label>
                    <input
                      type="text"
                      value={newSpecialOfferText}
                      onChange={(e) => setNewSpecialOfferText(e.target.value)}
                      placeholder="e.g., Free Protective Case + 1-Year Official Warranty + Extra Coupon Applicable"
                      className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>
                </div>

                {/* Stock Quota & Inventory Controls */}
                <div className="grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 sm:grid-cols-5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Available Stock *
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newStockRemaining}
                      onChange={(e) => setNewStockRemaining(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Total Stock Quota *
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={newTotalStockQuota}
                      onChange={(e) => setNewTotalStockQuota(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Max Order Quota
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={99}
                      value={newMaxOrderQuota}
                      onChange={(e) => setNewMaxOrderQuota(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Sold Count
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={newSoldCount}
                      onChange={(e) => setNewSoldCount(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700">
                      Rating (1.0 - 5.0)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={1}
                      max={5}
                      value={newRating}
                      onChange={(e) => setNewRating(e.target.value)}
                      className="mt-1 w-full rounded-xl border border-slate-300 px-2.5 py-2 font-mono text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 pt-1 text-xs font-semibold text-slate-700">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newFreeShipping}
                      onChange={(e) => setNewFreeShipping(e.target.checked)}
                      className="h-4 w-4 accent-emerald-600"
                    />
                    <span>Free Islandwide Delivery Eligible</span>
                  </label>

                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={newCodEligible}
                      onChange={(e) => setNewCodEligible(e.target.checked)}
                      className="h-4 w-4 accent-[#F85606]"
                    />
                    <span>Cash on Delivery (COD) Supported</span>
                  </label>
                </div>
              </div>

              {/* SECTION D: PRODUCT-SPECIFIC COUPONS & VOUCHERS */}
              <div className="rounded-xl border border-orange-200 bg-[#FFF9F5] p-4 shadow-2xs space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Ticket className="h-4 w-4 text-[#F85606]" />
                    <h3 className="font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                      D. Product-Specific Coupons &amp; Vouchers ({productCoupons.length})
                    </h3>
                  </div>
                  <span className="text-[11px] font-medium text-slate-500">
                    Shoppers can claim &amp; apply these coupons directly on this product&apos;s page
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-12">
                  <div className="sm:col-span-3">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Coupon Code
                    </label>
                    <input
                      type="text"
                      value={couponCodeInput}
                      onChange={(e) => setCouponCodeInput(e.target.value)}
                      placeholder="e.g., SAVE2000"
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs uppercase text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Discount Type
                    </label>
                    <select
                      value={couponTypeInput}
                      onChange={(e) =>
                        setCouponTypeInput(e.target.value as 'flat' | 'percent')
                      }
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    >
                      <option value="flat">Flat (Rs.)</option>
                      <option value="percent">Percent (%)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      {couponTypeInput === 'percent' ? 'Percent %' : 'Amount (Rs.)'}
                    </label>
                    <input
                      type="number"
                      min={1}
                      value={couponValueInput}
                      onChange={(e) => setCouponValueInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Min Spend (Rs.)
                    </label>
                    <input
                      type="number"
                      min={0}
                      value={couponMinSpendInput}
                      onChange={(e) => setCouponMinSpendInput(e.target.value)}
                      className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 font-mono text-xs text-slate-900 focus:border-[#F85606] focus:outline-none"
                    />
                  </div>

                  <div className="flex items-end sm:col-span-3">
                    <button
                      type="button"
                      onClick={handleAddProductCoupon}
                      className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-[#F85606] px-3 py-2 text-xs font-extrabold text-white shadow-2xs hover:bg-[#d94800]"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>Add Coupon</span>
                    </button>
                  </div>
                </div>

                {productCoupons.length > 0 && (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {productCoupons.map((cp) => (
                      <div
                        key={cp.id}
                        className="flex items-center justify-between gap-2 rounded-xl border border-orange-200 bg-white px-3 py-2 text-xs shadow-2xs"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="rounded bg-[#F85606] px-2 py-0.5 font-mono text-[10px] font-extrabold text-white">
                              {cp.code}
                            </span>
                            <span className="truncate font-bold text-slate-900">
                              {cp.badgeText}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-[11px] text-slate-500">
                            Min. Spend: {formatLKR(cp.minSpend)} · {cp.subtitle}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveProductCoupon(cp.id)}
                          className="rounded-lg p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          title="Delete coupon"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* SECTION E: DESCRIPTION, KEY SPECIFICATIONS & GOOGLE AI AUTO-ENRICH */}
              <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3.5">
                <h3 className="font-display text-xs font-extrabold tracking-wider text-slate-900 uppercase">
                  E. Product Description &amp; Specifications
                </h3>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Product Description / Overview
                  </label>
                  <textarea
                    rows={3}
                    value={newAdminNotes}
                    onChange={(e) => setNewAdminNotes(e.target.value)}
                    placeholder="Write product description, features, warranty details, and package contents..."
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700">
                    Key Specifications / Bullet Points (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={newSpecsInput}
                    onChange={(e) => setNewSpecsInput(e.target.value)}
                    placeholder="e.g., 48h Battery Life, Active Noise Cancellation, 1-Year Official Warranty"
                    className="mt-1 w-full rounded-xl border border-slate-300 px-3.5 py-2 text-sm text-slate-900 focus:border-[#F85606] focus:outline-none"
                  />
                </div>

                <div className="flex flex-wrap gap-4 rounded-xl border border-orange-200 bg-[#FFF5F0] p-3 text-xs font-semibold text-slate-800">
                  <label className="inline-flex cursor-pointer items-center gap-2">
                    <input
                      type="checkbox"
                      checked={enrichWithGoogleAi}
                      onChange={(e) => setEnrichWithGoogleAi(e.target.checked)}
                      className="h-4 w-4 accent-[#F85606]"
                    />
                    <span>
                      Auto-Fetch Extended Details &amp; Key Features from Google (Description Agent)
                    </span>
                  </label>

                  {!editingProductId && (
                    <>
                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={autoLaunchSaleForNew}
                          onChange={(e) =>
                            setAutoLaunchSaleForNew(e.target.checked)
                          }
                          className="h-4 w-4 accent-[#F85606]"
                        />
                        <span>Feature in Animated SuperDeals Spotlight</span>
                      </label>

                      <label className="inline-flex cursor-pointer items-center gap-2">
                        <input
                          type="checkbox"
                          checked={autoCreatePosterForNew}
                          onChange={(e) =>
                            setAutoCreatePosterForNew(e.target.checked)
                          }
                          className="h-4 w-4 accent-[#F85606]"
                        />
                        <span>Generate Promotional Poster</span>
                      </label>
                    </>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={savingProduct}
                className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#F85606] px-6 py-3.5 text-sm font-extrabold text-white shadow-md hover:bg-[#d94800] disabled:opacity-50"
              >
                {savingProduct ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Saving Product, Images, Stock Quota &amp; Coupons...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="h-4 w-4" />
                    <span>
                      {editingProductId
                        ? 'Save Product Changes'
                        : 'Add Product to Storefront Catalog'}
                    </span>
                  </>
                )}
              </button>
            </form>
          )}

          {/* =========================================================
              TAB 2: MANAGE ALL PRODUCTS (EDIT OR DELETE ANY PRODUCT)
             ========================================================= */}
          {activeTab === 'manage_catalog' && (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex flex-1 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2">
                  <Search className="h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={adminCatalogSearch}
                    onChange={(e) => setAdminCatalogSearch(e.target.value)}
                    placeholder="Search products by title, category, or store to Edit or Delete..."
                    className="w-full text-xs text-slate-900 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={resetFormForNewProduct}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#F85606] px-4 py-2 text-xs font-extrabold text-white shadow-2xs hover:bg-[#d94800]"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add New Product</span>
                </button>
              </div>

              <div className="space-y-2.5">
                {filteredAdminCatalog.map((prod) => {
                  const isConfirmingDelete = confirmDeleteId === prod.id;
                  return (
                    <div
                      key={prod.id}
                      className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-2xs transition-colors hover:border-orange-300"
                    >
                      <div className="flex min-w-0 flex-1 items-center gap-3">
                        <img
                          src={resolveAssetUrl(prod.imageUrl)}
                          alt={prod.title}
                          className="h-14 w-14 shrink-0 rounded-xl border border-slate-200 object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="rounded bg-orange-100 px-2 py-0.5 text-[10px] font-extrabold text-[#F85606]">
                              {prod.category}
                            </span>
                            <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-700">
                              Stock: {prod.stockRemaining}/{prod.totalStock}
                            </span>
                            {prod.extraImages && prod.extraImages.length > 0 && (
                              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[10px] font-bold text-blue-700">
                                +{prod.extraImages.length} Extra Photos
                              </span>
                            )}
                            {prod.productCoupons && prod.productCoupons.length > 0 && (
                              <span className="rounded bg-emerald-50 px-2 py-0.5 font-mono text-[10px] font-bold text-emerald-700">
                                {prod.productCoupons.length} Coupons
                              </span>
                            )}
                          </div>
                          <h4 className="mt-1 truncate font-display text-xs font-extrabold text-slate-900 sm:text-sm">
                            {prod.title}
                          </h4>
                          <p className="font-mono text-xs font-bold text-[#F85606]">
                            {formatLKR(prod.price)}{' '}
                            <span className="text-[11px] font-normal text-slate-400 line-through">
                              {formatLKR(prod.originalPrice)}
                            </span>{' '}
                            · <span className="text-slate-600">{prod.dealLabel}</span>
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => loadProductIntoEditor(prod)}
                          className="inline-flex items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-extrabold text-slate-800 hover:border-[#F85606] hover:bg-[#FFF3EB] hover:text-[#F85606]"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                          <span>Edit</span>
                        </button>

                        {isConfirmingDelete ? (
                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                onDeleteProduct(prod.id);
                                setConfirmDeleteId(null);
                                setStatusFeedback(`Deleted "${prod.title}" from catalog.`);
                              }}
                              className="rounded-xl bg-red-600 px-3 py-2 text-xs font-extrabold text-white hover:bg-red-700"
                            >
                              Confirm Delete
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(prod.id)}
                            className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-extrabold text-red-600 hover:bg-red-600 hover:text-white"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Delete</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* =========================================================
              TAB 3: LAUNCH SALE ON EXISTING OR NEW PRODUCTS
             ========================================================= */}
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
                      onChange={(e) =>
                        setSaleDealTier(e.target.value as DealTier)
                      }
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

          {/* =========================================================
              TAB 4: CREATE PROMOTIONAL AD POSTER
             ========================================================= */}
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
                  <span>
                    Generate Custom AI Promotional Poster Background Image
                  </span>
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
                    <span>
                      Generate &amp; Publish Promotional Poster to Dashboard
                    </span>
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
