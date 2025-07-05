const sanitizeInput = (text) => {
  return text.replace(/[<>]/g, "").substring(0, 5000);
};

const translationRequest = (text, targetLanguage) => ({
  contents: [
    {
      parts: [
        { text: `Translate to ${targetLanguage}:\n${sanitizeInput(text)}` },
      ],
    },
  ],
  generationConfig: {
    temperature: 0.6,
    maxOutputTokens: 2000,
    topP: 0.9,
  },
  safetySettings: [
    { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
    { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" },
  ],
  systemInstruction: {
    parts: [
      {
        text:
          "You are a professional translator. Rules:\n" +
          "1. Maintain original formatting\n" +
          "2. No additional comments\n" +
          "3. Preserve proper nouns\n" +
          "4. Use natural grammar",
      },
    ],
  },
});

const screenshotTranslationRequest = (targetLanguage, base64Image) => ({
  contents: [
    {
      parts: [
        {
          text: `IMPORTANT: You must provide a complete transcription of ALL visible text in this image, then translate it to ${targetLanguage}.

TASK REQUIREMENTS:
1. TRANSCRIPTION PHASE: Extract and transcribe every single piece of text visible in the image with pixel-perfect accuracy
2. TRANSLATION PHASE: Translate the transcribed text to ${targetLanguage} maintaining context and meaning

FORMAT YOUR RESPONSE EXACTLY AS:

TRANSCRIPTION:
[Write here ALL the text you can see in the image, preserving line breaks, formatting, and layout. Include even small text, watermarks, buttons, labels, etc.]

TRANSLATION:
[Write here the complete translation to ${targetLanguage} of all the transcribed text]

CRITICAL INSTRUCTIONS:
- Do NOT skip any visible text, no matter how small or unclear
- Maintain original formatting and structure
- If text is partially obscured, indicate with [unclear] but transcribe what you can see
- Include text from UI elements, buttons, menus, captions, etc.
- Preserve line breaks and spatial relationships
- Be thorough and comprehensive in your transcription`,
        },
        {
          inline_data: {
            mime_type: "image/png",
            data: base64Image,
          },
        },
      ],
    },
  ],
  generationConfig: {
    temperature: 0.2,
    topK: 32,
    topP: 1,
    maxOutputTokens: 4096,
  },
  safetySettings: [
    {
      category: "HARM_CATEGORY_HARASSMENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_HATE_SPEECH",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
    {
      category: "HARM_CATEGORY_DANGEROUS_CONTENT",
      threshold: "BLOCK_MEDIUM_AND_ABOVE",
    },
  ],
  systemInstruction: {
    parts: [
      {
        text:
          "You are an expert OCR and translation specialist. Your task is to:\n" +
          "1. TRANSCRIBE: Extract ALL visible text from images with maximum accuracy\n" +
          "2. TRANSLATE: Provide professional translation maintaining context\n" +
          "3. PRESERVE: Keep original formatting, structure, and meaning\n" +
          "4. BE THOROUGH: Never skip text elements, even small ones\n" +
          "5. BE PRECISE: Follow the exact output format specified",
      },
    ],
  },
});

export default translationRequest;
export { screenshotTranslationRequest };
