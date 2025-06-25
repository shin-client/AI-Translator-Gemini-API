import config from './config.js';
import translationRequest, { screenshotTranslationRequest } from './translationRequest.js';

const API_URL = config.API_URL;

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'translateSelectedText') {
        translateText(request.text, request.targetLanguage, sendResponse);
        return true; // Required for async sendResponse
    }
    
    if (request.action === 'captureAndTranslateScreenshot') {
        captureAndTranslateScreenshot(request.area, request.targetLanguage, sendResponse, sender.tab.id);
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

async function captureAndTranslateScreenshot(area, targetLanguage, sendResponse, tabId) {
    try {
        const geminiApiKey = await validateApiKey();
        
        // Capture visible tab
        const screenshot = await chrome.tabs.captureVisibleTab(null, {
            format: 'png',
            quality: 100
        });
        
        // Crop the screenshot to the selected area
        const croppedImage = await cropImage(screenshot, area);
        
        // Convert to base64 format for Gemini API
        const base64Image = croppedImage.split(',')[1];
        
        // Create vision request using the specialized function
        const visionRequest = screenshotTranslationRequest(targetLanguage, base64Image);

        const response = await fetch(`${API_URL}?key=${geminiApiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(visionRequest)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error?.message || 'Unknown error');
        }

        const data = await response.json();
        const result = handleTranslationResponse(data);
        
        // Extract translation part with improved pattern matching
        const translationMatch = result.match(/TRANSLATION:\s*([\s\S]*?)(?=\n\n|$)/);
        let translatedText = translationMatch ? translationMatch[1].trim() : result;
        
        // Fallback: if no TRANSLATION section found, return the whole result
        if (!translationMatch && result.includes('TRANSCRIPTION:')) {
            // If we have transcription but no clear translation, try to extract after transcription
            const afterTranscription = result.split('TRANSCRIPTION:')[1];
            if (afterTranscription) {
                translatedText = afterTranscription.replace(/^[\s\S]*?TRANSLATION:\s*/, '').trim();
            }
        }
        
        // Clean up any remaining formatting artifacts
        translatedText = translatedText.replace(/^\[.*?\]\s*/, '').replace(/\[unclear\]/g, '').trim();
        
        sendResponse({ translatedText });
        
    } catch (error) {
        console.error("Screenshot translation error:", error);
        sendResponse({ 
            error: error.message,
            translatedText: `${config.TRANSLATION_FAILED_MESSAGE}: ${error.message}`
        });
    }
}

function cropImage(dataUrl, area) {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();
        
        img.onload = () => {
            canvas.width = area.width;
            canvas.height = area.height;
            
            ctx.drawImage(
                img,
                area.left, area.top, area.width, area.height,
                0, 0, area.width, area.height
            );
            
            resolve(canvas.toDataURL('image/png'));
        };
        
        img.src = dataUrl;
    });
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