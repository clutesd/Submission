// @google/genai API functions for the Safety Hazard Mapper application.

import { GoogleGenAI, Type, Modality } from "@google/genai";
import type { SafetyAnalysis, Hazard } from '../types';

// Initialize the Gemini client.
// The API key is automatically sourced from the process.env.API_KEY environment variable.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });


// JSON schema definition for the safety analysis response.
const analysisSchema = {
  type: Type.OBJECT,
  properties: {
    caption: { type: Type.STRING, description: 'A short, descriptive caption for the image.' },
    overall_risk: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'], description: 'The overall risk assessment for the scene.' },
    summary: { type: Type.STRING, description: 'A detailed summary of the safety analysis.' },
    hazards: {
      type: Type.ARRAY,
      description: 'A list of identified hazards.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'A unique identifier for the hazard, e.g., "H1", "H2".' },
          hazard: { type: Type.STRING, description: 'A description of the hazard.' },
          risk: {
            type: Type.OBJECT,
            properties: {
              severity: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
              likelihood: { type: Type.STRING, enum: ['LOW', 'MEDIUM', 'HIGH'] },
              reason: { type: Type.STRING, description: 'The reasoning behind the risk assessment.' }
            },
            required: ['severity', 'likelihood', 'reason']
          },
          decide_controls: {
            type: Type.ARRAY,
            description: 'A list of recommended control measures.',
            items: { type: Type.STRING }
          }
        },
        required: ['id', 'hazard', 'risk', 'decide_controls']
      }
    },
    regions: {
      type: Type.ARRAY,
      description: 'A list of regions in the image corresponding to the hazards. Each region ID must match a hazard ID.',
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: 'The ID of the corresponding hazard.' },
          shape: { type: Type.STRING, enum: ['rect', 'poly'] },
          x: { type: Type.NUMBER, description: 'For rect, the top-left x-coordinate (0-1).' },
          y: { type: Type.NUMBER, description: 'For rect, the top-left y-coordinate (0-1).' },
          w: { type: Type.NUMBER, description: 'For rect, the width (0-1).' },
          h: { type: Type.NUMBER, description: 'For rect, the height (0-1).' },
          points: {
            type: Type.ARRAY,
            description: 'For poly, an array of [x, y] coordinate pairs (0-1).',
            items: {
              type: Type.ARRAY,
              items: { type: Type.NUMBER }
            }
          }
        },
        required: ['id', 'shape']
      }
    }
  },
  required: ['caption', 'overall_risk', 'summary', 'hazards', 'regions']
};


/**
 * Analyzes an image for safety hazards using Gemini.
 * @param imageBase64 The base64 encoded image string with data URL prefix.
 * @param imageMimeType The MIME type of the image.
 * @returns A promise that resolves to a SafetyAnalysis object.
 */
export const analyzeImage = async (imageBase64: string, imageMimeType: string): Promise<SafetyAnalysis> => {
  const imagePart = {
    inlineData: {
      data: imageBase64.split(',')[1],
      mimeType: imageMimeType
    }
  };
  
  const prompt = `Analyze the provided image for workplace safety hazards. Identify each hazard, assess its risk, suggest control measures, and provide a bounding box or polygon for its location. Follow the provided JSON schema precisely.
  - The 'id' for a hazard and its corresponding region must match exactly (e.g., hazard "H1" corresponds to region "H1").
  - Provide a region for every single hazard you identify. This is mandatory.
  - Provide coordinates for regions as normalized values between 0 and 1.
  - For 'rect', use x, y, w, h. For 'poly', use 'points'.
  - Be thorough and identify all potential safety issues.
  `;
  
  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema: analysisSchema,
    },
  });

  try {
    const jsonString = response.text;
    const analysis = JSON.parse(jsonString) as SafetyAnalysis;

    // **DEFINITIVE FIX: Data Validation and Sanitization**
    // Ensures that the hazards and regions arrays are perfectly synchronized
    // to prevent downstream errors.

    // 1. Ensure arrays exist
    analysis.hazards = analysis.hazards || [];
    analysis.regions = analysis.regions || [];

    // 2. Create sets of IDs for efficient lookup
    const hazardIds = new Set(analysis.hazards.map(h => h.id));
    const regionIds = new Set(analysis.regions.map(r => r.id));

    // 3. Filter both lists to only include items that have a matching counterpart
    const synchronizedHazards = analysis.hazards.filter(h => regionIds.has(h.id));
    const synchronizedRegions = analysis.regions.filter(r => hazardIds.has(r.id));
    
    // 4. Return the sanitized and validated analysis object
    return {
      ...analysis,
      hazards: synchronizedHazards,
      regions: synchronizedRegions,
    };

  } catch (e) {
    console.error("Failed to parse or validate JSON response:", response.text, e);
    throw new Error("The analysis returned an invalid format. Please try again.");
  }
};

