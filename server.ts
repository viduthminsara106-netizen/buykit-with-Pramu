import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

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
