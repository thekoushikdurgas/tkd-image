import { GoogleGenAI, Modality } from "@google/genai";

if (!process.env.API_KEY) {
  throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

export const fileToBase64 = (file: File): Promise<{ base64: string, mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const analyzeImageForPrompt = async (
  base64: string,
  mimeType: string,
  enableThinking: boolean,
  style: string,
  intensity: number,
  focusArea: string
): Promise<string> => {
  const imagePart = {
    inlineData: { data: base64, mimeType },
  };

  let promptText = `Analyze the provided image in detail, paying close attention to the subject, composition, lighting, and colors. Based on this analysis, create a detailed and creative generative AI prompt to reimagine the photo.`;
  
  if (style) {
    const intensityMap: { [key: number]: string } = {
      1: 'a very subtle hint of',
      2: 'a light touch of',
      3: 'a moderate',
      4: 'a strong',
      5: 'a very intense and dominant',
    };
    const intensityText = intensityMap[intensity] || 'a moderate';
    promptText += ` The new image should be in ${intensityText} ${style} style.`;
  } else {
    const intensityDescriptionMap: { [key: number]: string } = {
        1: 'The transformation should be very subtle, barely altering the original photo\'s feel.',
        2: 'Apply a light artistic touch, keeping the result very close to the source image.',
        3: 'The artistic style should be moderately applied, creating a noticeable but balanced transformation.',
        4: 'The reimagining should be strong and bold, significantly changing the original image into a new piece of art.',
        5: 'The transformation should be very intense and dominant, using the original photo only as a loose inspiration for a completely new artistic vision.',
      };
    const intensityDescription = intensityDescriptionMap[intensity] || intensityDescriptionMap[3];
    promptText += ` The new image should have a completely new and unique artistic style. ${intensityDescription}`;
  }

  if (focusArea) {
    if (style) {
      promptText += ` The style should be primarily focused on or applied to ${focusArea}. The rest of the image can be less affected or complementary to the styled area.`;
    } else {
      promptText += ` When creating this new style, pay special attention to the ${focusArea}.`;
    }
  }

  promptText += ` The prompt must be highly descriptive, providing specifics on brushstrokes, color palette, texture, and mood to guide the AI in generating a visually stunning and coherent piece of art.`;

  const textPart = {
    text: promptText,
  };
  
  const payload: {
    model: string;
    contents: any;
    config?: { thinkingConfig: { thinkingBudget: number } };
  } = {
    model: 'gemini-2.5-flash',
    contents: { parts: [imagePart, textPart] },
  };

  if (enableThinking) {
    payload.config = {
        thinkingConfig: { thinkingBudget: 24576 } // Max budget for 2.5 Flash
    };
  }

  const response = await ai.models.generateContent(payload);
  return response.text;
};

export const generateImage = async (
  base64: string,
  mimeType: string,
  prompt: string,
  negativePrompt: string,
  aspectRatio: string,
  styleStrength: number,
  quality: string
): Promise<{ base64: string; mimeType: string }> => {
  const imagePart = {
    inlineData: { data: base64, mimeType },
  };

  let fullPrompt = `Using the provided image as a structural reference for the face, create a new image based on this description: "${prompt}".`;

  const strengthMap: { [key: number]: string } = {
    1: 'The style should be very subtle, preserving the original facial structure as much as possible.',
    2: 'The style should be applied lightly, keeping the facial structure clearly recognizable.',
    3: 'Apply the style with a moderate intensity, balancing artistic change with structural preservation.',
    4: 'The style should be strong and prominent, taking creative liberties with the facial structure.',
    5: 'The style should be very intense and dominant, heavily transforming the original image and its structure.',
  };
  fullPrompt += `\n\n${strengthMap[styleStrength] || strengthMap[3]}`;

  const qualityMap: { [key: string]: string } = {
    low: 'The image should be generated quickly, prioritizing speed over fine details. A draft or sketch-like quality is acceptable.',
    medium: 'The image should have a good balance of detail and generation speed.',
    high: 'The image must be of very high quality, with intricate details, sharp focus, and a professional finish. Prioritize detail and quality over speed.',
  };
  if (qualityMap[quality]) {
    fullPrompt += `\n\nImage Quality Requirement: ${qualityMap[quality]}`;
  }

  const aspectRatioMap: { [key: string]: string } = {
    '1:1': 'a square (1:1) aspect ratio',
    '16:9': 'a landscape (16:9) aspect ratio',
    '9:16': 'a portrait (9:16) aspect ratio',
  };
  if (aspectRatioMap[aspectRatio]) {
    fullPrompt += `\n\nThe final image must have ${aspectRatioMap[aspectRatio]}.`;
  }

  if (negativePrompt.trim()) {
    fullPrompt += `\n\nCrucially, the generated image must NOT contain the following elements: ${negativePrompt}.`;
  }

  const textPart = {
    text: fullPrompt,
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [imagePart, textPart],
    },
    config: {
      responseModalities: [Modality.IMAGE],
    },
  });

  for (const part of response.candidates[0].content.parts) {
    if (part.inlineData) {
      return { base64: part.inlineData.data, mimeType: part.inlineData.mimeType };
    }
  }

  throw new Error('No image generated by the API.');
};