/**
 * Applies a targeted fix to a specific hazard in an image using inpainting.
 * @param imageBase64 The base64 encoded image string with data URL prefix.
 * @param imageMimeType The MIME type of the image.
 * @param maskBase64 The base64 encoded mask image string with data URL prefix.
 * @param hazard The hazard to fix.
 * @returns A promise that resolves to the base64 string of the modified image.
 */
export const applyTargetedFix = async (
  imageBase64: string,
  imageMimeType: string,
  maskBase64: string,
  hazard: Hazard
): Promise<string> => {
  const originalImagePart = {
    inlineData: {
      data: imageBase64.split(',')[1],
      mimeType: imageMimeType,
    },
  };
  
  const maskImagePart = {
    inlineData: {
      data: maskBase64.split(',')[1],
      mimeType: 'image/png', // Masks from createMaskFromRegion are PNGs
    },
  };

  const prompt = `You are an expert at fixing workplace safety issues. In the provided image, a hazard has been identified: "${hazard.hazard}". The area of this hazard is indicated by the white region in the provided mask image.
  Your task is to edit ONLY the masked area of the original image to resolve this hazard. Implement the following recommended controls: ${hazard.decide_controls.join(', ')}.
  The rest of the image must remain completely unchanged. The edited image should look realistic and seamlessly blended. Output only the modified image.`;

  const textPart = { text: prompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image-preview',
    contents: { parts: [originalImagePart, maskImagePart, textPart] },
    config: {
      responseModalities: [Modality.IMAGE, Modality.TEXT],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      const base64ImageBytes = part.inlineData.data;
      return `data:${part.inlineData.mimeType};base64,${base64ImageBytes}`;
    }
  }

  throw new Error("The model did not return an image for the targeted fix.");
};

/**
 * Generates a new, safe version of the workplace image.
 * @param imageBase64 The original base64 encoded image string (for context).
 * @param imageMimeType The MIME type of the original image.
 * @param analysis The safety analysis of the original image.
 * @returns A promise that resolves to the base64 string of the new, safe image.
 */
export const generateSafeImage = async (
  imageBase64: string,
  imageMimeType: string,
  analysis: SafetyAnalysis
): Promise<string> => {
  const prompt = `Generate a photorealistic image of a safe workplace that addresses the issues found in a previous analysis.
  Original scene description: ${analysis.caption}.
  Identified hazards to eliminate: ${analysis.hazards.map(h => h.hazard).join(', ')}.
  The new image should show a similar workplace but with all safety hazards corrected according to best practices. For example, if there was clutter, it should be tidy. If there was improper equipment use, it should be corrected.
  The image should be a safe and compliant version of the original scene.`;

  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });

  if (response.generatedImages && response.generatedImages.length > 0) {
    const base64ImageBytes = response.generatedImages[0].image.imageBytes;
    return `data:image/jpeg;base64,${base64ImageBytes}`;
  }

  throw new Error("Failed to generate a safe image version.");
};

/**
 * Generates a safety checklist based on the analysis.
 * @param analysis The safety analysis object.
 * @returns A promise that resolves to a string containing the checklist in Markdown format.
 */
export const generateChecklist = async (analysis: SafetyAnalysis): Promise<string> => {
  const prompt = `Based on the following safety analysis of a workplace image, generate a practical and easy-to-use safety checklist in Markdown format.
The checklist should help a safety officer or manager verify that the identified hazards have been addressed.
For each hazard, create a checklist item. Also, include general safety best practices relevant to the scene.

**Safety Analysis Summary:**
- **Overall Risk:** ${analysis.overall_risk}
- **Identified Hazards:**
${analysis.hazards.map(h => `  - ${h.hazard} (Severity: ${h.risk.severity}, Likelihood: ${h.risk.likelihood})`).join('\n')}
- **General Summary:** ${analysis.summary}

**Instructions for the checklist:**
- Use Markdown formatting.
- Start with a title "Workplace Safety Checklist".
- Create sections for each identified hazard.
- Under each hazard, list the recommended controls as actionable checklist items (e.g., "[ ] Action to take").
- Add a "General Safety" section with additional relevant checks.
- Keep the language clear and concise.
`;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });

  return response.text;
};