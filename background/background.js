import config from './config.js';
import translationRequest from './translationRequest.js';

const API_URL = config.API_URL;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translateSelectedText') {
        translateText(request.text, request.targetLanguage, sendResponse);
        return true; // Required for async sendResponse
    }
});

async function translateText(text, targetLanguage, sendResponse) {
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    if (!geminiApiKey) {
        sendResponse({ translatedText: config.API_KEY_NOT_SET_MESSAGE });
        return;
    }

    if (!text) {
        sendResponse({ translatedText: config.TEXT_TO_TRANSLATE_EMPTY_MESSAGE });
        return;
    }

    try {
        const response = await fetch(`${API_URL}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(translationRequest(text, targetLanguage || config.DEFAULT_TARGET_LANGUAGE))
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            sendResponse({ 
                translatedText: `${config.TRANSLATION_FAILED_MESSAGE}: ${errorData.error?.message || 'Unknown error'}`
            });
            return;
        }

        const data = await response.json();
        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const translatedText = data.candidates[0].content.parts[0].text
                .replace(/^["']|["']$/g, '')
                .replace(/^Translate to.*?: /i, '');
            sendResponse({ translatedText });
        } else {
            sendResponse({ translatedText: `${config.TRANSLATION_FAILED_MESSAGE}.` });
        }
    } catch (error) {
        console.error("Error during text translation:", error);
        sendResponse({ translatedText: `${config.TRANSLATION_FAILED_MESSAGE}: ${error.message}` });
    }
} 