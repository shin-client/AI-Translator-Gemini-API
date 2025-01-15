document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent';
    let apiKey = '';

    const apiKeyInput = document.getElementById('api-key-input');
    const saveApiKeyButton = document.getElementById('save-api-key-button');
    const textToTranslateTextarea = document.getElementById('text-to-translate');
    const translatedTextTextarea = document.getElementById('translated-text');
    const textTargetLanguageSelect = document.getElementById('text-target-language');
    const translateTextButton = document.getElementById('translate-text-button');
    const apiKeyStatus = document.getElementById('api-key-status');
    const textTranslationStatus = document.getElementById('text-translation-status');
    const apiKeyCard = document.getElementById('api-key-card');
    const apiKeyCollapseButton = apiKeyCard.querySelector('.collapse-button');
    const apiKeyStatusIcon = apiKeyCard.querySelector('.api-key-status-icon');
    const apiKeyClearIcon = apiKeyCard.querySelector('.api-key-clear-icon');

    // Load API Key from storage
    const { geminiApiKey } = await chrome.storage.local.get(['geminiApiKey']);
    if (geminiApiKey) {
        apiKey = geminiApiKey;
        apiKeyInput.value = geminiApiKey;
        apiKeyStatusIcon.classList.add('active');
        apiKeyStatusIcon.classList.add('valid');
        apiKeyClearIcon.classList.add('active');
    } else {
        apiKeyStatusIcon.classList.add('active');
        apiKeyStatusIcon.classList.add('invalid');
    }

    // Load default target language for text translation
    const { textTargetLanguage } = await chrome.storage.local.get(['textTargetLanguage']);
    if (textTargetLanguage) {
        textTargetLanguageSelect.value = textTargetLanguage;
    }

    apiKeyCollapseButton.addEventListener('click', () => {
        apiKeyCard.classList.toggle('collapsed');
    });

    apiKeyInput.addEventListener('input', () => {
        if (apiKeyInput.value.trim()) {
            apiKeyClearIcon.classList.add('active');
        } else {
            apiKeyClearIcon.classList.remove('active');
        }
    });

    apiKeyClearIcon.addEventListener('click', async () => {
        apiKey = '';
        apiKeyInput.value = '';
        apiKeyClearIcon.classList.remove('active');
        apiKeyStatusIcon.classList.remove('valid');
        apiKeyStatusIcon.classList.add('invalid');
        await chrome.storage.local.remove('geminiApiKey');
    });

    saveApiKeyButton.addEventListener('click', async () => {
        const newApiKey = apiKeyInput.value.trim();
        
        // Sprawdź format klucza API
        if (!/^[A-Za-z0-9-_]{39}$/.test(newApiKey)) {
            apiKeyStatus.textContent = 'Invalid API key format';
            apiKeyStatus.style.color = 'red';
            apiKeyStatus.classList.add('active');
            return;
        }

        if (!newApiKey) {
            apiKeyStatus.textContent = 'API key cannot be empty';
            apiKeyStatus.classList.add('active');
            apiKeyStatus.style.color = 'red';
            apiKeyStatusIcon.classList.remove('valid');
            apiKeyStatusIcon.classList.add('invalid');
            return;
        }

        apiKeyStatus.textContent = 'Validating API key...';
        apiKeyStatus.classList.add('active');
        apiKeyStatus.style.color = 'orange';
        apiKeyStatusIcon.classList.remove('valid');
        apiKeyStatusIcon.classList.remove('invalid');

        try {
            const response = await fetch(`${API_URL}?key=${newApiKey}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    contents: [{
                        parts: [{
                            text: 'Test message'
                        }]
                    }]
                })
            });

            if (!response.ok) {
                apiKeyStatus.textContent = 'Invalid API key. Please check your key and try again.';
                apiKeyStatus.style.color = 'red';
                apiKeyStatus.classList.add('active');
                apiKeyStatusIcon.classList.remove('valid');
                apiKeyStatusIcon.classList.add('invalid');
                return;
            }

            apiKeyStatus.textContent = 'API key is valid';
            apiKeyStatus.style.color = 'green';
            apiKeyStatus.classList.add('active');
            apiKeyStatusIcon.classList.remove('invalid');
            apiKeyStatusIcon.classList.add('valid');
            apiKeyClearIcon.classList.add('active');
            await chrome.storage.local.set({ geminiApiKey: newApiKey });
            setTimeout(() => {
                apiKeyStatus.textContent = '';
                apiKeyStatus.classList.remove('active');
            }, 3000);
        } catch (error) {
            console.error("Error during API key validation:", error);
            apiKeyStatus.textContent = `API key validation failed: ${error.message}`;
            apiKeyStatus.style.color = 'red';
            apiKeyStatus.classList.add('active');
            apiKeyStatusIcon.classList.remove('valid');
            apiKeyStatusIcon.classList.add('invalid');
        }
    });

    translateTextButton.addEventListener('click', async () => {
        if (!apiKey) {
            textTranslationStatus.textContent = 'Please set your API key first';
            textTranslationStatus.style.color = 'red';
            textTranslationStatus.classList.add('active');
            return;
        }

        const text = textToTranslateTextarea.value.trim();
        const targetLanguage = textTargetLanguageSelect.value;
        await chrome.storage.local.set({ textTargetLanguage: targetLanguage });

        if (!text) {
            translatedTextTextarea.value = '';
            textTranslationStatus.textContent = 'Please enter text to translate';
            textTranslationStatus.style.color = 'red';
            textTranslationStatus.classList.add('active');
            return;
        }

        textTranslationStatus.textContent = 'Translating text...';
        textTranslationStatus.style.color = 'yellow';
        textTranslationStatus.classList.add('active');
        translatedTextTextarea.value = '';

        try {
            const response = await fetch(`${API_URL}?key=${apiKey}`, {
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
                textTranslationStatus.textContent = 'Translation failed.';
                textTranslationStatus.style.color = 'red';
                textTranslationStatus.classList.add('active');
                return;
            }

            const data = await response.json();
             if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                const translatedText = data.candidates[0].content.parts[0].text
                    .replace(/^["']|["']$/g, '') // Usuń cudzysłowy
                    .replace(/^Translate to.*?: /i, ''); // Usuń prefiks "Translate to X:"
                translatedTextTextarea.value = translatedText;
                textTranslationStatus.textContent = 'Text translation complete';
                textTranslationStatus.style.color = 'green';
                textTranslationStatus.classList.add('active');
                setTimeout(() => {
                    textTranslationStatus.textContent = '';
                    textTranslationStatus.classList.remove('active');
                }, 3000);
            } else {
                textTranslationStatus.textContent = 'Translation failed.';
                textTranslationStatus.style.color = 'red';
                textTranslationStatus.classList.add('active');
            }
        } catch (error) {
            console.error("Error during text translation:", error);
            textTranslationStatus.textContent = `Text translation failed: ${error.message}`;
            textTranslationStatus.style.color = 'red';
            textTranslationStatus.classList.add('active');
        }
    });

    // Listen for changes in chrome.storage.local
    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local' && changes.geminiApiKey) {
            apiKey = changes.geminiApiKey.newValue || '';
            apiKeyInput.value = apiKey;
            if (apiKey) {
                apiKeyStatusIcon.classList.remove('invalid');
                apiKeyStatusIcon.classList.add('valid');
                apiKeyClearIcon.classList.add('active');
            } else {
                apiKeyStatusIcon.classList.remove('valid');
                apiKeyStatusIcon.classList.add('invalid');
                apiKeyClearIcon.classList.remove('active');
            }
        }
        if (areaName === 'local' && changes.textTargetLanguage) {
            textTargetLanguageSelect.value = changes.textTargetLanguage.newValue;
        }
    });

    textTargetLanguageSelect.addEventListener('change', async () => {
        const targetLanguage = textTargetLanguageSelect.value;
        await chrome.storage.local.set({ textTargetLanguage: targetLanguage });
    });
}); 