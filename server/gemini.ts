import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db';

let aiClient: GoogleGenAI | null = null;

const TEMPORARY_GEMINI_MESSAGE = 'EcoAI is temporarily busy. Please try again in a moment.';
const MAX_GEMINI_RETRIES = 3;

function localizedTemporaryMessage(language: GeminiLanguage = 'EN'): string {
  if (language === 'HI') return 'EcoAI अभी व्यस्त है। कृपया थोड़ी देर बाद फिर प्रयास करें।';
  if (language === 'TE') return 'EcoAI ప్రస్తుతం బిజీగా ఉంది. దయచేసి కొద్దిసేపటి తర్వాత ప్రయత్నించండి.';
  return TEMPORARY_GEMINI_MESSAGE;
}

class GeminiTemporaryError extends Error {
  readonly temporary = true;

  constructor(language: GeminiLanguage = 'EN') {
    super(localizedTemporaryMessage(language));
    this.name = 'GeminiTemporaryError';
  }
}

function getGeminiErrorDetails(error: unknown): { status?: number | string; text: string } {
  const candidate = error as any;
  const status = candidate?.status ?? candidate?.statusCode ?? candidate?.response?.status;
  const text = [candidate?.message, candidate?.code, candidate?.status, candidate?.error?.message]
    .filter((value) => value !== undefined && value !== null)
    .join(' ')
    .toLowerCase();
  return { status, text };
}

function isGeminiAuthenticationError(error: unknown): boolean {
  const { status, text } = getGeminiErrorDetails(error);
  return (
    status === 400 ||
    status === 401 ||
    status === 403 ||
    text.includes('api_key_invalid') ||
    text.includes('api key not valid') ||
    text.includes('invalid api key') ||
    text.includes('authentication') ||
    text.includes('unauthorized')
  );
}

function isGeminiTemporaryError(error: unknown): boolean {
  const { status, text } = getGeminiErrorDetails(error);
  const numericStatus = typeof status === 'string' ? Number(status) : status;
  return (
    numericStatus === 429 ||
    (typeof numericStatus === 'number' && numericStatus >= 500 && numericStatus <= 599) ||
    text.includes('resource_exhausted') ||
    text.includes('quota') ||
    text.includes('unavailable') ||
    text.includes('temporarily') ||
    text.includes('timeout') ||
    text.includes('timed out') ||
    text.includes('econnreset') ||
    text.includes('fetch failed')
  );
}

async function withGeminiRetries<T>(operation: () => Promise<T>, language: GeminiLanguage = 'EN'): Promise<T> {
  for (let retry = 0; ; retry += 1) {
    try {
      return await operation();
    } catch (error) {
      if (isGeminiAuthenticationError(error) || !isGeminiTemporaryError(error)) {
        throw error;
      }
      if (retry >= MAX_GEMINI_RETRIES) {
        throw new GeminiTemporaryError(language);
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * 2 ** retry));
    }
  }
}

