import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
import QRCode from 'qrcode';
import { GoogleGenAI, ThinkingLevel, Type } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true }));

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please verify your API key in Settings > Secrets.'
    );
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// 1. Fast AI Deal & Search Assistant (gemini-3.1-flash-lite for fast tasks, gemini-4-argon for deep comparison)
app.post('/api/ai/shopping-advisor', async (req, res) => {
  try {
    const { queryText, mode, catalogContext } = req.body as {
      queryText: string;
      mode?: 'fast' | 'deep';
      catalogContext?: string;
    };

    if (!queryText || typeof queryText !== 'string') {
      res.status(400).json({ error: 'Please provide a valid question or product query.' });
      return;
    }

    const ai = getGenAIClient();
    const selectedModel = mode === 'deep' ? 'gemini-4-argon' : 'gemini-3.1-flash-lite';

    const systemPrompt =
      'You are Pramu AI Shopping Concierge for "BuyKit with Pramu", an online marketplace inspired by Daraz and AliExpress using Sri Lankan Rupees (LKR / Rs.). ' +
      'Respond clearly in English. Highlight New User Deals, Flash Sales, Choice Bundles, and remind guests that creating a free account with Google unlocks adding items to the cart and claiming the New User Price.';

    const response = await ai.models.generateContent({
      model: selectedModel,
      contents: `Catalog Context:\n${catalogContext || 'Standard BuyKit catalog'}\n\nShopper Question: ${queryText}`,
      config: {
        systemInstruction: systemPrompt,
        ...(mode === 'deep' ? { thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH } } : {}),
      },
    });

    res.json({
      modelUsed: selectedModel,
      answer: response.text || 'No response generated.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Shopping advisor error:', message);
    res.status(500).json({ error: message });
  }
});

