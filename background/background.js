import config from './config.js';
import translationRequest from './translationRequest.js';

const API_URL = config.API_URL;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translateSelectedText') {
        translateText(request.text, request.targetLanguage, sendResponse);
        return true; // Required for async sendResponse
    }
});

const validateApiKey = async () => {
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    if (!geminiApiKey) throw new Error(config.API_KEY_NOT_SET_MESSAGE);
    return geminiApiKey;
};

const handleTranslationResponse = (data) => {
    const candidate = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidate) throw new Error(config.TRANSLATION_FAILED_MESSAGE);
    
    return candidate
        .replace(/^["']|["']$/g, '')
        .replace(/^Translate to.*?: /i, '');
};

async function translateText(text, targetLanguage, sendResponse) {
    try {
        const geminiApiKey = await validateApiKey();
        if (!text) throw new Error(config.TRANSLATION_FAILED_MESSAGE);

        const response = await fetch(`${API_URL}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(translationRequest(text, targetLanguage))
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Unknown error');
        }

        const translatedText = handleTranslationResponse(await response.json());
        sendResponse({ translatedText });
    } catch (error) {
        console.error("Translation Error:", error);
        sendResponse({ 
            translatedText: `${config.TRANSLATION_FAILED_MESSAGE}: ${error.message}`
        });
    }
}

// Dodaj listener dla zmian języka
chrome.storage.onChanged.addListener((changes, namespace) => {
    if (changes.selectedTextLanguage) {
        chrome.storage.local.set({ 
            textTargetLanguage: changes.selectedTextLanguage.newValue 
        });
    }
});

console.log("Service worker started.");
chrome.runtime.onInstalled.addListener(() => {
    console.log("Extension installed.");
}); 