function getApiKey(): string | null {
  const rawKey =
    process.env.GEMINI_API_KEY ||
    process.env.VITE_GEMINI_API_KEY ||
    process.env.API_KEY;
  if (!rawKey) return null;
  const cleaned = rawKey.trim().replace(/^["']|["']$/g, '');
  return cleaned.length > 0 ? cleaned : null;
}

function getGenAI(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY is not set in environment.');
    return null;
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

export interface WasteAnalysisResult {
  material: string;
  category: string;
  material_type: string;
  confidence: number;
  estimated_weight: number | null;
  weight_range_kg?: string | null;
  recyclable: boolean;
  recyclability_status:
    | 'Highly Recyclable'
    | 'Recyclable'
    | 'Conditionally Recyclable'
    | 'Special Disposal Required'
    | 'Not Recyclable'
    | 'Requires Separation';
  best_for: string;
  estimated_value: number | null;
  value_text?: string;
  disposal_instruction: string;
  current_rate_per_kg: number | null;
  detected_items: string[];
  requires_verification: boolean;
  reason?: string;
  is_unidentifiable?: boolean;
}

type GeminiLanguage = 'EN' | 'HI' | 'TE';

function normalizeLanguage(language?: string): GeminiLanguage {
  return language === 'HI' || language === 'TE' ? language : 'EN';
}

function languageInstruction(language: GeminiLanguage): string {
  const selected = language === 'HI' ? 'Hindi (Devanagari)' : language === 'TE' ? 'Telugu script' : 'English';
  return `The selected app language is ${selected}. Respond in the user's dominant language. Understand and naturally handle mixed Hindi-English or Telugu-English. If the user explicitly asks for another language, follow that request. For structured output, keep JSON property names in English but translate every user-facing string value into the response language.`;
}

function getUnverifiedAnalysis(language: GeminiLanguage, reason?: string): WasteAnalysisResult {
  const copy = {
    EN: {
      material: 'Mixed Scrap / Unverified Waste', category: 'Mixed Waste', materialType: 'Unclassified Scrap',
      weight: 'Requires verification at pickup', value: 'Requires material separation / pickup verification', bestFor: 'Kabadiwala / Scrap Collection',
      disposal: 'Segregate materials into dry/metal/plastic bins or request doorstep inspection.', item: 'Scrap Material',
      reason: reason || 'AI vision processing failed. Manual verification required.',
    },
    HI: {
      material: 'मिश्रित स्क्रैप / सत्यापन रहित कचरा', category: 'मिश्रित कचरा', materialType: 'अवर्गीकृत स्क्रैप',
      weight: 'पिकअप के समय सत्यापन आवश्यक', value: 'सामग्री अलग करना / पिकअप सत्यापन आवश्यक', bestFor: 'कबाड़ीवाला / स्क्रैप संग्रह',
      disposal: 'कचरे को सूखे, धातु और प्लास्टिक डिब्बों में अलग करें या घर पर निरीक्षण का अनुरोध करें।', item: 'स्क्रैप सामग्री',
      reason: reason || 'AI विज़न प्रक्रिया विफल हुई। मैन्युअल सत्यापन आवश्यक है।',
    },
    TE: {
      material: 'మిశ్రమ స్క్రాప్ / ధృవీకరించని వ్యర్థం', category: 'మిశ్రమ వ్యర్థం', materialType: 'వర్గీకరించని స్క్రాప్',
      weight: 'పికప్ సమయంలో ధృవీకరణ అవసరం', value: 'పదార్థాలను వేరు చేయడం / పికప్ ధృవీకరణ అవసరం', bestFor: 'కబాడీవాలా / స్క్రాప్ సేకరణ',
      disposal: 'వ్యర్థాలను పొడి, లోహం మరియు ప్లాస్టిక్ బిన్‌లలో వేరు చేయండి లేదా ఇంటి తనిఖీని అభ్యర్థించండి.', item: 'స్క్రాప్ పదార్థం',
      reason: reason || 'AI విజన్ ప్రక్రియ విఫలమైంది. మాన్యువల్ ధృవీకరణ అవసరం.',
    },
  }[language];

  return {
    material: copy.material, category: copy.category, material_type: copy.materialType, confidence: 0.5,
    estimated_weight: null, weight_range_kg: copy.weight, recyclable: true,
    recyclability_status: 'Requires Separation', best_for: copy.bestFor, estimated_value: null,
    value_text: copy.value, disposal_instruction: copy.disposal, current_rate_per_kg: null,
    detected_items: [copy.item], requires_verification: true, reason: copy.reason, is_unidentifiable: false,
  };
}

export async function analyzeWasteImage(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  language: GeminiLanguage = 'EN'
): Promise<WasteAnalysisResult> {
  const responseLanguage = normalizeLanguage(language);
  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '');
  const ai = getGenAI();

  // Current materials and prices for context
  const materials = db.getMaterials();
  const materialsContext = materials
    .map((m) => `${m.material_name} (${m.category}): ₹${m.current_price_per_kg}/kg`)
    .join(', ');

  if (!ai) {
    // Graceful unverified result if GEMINI_API_KEY is not configured (NEVER DEFAULT TO PET BOTTLE)
    console.warn('[Gemini] GEMINI_API_KEY not set. Returning unverified inspection result.');
    return getUnverifiedAnalysis(responseLanguage, responseLanguage === 'EN'
      ? 'AI key not configured. Physical inspection required at pickup.'
      : responseLanguage === 'HI'
      ? 'AI कुंजी कॉन्फ़िगर नहीं है। पिकअप पर भौतिक निरीक्षण आवश्यक है।'
      : 'AI కీ కాన్ఫిగర్ కాలేదు. పికప్ సమయంలో భౌతిక తనిఖీ అవసరం.');
  }

  try {
    const prompt = `You are EcoScan AI, an expert waste identification and scrap material appraisal vision engine for India.
Analyze the ENTIRE uploaded image thoroughly before assigning any classification.

  ${languageInstruction(responseLanguage)}

Current scrap mandi benchmark rates in India: [${materialsContext}].

ROBUST CLASSIFICATION & SAFETY RULES:
1. Examine all objects and materials across the ENTIRE image field.
2. Detect whether the image contains single or multiple materials:
   - PET bottles (Polyethylene Terephthalate, e.g. transparent water/soda bottles)
   - HDPE plastic (High-Density Polyethylene, e.g. milk jugs, shampoo bottles)
   - PP plastic (Polypropylene, e.g. food containers, bottle caps)
   - Cardboard / Paper (Kraft boxes, newspapers)
   - Glass (beer, wine, sauce bottles)
   - Aluminium (beverage cans, foil)
   - Steel / Metal (heavy iron rods, saria, metal mesh, scrap pieces)
   - E-Waste (circuit boards, copper wiring, electronic components)
   - Organic waste (food peels, garden waste)
   - Mixed Waste / Mixed Scrap (containing multiple significantly different materials like metal pieces, wires, plastic fragments, mesh, etc.)
   - Other / Unknown
3. CRITICAL: If the image contains a pile, bundle, or mix of multiple distinct materials (e.g. metal pieces, wires, plastic fragments, mesh), you MUST classify it as "Mixed Scrap" with category "Mixed Waste". NEVER call mixed scrap or metal pieces a "Plastic PET Beverage Bottle".
4. CONFIDENCE: Provide an accurate confidence decimal between 0.00 and 1.00.
   - If confidence is low (< 0.45), or image is blurry, pitch black, or ambiguous, set is_unidentifiable: true, confidence: confidence, and reason: "Unable to confidently identify the waste. Please upload a clearer image."
5. WEIGHT ESTIMATION:
   - For a single item (e.g., 1 PET bottle), estimate realistic weight (e.g. 0.03 kg) and set weight_range_kg: "0.02 - 0.05 kg".
   - For multiple items or a pile of scrap where exact scale/quantity cannot be visually determined, DO NOT invent a fake exact weight. Set estimated_weight: null, requires_verification: true, and weight_range_kg: "Requires verification at pickup".
6. PRICE CALCULATION:
   - If material is specific and weight is estimated, calculate value = weight * current_rate_per_kg.
   - If material is mixed scrap or scale is unknown, set current_rate_per_kg: null, estimated_value: null, and value_text: "Requires material separation / pickup verification".
   - Clearly mark all prices as ESTIMATES.

Respond strictly in JSON matching the schema.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const generateImageRequest = () => ai.models.generateContent({
      model: 'gemini-3.7-flash',
      contents: { parts: [imagePart, { text: prompt }] },
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            material: { type: Type.STRING },
            category: { type: Type.STRING },
            material_type: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            estimated_weight: { type: Type.NUMBER },
            weight_range_kg: { type: Type.STRING },
            recyclable: { type: Type.BOOLEAN },
            recyclability_status: { type: Type.STRING },
            best_for: { type: Type.STRING },
            disposal_instruction: { type: Type.STRING },
            detected_items: { type: Type.ARRAY, items: { type: Type.STRING } },
            requires_verification: { type: Type.BOOLEAN },
            reason: { type: Type.STRING },
            is_unidentifiable: { type: Type.BOOLEAN },
          },
          required: [
            'material',
            'category',
            'confidence',
            'recyclable',
            'disposal_instruction',
            'detected_items',
          ],
        },
      },
    });

    const response = (await withGeminiRetries(() => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Gemini API call timed out after 8 seconds')), 8000)
      );
      return Promise.race([generateImageRequest(), timeoutPromise]);
    }, responseLanguage)) as any;

    const jsonText = response.text || '{}';
    const parsed = JSON.parse(jsonText);

    const isLowConfidence = parsed.is_unidentifiable || (parsed.confidence !== undefined && parsed.confidence < 0.45);

    if (isLowConfidence) {
      return {
        material: 'Unidentified / Ambiguous Waste',
        category: 'Other',
        material_type: 'Unknown',
        confidence: Number((parsed.confidence || 0.3).toFixed(2)),
        estimated_weight: null,
        weight_range_kg: 'Requires verification at pickup',
        recyclable: false,
        recyclability_status: 'Not Recyclable',
        best_for: 'Verification Required',
        estimated_value: null,
        value_text: 'Rate unavailable',
        current_rate_per_kg: null,
        disposal_instruction:
          parsed.reason || 'Unable to confidently identify the waste. Please upload a clearer image.',
        detected_items: [],
        requires_verification: true,
        reason: 'Unable to confidently identify the waste. Please upload a clearer image.',
        is_unidentifiable: true,
      };
    }

    // Match with current dynamic scrap rate from database
    const categoryLower = (parsed.category || '').toLowerCase();
    const materialLower = (parsed.material || '').toLowerCase();
    const isMixed =
      categoryLower.includes('mixed') ||
      materialLower.includes('mixed') ||
      (Array.isArray(parsed.detected_items) && parsed.detected_items.length > 2);

    const matchedMat = materials.find((m) =>
      materialLower.includes(m.material_name.toLowerCase())
    ) || materials.find((m) => m.category.toLowerCase() === categoryLower);

    const currentRate = matchedMat ? matchedMat.current_price_per_kg : null;
    const isWeightEstimated = typeof parsed.estimated_weight === 'number' && parsed.estimated_weight > 0;
    const estWeight = isWeightEstimated ? Number(parsed.estimated_weight.toFixed(2)) : null;
    const estValue = estWeight && currentRate ? Number((estWeight * currentRate).toFixed(2)) : null;

    const weightRange =
      parsed.weight_range_kg ||
      (estWeight ? `~${estWeight} kg` : 'Requires verification at pickup');

    const valueText = estValue !== null
      ? `₹${estValue.toFixed(2)} (Estimated)`
      : isMixed
      ? 'Requires material separation / pickup verification'
      : currentRate !== null
      ? 'Weight verification required'
      : 'Rate unavailable';

    const recStatus =
      parsed.recyclability_status ||
      (isMixed
        ? 'Requires Separation'
        : parsed.recyclable
        ? categoryLower.includes('metal')
          ? 'Highly Recyclable'
          : 'Recyclable'
        : 'Not Recyclable');

    const bestFor =
      parsed.best_for ||
      (isMixed
        ? 'Kabadiwala / Scrap Collection'
        : parsed.recyclable
        ? 'Recycling'
        : 'Home / City Composting');

    return {
      material: isMixed ? 'Mixed Scrap' : parsed.material || 'Scrap Material',
      category: isMixed ? 'Mixed Waste' : parsed.category || 'Other',
      material_type: parsed.material_type || (isMixed ? 'Mixed Scrap' : 'General Scrap'),
      confidence: Number(Math.min(0.99, Math.max(0.45, parsed.confidence || 0.85)).toFixed(2)),
      estimated_weight: estWeight,
      weight_range_kg: weightRange,
      recyclable: Boolean(parsed.recyclable),
      recyclability_status: recStatus as any,
      best_for: bestFor,
      current_rate_per_kg: currentRate,
      estimated_value: estValue,
      value_text: valueText,
      disposal_instruction:
        parsed.disposal_instruction ||
        'Segregate cleanly in designated stream or request doorstep kabadiwala verification.',
      detected_items:
        Array.isArray(parsed.detected_items) && parsed.detected_items.length > 0
          ? parsed.detected_items
          : [parsed.material || 'Scrap Material'],
      requires_verification: Boolean(parsed.requires_verification || isMixed || !estWeight),
      reason: parsed.reason,
      is_unidentifiable: false,
    };
  } catch (error) {
    const temporaryFailure = error instanceof GeminiTemporaryError;
    console.error('[Gemini] Vision identification error:', {
      temporary: temporaryFailure,
      status: getGeminiErrorDetails(error).status,
    });
    // REMOVE HARDCODED PET BOTTLE FALLBACK. Return unverified mixed scrap result.
    return getUnverifiedAnalysis(responseLanguage, temporaryFailure
      ? responseLanguage === 'EN'
        ? TEMPORARY_GEMINI_MESSAGE
        : responseLanguage === 'HI'
        ? 'EcoAI अभी व्यस्त है। कृपया थोड़ी देर बाद फिर प्रयास करें।'
        : 'EcoAI ప్రస్తుతం బిజీగా ఉంది. దయచేసి కొద్దిసేపటి తర్వాత ప్రయత్నించండి.'
      : undefined);
  }
}

export async function askEcoAiChat(
  userQuestion: string,
  history?: { role: 'user' | 'model'; text: string }[],
  language: GeminiLanguage = 'EN'
): Promise<string> {
  const responseLanguage = normalizeLanguage(language);
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY environment variable is not configured. Please create a .env file in your project root folder and set GEMINI_API_KEY=your_actual_api_key.');
  }

  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });

  try {
    const materials = db.getMaterials();
    const ratesSummary = materials
      .map((m) => `${m.material_name}: ₹${m.current_price_per_kg}/kg`)
      .join(', ');

    const systemPrompt = `You are EcoAI, a friendly, warm, intelligent, and highly capable general-purpose conversational AI assistant for EcoScan IN (India's premier waste intelligence, recycling, and scrap material appraisal startup).

  ${languageInstruction(responseLanguage)}

CRITICAL BEHAVIORAL DIRECTIVES:
1. Conversational AI Capabilities: You are a REAL general-purpose conversational AI assistant. You can converse naturally about anything: greetings (hello, hi, hey, good morning), casual conversation, jokes, general knowledge, math, technology, lifestyle, science, or general questions.
2. Sustainability & Waste Expertise: When questions touch on waste, recycling, scrap prices, 4-bin segregation (BBMP / CPCB rules), doorstep kabadiwala collection, or EcoScan features, provide expert, practical Indian environmental guidance. Reference current benchmark rates when helpful (e.g. Cardboard ₹14/kg, Millberry Copper ₹500+/kg, Heavy Iron ₹30/kg, PET Bottles ₹12/kg).
3. Conversational Context & Memory: You must use the provided conversation history to maintain context. If the user refers to items, quantities, or topics mentioned in earlier messages (e.g., User: "I have 5kg cardboard", User: "How much can I earn?"), understand that "How much" refers to the 5kg cardboard from the previous message and compute the estimate (5kg × ₹14/kg = ₹70).
4. Emojis & Tone: Be polite, encouraging, natural, and helpful. Use friendly emojis (e.g. 👋, ♻️, 🌿, 💡, ✨) naturally. Keep responses concise and easy to read (generally under 150 words unless detailed explanation is requested).
5. Never behave like a rigid FAQ bot or refuse general questions. Respond intelligently and conversationally to whatever the user asks.`;

    // Sanitize and structure history turns for Gemini API
    const rawHistory = Array.isArray(history) ? history.slice(-10) : [];
    const contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = [];

    for (const item of rawHistory) {
      if (!item || !item.text || !item.text.trim()) continue;
      const role = item.role === 'user' ? 'user' : 'model';

      if (contents.length === 0) {
        if (role === 'user') {
          contents.push({ role: 'user', parts: [{ text: item.text }] });
        }
      } else {
        const lastTurn = contents[contents.length - 1];
        if (lastTurn.role === role) {
          lastTurn.parts[0].text += `\n${item.text}`;
        } else {
          contents.push({ role, parts: [{ text: item.text }] });
        }
      }
    }

    if (contents.length > 0 && contents[contents.length - 1].role === 'user') {
      contents[contents.length - 1].parts[0].text += `\n${userQuestion}`;
    } else {
      contents.push({ role: 'user', parts: [{ text: userQuestion }] });
    }

    const response = await withGeminiRetries(() =>
      ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: contents,
        config: {
          systemInstruction: systemPrompt,
        },
      }),
      responseLanguage
    );

    const text = response.text?.trim();
    if (!text) {
      throw new Error('Gemini API returned an empty response.');
    }
    return text;
  } catch (err: any) {
    console.error('[Gemini] Chat API error:', {
      temporary: err instanceof GeminiTemporaryError,
      status: getGeminiErrorDetails(err).status,
    });
    const errMsg = err?.message || String(err);
    const status = err?.status || err?.statusCode;

    if (err instanceof GeminiTemporaryError) {
      throw new Error(err.message || TEMPORARY_GEMINI_MESSAGE);
    }

    if (errMsg.includes('GEMINI_API_KEY')) {
      throw new Error('EcoAI is not configured on the server. Please try again later.');
    }

    if (
      errMsg.includes('API_KEY_INVALID') ||
      errMsg.includes('API key not valid') ||
      errMsg.includes('INVALID_ARGUMENT') ||
      status === 400 ||
      status === 401 ||
      status === 403
    ) {
      throw new Error('EcoAI authentication is unavailable. Please try again later.');
    }

    if (errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota') || status === 429) {
      throw new Error('Gemini API Error: Quota exceeded or rate limit hit. Please try again later or check your Gemini API plan.');
    }

    if (
      errMsg.includes('fetch failed') ||
      errMsg.includes('ENOTFOUND') ||
      errMsg.includes('ECONNREFUSED') ||
      errMsg.includes('ETIMEDOUT')
    ) {
      throw new Error('Gemini API Error: Network failure connecting to Google Gemini API servers. Please check your internet connection.');
    }

    throw new Error('EcoAI could not process that request. Please try again later.');
  }
}
