import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import fs from 'fs';
import path from 'path';

dotenv.config();

async function testVisionWithGemini36() {
  const apiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || process.env.API_KEY;
  if (!apiKey) {
    console.error('No API key found in .env');
    return;
  }

  const ai = new GoogleGenAI({ apiKey });

  // Create a small 1x1 test blue pixel image base64 if no file available
  const sampleBase64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

  console.log('Testing gemini-3.6-flash Vision Multimodal Analysis...');

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: [
        {
          inlineData: {
            mimeType: 'image/png',
            data: sampleBase64,
          },
        },
        'Analyze this waste image. Return structured JSON with material, category, confidence, recyclable, disposal_instruction.',
      ],
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            material: { type: Type.STRING },
            category: { type: Type.STRING },
            confidence: { type: Type.NUMBER },
            recyclable: { type: Type.BOOLEAN },
            disposal_instruction: { type: Type.STRING },
          },
          required: ['material', 'category', 'confidence', 'recyclable', 'disposal_instruction'],
        },
      },
    });

    console.log('SUCCESS! Gemini 3.6 Flash Vision Response:', response.text);
  } catch (err: any) {
    console.error('FAILED:', err?.message || err);
  }
}

testVisionWithGemini36();