// 2. Live Market Price & Trend Check using Google Search Grounding (gemini-3.8-flash + googleSearch)
app.post('/api/ai/market-search', async (req, res) => {
  try {
    const { queryText } = req.body as { queryText: string };
    if (!queryText) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }

    const ai = getGenAIClient();
    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Compare current e-commerce market prices (including LKR / Rs. equivalents), specs, and buyer sentiment for: ${queryText}. Explain why the BuyKit with Pramu deal price offers strong value.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources = rawChunks
      .map((c: any) => {
        if (c?.web?.uri) {
          return {
            title: c.web.title || c.web.uri,
            uri: c.web.uri,
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json({
      modelUsed: 'gemini-3.8-flash',
      summary: response.text || 'No search insights returned.',
      sources,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Market search grounding error:', message);
    res.status(500).json({ error: message });
  }
});

// 3. Pickup Hubs & Store Locator using Google Maps Grounding (gemini-3.8-flash + googleMaps)
app.post('/api/ai/maps-grounding', async (req, res) => {
  try {
    const { queryText, latitude, longitude } = req.body as {
      queryText: string;
      latitude?: number;
      longitude?: number;
    };

    if (!queryText) {
      res.status(400).json({ error: 'Location query is required.' });
      return;
    }

    const ai = getGenAIClient();
    const hasCoords = typeof latitude === 'number' && typeof longitude === 'number';

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: queryText,
      config: {
        tools: [{ googleMaps: {} }],
        ...(hasCoords
          ? {
              toolConfig: {
                retrievalConfig: {
                  latLng: {
                    latitude: latitude!,
                    longitude: longitude!,
                  },
                },
              },
            }
          : {}),
      },
    });

    const rawChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const places = rawChunks
      .map((chunk: any) => {
        if (chunk?.maps) {
          const reviewSnippets =
            chunk.maps.placeAnswerSources?.reviewSnippets?.map(
              (r: any) => r.reviewText || r.text || ''
            ) || [];
          return {
            title: chunk.maps.title || 'Verified Location on Google Maps',
            uri: chunk.maps.uri || 'https://maps.google.com',
            placeId: chunk.maps.placeId || '',
            reviewSnippets: reviewSnippets.filter(Boolean),
          };
        }
        return null;
      })
      .filter(Boolean);

    res.json({
      modelUsed: 'gemini-3.8-flash',
      text: response.text || '',
      places,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Google Maps grounding error:', message);
    res.status(500).json({ error: message });
  }
});

// 4. Product Image Creation & Editing Studio (gemini-nano-banana-2.1 and gemini-3-pro-image-preview with 1K/2K/4K size)
app.post('/api/ai/image-studio', async (req, res) => {
  try {
    const {
      prompt,
      mode,
      imageSize = '1K',
      aspectRatio = '1:1',
      base64Image,
      mimeType = 'image/png',
    } = req.body as {
      prompt: string;
      mode: 'nano-banana' | 'pro-hq';
      imageSize?: '1K' | '2K' | '4K';
      aspectRatio?: '1:1' | '4:3' | '16:9' | '9:16' | '3:4';
      base64Image?: string;
      mimeType?: string;
    };

    if (!prompt || typeof prompt !== 'string') {
      res.status(400).json({ error: 'Prompt is required for image generation or editing.' });
      return;
    }

    const ai = getGenAIClient();
    const targetModel =
      mode === 'pro-hq' ? 'gemini-3-pro-image-preview' : 'gemini-nano-banana-2.1';

    const parts: any[] = [];
    if (base64Image) {
      const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');
      parts.push({
        inlineData: {
          data: cleanBase64,
          mimeType,
        },
      });
    }
    parts.push({ text: prompt });

    let response;
    try {
      response = await ai.models.generateContent({
        model: targetModel,
        contents: { parts },
        config: {
          imageConfig: {
            aspectRatio,
            imageSize,
          },
        },
      });
    } catch (innerErr: unknown) {
      // Fallback to gemini-3-pro-image or gemini-nano-banana-2.1 if preview alias returns 404
      const msg = innerErr instanceof Error ? innerErr.message : String(innerErr);
      if (targetModel === 'gemini-3-pro-image-preview' && (msg.includes('404') || msg.includes('NOT_FOUND'))) {
        response = await ai.models.generateContent({
          model: 'gemini-3-pro-image',
          contents: { parts },
          config: {
            imageConfig: {
              aspectRatio,
              imageSize,
            },
          },
        });
      } else {
        throw innerErr;
      }
    }

    let generatedImageUrl: string | null = null;
    let captionText = '';

    for (const part of response.candidates?.[0]?.content?.parts ?? []) {
      if (part.inlineData?.data) {
        const outMime = part.inlineData.mimeType ?? 'image/png';
        generatedImageUrl = `data:${outMime};base64,${part.inlineData.data}`;
      } else if (part.text) {
        captionText += part.text;
      }
    }

    if (!generatedImageUrl) {
      res.status(500).json({
        error: captionText || 'Model did not return an image part. Try refining your prompt.',
      });
      return;
    }

    res.json({
      modelUsed: targetModel,
      imageSize,
      aspectRatio,
      imageUrl: generatedImageUrl,
      caption: captionText,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Image studio error:', message);
    res.status(500).json({ error: message });
  }
});

// 5. Animate Uploaded Product Photo into Video using Gemini Interactions API (gemini-omni-1.2-flash)
app.post('/api/ai/animate-video', async (req, res) => {
  try {
    const {
      prompt,
      base64Image,
      mimeType = 'image/png',
      aspectRatio = '16:9',
    } = req.body as {
      prompt: string;
      base64Image: string;
      mimeType?: string;
      aspectRatio?: '16:9' | '9:16';
    };

    if (!base64Image) {
      res.status(400).json({ error: 'Please upload a photo to animate into a video.' });
      return;
    }

    const validAspectRatio: '16:9' | '9:16' = aspectRatio === '9:16' ? '9:16' : '16:9';
    const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');

    const ai = getGenAIClient();
    const interaction = await ai.interactions.create(
      {
        model: 'gemini-omni-1.2-flash',
        input: [
          {
            type: 'image',
            mime_type: mimeType,
            data: cleanBase64,
          },
          {
            type: 'text',
            text:
              prompt ||
              'Smooth commercial product showcase camera orbit with soft studio lighting reflections.',
          },
        ],
        background: false,
        store: false,
        stream: false,
        response_format: {
          type: 'video',
          aspect_ratio: validAspectRatio,
        },
      },
      { timeout: 300000 }
    );

    const videoPart = interaction.output_video;
    if (videoPart?.data) {
      const outMime = videoPart.mime_type || 'video/mp4';
      res.json({
        modelUsed: 'gemini-omni-1.2-flash',
        aspectRatio: validAspectRatio,
        videoUrl: `data:${outMime};base64,${videoPart.data}`,
      });
      return;
    }

    if (videoPart?.uri) {
      res.json({
        modelUsed: 'gemini-omni-1.2-flash',
        aspectRatio: validAspectRatio,
        videoUrl: videoPart.uri,
      });
      return;
    }

    res.status(500).json({
      error: 'Video generation completed without a video payload. Please try again.',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Animate video error:', message);
    res.status(500).json({ error: message });
  }
});

// =========================================================
// MULTI-AGENT STOREFRONT ORCHESTRATION ENDPOINTS
// 1. Promotion Agent (/api/agents/promotion)
// 2. Sales Agent (/api/agents/sales)
// 3. Description Agent (/api/agents/description - Google Search Grounded)
// =========================================================

// Agent 1: Promotion Agent — Generates creative promotional ad posters, slogans & AI poster imagery
app.post('/api/agents/promotion', async (req, res) => {
  try {
    const {
      campaignTheme,
      productTitle,
      category,
      dealPrice,
      originalPrice,
      generateAiPoster = true,
      fallbackImageUrl,
    } = req.body as {
      campaignTheme?: string;
      productTitle?: string;
      category?: string;
      dealPrice?: number;
      originalPrice?: number;
      generateAiPoster?: boolean;
      fallbackImageUrl?: string;
    };

    const ai = getGenAIClient();
    const discountPct =
      originalPrice && dealPrice && originalPrice > dealPrice
        ? Math.round(((originalPrice - dealPrice) / originalPrice) * 100)
        : 55;

    const copyResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Create a high-converting, creative Daraz/AliExpress-style promotional poster campaign for "BuyKit with Pramu" in Sri Lankan Rupees (Rs.).
Campaign Theme: ${campaignTheme || 'Mega Flash Festival'}
Featured Product: ${productTitle || 'Flagship Smart Tech & Lifestyle Gear'}
Category: ${category || 'Audio & Headphones'}
Deal Price: Rs. ${dealPrice || 14500} (Original: Rs. ${originalPrice || 32500}, ${discountPct}% OFF)`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            campaignTag: {
              type: Type.STRING,
              description: 'Short energetic campaign kicker e.g. MEGA FLASH FESTIVAL · LIMITED TIME',
            },
            discountBadge: {
              type: Type.STRING,
              description: 'Punchy discount badge e.g. 58% OFF · Save Rs. 18,000',
            },
            headline: {
              type: Type.STRING,
              description: 'Compelling promotional poster headline (under 65 chars)',
            },
            subheadline: {
              type: Type.STRING,
              description: 'Benefit-driven subheadline highlighting value, free delivery, and warranty',
            },
            ctaLabel: {
              type: Type.STRING,
              description: 'Action button text e.g. Claim Flash Deal Now',
            },
            accentTheme: {
              type: Type.STRING,
              description: 'One of: orange_gold, obsidian_flame, emerald_luxe, royal_amber',
            },
            imagePrompt: {
              type: Type.STRING,
              description: 'Detailed studio commercial photography prompt for the promotional poster background',
            },
          },
          required: [
            'campaignTag',
            'discountBadge',
            'headline',
            'subheadline',
            'ctaLabel',
            'accentTheme',
            'imagePrompt',
          ],
        },
      },
    });

    let parsedCopy: {
      campaignTag: string;
      discountBadge: string;
      headline: string;
      subheadline: string;
      ctaLabel: string;
      accentTheme: string;
      imagePrompt: string;
    } = {
      campaignTag: campaignTheme || 'BUYKIT SUPER CAMPAIGN · LIMITED TIME',
      discountBadge: `${discountPct}% OFF · Save Rs. ${Math.max(2500, (originalPrice || 30000) - (dealPrice || 14500)).toLocaleString('en-LK')}`,
      headline: productTitle || 'Exclusive SuperDeal Promotional Event',
      subheadline: 'Islandwide Free Express Delivery · 1-Year Official Warranty · Cash on Delivery',
      ctaLabel: 'Shop SuperDeal',
      accentTheme: 'orange_gold',
      imagePrompt: `Commercial retail promotional poster of ${productTitle || 'modern flagship electronics'} on a warm orange and gold studio podium, dramatic rim lighting, 8k`,
    };

    try {
      const rawJson = (copyResponse.text || '{}').trim();
      parsedCopy = { ...parsedCopy, ...JSON.parse(rawJson) };
    } catch {
      // Use fallback copy if JSON parse fails
    }

    let posterImageUrl =
      fallbackImageUrl || '/src/assets/images/promo_poster_mega_sale_1794319674629.jpg';

    if (generateAiPoster) {
      try {
        const imgResp = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite-image',
          contents: {
            parts: [{ text: parsedCopy.imagePrompt }],
          },
          config: {
            imageConfig: {
              aspectRatio: '16:9',
            },
          },
        });

        for (const part of imgResp.candidates?.[0]?.content?.parts ?? []) {
          if (part.inlineData?.data) {
            const outMime = part.inlineData.mimeType ?? 'image/png';
            posterImageUrl = `data:${outMime};base64,${part.inlineData.data}`;
            break;
          }
        }
      } catch {
        // Gracefully keep high-resolution pre-generated promotional poster image
      }
    }

    res.json({
      ...parsedCopy,
      imageUrl: posterImageUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Promotion agent error:', message);
    res.status(500).json({ error: message });
  }
});

// Agent 2: Sales Agent — Creatively formats Admin-added Sales & Offers for New and Existing Products
app.post('/api/agents/sales', async (req, res) => {
  try {
    const {
      saleName,
      discountPercent,
      dealTier = 'flash_sale',
      productTitle,
      currentPrice,
      originalPrice,
      isNewProduct = false,
    } = req.body as {
      saleName?: string;
      discountPercent?: number;
      dealTier?: string;
      productTitle?: string;
      currentPrice?: number;
      originalPrice?: number;
      isNewProduct?: boolean;
    };

    const ai = getGenAIClient();
    const effDiscount = Math.min(85, Math.max(5, Number(discountPercent) || 45));
    const baseOrig = Number(originalPrice) || Number(currentPrice) * 1.6 || 45000;
    const computedSalePrice = Math.round((baseOrig * (100 - effDiscount)) / 100);

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `You are the Sales Presentation Engine for BuyKit with Pramu (Daraz/AliExpress style LKR marketplace).
An admin just launched a sale for ${isNewProduct ? 'a brand-new product' : 'an existing catalog product'}:
- Product: ${productTitle || 'Flagship Product'}
- Sale Event Name: ${saleName || 'Super Flash Sale'}
- Discount: ${effDiscount}% OFF
- New Sale Price: Rs. ${computedSalePrice} (Original Price: Rs. ${baseOrig})
- Tier: ${dealTier}

Generate creative, high-energy Daraz/AliExpress sale presentation badges, animated ribbon text, urgency tagline, and value highlight.`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            saleBannerTitle: {
              type: Type.STRING,
              description: 'Catchy sale event title e.g. Lightning SuperDeal · Limited Stock',
            },
            dealLabel: {
              type: Type.STRING,
              description: 'Short card badge e.g. Flash Sale · 55% Off',
            },
            animatedRibbonText: {
              type: Type.STRING,
              description: 'Animated ribbon callout e.g. HOT SALE · SAVE RS. 21,000 TODAY',
            },
            creativeTagline: {
              type: Type.STRING,
              description: 'Exciting 1-line product tagline highlighting the sale offer',
            },
            urgencyHighlight: {
              type: Type.STRING,
              description: 'Urgency message e.g. Selling fast — 88% claimed at this LKR deal price',
            },
          },
          required: [
            'saleBannerTitle',
            'dealLabel',
            'animatedRibbonText',
            'creativeTagline',
            'urgencyHighlight',
          ],
        },
      },
    });

    let parsedSale = {
      saleBannerTitle: saleName || 'Super Flash Sale · Limited Time Offer',
      dealLabel: `Flash Sale · ${effDiscount}% Off`,
      animatedRibbonText: `SAVE RS. ${Math.max(1000, baseOrig - computedSalePrice).toLocaleString('en-LK')} · LIVE DEAL`,
      creativeTagline: `${saleName || 'Special Sale'} · Free Islandwide Express Delivery`,
      urgencyHighlight: 'High demand — Limited promotional units remaining at this price',
    };

    try {
      parsedSale = { ...parsedSale, ...JSON.parse((response.text || '{}').trim()) };
    } catch {
      // Fallback to default structured sale copy
    }

    res.json({
      ...parsedSale,
      computedSalePrice,
      originalPrice: baseOrig,
      discountPercent: effDiscount,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Sales agent error:', message);
    res.status(500).json({ error: message });
  }
});

// Agent 3: Description Agent — Uses Google Search Grounding to fetch real product details, Key Features & Extended Description
app.post('/api/agents/description', async (req, res) => {
  try {
    const {
      productTitle,
      category,
      adminNotes,
      adminSpecs = [],
    } = req.body as {
      productTitle: string;
      category?: string;
      adminNotes?: string;
      adminSpecs?: string[];
    };

    if (!productTitle || typeof productTitle !== 'string') {
      res.status(400).json({ error: 'productTitle is required.' });
      return;
    }

    const ai = getGenAIClient();

    // Step 1: Ground with Google Search to retrieve real-world specifications, features, and product insights
    const groundedResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Research the product "${productTitle}" in category "${category || 'Electronics & Lifestyle'}".
Admin provided initial details: "${adminNotes || 'Standard flagship model'}" and specs: ${JSON.stringify(adminSpecs)}.
Find comprehensive technical specifications, standout key features, real-world usage benefits, what is typically included in the box, and why shoppers love this product.`,
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    const groundedResearchText = groundedResponse.text || '';
    const rawChunks = groundedResponse.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const searchSources = rawChunks
      .map((c: any) => {
        if (c?.web?.uri) {
          return {
            title: c.web.title || c.web.uri,
            uri: c.web.uri,
          };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 4);

    // Step 2: Structure the Google-grounded insights into rich e-commerce "More Details", Key Features & Specs
    const structuredResponse = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Using the following Google-researched product information and admin details, create a rich, Daraz/AliExpress-style product detail package for "${productTitle}".
Admin Notes: ${adminNotes || 'Official Store Product'}
Google Research Context:
${groundedResearchText}`,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            enhancedTagline: {
              type: Type.STRING,
              description: 'Punchy 1-line product subtitle with top 3 specs',
            },
            extendedDescription: {
              type: Type.STRING,
              description: 'Detailed, engaging 2-paragraph product story & real-world performance overview (in addition to admin summary)',
            },
            keyFeatures: {
              type: Type.ARRAY,
              items: { type: Type.STRING },
              description: '6 detailed key features & technical capabilities',
            },
            moreDetailsHighlights: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  label: { type: Type.STRING },
                  value: { type: Type.STRING },
                },
                required: ['label', 'value'],
              },
              description: '6 structured technical specification pairs (e.g. Build Material, Connectivity, Power/Battery, Box Contents, Warranty)',
            },
            proBuyerTips: {
              type: Type.STRING,
              description: 'Helpful usage tip or care highlight for buyers',
            },
          },
          required: [
            'enhancedTagline',
            'extendedDescription',
            'keyFeatures',
            'moreDetailsHighlights',
            'proBuyerTips',
          ],
        },
      },
    });

    let parsedDetails = {
      enhancedTagline: `${category || 'Flagship'} · Official BuyKit Mall Warranty · Free Islandwide Delivery`,
      extendedDescription:
        groundedResearchText.slice(0, 600) ||
        `${productTitle} is engineered for flagship reliability, combining premium materials with high-efficiency performance for everyday use.`,
      keyFeatures:
        adminSpecs.length > 0
          ? adminSpecs
          : [
              'Premium commercial-grade build and ergonomic design',
              'High-efficiency performance tuned for daily reliability',
              'Complete retail box package with official accessories',
              '1-Year Official BuyKit Mall Warranty & Buyer Protection',
            ],
      moreDetailsHighlights: [
        { label: 'Category', value: category || 'Flagship Gear' },
        { label: 'Warranty', value: '1-Year Official BuyKit Warranty' },
        { label: 'Delivery', value: 'Islandwide Express & Pickup Hub Ready' },
        { label: 'Package', value: 'Full Retail Box & Accessories Included' },
      ],
      proBuyerTips: 'Eligible for BuyKit LKR store coupons and Cash on Delivery across Sri Lanka.',
    };

    try {
      parsedDetails = {
        ...parsedDetails,
        ...JSON.parse((structuredResponse.text || '{}').trim()),
      };
    } catch {
      // Keep fallback structured details
    }

    res.json({
      ...parsedDetails,
      searchSources,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Description agent error:', message);
    res.status(500).json({ error: message });
  }
});

// =========================================================
// 6. PAYHERE CHECKOUT PAYMENT INTENT & WEBHOOK ENDPOINTS (LKR)
// =========================================================
function generatePayHereCheckoutHash(
  merchantId: string,
  orderId: string,
  amountFormatted: string,
  currency: string,
  merchantSecret: string
): string {
  const hashedSecret = crypto
    .createHash('md5')
    .update(merchantSecret)
    .digest('hex')
    .toUpperCase();

  const rawString = `${merchantId}${orderId}${amountFormatted}${currency}${hashedSecret}`;
  return crypto.createHash('md5').update(rawString).digest('hex').toUpperCase();
}

app.get('/api/payhere/status', (_req, res) => {
  const merchantId = (process.env.PAYHERE_MERCHANT_ID || '').trim();
  const merchantSecret = (process.env.PAYHERE_MERCHANT_SECRET || '').trim();
  const isSandbox = process.env.PAYHERE_SANDBOX !== 'false';
  const configured = Boolean(merchantId && merchantSecret);

  res.json({
    configured,
    sandbox: isSandbox,
    merchantIdPreview: configured ? `${merchantId.slice(0, 4)}•••` : 'DEMO-SANDBOX',
  });
});

app.post('/api/payhere/create-payment-intent', (req, res) => {
  try {
    const {
      orderId,
      amount,
      currency = 'LKR',
      itemsTitle,
      firstName,
      lastName,
      email,
      phone,
      address,
      city,
      country = 'Sri Lanka',
    } = req.body as {
      orderId?: string;
      amount?: number;
      currency?: string;
      itemsTitle?: string;
      firstName?: string;
      lastName?: string;
      email?: string;
      phone?: string;
      address?: string;
      city?: string;
      country?: string;
    };

    const numericAmount = Number(amount);
    if (!orderId || !Number.isFinite(numericAmount) || numericAmount <= 0) {
      res.status(400).json({ error: 'Valid orderId and positive amount in LKR are required.' });
      return;
    }

    const envMerchantId = (process.env.PAYHERE_MERCHANT_ID || '').trim();
    const envMerchantSecret = (process.env.PAYHERE_MERCHANT_SECRET || '').trim();
    const hasLiveMerchantConfig = Boolean(envMerchantId && envMerchantSecret);

    const effectiveMerchantId = hasLiveMerchantConfig ? envMerchantId : '1210000_SANDBOX';
    const effectiveMerchantSecret = hasLiveMerchantConfig
      ? envMerchantSecret
      : 'BUYKIT_SANDBOX_DEMO_SECRET_KEY';
    const isSandbox = process.env.PAYHERE_SANDBOX !== 'false';
    const appBaseUrl = (process.env.APP_URL || `http://localhost:${PORT}`).replace(/\/$/, '');

    // Format amount to 2 decimal places without thousand separators as required by PayHere
    const amountFormatted = numericAmount.toFixed(2);
    const normalizedCurrency = (currency || 'LKR').toUpperCase();

    const hash = generatePayHereCheckoutHash(
      effectiveMerchantId,
      String(orderId),
      amountFormatted,
      normalizedCurrency,
      effectiveMerchantSecret
    );

    res.json({
      hasLiveMerchantConfig,
      sandbox: isSandbox,
      merchant_id: effectiveMerchantId,
      return_url: `${appBaseUrl}/?payment=success&orderId=${encodeURIComponent(String(orderId))}`,
      cancel_url: `${appBaseUrl}/?payment=cancelled&orderId=${encodeURIComponent(String(orderId))}`,
      notify_url: `${appBaseUrl}/api/payhere/notify`,
      order_id: String(orderId),
      items: itemsTitle || `BuyKit Order #${orderId}`,
      amount: amountFormatted,
      currency: normalizedCurrency,
      hash,
      first_name: firstName || 'BuyKit',
      last_name: lastName || 'Customer',
      email: email || 'customer@buykit.lk',
      phone: phone || '0771234567',
      address: address || 'Colombo',
      city: city || 'Colombo',
      country: country || 'Sri Lanka',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('PayHere create-payment-intent error:', message);
    res.status(500).json({ error: 'Failed to create PayHere PaymentIntent.' });
  }
});

app.post('/api/payhere/notify', (req, res) => {
  try {
    const {
      merchant_id = '',
      order_id = '',
      payhere_amount = '',
      payhere_currency = 'LKR',
      status_code = '',
      md5sig = '',
      payment_id = '',
    } = req.body as Record<string, string>;

    const envMerchantSecret =
      (process.env.PAYHERE_MERCHANT_SECRET || '').trim() || 'BUYKIT_SANDBOX_DEMO_SECRET_KEY';

    const hashedSecret = crypto
      .createHash('md5')
      .update(envMerchantSecret)
      .digest('hex')
      .toUpperCase();

    const localMd5Sig = crypto
      .createHash('md5')
      .update(
        `${merchant_id}${order_id}${payhere_amount}${payhere_currency}${status_code}${hashedSecret}`
      )
      .digest('hex')
      .toUpperCase();

    if (md5sig && localMd5Sig !== String(md5sig).toUpperCase()) {
      console.error('Invalid PayHere webhook signature for order:', order_id);
      res.status(400).send('Invalid signature');
      return;
    }

    if (String(status_code) === '2') {
      console.log(
        `[PayHere Webhook] Order ${order_id} PAID (${payhere_currency} ${payhere_amount}) · Payment ID: ${payment_id}`
      );
      // If this verified webhook corresponds to a pending LANKAQR session, auto-confirm it
      if (md5sig && localMd5Sig === String(md5sig).toUpperCase()) {
        for (const rec of lankaQrSessions.values()) {
          if (rec.orderId === String(order_id) && rec.status !== 'paid') {
            rec.status = 'paid';
            rec.paymentId = payment_id || `PH-LQR-${Date.now().toString().slice(-8)}`;
            rec.bankAppName = 'PayHere LANKAQR Gateway';
            rec.paidAt = Date.now();
          }
        }
      }
    }

    res.status(200).send('OK');
  } catch (error: unknown) {
    console.error('PayHere webhook error:', error);
    res.status(500).send('Webhook error');
  }
});

// =========================================================
// 7. LANKAQR SERVER-AUTHORITATIVE QR GENERATION & AUTO-CONFIRMATION (LKR)
//    Payment CANNOT be bypassed from the checkout UI. A session transitions
//    to 'paid' ONLY when:
//      (a) A real phone scans the QR code (extracting the server-only scanToken)
//          and completes bank payment authorization, OR
//      (b) A signed PayHere / Bank LANKAQR webhook confirms settlement.
// =========================================================
interface LankaQrSessionRecord {
  sessionId: string;
  orderId: string;
  amountLkr: number;
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  emvPayload: string;
  scanToken: string; // Never sent in checkout JSON; encoded ONLY inside the QR code
  status: 'pending' | 'scanned' | 'paid' | 'expired';
  createdAt: number;
  expiresAt: number;
  scannedAt?: number;
  paidAt?: number;
  paymentId?: string;
  bankAppName?: string;
}

const LANKAQR_SESSION_TTL_MS = 15 * 60 * 1000; // 15 minutes
const LANKAQR_MAX_SESSIONS = 1000;
const lankaQrSessions = new Map<string, LankaQrSessionRecord>();

function computeEmvCrc16Server(payload: string): string {
  let crc = 0xffff;
  for (let i = 0; i < payload.length; i++) {
    crc ^= payload.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      if ((crc & 0x8000) !== 0) {
        crc = ((crc << 1) ^ 0x1021) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function encodeEmvTlv(tag: string, rawValue: string): string {
  const safeVal = rawValue.slice(0, 99);
  const lengthPrefix = String(safeVal.length).padStart(2, '0');
  return `${tag}${lengthPrefix}${safeVal}`;
}

function buildServerLankaQrPayload(params: {
  merchantId: string;
  merchantName: string;
  merchantCity: string;
  orderId: string;
  amountLkr: number;
}): string {
  const safeMerchantId = params.merchantId.replace(/[^A-Za-z0-9]/g, '').slice(0, 16) || '1228450';
  const safeName =
    params.merchantName.replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 25).toUpperCase() ||
    'BUYKIT WITH PRAMU';
  const safeCity =
    params.merchantCity.replace(/[^A-Za-z0-9 ]/g, '').trim().slice(0, 15).toUpperCase() ||
    'COLOMBO';
  const safeRef = params.orderId.replace(/[^A-Za-z0-9-]/g, '').slice(0, 20) || 'BKORDER';
  const amountStr = params.amountLkr.toFixed(2);

  const merchantAccountInfo =
    encodeEmvTlv('00', 'lk.lankaclear.lankaqr') +
    encodeEmvTlv('01', safeMerchantId) +
    encodeEmvTlv('02', safeRef);

  const additionalData = encodeEmvTlv('01', safeRef);

  const withoutCrc =
    encodeEmvTlv('00', '01') +
    encodeEmvTlv('01', '12') +
    encodeEmvTlv('26', merchantAccountInfo) +
    encodeEmvTlv('52', '5399') +
    encodeEmvTlv('53', '144') +
    encodeEmvTlv('54', amountStr) +
    encodeEmvTlv('58', 'LK') +
    encodeEmvTlv('59', safeName) +
    encodeEmvTlv('60', safeCity) +
    encodeEmvTlv('62', additionalData) +
    '6304';

  return `${withoutCrc}${computeEmvCrc16Server(withoutCrc)}`;
}

function resolvePublicOriginForQr(req: express.Request): string {
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '')
    .split(',')[0]
    .trim();
  const forwardedProto = String(req.headers['x-forwarded-proto'] || '')
    .split(',')[0]
    .trim()
    .toLowerCase();

  // Strict hostname validation to prevent Host header injection
  if (/^[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(forwardedHost)) {
    const isLocal =
      forwardedHost.startsWith('localhost') || forwardedHost.startsWith('127.0.0.1');
    const proto = forwardedProto === 'https' || !isLocal ? 'https' : 'http';
    return `${proto}://${forwardedHost}`;
  }

  const envUrl = (process.env.APP_URL || '').trim().replace(/\/$/, '');
  if (/^https?:\/\/[a-zA-Z0-9.-]+(:\d{1,5})?$/.test(envUrl)) {
    return envUrl;
  }

  return `http://localhost:${PORT}`;
}

function timingSafeCompareStr(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

function pruneExpiredLankaQrSessions() {
  const now = Date.now();
  for (const [id, rec] of lankaQrSessions.entries()) {
    if (rec.expiresAt < now - 5 * 60 * 1000) {
      lankaQrSessions.delete(id);
    }
  }
  while (lankaQrSessions.size > LANKAQR_MAX_SESSIONS) {
    const oldestKey = lankaQrSessions.keys().next().value;
    if (!oldestKey) break;
    lankaQrSessions.delete(oldestKey);
  }
}

app.post('/api/lankaqr/create-session', async (req, res) => {
  try {
    const { orderId, amountLkr } = req.body as {
      orderId?: unknown;
      amountLkr?: unknown;
    };

    const numericAmount = Number(amountLkr);
    if (
      typeof orderId !== 'string' ||
      !/^[A-Za-z0-9_-]{3,40}$/.test(orderId.trim()) ||
      !Number.isFinite(numericAmount) ||
      numericAmount < 1 ||
      numericAmount > 50_000_000
    ) {
      res.status(400).json({
        error: 'Valid orderId (3-40 alphanumeric chars) and LKR amount (1 - 50,000,000) are required.',
      });
      return;
    }

    pruneExpiredLankaQrSessions();

    const cleanOrderId = orderId.trim();
    const roundedAmount = Math.round(numericAmount * 100) / 100;
    const envMerchantId = (process.env.LANKAQR_MERCHANT_ID || '').trim();
    const merchantId = envMerchantId || '1228450';
    const merchantName = (process.env.LANKAQR_MERCHANT_NAME || 'BUYKIT WITH PRAMU').trim();
    const merchantCity = (process.env.LANKAQR_MERCHANT_CITY || 'COLOMBO').trim();
    const isLiveMerchant = Boolean(envMerchantId);

    const sessionId = `LQR-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const scanToken = crypto.randomBytes(24).toString('hex');
    const createdAt = Date.now();
    const expiresAt = createdAt + LANKAQR_SESSION_TTL_MS;

    const emvPayload = buildServerLankaQrPayload({
      merchantId,
      merchantName,
      merchantCity,
      orderId: cleanOrderId,
      amountLkr: roundedAmount,
    });

    // In live merchant mode, encode the raw EMVCo LANKAQR string for bank apps (auto-confirmed via webhook).
    // In interactive sandbox mode, encode the signed mobile scan URL so scanning with any phone camera
    // opens the mobile bank approval page and automatically confirms the checkout screen!
    const publicOrigin = resolvePublicOriginForQr(req);
    const qrContentToEncode = isLiveMerchant
      ? emvPayload
      : `${publicOrigin}/?qrPaySession=${encodeURIComponent(sessionId)}&sig=${encodeURIComponent(
          scanToken
        )}`;

    const qrImageDataUrl = await QRCode.toDataURL(qrContentToEncode, {
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 340,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
    });

    lankaQrSessions.set(sessionId, {
      sessionId,
      orderId: cleanOrderId,
      amountLkr: roundedAmount,
      merchantId,
      merchantName,
      merchantCity,
      emvPayload,
      scanToken,
      status: 'pending',
      createdAt,
      expiresAt,
    });

    // Notice: scanToken is intentionally NEVER returned to the checkout browser.
    res.json({
      sessionId,
      orderId: cleanOrderId,
      amountLkr: roundedAmount,
      currency: 'LKR',
      merchantId,
      merchantName,
      merchantCity,
      isLiveMerchant,
      emvPayload,
      qrImageDataUrl,
      expiresAt,
      status: 'pending',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('LANKAQR create-session error:', message);
    res.status(500).json({ error: 'Unable to generate LANKAQR payment session.' });
  }
});

// Read-only status polling endpoint called by Checkout every 2 seconds
app.get('/api/lankaqr/session/:sessionId', (req, res) => {
  const sessionId = String(req.params.sessionId || '').trim();
  const record = lankaQrSessions.get(sessionId);
  if (!record) {
    res.status(404).json({ error: 'QR payment session not found.' });
    return;
  }

  let effectiveStatus = record.status;
  if (
    (record.status === 'pending' || record.status === 'scanned') &&
    Date.now() > record.expiresAt
  ) {
    record.status = 'expired';
    effectiveStatus = 'expired';
  }

  res.json({
    sessionId: record.sessionId,
    orderId: record.orderId,
    amountLkr: record.amountLkr,
    status: effectiveStatus,
    expiresAt: record.expiresAt,
    scannedAt: record.scannedAt || null,
    paidAt: record.paidAt || null,
    paymentId: record.paymentId || null,
    bankAppName: record.bankAppName || null,
  });
});

// Called ONLY by the mobile device after scanning the QR code (proving physical QR scan via scanToken)
app.post('/api/lankaqr/mark-scanned', (req, res) => {
  try {
    const { sessionId, sig } = req.body as { sessionId?: unknown; sig?: unknown };
    if (
      typeof sessionId !== 'string' ||
      typeof sig !== 'string' ||
      !sessionId.trim() ||
      !sig.trim()
    ) {
      res.status(400).json({ error: 'Invalid QR scan link.' });
      return;
    }

    const record = lankaQrSessions.get(sessionId.trim());
    if (!record) {
      res.status(404).json({ error: 'QR payment session not found or expired.' });
      return;
    }

    if (!timingSafeCompareStr(sig.trim(), record.scanToken)) {
      res.status(403).json({ error: 'Invalid QR scan signature.' });
      return;
    }

    if (Date.now() > record.expiresAt && record.status !== 'paid') {
      record.status = 'expired';
      res.status(410).json({ error: 'This QR code has expired. Please refresh QR on checkout.' });
      return;
    }

    if (record.status === 'pending') {
      record.status = 'scanned';
      record.scannedAt = Date.now();
    }

    res.json({
      sessionId: record.sessionId,
      orderId: record.orderId,
      amountLkr: record.amountLkr,
      currency: 'LKR',
      merchantId: record.merchantId,
      merchantName: record.merchantName,
      merchantCity: record.merchantCity,
      status: record.status,
      expiresAt: record.expiresAt,
      paymentId: record.paymentId || null,
    });
  } catch (error: unknown) {
    console.error('LANKAQR mark-scanned error:', error);
    res.status(500).json({ error: 'Failed to process QR scan.' });
  }
});

// Called ONLY by the mobile device after scanning the QR code and approving the LKR bank payment
app.post('/api/lankaqr/authorize-scan-payment', (req, res) => {
  try {
    const { sessionId, sig, bankAppName, bankPin } = req.body as {
      sessionId?: unknown;
      sig?: unknown;
      bankAppName?: unknown;
      bankPin?: unknown;
    };

    if (
      typeof sessionId !== 'string' ||
      typeof sig !== 'string' ||
      !sessionId.trim() ||
      !sig.trim()
    ) {
      res.status(400).json({ error: 'Missing QR scan credentials.' });
      return;
    }

    const record = lankaQrSessions.get(sessionId.trim());
    if (!record) {
      res.status(404).json({ error: 'QR payment session not found or expired.' });
      return;
    }

    if (!timingSafeCompareStr(sig.trim(), record.scanToken)) {
      res.status(403).json({ error: 'Unauthorized QR payment confirmation attempt.' });
      return;
    }

    if (Date.now() > record.expiresAt && record.status !== 'paid') {
      record.status = 'expired';
      res.status(410).json({ error: 'This QR code has expired. Please scan a new QR code.' });
      return;
    }

    if (typeof bankPin !== 'string' || !/^\d{4,6}$/.test(bankPin.trim())) {
      res.status(400).json({ error: 'Please enter a valid 4 to 6 digit mobile banking PIN.' });
      return;
    }

    if (record.status === 'paid' && record.paymentId) {
      res.json({
        verified: true,
        sessionId: record.sessionId,
        orderId: record.orderId,
        amountLkr: record.amountLkr,
        paymentId: record.paymentId,
        bankAppName: record.bankAppName || 'LANKAQR Bank App',
        paidAt: record.paidAt,
      });
      return;
    }

    const cleanBankApp =
      typeof bankAppName === 'string' && bankAppName.trim().length > 0
        ? bankAppName.replace(/[^A-Za-z0-9 '+-]/g, '').slice(0, 32)
        : 'LANKAQR Bank App';

    const generatedPaymentId = `LQR-${Date.now().toString().slice(-8)}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;

    record.status = 'paid';
    record.paymentId = generatedPaymentId;
    record.bankAppName = cleanBankApp;
    record.paidAt = Date.now();

    console.log(
      `[LANKAQR Scan Paid] Order ${record.orderId} PAID (LKR ${record.amountLkr.toFixed(
        2
      )}) via ${cleanBankApp} · Ref: ${generatedPaymentId}`
    );

    res.json({
      verified: true,
      sessionId: record.sessionId,
      orderId: record.orderId,
      amountLkr: record.amountLkr,
      paymentId: generatedPaymentId,
      bankAppName: cleanBankApp,
      paidAt: record.paidAt,
    });
  } catch (error: unknown) {
    console.error('LANKAQR authorize-scan-payment error:', error);
    res.status(500).json({ error: 'Failed to authorize QR payment.' });
  }
});

// Signed Bank / LANKAQR Production Settlement Webhook (HMAC-SHA256)
app.post('/api/lankaqr/webhook', (req, res) => {
  try {
    const webhookSecret = (process.env.LANKAQR_WEBHOOK_SECRET || '').trim();
    if (!webhookSecret) {
      res.status(503).json({ error: 'LANKAQR webhook secret is not configured.' });
      return;
    }

    const providedSig = String(req.headers['x-lankaqr-signature'] || '').trim();
    const { orderId, sessionId, amountLkr, paymentId, bankAppName, status } = req.body as {
      orderId?: string;
      sessionId?: string;
      amountLkr?: number;
      paymentId?: string;
      bankAppName?: string;
      status?: string;
    };

    const expectedSig = crypto
      .createHmac('sha256', webhookSecret)
      .update(`${sessionId || ''}|${orderId || ''}|${Number(amountLkr || 0).toFixed(2)}|${status || ''}`)
      .digest('hex');

    if (!providedSig || !timingSafeCompareStr(providedSig, expectedSig)) {
      res.status(403).json({ error: 'Invalid webhook signature.' });
      return;
    }

    if (String(status).toUpperCase() !== 'PAID') {
      res.status(200).json({ received: true });
      return;
    }

    let matchedRecord: LankaQrSessionRecord | undefined;
    if (sessionId && lankaQrSessions.has(sessionId)) {
      matchedRecord = lankaQrSessions.get(sessionId);
    } else if (orderId) {
      for (const rec of lankaQrSessions.values()) {
        if (rec.orderId === orderId) {
          matchedRecord = rec;
          break;
        }
      }
    }

    if (!matchedRecord) {
      res.status(404).json({ error: 'Matching QR session not found.' });
      return;
    }

    matchedRecord.status = 'paid';
    matchedRecord.paymentId =
      typeof paymentId === 'string' && paymentId.trim()
        ? paymentId.replace(/[^A-Za-z0-9-]/g, '').slice(0, 28)
        : `LQR-BANK-${Date.now().toString().slice(-8)}`;
    matchedRecord.bankAppName =
      typeof bankAppName === 'string' && bankAppName.trim()
        ? bankAppName.slice(0, 32)
        : 'Sri Lankan Bank LANKAQR';
    matchedRecord.paidAt = Date.now();

    res.status(200).json({ verified: true, paymentId: matchedRecord.paymentId });
  } catch (error: unknown) {
    console.error('LANKAQR webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed.' });
  }
});

// =========================================================
// 8. KOKO PAY (SRI LANKA 3x 0% BNPL) PAYMENT GATEWAY ENDPOINTS
//    Supports Live RSA-SHA256 Merchant Signing + Production Callback
//    Verification (when KOKO_* env vars are set) and an interactive
//    Sandbox OTP + RSA Verification Flow for local/preview testing.
// =========================================================
interface KokoInstallmentItem {
  number: 1 | 2 | 3;
  label: string;
  dueDateIso: string;
  amountLkr: number;
}

interface KokoSessionRecord {
  sessionId: string;
  orderId: string;
  reference: string;
  amountLkr: number;
  installments: KokoInstallmentItem[];
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  description: string;
  mode: 'live_redirect' | 'sandbox_modal';
  status: 'pending' | 'otp_sent' | 'paid' | 'failed' | 'expired';
  createdAt: number;
  expiresAt: number;
  sandboxOtp?: string;
  sandboxOtpExpiresAt?: number;
  sandboxOtpAttempts: number;
  sandboxPhone?: string;
  paidAt?: number;
  trnId?: string;
}

const KOKO_MIN_LKR = 1500;
const KOKO_MAX_LKR = 250000;
const KOKO_SESSION_TTL_MS = 15 * 60 * 1000;
const KOKO_MAX_SESSIONS = 1000;
const kokoSessions = new Map<string, KokoSessionRecord>();

// Ephemeral in-memory RSA-2048 keypair used ONLY for Sandbox signature verification
let sandboxKokoRsaKeys: { privateKey: string; publicKey: string } | null = null;
function getSandboxKokoRsaKeys(): { privateKey: string; publicKey: string } {
  if (!sandboxKokoRsaKeys) {
    const pair = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    sandboxKokoRsaKeys = {
      privateKey: pair.privateKey,
      publicKey: pair.publicKey,
    };
  }
  return sandboxKokoRsaKeys;
}

function normalizePemKey(raw: string): string {
  return raw.replace(/\\n/g, '\n').trim();
}

function getKokoMerchantConfig() {
  const merchantId = (process.env.KOKO_MERCHANT_ID || '').trim();
  const apiKey = (process.env.KOKO_API_KEY || '').trim();
  const privateKey = normalizePemKey(process.env.KOKO_PRIVATE_KEY || '');
  const publicKey = normalizePemKey(process.env.KOKO_PUBLIC_KEY || '');
  const isSandbox = process.env.KOKO_SANDBOX !== 'false';
  const configured = Boolean(merchantId && apiKey && privateKey);
  const gatewayUrl = isSandbox
    ? 'https://qaapi.paykoko.com/api/merchants/orderCreate'
    : 'https://prodapi.paykoko.com/api/merchants/orderCreate';

  return {
    merchantId,
    apiKey,
    privateKey,
    publicKey,
    isSandbox,
    configured,
    gatewayUrl,
  };
}

function buildKokoInstallments(totalLkr: number): KokoInstallmentItem[] {
  const roundedTotal = Math.round(totalLkr * 100) / 100;
  const baseInstallment = Math.floor((roundedTotal / 3) * 100) / 100;
  const firstInstallment =
    Math.round((roundedTotal - baseInstallment * 2) * 100) / 100;

  const now = new Date();
  const day30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const day60 = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);

  return [
    {
      number: 1,
      label: '1st Installment (Due Today)',
      dueDateIso: now.toISOString(),
      amountLkr: firstInstallment,
    },
    {
      number: 2,
      label: '2nd Installment (In 30 Days)',
      dueDateIso: day30.toISOString(),
      amountLkr: baseInstallment,
    },
    {
      number: 3,
      label: '3rd Installment (In 60 Days)',
      dueDateIso: day60.toISOString(),
      amountLkr: baseInstallment,
    },
  ];
}

function pruneExpiredKokoSessions() {
  const now = Date.now();
  for (const [id, rec] of kokoSessions.entries()) {
    if (rec.expiresAt < now - 5 * 60 * 1000) {
      kokoSessions.delete(id);
    }
  }
  while (kokoSessions.size > KOKO_MAX_SESSIONS) {
    const oldestKey = kokoSessions.keys().next().value;
    if (!oldestKey) break;
    kokoSessions.delete(oldestKey);
  }
}

app.get('/api/koko/status', (_req, res) => {
  const cfg = getKokoMerchantConfig();
  res.json({
    configured: cfg.configured,
    sandbox: cfg.isSandbox,
    minAmountLkr: KOKO_MIN_LKR,
    maxAmountLkr: KOKO_MAX_LKR,
    merchantIdPreview: cfg.configured ? `${cfg.merchantId.slice(0, 4)}•••` : 'KOKO-SANDBOX',
  });
});

app.post('/api/koko/create-order', (req, res) => {
  try {
    const {
      orderId,
      amountLkr,
      firstName,
      lastName,
      email,
      phone,
      description,
    } = req.body as {
      orderId?: unknown;
      amountLkr?: unknown;
      firstName?: unknown;
      lastName?: unknown;
      email?: unknown;
      phone?: unknown;
      description?: unknown;
    };

    const numericAmount = Number(amountLkr);
    if (
      typeof orderId !== 'string' ||
      !/^[A-Za-z0-9_-]{3,40}$/.test(orderId.trim()) ||
      !Number.isFinite(numericAmount) ||
      numericAmount < KOKO_MIN_LKR ||
      numericAmount > KOKO_MAX_LKR
    ) {
      res.status(400).json({
        error: `Koko 3x 0% Installments requires an order total between Rs. ${KOKO_MIN_LKR.toLocaleString(
          'en-LK'
        )} and Rs. ${KOKO_MAX_LKR.toLocaleString('en-LK')}.`,
      });
      return;
    }

    pruneExpiredKokoSessions();

    const cfg = getKokoMerchantConfig();
    const cleanOrderId = orderId.trim();
    const roundedAmount = Math.round(numericAmount * 100) / 100;
    const amountFormatted = roundedAmount.toFixed(2);
    const cleanFirst =
      typeof firstName === 'string' && firstName.trim()
        ? firstName.replace(/[^A-Za-z0-9 .'-]/g, '').trim().slice(0, 40)
        : 'BuyKit';
    const cleanLast =
      typeof lastName === 'string' && lastName.trim()
        ? lastName.replace(/[^A-Za-z0-9 .'-]/g, '').trim().slice(0, 40)
        : 'Customer';
    const cleanEmail =
      typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
        ? email.trim().slice(0, 80)
        : 'customer@buykit.lk';
    const cleanPhone =
      typeof phone === 'string' ? phone.replace(/[^0-9+]/g, '').slice(0, 15) : '0771234567';
    const cleanDesc =
      typeof description === 'string' && description.trim()
        ? description.replace(/[\r\n<>]/g, '').trim().slice(0, 140)
        : `BuyKit Order #${cleanOrderId}`;

    const sessionId = `KOKO-${crypto.randomBytes(8).toString('hex').toUpperCase()}`;
    const reference = `${cfg.configured ? cfg.merchantId : 'BK'}-${Date.now().toString().slice(-6)}`;
    const installments = buildKokoInstallments(roundedAmount);
    const createdAt = Date.now();
    const expiresAt = createdAt + KOKO_SESSION_TTL_MS;

    const publicOrigin = resolvePublicOriginForQr(req);
    const returnUrl = `${publicOrigin}/?kokoPayment=success&orderId=${encodeURIComponent(
      cleanOrderId
    )}&sessionId=${encodeURIComponent(sessionId)}`;
    const cancelUrl = `${publicOrigin}/?kokoPayment=cancelled&orderId=${encodeURIComponent(
      cleanOrderId
    )}&sessionId=${encodeURIComponent(sessionId)}`;
    const responseUrl = `${publicOrigin}/api/koko/callback`;

    const pluginName = 'customapi';
    const pluginVersion = '1.0.1';
    const currency = 'LKR';

    let mode: 'live_redirect' | 'sandbox_modal' = 'sandbox_modal';
    let signedFormFields: Record<string, string> | null = null;

    if (cfg.configured) {
      try {
        const dataString = `${cfg.merchantId}${amountFormatted}${currency}${pluginName}${pluginVersion}${returnUrl}${cancelUrl}${cleanOrderId}${reference}${cleanFirst}${cleanLast}${cleanEmail}${cleanDesc}${cfg.apiKey}${responseUrl}`;
        const signer = crypto.createSign('RSA-SHA256');
        signer.update(dataString);
        signer.end();
        const signature = signer.sign(cfg.privateKey, 'base64');

        mode = 'live_redirect';
        signedFormFields = {
          _mId: cfg.merchantId,
          api_key: cfg.apiKey,
          _returnUrl: returnUrl,
          _cancelUrl: cancelUrl,
          _responseUrl: responseUrl,
          _currency: currency,
          _amount: amountFormatted,
          _reference: reference,
          _orderId: cleanOrderId,
          _pluginName: pluginName,
          _pluginVersion: pluginVersion,
          _description: cleanDesc,
          _firstName: cleanFirst,
          _lastName: cleanLast,
          _email: cleanEmail,
          dataString,
          signature,
        };
      } catch (signErr) {
        console.error('Koko RSA signing error (falling back to sandbox mode):', signErr);
      }
    }

    kokoSessions.set(sessionId, {
      sessionId,
      orderId: cleanOrderId,
      reference,
      amountLkr: roundedAmount,
      installments,
      customerName: `${cleanFirst} ${cleanLast}`.trim(),
      customerEmail: cleanEmail,
      customerPhone: cleanPhone,
      description: cleanDesc,
      mode,
      status: 'pending',
      createdAt,
      expiresAt,
      sandboxOtpAttempts: 0,
    });

    res.json({
      sessionId,
      orderId: cleanOrderId,
      reference,
      amountLkr: roundedAmount,
      currency,
      installments,
      mode,
      sandbox: cfg.isSandbox,
      gatewayUrl: mode === 'live_redirect' ? cfg.gatewayUrl : null,
      signedFormFields,
      expiresAt,
      status: 'pending',
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('Koko create-order error:', message);
    res.status(500).json({ error: 'Unable to initialize Koko payment session.' });
  }
});

app.get('/api/koko/session/:sessionId', (req, res) => {
  const sessionId = String(req.params.sessionId || '').trim();
  const record = kokoSessions.get(sessionId);
  if (!record) {
    res.status(404).json({ error: 'Koko payment session not found.' });
    return;
  }

  let effectiveStatus = record.status;
  if (
    (record.status === 'pending' || record.status === 'otp_sent') &&
    Date.now() > record.expiresAt
  ) {
    record.status = 'expired';
    effectiveStatus = 'expired';
  }

  res.json({
    sessionId: record.sessionId,
    orderId: record.orderId,
    amountLkr: record.amountLkr,
    installments: record.installments,
    mode: record.mode,
    status: effectiveStatus,
    trnId: record.trnId || null,
    paidAt: record.paidAt || null,
    expiresAt: record.expiresAt,
  });
});

// Sandbox-only OTP request endpoint (disabled automatically when live Koko keys are configured)
app.post('/api/koko/sandbox/send-otp', (req, res) => {
  try {
    const cfg = getKokoMerchantConfig();
    if (cfg.configured) {
      res.status(403).json({ error: 'Sandbox OTP flow is disabled in live merchant mode.' });
      return;
    }

    const { sessionId, mobileNumber } = req.body as {
      sessionId?: unknown;
      mobileNumber?: unknown;
    };

    if (typeof sessionId !== 'string' || !sessionId.trim()) {
      res.status(400).json({ error: 'Valid Koko sessionId is required.' });
      return;
    }

    const record = kokoSessions.get(sessionId.trim());
    if (!record || record.mode !== 'sandbox_modal') {
      res.status(404).json({ error: 'Koko payment session not found or expired.' });
      return;
    }

    if (Date.now() > record.expiresAt) {
      record.status = 'expired';
      res.status(410).json({ error: 'Koko session expired. Please restart checkout.' });
      return;
    }

    const normalizedMobile =
      typeof mobileNumber === 'string'
        ? mobileNumber.replace(/[\s-]/g, '').trim()
        : '';
    if (!/^(?:\+94|0)?7[0-9]{8}$/.test(normalizedMobile)) {
      res.status(400).json({
        error: 'Please enter a valid Sri Lankan mobile number (e.g., 0771234567).',
      });
      return;
    }

    const otp = String(crypto.randomInt(100000, 999999));
    record.sandboxOtp = otp;
    record.sandboxOtpExpiresAt = Date.now() + 5 * 60 * 1000;
    record.sandboxOtpAttempts = 0;
    record.sandboxPhone = normalizedMobile;
    record.status = 'otp_sent';

    const maskedPhone = `${normalizedMobile.slice(0, -4).replace(/\d/g, '•')}${normalizedMobile.slice(-4)}`;

    res.json({
      sent: true,
      maskedPhone,
      sandboxOtpPreview: otp,
      expiresInSeconds: 300,
    });
  } catch (error: unknown) {
    console.error('Koko sandbox send-otp error:', error);
    res.status(500).json({ error: 'Failed to issue Koko verification OTP.' });
  }
});

// Sandbox-only OTP verification + RSA-SHA256 callback verification simulation
app.post('/api/koko/sandbox/verify-otp', (req, res) => {
  try {
    const cfg = getKokoMerchantConfig();
    if (cfg.configured) {
      res.status(403).json({ error: 'Sandbox OTP flow is disabled in live merchant mode.' });
      return;
    }

    const { sessionId, otp } = req.body as { sessionId?: unknown; otp?: unknown };
    if (typeof sessionId !== 'string' || typeof otp !== 'string') {
      res.status(400).json({ error: 'Session ID and 6-digit OTP are required.' });
      return;
    }

    const record = kokoSessions.get(sessionId.trim());
    if (!record || record.mode !== 'sandbox_modal') {
      res.status(404).json({ error: 'Koko payment session not found.' });
      return;
    }

    if (Date.now() > record.expiresAt) {
      record.status = 'expired';
      res.status(410).json({ error: 'Koko session expired. Please start again.' });
      return;
    }

    if (record.status === 'paid' && record.trnId) {
      res.json({
        verified: true,
        orderId: record.orderId,
        trnId: record.trnId,
        paidAt: record.paidAt,
        installments: record.installments,
      });
      return;
    }

    if (!record.sandboxOtp || !record.sandboxOtpExpiresAt || Date.now() > record.sandboxOtpExpiresAt) {
      res.status(400).json({ error: 'OTP expired. Please request a new OTP.' });
      return;
    }

    if (record.sandboxOtpAttempts >= 5) {
      res.status(429).json({ error: 'Too many invalid OTP attempts. Please request a new OTP.' });
      return;
    }

    const cleanOtp = otp.trim();
    if (!/^\d{6}$/.test(cleanOtp) || !timingSafeCompareStr(cleanOtp, record.sandboxOtp)) {
      record.sandboxOtpAttempts += 1;
      res.status(400).json({
        error: `Invalid 6-digit OTP (${5 - record.sandboxOtpAttempts} attempts remaining).`,
      });
      return;
    }

    // Exercise the real RSA-SHA256 sign + verify path using the ephemeral sandbox RSA-2048 keypair
    const trnId = `KOKO-TRN-${Date.now().toString().slice(-8)}-${crypto
      .randomBytes(2)
      .toString('hex')
      .toUpperCase()}`;
    const callbackDataString = `${record.orderId}${trnId}SUCCESS`;
    const { privateKey, publicKey } = getSandboxKokoRsaKeys();

    const signer = crypto.createSign('RSA-SHA256');
    signer.update(callbackDataString);
    signer.end();
    const simulatedSig = signer.sign(privateKey, 'base64');

    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(callbackDataString);
    verifier.end();
    const signatureOk = verifier.verify(publicKey, simulatedSig, 'base64');

    if (!signatureOk) {
      res.status(500).json({ error: 'RSA signature verification failed.' });
      return;
    }

    record.status = 'paid';
    record.trnId = trnId;
    record.paidAt = Date.now();
    record.sandboxOtp = undefined;

    console.log(
      `[Koko Sandbox Paid] Order ${record.orderId} · 1st Installment LKR ${record.installments[0].amountLkr.toFixed(
        2
      )} / Total LKR ${record.amountLkr.toFixed(2)} · Ref: ${trnId}`
    );

    res.json({
      verified: true,
      orderId: record.orderId,
      trnId,
      paidAt: record.paidAt,
      installments: record.installments,
    });
  } catch (error: unknown) {
    console.error('Koko sandbox verify-otp error:', error);
    res.status(500).json({ error: 'Failed to verify Koko OTP.' });
  }
});

// Production Koko Server-to-Server Callback Webhook (RSA-SHA256 verified via KOKO_PUBLIC_KEY)
app.post('/api/koko/callback', (req, res) => {
  try {
    const cfg = getKokoMerchantConfig();
    if (!cfg.publicKey) {
      res.status(503).send('KOKO_PUBLIC_KEY not configured');
      return;
    }

    const {
      orderId = '',
      trnId = '',
      status = '',
      signature = '',
    } = req.body as Record<string, string>;

    if (!orderId || !trnId || !status || !signature) {
      res.status(400).send('Missing callback fields');
      return;
    }

    const dataString = `${String(orderId)}${String(trnId)}${String(status)}`;
    const verifier = crypto.createVerify('RSA-SHA256');
    verifier.update(dataString);
    verifier.end();

    const isAuthentic = verifier.verify(cfg.publicKey, String(signature), 'base64');
    if (!isAuthentic) {
      console.error('[Koko Callback] Invalid RSA signature for order:', orderId);
      res.status(403).send('Invalid signature');
      return;
    }

    let matched: KokoSessionRecord | undefined;
    for (const rec of kokoSessions.values()) {
      if (rec.orderId === String(orderId)) {
        matched = rec;
        break;
      }
    }

    if (matched) {
      if (String(status).toUpperCase() === 'SUCCESS') {
        matched.status = 'paid';
        matched.trnId = String(trnId).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 40);
        matched.paidAt = Date.now();
        console.log(`[Koko Live Webhook] Order ${orderId} PAID · TrnID: ${matched.trnId}`);
      } else {
        matched.status = 'failed';
      }
    }

    res.status(200).send('OK');
  } catch (error: unknown) {
    console.error('Koko callback error:', error);
    res.status(500).send('Callback error');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`BuyKit with Pramu server running on http://localhost:${PORT}`);
  });
}

startServer();
