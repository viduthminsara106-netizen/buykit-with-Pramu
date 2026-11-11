import { DealTier, ProductDepartment } from '../data/catalog';
import { resolveAssetUrl } from './assetResolver';

export interface PromotionalPosterCampaign {
  id: string;
  productId: string;
  campaignTag: string;
  discountBadge: string;
  headline: string;
  subheadline: string;
  ctaLabel: string;
  dealPrice: number;
  originalPrice: number;
  accentTheme: 'orange_gold' | 'obsidian_flame' | 'emerald_luxe' | 'royal_amber';
  imageUrl: string;
  createdAt: string;
}

export interface CreativeSaleSpotlight {
  id: string;
  productId: string;
  productTitle: string;
  productImageUrl: string;
  category: ProductDepartment;
  saleBannerTitle: string;
  dealLabel: string;
  animatedRibbonText: string;
  creativeTagline: string;
  urgencyHighlight: string;
  salePrice: number;
  originalPrice: number;
  discountPercent: number;
  dealTier: DealTier;
  isNewProduct: boolean;
  claimedPercent: number;
}

export interface EnrichedProductDetails {
  productId: string;
  enhancedTagline: string;
  extendedDescription: string;
  keyFeatures: string[];
  moreDetailsHighlights: { label: string; value: string }[];
  proBuyerTips: string;
  searchSources?: { title: string; uri: string }[];
}

export const INITIAL_PROMO_POSTERS: PromotionalPosterCampaign[] = [
  {
    id: 'poster_mega_tech_festival',
    productId: 'prod_sonicflow_anc_pro',
    campaignTag: 'MEGA TECH FESTIVAL · LIMITED TIME',
    discountBadge: '62% OFF · Save Rs. 38,000',
    headline: 'Studio ANC Audio, Sapphire Smartwatch & 4K Drone SuperDeals',
    subheadline: 'Islandwide Free Express Delivery · 1-Year Official Warranty · Cash on Delivery',
    ctaLabel: 'Explore Mega Deals',
    dealPrice: 14500,
    originalPrice: 52500,
    accentTheme: 'orange_gold',
    imageUrl: resolveAssetUrl('/src/assets/images/promo_poster_mega_sale_1794319674629.jpg'),
    createdAt: '2026-11-10',
  },
  {
    id: 'poster_power_gaming_drop',
    productId: 'prod_apex_pro_controller',
    campaignTag: 'PRO GAMING & GAN POWER DROP',
    discountBadge: '69% OFF · Save Rs. 24,600',
    headline: '160W GaN Fast Charging & Hall-Effect Pro Gaming Gear',
    subheadline: 'Zero-Drift Magnetic Joysticks · 140W OLED Laptop Power Banks In Stock',
    ctaLabel: 'Shop Power & Gaming',
    dealPrice: 10900,
    originalPrice: 35500,
    accentTheme: 'obsidian_flame',
    imageUrl: resolveAssetUrl('/src/assets/images/promo_poster_flash_festival_1794319675114.jpg'),
    createdAt: '2026-11-10',
  },
  {
    id: 'poster_home_barista_sale',
    productId: 'prod_barista_pro_espresso',
    campaignTag: 'HOME & BARISTA LUXURY SALE',
    discountBadge: '51% OFF · Save Rs. 45,100',
    headline: 'Italian 20-Bar Stainless Steel Espresso & Smart Home Collection',
    subheadline: 'Dual-Boiler PID Temperature Control · Extra LKR Coupons Available at Checkout',
    ctaLabel: 'Shop Home Deals',
    dealPrice: 42900,
    originalPrice: 88000,
    accentTheme: 'emerald_luxe',
    imageUrl: resolveAssetUrl('/src/assets/images/promo_poster_home_lifestyle_1794319676096.jpg'),
    createdAt: '2026-11-10',
  },
];

