import config from '../background/config.js';
import translationRequest from '../background/translationRequest.js';

document.addEventListener('DOMContentLoaded', async () => {
    const API_URL = config.API_URL;
    let apiKey = '';
    const elements = {
        apiKeyInput: document.getElementById('aiGeminiTranslator_api-key-input'),
        saveApiKeyButton: document.getElementById('aiGeminiTranslator_save-api-key-button'),
        textToTranslateTextarea: document.getElementById('aiGeminiTranslator_text-to-translate'),
        translatedTextTextarea: document.getElementById('aiGeminiTranslator_translated-text'),
        textTargetLanguageSelect: document.getElementById('aiGeminiTranslator_text-target-language'),
        translateTextButton: document.getElementById('aiGeminiTranslator_translate-text-button'),
        apiKeyStatus: document.getElementById('aiGeminiTranslator_api-key-status'),
        textTranslationStatus: document.getElementById('aiGeminiTranslator_text-translation-status'),
        apiKeyCard: document.getElementById('aiGeminiTranslator_api-key-card'),
        apiKeyCollapseButton: document.querySelector('.aiGeminiTranslator_collapse-button'),
        apiKeyStatusIcon: document.querySelector('.aiGeminiTranslator_api-key-status-icon'),
        apiKeyClearIcon: document.querySelector('.aiGeminiTranslator_api-key-clear-icon')
    };

    const { geminiApiKey, textTargetLanguage } = await chrome.storage.local.get(['geminiApiKey', 'textTargetLanguage']);
    if (geminiApiKey) {
        apiKey = geminiApiKey;
        elements.apiKeyInput.value = geminiApiKey;
        elements.apiKeyClearIcon.classList.add('active', 'valid');
    }

    elements.textTargetLanguageSelect.value = textTargetLanguage || config.DEFAULT_TARGET_LANGUAGE;

    elements.apiKeyCollapseButton.addEventListener('click', () => elements.apiKeyCard.classList.toggle('collapsed'));
    elements.apiKeyInput.addEventListener('input', () => {
        elements.apiKeyClearIcon.classList.toggle('active', !!elements.apiKeyInput.value.trim());
        elements.apiKeyStatusIcon.classList.toggle('active', true);
    });
    
    elements.apiKeyClearIcon.addEventListener('click', async () => {
        elements.apiKeyInput.value = '';
        elements.apiKeyClearIcon.classList.remove('active');
        await chrome.storage.local.remove('geminiApiKey');
    });

    elements.saveApiKeyButton.addEventListener('click', async () => {
        const newApiKey = elements.apiKeyInput.value.trim();
        if (!newApiKey) return updateStatus('API_KEY_EMPTY_MESSAGE', 'red', 'invalid');
        
        updateStatus('API_KEY_VALIDATION_MESSAGE', 'orange');
        
        try {
            const response = await fetch(`${API_URL}?key=${newApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config.TEST_MESSAGE_REQUEST_BODY)
            });

            const data = await response.json();
            if (!response.ok || !data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase().includes('test')) {
                return updateStatus('API_KEY_INVALID_MESSAGE', 'red', 'invalid');
            }

            updateStatus('API_KEY_VALID_MESSAGE', 'green', 'valid');
            await chrome.storage.local.set({ geminiApiKey: newApiKey });
            apiKey = newApiKey;
            elements.apiKeyInput.value = newApiKey;
            elements.apiKeyClearIcon.classList.add('active');
        } catch (error) {
            updateStatus(`Error: ${error.message}`, 'red', 'invalid');
        }
    });

    elements.translateTextButton.addEventListener('click', translateText);
    elements.textTargetLanguageSelect.addEventListener('change', async () => {
        await chrome.storage.local.set({ textTargetLanguage: elements.textTargetLanguageSelect.value });
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            if (changes.geminiApiKey) {
                elements.apiKeyInput.value = changes.geminiApiKey.newValue || '';
                elements.apiKeyClearIcon.classList.toggle('active', !!changes.geminiApiKey.newValue);
            }
            if (changes.textTargetLanguage) elements.textTargetLanguageSelect.value = changes.textTargetLanguage.newValue;
        }
    });

    function updateStatus(messageKey, color, iconType) {
        elements.apiKeyStatus.textContent = config[messageKey];
        elements.apiKeyStatus.style.color = color;
        elements.apiKeyStatusIcon.classList.toggle('valid', iconType === 'valid');
        elements.apiKeyStatusIcon.classList.toggle('invalid', iconType === 'invalid');
    }

    async function translateText() {
        if (!apiKey) return updateTranslationStatus('API_KEY_NOT_SET_MESSAGE', 'red');
        
        const text = elements.textToTranslateTextarea.value.trim();
        const targetLanguage = elements.textTargetLanguageSelect.value;
        await chrome.storage.local.set({ textTargetLanguage });

        if (!text) return updateTranslationStatus('TEXT_TO_TRANSLATE_EMPTY_MESSAGE', 'red');

        updateTranslationStatus('TRANSLATION_IN_PROGRESS_MESSAGE', 'yellow');
        elements.translatedTextTextarea.value = '';

        try {
            const response = await fetch(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(translationRequest(text, targetLanguage))
            });

            if (!response.ok) return updateTranslationStatus('TRANSLATION_FAILED_MESSAGE', 'red');
            
            const data = await response.json();
            if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
                elements.translatedTextTextarea.value = data.candidates[0].content.parts[0].text
                    .replace(/^["']|["']$/g, '')
                    .replace(/^Translate to.*?: /i, '');
                updateTranslationStatus('TRANSLATION_COMPLETE_MESSAGE', 'green');
            } else {
                updateTranslationStatus('TRANSLATION_FAILED_MESSAGE', 'red');
            }
        } catch (error) {
            updateTranslationStatus('TRANSLATION_FAILED_MESSAGE', 'red');
        }
    }

    function updateTranslationStatus(messageKey, color) {
        elements.textTranslationStatus.textContent = config[messageKey];
        elements.textTranslationStatus.style.color = color;
        elements.textTranslationStatus.classList.add('active');
        if (color === 'green') setTimeout(() => elements.textTranslationStatus.classList.remove('active'), 3000);
    }

    elements.textToTranslateTextarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            translateText();
        }
    });

    const textElements = {
        'aiGeminiTranslator_select-label': 'TEXT_TO_TRANSLATE_LABEL',
        'aiGeminiTranslator_translate-text-button': 'TRANSLATE_TEXT_BUTTON_TEXT',
        'aiGeminiTranslator_save-api-key-button': 'SAVE_API_KEY_BUTTON_TEXT',
        'aiGeminiTranslator_text-to-translate': 'TEXT_TO_TRANSLATE_PLACEHOLDER',
        'aiGeminiTranslator_translated-text': 'TRANSLATED_TEXT_PLACEHOLDER',
        'aiGeminiTranslator_text-translation-status': 'TEXT_TRANSLATION_STATUS_MESSAGE',
        'aiGeminiTranslator_api-key-input': 'API_KEY_PLACEHOLDER',
        'aiGeminiTranslator_translation-card-header-title': 'TRANSLATION_CARD_HEADER_TITLE',
        'aiGeminiTranslator_api-key-card-header-title': 'API_KEY_CARD_HEADER_TITLE'
    };

    Object.entries(textElements).forEach(([id, key]) => {
        const element = document.getElementById(id);
        if (!element) return;
        
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.placeholder = config[key];
        } else {
            element.textContent = config[key];
        }
    });
}); 