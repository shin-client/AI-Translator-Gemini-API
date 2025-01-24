import config from './config.js';

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
        sendResponse({ translatedText: 'API key not set.' });
        return;
    }

    try {
        const response = await fetch(`${API_URL}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(config.TRANSLATION_REQUEST_BODY(text, targetLanguage))
        });

        if (!response.ok) {
            const errorData = await response.json();
            console.error("API Error:", errorData);
            sendResponse({ 
                translatedText: `Translation failed: ${errorData.error?.message || 'Unknown error'}` 
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
            sendResponse({ translatedText: 'Translation failed.' });
        }
    } catch (error) {
        console.error("Error during text translation:", error);
        sendResponse({ translatedText: `Translation failed: ${error.message}` });
    }
} 