export const INITIAL_CREATIVE_SALES: CreativeSaleSpotlight[] = [
  {
    id: 'sale_spot_anc',
    productId: 'prod_sonicflow_anc_pro',
    productTitle: 'SonicFlow Titanium Studio ANC Wireless Over-Ear Headphones',
    productImageUrl: resolveAssetUrl('/src/assets/images/product_audio_headphones_1794121197272.jpg'),
    category: 'Audio & Headphones',
    saleBannerTitle: 'SuperDeal Audio Spotlight · 62% OFF',
    dealLabel: 'Flash Sale · 62% Off',
    animatedRibbonText: 'SAVE RS. 38,000 · HI-RES LDAC STUDIO ANC',
    creativeTagline: 'Hybrid -48dB Active Noise Cancellation with 48-Hour Ultra Endurance Battery',
    urgencyHighlight: '89% of promotional units claimed at Rs. 14,500',
    salePrice: 14500,
    originalPrice: 52500,
    discountPercent: 62,
    dealTier: 'flash_sale',
    isNewProduct: false,
    claimedPercent: 89,
  },
  {
    id: 'sale_spot_watch',
    productId: 'prod_atlas_titanium_watch',
    productTitle: 'Atlas Ultra Sapphire Titanium GPS Smartwatch (49mm)',
    productImageUrl: resolveAssetUrl('/src/assets/images/product_smartwatch_pro_1794121197679.jpg'),
    category: 'Smartwatches & Wearables',
    saleBannerTitle: 'Flagship Wearable Drop · 55% OFF',
    dealLabel: 'Flash Sale · 55% Off',
    animatedRibbonText: 'SAVE RS. 35,400 · GRADE 5 TITANIUM + SAPPHIRE',
    creativeTagline: '2000-Nit AMOLED Display · Dual-Frequency L1+L5 GPS · 14-Day Battery',
    urgencyHighlight: '92% claimed — Only 9 units left in Colombo Hub',
    salePrice: 29500,
    originalPrice: 64900,
    discountPercent: 55,
    dealTier: 'flash_sale',
    isNewProduct: false,
    claimedPercent: 92,
  },
  {
    id: 'sale_spot_drone',
    productId: 'prod_cinemax_fold_4k',
    productTitle: 'CineMax Fold 4K HDR 3-Axis Gimbal Camera Drone Combo',
    productImageUrl: resolveAssetUrl('/src/assets/images/product_camera_drone_1794121198906.jpg'),
    category: 'Cameras & Drones',
    saleBannerTitle: 'Aerial Creator Bundle · Save Rs. 49,000',
    dealLabel: 'Choice · 42% Off',
    animatedRibbonText: 'SAVE RS. 49,000 · 3-AXIS GIMBAL + FLY MORE KIT',
    creativeTagline: 'Sub-249g 4K/60fps HDR Cinema Drone with 12km HD Transmission',
    urgencyHighlight: '84% claimed — Free Express Courier Included',
    salePrice: 66900,
    originalPrice: 115900,
    discountPercent: 42,
    dealTier: 'choice_bundle',
    isNewProduct: false,
    claimedPercent: 84,
  },
  {
    id: 'sale_spot_espresso',
    productId: 'prod_barista_pro_espresso',
    productTitle: 'Marzocco Studio 20-Bar Stainless Steel Espresso Maker',
    productImageUrl: resolveAssetUrl('/src/assets/images/product_espresso_maker_1794123345741.jpg'),
    category: 'Home & Lifestyle',
    saleBannerTitle: 'Home Café Super Sale · 51% OFF',
    dealLabel: 'Flash Sale · 51% Off',
    animatedRibbonText: 'SAVE RS. 45,100 · ITALIAN 20-BAR PUMP + PID',
    creativeTagline: 'Commercial 58mm Walnut Portafilter & Micro-Foam Steam Wand for Café Crema',
    urgencyHighlight: '86% claimed — Cash on Delivery Eligible',
    salePrice: 42900,
    originalPrice: 88000,
    discountPercent: 51,
    dealTier: 'flash_sale',
    isNewProduct: false,
    claimedPercent: 86,
  },
];

