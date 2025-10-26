import { GoogleGenAI, Modality, Type } from "@google/genai";

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

export const analyzeForModel = async (
  images: { base64: string; mimeType: string }[]
): Promise<{ characterSheet: { facialStructure: string; bodyStructure: string }; confidenceScore: number }> => {
  if (images.length === 0) {
    throw new Error("At least one image must be provided for analysis.");
  }

  const imageParts = images.map(image => ({
    inlineData: { data: image.base64, mimeType: image.mimeType },
  }));

  const textPart = {
    text: `You are an expert 3D character artist. Your task is to analyze the provided image(s) of a person and create a detailed character sheet that could be used to create a realistic 3D model.

If multiple images are provided, synthesize the information to create the most accurate and consistent description possible. Note any inconsistencies if they exist.

Your response MUST be a JSON object. Do not include any markdown formatting or any text outside of the JSON object.

The JSON object must have two top-level keys:
1.  'characterSheet': An object containing 'facialStructure' and 'bodyStructure' as detailed string descriptions, written in paragraphs.
2.  'confidenceScore': A number between 0 and 100 representing your confidence in the accuracy of the structural analysis based on the quality and number of provided images. A single, clear, front-facing photo might yield a confidence of 70-80. Multiple angles would increase this score. A blurry or obscured photo would result in a lower score.
`,
  };

  const responseSchema = {
    type: Type.OBJECT,
    properties: {
      characterSheet: {
        type: Type.OBJECT,
        properties: {
          facialStructure: { type: Type.STRING, description: "A detailed breakdown of the person's facial features, shape, and structure." },
          bodyStructure: { type: Type.STRING, description: "A detailed breakdown of the person's body type, build, posture, and proportions." },
        },
        required: ["facialStructure", "bodyStructure"],
      },
      confidenceScore: {
        type: Type.NUMBER,
        description: "A confidence score from 0 to 100.",
      },
    },
    required: ["characterSheet", "confidenceScore"],
  };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: { parts: [...imageParts, textPart] },
    config: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  try {
    const jsonText = response.text.trim();
    return JSON.parse(jsonText);
  } catch (e) {
    console.error("Failed to parse JSON response from Gemini:", response.text);
    throw new Error("The AI returned an invalid response. Please try again.");
  }
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

  let promptText = `You are a creative assistant. Your goal is to generate a new, detailed prompt for an image generation model. This new prompt should describe how to reimagine the provided image with a new artistic style.

To do this, first, conduct a thorough analysis of the original image. Describe everything you see in detail:
- The person(s): facial features, expression, age, pose, clothing style and color.
- The setting: background details, objects, environment.
- The composition: framing, angle, focus.
- The lighting: source, harshness/softness, shadows, highlights, mood.
- The colors: overall palette, dominant colors, contrast.

Based on this complete analysis, construct the new prompt.`;
  
  if (style) {
    const intensityMap: { [key: number]: string } = {
      1: 'a very subtle hint of the',
      2: 'a light touch of the',
      3: 'a moderate',
      4: 'a strong',
      5: 'a very intense and dominant',
    };
    const intensityText = intensityMap[intensity] || 'a moderate';
    promptText += ` The new style should be ${intensityText} ${style} style.`;
  } else {
    const intensityDescriptionMap: { [key: number]: string } = {
        1: 'The artistic transformation should be very subtle, barely altering the original photo\'s feel.',
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

  promptText += `\n\nThe final output must be ONLY the generated prompt. The prompt should be a single, cohesive paragraph that is highly descriptive, providing specifics on brushstrokes, color palette, texture, and mood to guide an AI in generating a visually stunning piece of art. Do not include your analysis or any other conversational text in the final response.`;

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


export const inpaintImage = async (
  baseImage: { base64: string, mimeType: string },
  maskImage: { base64: string, mimeType: string },
  prompt: string,
): Promise<{ base64: string; mimeType: string }> => {
  const originalImagePart = {
    inlineData: { data: baseImage.base64, mimeType: baseImage.mimeType },
  };
  const maskImagePart = {
    inlineData: { data: maskImage.base64, mimeType: maskImage.mimeType },
  };

  const fullPrompt = `You are an expert image editor. I have provided an original image, and a mask image. Your task is to perform in-painting. The area to be modified in the original image is indicated by the white region in the mask image. Replace this white-masked area with: "${prompt}". The rest of the image (the black-masked area) must remain completely unchanged. Ensure the final result is seamless.`;

  const textPart = { text: fullPrompt };

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: {
      parts: [originalImagePart, maskImagePart, textPart],
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

  throw new Error('No image generated by the API for in-painting.');
};

export const generateImageFromText = async (
    prompt: string,
    negativePrompt: string,
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4'
): Promise<{ base64: string; mimeType: string }> => {
    let fullPrompt = prompt;
    if (negativePrompt.trim()) {
        fullPrompt += ` --no ${negativePrompt}`;
    }

    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: fullPrompt,
        config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
            aspectRatio: aspectRatio,
        },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
        const image = response.generatedImages[0];
        return { base64: image.image.imageBytes, mimeType: 'image/png' };
    }

    throw new Error('No image generated by the API.');
};

export const editImage = async (
    image: { base64: string; mimeType: string },
    prompt: string
): Promise<{ base64: string; mimeType: string }> => {
    const imagePart = {
        inlineData: { data: image.base64, mimeType: image.mimeType },
    };
    const textPart = { text: prompt };

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

    throw new Error('No image generated by the API for editing.');
};

export const runStudioQuery = async (
    prompt: string,
    media: { base64: string; mimeType: string } | null,
    model: 'gemini-2.5-flash' | 'gemini-2.5-pro',
    useThinking: boolean,
    useGrounding: boolean
): Promise<{ text: string, groundingChunks: any[] | null }> => {
    const textPart = { text: prompt };
    const parts = media ? [{ inlineData: { data: media.base64, mimeType: media.mimeType } }, textPart] : [textPart];

    const config: any = {};

    if (useThinking && model === 'gemini-2.5-pro') {
        config.thinkingConfig = { thinkingBudget: 32768 };
    }

    if (useGrounding) {
        config.tools = [{ googleSearch: {} }];
    }

    const response = await ai.models.generateContent({
        model: model,
        contents: { parts },
        config: config,
    });

    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || null;

    return { text: response.text, groundingChunks };
};
