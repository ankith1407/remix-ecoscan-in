import { GoogleGenAI, Type } from '@google/genai';
import { db } from './db';

let aiClient: GoogleGenAI | null = null;

const TEMPORARY_GEMINI_MESSAGE = 'EcoAI is temporarily busy. Please try again in a moment.';
const MAX_GEMINI_RETRIES = 3;

// Minimum confidence required for an authoritative result.
const MIN_CONFIDENCE = 0.70;

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

function isGeminiModelNotFoundError(error: unknown): boolean {
  const { status, text } = getGeminiErrorDetails(error);
  return (
    status === 404 ||
    text.includes('not found') ||
    text.includes('404') ||
    text.includes('model') && text.includes('not found')
  );
}

const GEMINI_MODELS = ['gemini-3.6-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

async function generateContentWithModelFallback(
  ai: GoogleGenAI,
  contents: any,
  config?: any
) {
  let lastError: any = null;
  for (const model of GEMINI_MODELS) {
    try {
      console.log(`[EcoScan AI] Querying Gemini Vision API model: ${model}`);
      const response = await ai.models.generateContent({
        model,
        contents,
        ...(config ? { config } : {}),
      });
      if (response && response.text) {
        console.log(`[EcoScan AI] Successfully received response from model: ${model}`);
        return response;
      }
    } catch (err: any) {
      lastError = err;
      console.warn(`[EcoScan AI] Model ${model} returned error:`, err?.message || err);
      continue;
    }
  }
  throw lastError || new Error('All Gemini AI model candidates failed to return a valid response.');
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

let currentApiKey: string | null = null;

function getGenAI(): GoogleGenAI | null {
  const apiKey = getApiKey();
  if (!apiKey) {
    aiClient = null;
    currentApiKey = null;
    return null;
  }
  if (!aiClient || currentApiKey !== apiKey) {
    aiClient = new GoogleGenAI({ apiKey });
    currentApiKey = apiKey;
  }
  return aiClient;
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
  visible_materials: string[];
  requires_verification: boolean;
  reason?: string;
  is_unidentifiable?: boolean;
}

// -------------------------------------------------------------------
// Controlled category taxonomy.
// Gemini's raw category output is mapped into this list.
// Any unknown value maps to 'other'.
// -------------------------------------------------------------------
const CONTROLLED_CATEGORIES = [
  'plastic',
  'paper',
  'cardboard',
  'metal',
  'glass',
  'organic',
  'textile',
  'e_waste',
  'hazardous',
  'medical',
  'mixed',
  'other',
  'unknown',
] as const;

type ControlledCategory = typeof CONTROLLED_CATEGORIES[number];

const CATEGORY_SYNONYMS: Record<string, ControlledCategory> = {
  // Plastic
  'plastics': 'plastic',
  'pet': 'plastic',
  'pet plastic': 'plastic',
  'pet bottle': 'plastic',
  'pet bottles': 'plastic',
  'plastic bottle': 'plastic',
  'plastic bottles': 'plastic',
  'plastic containers': 'plastic',
  'hdpe': 'plastic',
  'hdpe plastic': 'plastic',
  'pp': 'plastic',
  'polypropylene': 'plastic',
  'polyethylene': 'plastic',
  'thermoplastic': 'plastic',
  'pvc': 'plastic',
  // Paper
  'papers': 'paper',
  'newspaper': 'paper',
  'newspapers': 'paper',
  'paper waste': 'paper',
  // Cardboard
  'cardboard box': 'cardboard',
  'cardboard boxes': 'cardboard',
  'corrugated': 'cardboard',
  'carton': 'cardboard',
  'cartons': 'cardboard',
  // Metal
  'metals': 'metal',
  'iron': 'metal',
  'steel': 'metal',
  'aluminium': 'metal',
  'aluminum': 'metal',
  'copper': 'metal',
  'brass': 'metal',
  'ferrous': 'metal',
  'non-ferrous': 'metal',
  // Glass
  'glasses': 'glass',
  'glass bottle': 'glass',
  'glass bottles': 'glass',
  // Organic
  'organics': 'organic',
  'food waste': 'organic',
  'food': 'organic',
  'wet waste': 'organic',
  'kitchen waste': 'organic',
  'biomass': 'organic',
  'compost': 'organic',
  // Textile
  'textiles': 'textile',
  'cloth': 'textile',
  'fabric': 'textile',
  'clothes': 'textile',
  // E-waste
  'e-waste': 'e_waste',
  'ewaste': 'e_waste',
  'electronic': 'e_waste',
  'electronics': 'e_waste',
  'electronic waste': 'e_waste',
  // Hazardous
  'hazardous waste': 'hazardous',
  'chemical': 'hazardous',
  'battery': 'hazardous',
  'batteries': 'hazardous',
  // Medical
  'biomedical': 'medical',
  'medical waste': 'medical',
  // Mixed
  'mixed waste': 'mixed',
  'mixed scrap': 'mixed',
  'mixed recyclables': 'mixed',
  'multiple materials': 'mixed',
};

function normalizeCategory(raw: string): ControlledCategory {
  if (!raw) return 'unknown';
  const lower = raw.toLowerCase().trim();
  if (CATEGORY_SYNONYMS[lower]) return CATEGORY_SYNONYMS[lower];
  for (const cat of CONTROLLED_CATEGORIES) {
    if (lower === cat || lower.startsWith(cat)) return cat;
  }
  // If the model says "Mixed" anything, only accept if it really IS mixed
  if (lower.includes('mixed')) return 'mixed';
  return 'other';
}

// -------------------------------------------------------------------
// Typed errors thrown by analyzeWasteImage.
// Server.ts maps these to structured HTTP response codes.
// NEVER return a fake WasteAnalysisResult — always throw on failure.
// -------------------------------------------------------------------
export class GeminiTimeoutError extends Error {
  readonly code = 'AI_TIMEOUT' as const;
  constructor() {
    super('AI analysis timed out. Please retry.');
    this.name = 'GeminiTimeoutError';
  }
}

export class GeminiUnavailableError extends Error {
  readonly code = 'AI_UNAVAILABLE' as const;
  constructor(reason?: string) {
    super(reason || 'AI service is temporarily unavailable. Please retry later.');
    this.name = 'GeminiUnavailableError';
  }
}

export class GeminiInvalidResponseError extends Error {
  readonly code = 'AI_INVALID_RESPONSE' as const;
  constructor(reason?: string) {
    super(reason || 'AI returned an unexpected response. Please retry.');
    this.name = 'GeminiInvalidResponseError';
  }
}

export class GeminiLowConfidenceResult extends Error {
  readonly code = 'AI_LOW_CONFIDENCE' as const;
  readonly result: WasteAnalysisResult;
  constructor(result: WasteAnalysisResult) {
    super('AI could not confidently identify this image.');
    this.name = 'GeminiLowConfidenceResult';
    this.result = result;
  }
}

type GeminiLanguage = 'EN' | 'HI' | 'TE';

function normalizeLanguage(language?: string): GeminiLanguage {
  return language === 'HI' || language === 'TE' ? language : 'EN';
}

function languageInstruction(language: GeminiLanguage): string {
  const selected = language === 'HI' ? 'Hindi (Devanagari)' : language === 'TE' ? 'Telugu script' : 'English';
  return `The selected app language is ${selected}. Respond in the user's dominant language. Understand and naturally handle mixed Hindi-English or Telugu-English. If the user explicitly asks for another language, follow that request. For structured output, keep JSON property names in English but translate every user-facing string value into the response language.`;
}

export async function analyzeWasteImage(
  base64Data: string,
  mimeType: string = 'image/jpeg',
  language: GeminiLanguage = 'EN'
): Promise<WasteAnalysisResult> {
  const responseLanguage = normalizeLanguage(language);
  const cleanBase64 = base64Data.replace(/^data:image\/[a-zA-Z0-9+]+;base64,/, '').trim();
  const ai = getGenAI();

  if (!ai) {
    console.error('[EcoScan AI] GEMINI_API_KEY is not configured on the server.');
    throw new GeminiUnavailableError('Gemini API key is not configured on the server. Please set a valid GEMINI_API_KEY in your .env file.');
  }

  console.log('[EcoScan AI] Starting image analysis request:', {
    mimeType: mimeType || 'image/jpeg',
    payloadLength: cleanBase64.length,
    estimatedSizeKb: Math.round((cleanBase64.length * 0.75) / 1024),
    language: responseLanguage,
    timestamp: new Date().toISOString(),
  });

  // Current materials and prices for context
  const materials = db.getMaterials();
  const materialsContext = materials
    .map((m) => `${m.material_name} (${m.category}): ₹${m.current_price_per_kg}/kg`)
    .join(', ');

  try {
    const prompt = `You are EcoScan's waste image classification engine for Indian waste segregation.

${languageInstruction(responseLanguage)}

Current scrap mandi benchmark rates in India: [${materialsContext}].

═══════════════════════════════════════════════════════
CRITICAL IMAGE CLASSIFICATION RULES — READ CAREFULLY
═══════════════════════════════════════════════════════

1. ANALYZE ONLY THIS IMAGE. Do NOT use:
   - The filename
   - Any previous scan result
   - Any conversation history
   - Any assumption not visible in the image

2. IDENTIFY THE PRIMARY WASTE TYPE visible in the image.

3. SINGLE MATERIAL RULE (MOST IMPORTANT):
   If ALL objects in the image are clearly the same material type, classify as THAT MATERIAL — NOT as "mixed".
   Examples:
   - Multiple plastic bottles → category: "plastic" (NOT "mixed")
   - Several cardboard boxes → category: "cardboard" (NOT "mixed")
   - A pile of metal cans → category: "metal" (NOT "mixed")
   - Lots of newspapers → category: "paper" (NOT "mixed")
   Having MANY objects of the SAME TYPE is NOT mixed waste.

4. MIXED WASTE RULE:
   Only use category "mixed" when the image contains MULTIPLE CLEARLY DISTINCT material types simultaneously visible.
   Example of genuine mixed: plastic bottle + metal can + newspaper in the same frame → "mixed".
   If uncertain whether materials are distinct, classify by the DOMINANT visible material.

5. UNCLEAR IMAGE RULE:
   If the image is blurry, too dark, too far away, mostly empty, or not a waste item, set:
   - is_unidentifiable: true
   - confidence: a low value (e.g. 0.20)
   - reason: explanation of why

6. CONFIDENCE RULE:
   Provide an honest confidence decimal between 0.00 and 1.00.
   - Clear single-item image: 0.85–0.99
   - Slightly ambiguous: 0.60–0.84
   - Poor image quality: 0.20–0.59 (set is_unidentifiable: true if < 0.50)

7. visible_materials[] field:
   List ALL distinct material types you can actually see in the image.
   For a bottle pile: ["plastic"]
   For a mixed bin: ["plastic", "metal", "cardboard"]
   This array drives the mixed-waste classification, not item count.

8. WEIGHT ESTIMATION:
   - For a single identifiable item, estimate realistic weight in kg (e.g. 0.03 for a PET bottle).
   - For large piles or mixed scrap where scale is unknown: set estimated_weight null, requires_verification: true.

9. PRICE CALCULATION:
   - If specific material and weight known: calculate value = weight × rate_per_kg.
   - If mixed or scale unknown: set current_rate_per_kg null, estimated_value null.

Respond strictly in the JSON schema provided.`;

    const imagePart = {
      inlineData: {
        mimeType: mimeType || 'image/jpeg',
        data: cleanBase64,
      },
    };

    const generateImageRequest = () => generateContentWithModelFallback(ai, [imagePart, { text: prompt }], {
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          material: {
            type: Type.STRING,
            description: 'Specific name of the primary waste material visible (e.g. "PET plastic bottles", "corrugated cardboard")',
          },
          category: {
            type: Type.STRING,
            description: 'Primary category: plastic | paper | cardboard | metal | glass | organic | textile | e_waste | hazardous | medical | mixed | other | unknown',
          },
          material_type: {
            type: Type.STRING,
            description: 'Specific material sub-type (e.g. "PET #1", "HMS Ferrous Steel")',
          },
          confidence: {
            type: Type.NUMBER,
            description: 'Classification confidence 0.00–1.00',
          },
          estimated_weight: {
            type: Type.NUMBER,
            description: 'Estimated weight in kg for single identifiable items. Omit or null for large piles.',
          },
          weight_range_kg: {
            type: Type.STRING,
            description: 'Human-readable weight range (e.g. "0.02–0.05 kg") or "Requires verification at pickup"',
          },
          recyclable: {
            type: Type.BOOLEAN,
          },
          recyclability_status: {
            type: Type.STRING,
            description: 'One of: Highly Recyclable | Recyclable | Conditionally Recyclable | Special Disposal Required | Not Recyclable | Requires Separation',
          },
          best_for: {
            type: Type.STRING,
          },
          estimated_value: {
            type: Type.NUMBER,
            description: 'Estimated resale value in ₹. Null if unknown.',
          },
          value_text: {
            type: Type.STRING,
          },
          current_rate_per_kg: {
            type: Type.NUMBER,
            description: 'Current scrap mandi rate in ₹/kg. Null if mixed or unknown.',
          },
          disposal_instruction: {
            type: Type.STRING,
          },
          detected_items: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of specific items identified in the image',
          },
          visible_materials: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'List of distinct material types visible (e.g. ["plastic"] or ["plastic","metal"])',
          },
          requires_verification: {
            type: Type.BOOLEAN,
          },
          reason: {
            type: Type.STRING,
            description: 'Required if is_unidentifiable is true. Explain why classification failed.',
          },
          is_unidentifiable: {
            type: Type.BOOLEAN,
            description: 'Set true only if image is unclear, too dark, blurry, or cannot be reliably classified',
          },
        },
        required: [
          'material',
          'category',
          'confidence',
          'recyclable',
          'disposal_instruction',
          'detected_items',
          'visible_materials',
        ],
      },
    });

    // Single attempt with a 20 s timeout (no vision retries — the user retries via the button).
    // Frontend has a 25 s timeout, so the backend will always respond before the frontend gives up.
    let response: any;
    try {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new GeminiTimeoutError()), 20000)
      );
      response = await Promise.race([generateImageRequest(), timeoutPromise]);
    } catch (timeoutErr) {
      if (timeoutErr instanceof GeminiTimeoutError) throw timeoutErr;
      // Classify Gemini SDK errors
      if (isGeminiTemporaryError(timeoutErr)) {
        throw new GeminiUnavailableError(localizedTemporaryMessage(responseLanguage));
      }
      throw timeoutErr;
    }

    const jsonText = response?.text;
    if (!jsonText || jsonText.trim() === '' || jsonText.trim() === '{}') {
      throw new GeminiInvalidResponseError('AI returned an empty response.');
    }

    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch {
      throw new GeminiInvalidResponseError('AI returned malformed JSON.');
    }

    // --- Validate required fields ---
    if (!parsed || typeof parsed !== 'object') {
      throw new GeminiInvalidResponseError('AI response was not a valid object.');
    }
    if (typeof parsed.material !== 'string' || !parsed.material.trim()) {
      throw new GeminiInvalidResponseError('AI response missing required field: material.');
    }
    if (typeof parsed.category !== 'string' || !parsed.category.trim()) {
      throw new GeminiInvalidResponseError('AI response missing required field: category.');
    }
    if (typeof parsed.confidence !== 'number' || parsed.confidence < 0 || parsed.confidence > 1) {
      throw new GeminiInvalidResponseError('AI response has invalid confidence value.');
    }

    // --- Normalize category through controlled taxonomy ---
    const normalizedCategory = normalizeCategory(parsed.category);

    // --- Determine visible_materials for isMixed decision ---
    const visibleMaterials: string[] = Array.isArray(parsed.visible_materials)
      ? parsed.visible_materials.map((m: any) => String(m).toLowerCase().trim()).filter(Boolean)
      : [];

    // MIXED = normalized category is 'mixed' AND there are genuinely multiple distinct material types
    // visible, OR the visible_materials array contains 2+ distinct types.
    // Multiple items of the SAME type (e.g. 5 plastic bottles) is NOT mixed.
    const distinctMaterialTypes = new Set(visibleMaterials.map((m) => normalizeCategory(m)));
    // Remove 'other', 'unknown' from distinctness count for isMixed decision
    distinctMaterialTypes.delete('other');
    distinctMaterialTypes.delete('unknown');

    const isMixed =
      normalizedCategory === 'mixed' && distinctMaterialTypes.size >= 2;

    // If Gemini says mixed but only one distinct material type is visible, override it
    const effectiveCategory: ControlledCategory = isMixed ? 'mixed' : (
      normalizedCategory === 'mixed' && distinctMaterialTypes.size < 2
        ? (distinctMaterialTypes.size === 1 ? [...distinctMaterialTypes][0] : 'other')
        : normalizedCategory
    );

    const isLowConfidence = parsed.is_unidentifiable || parsed.confidence < MIN_CONFIDENCE;

    if (isLowConfidence) {
      // Throw a typed low-confidence result — server returns 422, frontend shows UNCERTAIN state.
      const lowConfResult: WasteAnalysisResult = {
        material: 'Unable to reliably identify this item',
        category: 'unknown',
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
          parsed.reason || 'Unable to reliably identify this item. Please upload a clearer, well-lit image.',
        detected_items: [],
        visible_materials: [],
        requires_verification: true,
        reason: parsed.reason || 'Unable to reliably identify this item. Please upload a clearer, well-lit image.',
        is_unidentifiable: true,
      };
      throw new GeminiLowConfidenceResult(lowConfResult);
    }

    // --- Match with current dynamic scrap rate from database ---
    const materialLower = (parsed.material || '').toLowerCase();

    const matchedMat = materials.find((m) =>
      materialLower.includes(m.material_name.toLowerCase())
    ) || materials.find((m) => m.category.toLowerCase() === effectiveCategory);

    const currentRate = isMixed ? null : (matchedMat ? matchedMat.current_price_per_kg : null);
    const isWeightEstimated = typeof parsed.estimated_weight === 'number' && parsed.estimated_weight > 0;
    const estWeight = isWeightEstimated ? Number(parsed.estimated_weight.toFixed(2)) : null;
    const estValue = estWeight && currentRate ? Number((estWeight * currentRate).toFixed(2)) : null;

    const weightRange =
      parsed.weight_range_kg ||
      (estWeight ? `~${estWeight} kg` : 'Requires verification at pickup');

    const valueText = parsed.value_text || (
      estValue !== null
        ? `₹${estValue.toFixed(2)} (Estimated)`
        : isMixed
        ? 'Requires material separation / pickup verification'
        : currentRate !== null
        ? 'Weight verification required'
        : 'Rate unavailable'
    );

    const recStatus =
      parsed.recyclability_status ||
      (isMixed
        ? 'Requires Separation'
        : parsed.recyclable
        ? effectiveCategory === 'metal'
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

    // Use effectiveCategory label for display (capitalize first letter)
    const categoryDisplay = isMixed
      ? 'Mixed Waste'
      : effectiveCategory === 'e_waste'
      ? 'E-Waste'
      : effectiveCategory.charAt(0).toUpperCase() + effectiveCategory.slice(1);

    return {
      material: isMixed ? 'Mixed Waste (Multiple Materials)' : parsed.material.trim(),
      category: categoryDisplay,
      material_type: parsed.material_type || (isMixed ? 'Mixed Materials' : parsed.material),
      confidence: Number(Math.min(0.99, Math.max(MIN_CONFIDENCE, parsed.confidence)).toFixed(2)),
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
          : [parsed.material || 'Waste Item'],
      visible_materials: visibleMaterials,
      requires_verification: Boolean(parsed.requires_verification || isMixed || !estWeight),
      reason: parsed.reason,
      is_unidentifiable: false,
    };
  } catch (error) {
    if (error instanceof GeminiLowConfidenceResult) {
      throw error;
    }

    const { status, text } = getGeminiErrorDetails(error);
    console.error('[EcoScan AI] Gemini Vision API Error:', {
      status,
      message: (error as Error)?.message || text,
    });

    if (isGeminiAuthenticationError(error)) {
      throw new GeminiUnavailableError('AI authentication failed. Please verify that a valid GEMINI_API_KEY is set in your .env file.');
    }

    if (isGeminiModelNotFoundError(error)) {
      throw new GeminiUnavailableError('Gemini AI Vision model is currently unavailable (404). Please try again in a moment or verify your API key access.');
    }

    if (isGeminiTemporaryError(error)) {
      throw new GeminiUnavailableError(localizedTemporaryMessage(responseLanguage));
    }

    throw new GeminiInvalidResponseError((error as Error)?.message || 'AI analysis failed. Please try again.');
  }
}

export async function askEcoAiChat(
  userQuestion: string,
  history?: { role: 'user' | 'model'; text: string }[],
  language: GeminiLanguage = 'EN'
): Promise<string> {
  const responseLanguage = normalizeLanguage(language);
  const ai = getGenAI();
  if (!ai) {
    throw new Error('GEMINI_API_KEY environment variable is not configured. Please set it in your .env file.');
  }

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
      generateContentWithModelFallback(ai, contents, {
        systemInstruction: systemPrompt,
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