export const INITIAL_ENRICHED_DESCRIPTIONS: Record<string, EnrichedProductDetails> = {
  prod_sonicflow_anc_pro: {
    productId: 'prod_sonicflow_anc_pro',
    enhancedTagline: 'Dual-Chamber 45mm Beryllium Drivers · -48dB Hybrid ANC · 48h Playtime',
    extendedDescription:
      'Designed for audiophiles, studio engineers, and frequent commuters, the SonicFlow Titanium Studio ANC combines custom 45mm beryllium-coated dynamic drivers with an acoustic dual-chamber housing. Its 6-microphone adaptive array continuously samples ambient noise up to 48,000 times per second, neutralizing jet engine rumble, office chatter, and city traffic by up to -48dB without introducing ear pressure.\n\nWith Sony LDAC 990kbps high-resolution wireless streaming, multipoint Bluetooth 5.4 pairing across laptop and phone simultaneously, and plush protein-leather memory foam earcups mounted on CNC-machined titanium yokes, it delivers all-day comfort and reference-grade clarity.',
    keyFeatures: [
      'Adaptive 6-Microphone Hybrid Active Noise Cancellation (-48dB depth)',
      'Hi-Res Audio Wireless Certified with LDAC 990kbps & AAC support',
      '48-Hour battery life with ANC on (65 hours standard) + 10-min USB-C fast charge for 8 hours playback',
      'Dual-device Multipoint Bluetooth 5.4 for seamless laptop-to-phone switching',
      'Spatial Audio with dynamic head tracking and customizable 10-band EQ',
      'Foldable CNC brushed titanium hinges with hard-shell travel case included',
    ],
    moreDetailsHighlights: [
      { label: 'Driver Unit', value: '45mm Custom Beryllium-Coated Dynamic' },
      { label: 'Frequency Response', value: '8 Hz – 40,000 Hz (Hi-Res Certified)' },
      { label: 'Bluetooth Codec', value: 'LDAC, aptX Adaptive, AAC, SBC' },
      { label: 'Battery Capacity', value: '850mAh Li-Polymer (Up to 65h Max)' },
      { label: 'Weight & Build', value: '268g · Grade-5 Titanium Yokes + Memory Foam' },
      { label: 'In the Box', value: 'Headphones, Hard Case, USB-C Cable, 3.5mm Aux Cable' },
    ],
    proBuyerTips:
      'Enable LDAC in your phone Bluetooth settings for full 24-bit/96kHz lossless studio soundstage.',
  },
  prod_atlas_titanium_watch: {
    productId: 'prod_atlas_titanium_watch',
    enhancedTagline: 'Aerospace Grade-5 Titanium · 2000-Nit Sapphire AMOLED · 14-Day Battery',
    extendedDescription:
      'Built to endure extreme environments while looking refined in the boardroom, the Atlas Ultra 49mm features a corrosion-resistant Grade-5 titanium bezel protecting a flat sapphire crystal display rated at 2,000 nits peak brightness. Dual-frequency L1 + L5 satellite positioning locks onto your exact route through dense urban canyons or mountain trails.\n\nEquipped with continuous ECG heart rhythm analysis, blood oxygen (SpO2) altitude monitoring, depth gauge up to 100 meters (EN13319 dive certified), and up to 14 days of battery autonomy on a single magnetic fast charge.',
    keyFeatures: [
      '49mm Aerospace Grade-5 Titanium chassis with flat scratch-proof Sapphire Crystal',
      'Dual-Frequency L1 + L5 precision GPS with offline topographic trail maps',
      '100m water resistance (EN13319 dive computer certified up to 40m recreational diving)',
      '24/7 Biometric Suite: ECG, SpO2, Skin Temperature, HRV recovery, and Sleep Stage tracking',
      'Dedicated programmable Action Button for instant workout, waypoint, or siren trigger',
      'Up to 14 days standard battery life (48 hours continuous dual-band GPS mode)',
    ],
    moreDetailsHighlights: [
      { label: 'Case Material', value: 'Aerospace Grade-5 Titanium + Ceramic Back' },
      { label: 'Display', value: '1.92" LTPO AMOLED (502×410 px, 2000 Nits)' },
      { label: 'Water Resistance', value: '10 ATM / 100 Meters + EN13319 Dive Rated' },
      { label: 'Positioning', value: 'Dual-Band L1+L5 GPS, GLONASS, Galileo, BeiDou' },
      { label: 'Battery Runtime', value: '14 Days Typical / 60h Low-Power GPS' },
      { label: 'In the Box', value: 'Atlas Ultra Watch, Braided Alpine Strap, Fast Magnetic Puck' },
    ],
    proBuyerTips:
      'Works seamlessly with both Android and iOS via the companion health app with instant WhatsApp and call notifications.',
  },
  prod_cinemax_fold_4k: {
    productId: 'prod_cinemax_fold_4k',
    enhancedTagline: '1/1.3" CMOS 4K/60fps HDR · 3-Axis Mechanical Gimbal · 38-Min Flight',
    extendedDescription:
      'Weighing under 249 grams for hassle-free travel, the CineMax Fold 4K packs a flagship 1/1.3-inch quad-Bayer CMOS sensor with a wide f/1.7 aperture capable of capturing true 10-bit D-Log M and 4K/60fps HDR aerial footage. Its 3-axis mechanical gimbal rotates 90 degrees for true vertical 4K social reels without cropping.\n\nTri-directional millimeter-wave and binocular vision sensors actively detect obstacles in real time, while the O4 digital transmission system delivers a rock-solid 1080p/60fps live feed up to 12 kilometers away.',
    keyFeatures: [
      'Ultralight sub-249g foldable carbon-composite airframe with Level-5 wind resistance',
      'True Vertical Shooting mode (90° rotating gimbal) for lossless 4K reels & shorts',
      'Omnidirectional binocular vision obstacle avoidance + ActiveTrack 360° subject following',
      '12km Full-HD 1080p/60fps low-latency live video transmission',
      '38-minute flight time per intelligent battery (Fly More Combo includes 2 batteries)',
      'Automated GPS Return-to-Home (RTH) on low battery or signal loss',
    ],
    moreDetailsHighlights: [
      { label: 'Camera Sensor', value: '1/1.3" CMOS · 48MP Stills · f/1.7 Aperture' },
      { label: 'Video Resolution', value: '4K @ 60fps HDR / 2.7K @ 120fps Slow-Mo' },
      { label: 'Gimbal System', value: '3-Axis Mechanical (Tilt, Roll, Pan) + 90° Vertical' },
      { label: 'Max Flight Time', value: '38 Mins per Battery (Windless Sea Level)' },
      { label: 'Takeoff Weight', value: '248g (Ultralight Travel Class)' },
      { label: 'In the Box', value: 'Drone, RC Controller, 2× Batteries, Charging Hub, Case' },
    ],
    proBuyerTips:
      'Calibrate the compass once before your first outdoor flight and engage Cine mode for ultra-smooth cinematic panning.',
  },
};

