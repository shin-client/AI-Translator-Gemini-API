import config from '../background/config.js';

document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = config.API_URL;
    let apiKey = '';

    const apiKeyInput = document.getElementById('aiGeminiTranslator_api-key-input');
    const saveApiKeyButton = document.getElementById('aiGeminiTranslator_save-api-key-button');
    const textToTranslateTextarea = document.getElementById('aiGeminiTranslator_text-to-translate');
    const translatedTextTextarea = document.getElementById('aiGeminiTranslator_translated-text');
    const textTargetLanguageSelect = document.getElementById('aiGeminiTranslator_text-target-language');
    const translateTextButton = document.getElementById('aiGeminiTranslator_translate-text-button');
    const apiKeyStatus = document.getElementById('aiGeminiTranslator_api-key-status');
    const textTranslationStatus = document.getElementById('aiGeminiTranslator_text-translation-status');
    const apiKeyCard = document.getElementById('aiGeminiTranslator_api-key-card');
    const apiKeyCollapseButton = apiKeyCard.querySelector('.aiGeminiTranslator_collapse-button');
    const apiKeyStatusIcon = apiKeyCard.querySelector('.aiGeminiTranslator_api-key-status-icon');
    const apiKeyClearIcon = apiKeyCard.querySelector('.aiGeminiTranslator_api-key-clear-icon');

    // Load saved API key and target language
    const { geminiApiKey, textTargetLanguage } = await chrome.storage.local.get(['geminiApiKey', 'textTargetLanguage']);
    if (geminiApiKey) {
        apiKeyInput.value = geminiApiKey;
        apiKeyClearIcon.classList.add('active');
        apiKeyStatusIcon.classList.add('valid');
    } else {
        apiKeyStatusIcon.classList.add('invalid');
    }

    // Load default target language for text translation
    if (textTargetLanguage) {
        textTargetLanguageSelect.value = textTargetLanguage;
    } else {
        textTargetLanguageSelect.value = config.DEFAULT_TARGET_LANGUAGE;
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
        apiKeyInput.value = '';
        apiKeyClearIcon.classList.remove('active');
        apiKeyStatusIcon.classList.remove('valid');
        await chrome.storage.local.remove('geminiApiKey');
    });

    saveApiKeyButton.addEventListener('click', async () => {
        const newApiKey = apiKeyInput.value.trim();
        
        if (!/^[A-Za-z0-9-_]{39}$/.test(newApiKey)) {
            apiKeyStatus.textContent = config.API_KEY_INVALID_FORMAT_MESSAGE;
            apiKeyStatus.style.color = 'red';
            apiKeyStatus.classList.add('active');
            return;
        }

        if (!newApiKey) {
            apiKeyStatus.textContent = config.API_KEY_EMPTY_MESSAGE;
            apiKeyStatus.classList.add('active');
            apiKeyStatus.style.color = 'red';
            apiKeyStatusIcon.classList.remove('valid');
            apiKeyStatusIcon.classList.add('invalid');
            return;
        }

        apiKeyStatus.textContent = config.API_KEY_VALIDATION_MESSAGE;
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
                apiKeyStatus.textContent = config.API_KEY_INVALID_MESSAGE;
                apiKeyStatus.style.color = 'red';
                apiKeyStatus.classList.add('active');
                apiKeyStatusIcon.classList.remove('valid');
                apiKeyStatusIcon.classList.add('invalid');
                return;
            }

            apiKeyStatus.textContent = config.API_KEY_VALID_MESSAGE;
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
            apiKeyStatus.textContent = `Error: ${error.message}`;
            apiKeyStatus.style.color = 'red';
            apiKeyStatus.classList.add('active');
            apiKeyStatusIcon.classList.remove('valid');
            apiKeyStatusIcon.classList.add('invalid');
        }
    });

    translateTextButton.addEventListener('click', async () => {
        if (!apiKey) {
            textTranslationStatus.textContent = config.API_KEY_NOT_SET_MESSAGE;
            textTranslationStatus.style.color = 'red';
            textTranslationStatus.classList.add('active');
            return;
        }

        const text = textToTranslateTextarea.value.trim();
        const targetLanguage = textTargetLanguageSelect.value;
        await chrome.storage.local.set({ textTargetLanguage: targetLanguage });

        if (!text) {
            translatedTextTextarea.value = '';
            textTranslationStatus.textContent = config.TEXT_TO_TRANSLATE_EMPTY_MESSAGE;
            textTranslationStatus.style.color = 'red';
            textTranslationStatus.classList.add('active');
            return;
        }

        textTranslationStatus.textContent = config.TRANSLATION_IN_PROGRESS_MESSAGE;
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
                textTranslationStatus.textContent = config.TRANSLATION_FAILED_MESSAGE;
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
                textTranslationStatus.textContent = config.TRANSLATION_COMPLETE_MESSAGE;
                textTranslationStatus.style.color = 'green';
                textTranslationStatus.classList.add('active');
                setTimeout(() => {
                    textTranslationStatus.textContent = '';
                    textTranslationStatus.classList.remove('active');
                }, 3000);
            } else {
                textTranslationStatus.textContent = config.TRANSLATION_FAILED_MESSAGE;
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