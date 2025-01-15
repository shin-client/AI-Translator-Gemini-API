const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';

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
            body: JSON.stringify({
                contents: [{
                    parts: [{
                        text: `Translate the following text to ${targetLanguage}. If it's necessary, modify the text to sound natural for the ${targetLanguage}, use the appropriate grammar, do not translate proper names. In the response, provide only the translation text without any additional descriptions or explanations:\n${text}`
                    }]
                }]
            })
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