export function getDefaultEnrichedDetails(
  productId: string,
  title: string,
  category: string,
  description: string,
  specs: string[]
): EnrichedProductDetails {
  if (INITIAL_ENRICHED_DESCRIPTIONS[productId]) {
    return INITIAL_ENRICHED_DESCRIPTIONS[productId];
  }
  return {
    productId,
    enhancedTagline: `${category} Flagship · Official BuyKit Mall Guarantee · Islandwide Express`,
    extendedDescription: `${description}\n\nEngineered with high-grade components and tested for long-term durability in Sri Lankan climate conditions, ${title} comes complete with full retail packaging, official store warranty coverage, and priority dispatch from your nearest BuyKit hub.`,
    keyFeatures: [
      ...specs,
      'Precision-engineered internal components for reliable daily performance',
      'Energy-efficient operation with multi-stage surge and thermal protection',
      'Backed by 1-Year Official BuyKit Mall Warranty and 14-Day Easy Returns',
    ],
    moreDetailsHighlights: [
      { label: 'Department', value: category },
      { label: 'Build Quality', value: 'Flagship Retail Grade · Factory QC Verified' },
      { label: 'Warranty Coverage', value: '1-Year Official Store Warranty' },
      { label: 'Shipping & COD', value: 'Free Express Delivery · Cash on Delivery Eligible' },
      { label: 'Package Contents', value: 'Main Unit, Official Accessories, User Manual & Warranty Card' },
      { label: 'Return Policy', value: '14-Day Hassle-Free Buyer Protection' },
    ],
    proBuyerTips:
      'Combine with an active BuyKit LKR coupon on this page or at checkout to maximize your total savings.',
  };
}

export async function runPromotionAgent(params: {
  campaignTheme: string;
  productTitle: string;
  category: string;
  dealPrice: number;
  originalPrice: number;
  generateAiPoster?: boolean;
  fallbackImageUrl?: string;
}): Promise<Omit<PromotionalPosterCampaign, 'id' | 'productId' | 'dealPrice' | 'originalPrice' | 'createdAt'>> {
  const res = await fetch('/api/agents/promotion', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error('Failed to generate promotional campaign.');
  }
  return res.json();
}

export async function runSalesAgent(params: {
  saleName: string;
  discountPercent: number;
  dealTier: DealTier;
  productTitle: string;
  currentPrice: number;
  originalPrice: number;
  isNewProduct?: boolean;
}): Promise<{
  saleBannerTitle: string;
  dealLabel: string;
  animatedRibbonText: string;
  creativeTagline: string;
  urgencyHighlight: string;
  computedSalePrice: number;
  originalPrice: number;
  discountPercent: number;
}> {
  const res = await fetch('/api/agents/sales', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error('Failed to generate creative sale campaign.');
  }
  return res.json();
}

export async function runDescriptionAgent(params: {
  productTitle: string;
  category: string;
  adminNotes: string;
  adminSpecs: string[];
}): Promise<Omit<EnrichedProductDetails, 'productId'>> {
  const res = await fetch('/api/agents/description', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  if (!res.ok) {
    throw new Error('Failed to enrich product description with Google Search.');
  }
  return res.json();
}
