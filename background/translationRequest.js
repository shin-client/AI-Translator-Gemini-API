const sanitizeInput = (text) => {
    return text
        .replace(/[<>]/g, '')
        .substring(0, 5000);
};

const translationRequest = (text, targetLanguage) => ({
    contents: [{
        parts: [{ text: `Translate to ${targetLanguage}:\n${sanitizeInput(text)}` }]
    }],
    generationConfig: {
        temperature: 0.6,
        maxOutputTokens: 2000,
        topP: 0.9
    },
    safetySettings: [
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_NONE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_NONE" }
    ],
    systemInstruction: {
        parts: [{
            text: "You are a professional translator. Rules:\n" +
                "1. Maintain original formatting\n" +
                "2. No additional comments\n" +
                "3. Preserve proper nouns\n" +
                "4. Use natural grammar"
        }]
    }
});

export default translationRequest;