import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import crypto from 'crypto';
import dotenv from 'dotenv';
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
    }

    res.status(200).send('OK');
  } catch (error: unknown) {
    console.error('PayHere webhook error:', error);
    res.status(500).send('Webhook error');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
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
