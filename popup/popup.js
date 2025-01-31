import config from '../background/config.js';
import translationRequest from '../background/translationRequest.js';

// Define text elements for dynamic content
const textElements = {
    'aiGeminiTranslator_select-label': 'TEXT_TO_TRANSLATE_LABEL',
    'aiGeminiTranslator_translate-text-button': 'TRANSLATE_TEXT_BUTTON_TEXT',
    'aiGeminiTranslator_save-api-key-button': 'SAVE_API_KEY_BUTTON_TEXT',
    'aiGeminiTranslator_text-to-translate': 'TEXT_TO_TRANSLATE_PLACEHOLDER',
    'aiGeminiTranslator_translated-text': 'TRANSLATED_TEXT_PLACEHOLDER',
    'aiGeminiTranslator_text-translation-status': 'TEXT_TRANSLATION_STATUS_MESSAGE',
    'aiGeminiTranslator_api-key-input': 'API_KEY_PLACEHOLDER',
    'aiGeminiTranslator_translation-card-header-title': 'TRANSLATION_CARD_HEADER_TITLE',
    'aiGeminiTranslator_settings-card-header-title': 'SETTINGS_CARD_HEADER_TITLE',
    'aiGeminiTranslator_selected-text-language-label': 'SELECTED_TEXT_LANGUAGE_LABEL',
    'aiGeminiTranslator_api-key-label': 'API_KEY_LABEL',
    'aiGeminiTranslator_copy-icon': 'COPY_ICON_TOOLTIP'
};

document.addEventListener('DOMContentLoaded', async () => {
    // Get API URL from config
    const API_URL = config.API_URL;
    let apiKey = '';

    // Get DOM elements
    const elements = {
        apiKeyInput: document.getElementById('aiGeminiTranslator_api-key-input'),
        saveApiKeyButton: document.getElementById('aiGeminiTranslator_save-api-key-button'),
        textToTranslateTextarea: document.getElementById('aiGeminiTranslator_text-to-translate'),
        translatedTextTextarea: document.getElementById('aiGeminiTranslator_translated-text'),
        textTargetLanguageSelect: document.getElementById('aiGeminiTranslator_text-target-language'),
        translateTextButton: document.getElementById('aiGeminiTranslator_translate-text-button'),
        apiKeyStatus: document.getElementById('aiGeminiTranslator_api-key-status'),
        textTranslationStatus: document.getElementById('aiGeminiTranslator_text-translation-status'),
        settingsCard: document.querySelector('.aiGeminiTranslator_card.collapsed'),
        settingsCollapseButton: document.querySelector('.aiGeminiTranslator_card.collapsed .aiGeminiTranslator_collapse-button'),
        apiKeyStatusIcon: document.querySelector('.aiGeminiTranslator_api-key-status-icon'),
        apiKeyClearIcon: document.querySelector('.aiGeminiTranslator_api-key-clear-icon'),
        copyIcon: document.querySelector('.aiGeminiTranslator_copy-icon'),
        apiStatusTooltip: document.querySelector('.aiGeminiTranslator_api-status-tooltip'),
        selectedTextLanguageSelect: document.getElementById('aiGeminiTranslator_selected-text-language'),
        statusElement: document.getElementById('aiGeminiTranslator_status')
    };

    // Initialize text content and placeholders
    Object.entries(textElements).forEach(([id, key]) => {
        const element = document.getElementById(id);
        if (!element) return;

        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
            element.placeholder = config[key];
        } else {
            element.textContent = config[key];
        }
    });

    // Load API key and target language from storage
    const { geminiApiKey, textTargetLanguage, selectedTextLanguage } = await chrome.storage.local.get(['geminiApiKey', 'textTargetLanguage', 'selectedTextLanguage']);
    if (geminiApiKey) {
        apiKey = geminiApiKey;
        elements.apiKeyInput.value = geminiApiKey;
        elements.apiKeyClearIcon.classList.add('active');
        elements.apiKeyStatusIcon.classList.add('valid');
        elements.apiStatusTooltip.textContent = config.API_STATUS_VALID_TOOLTIP;
        elements.apiStatusTooltip.style.color = '#4CAF50';
    } else {
        elements.apiStatusTooltip.textContent = config.API_STATUS_INVALID_TOOLTIP;
        elements.apiStatusTooltip.style.color = '#F44336';
    }

    elements.textTargetLanguageSelect.value = textTargetLanguage || config.DEFAULT_TARGET_LANGUAGE;
    elements.selectedTextLanguageSelect.value = selectedTextLanguage || 'English';

    // Event listeners
    elements.settingsCollapseButton.addEventListener('click', (e) => {
        e.preventDefault();
        elements.settingsCard.classList.toggle('collapsed');
    });

    elements.apiKeyInput.addEventListener('input', () => {
        elements.apiKeyClearIcon.classList.toggle('active', !!elements.apiKeyInput.value.trim());
    });

    elements.apiKeyClearIcon.addEventListener('click', async () => {
        elements.apiKeyClearIcon.classList.remove('active');
        setTimeout(async () => {
            await chrome.storage.local.remove('geminiApiKey');
            elements.apiKeyInput.value = '';
            elements.apiKeyStatusIcon.classList.remove('valid');
        }, 300);
    });

    elements.saveApiKeyButton.addEventListener('click', async () => {
        const newApiKey = elements.apiKeyInput.value.trim();
        if (!newApiKey) return updateStatus('API_KEY_EMPTY_MESSAGE', 'red');

        updateStatus('API_KEY_VALIDATION_MESSAGE', 'orange');

        try {
            const response = await fetch(`${API_URL}?key=${newApiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(config.TEST_MESSAGE_REQUEST_BODY)
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                return updateStatus('API_KEY_INVALID_MESSAGE', 'red');
            }

            const data = await response.json();
            if (!data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim().toLowerCase().includes('test')) {
                 return updateStatus('API_KEY_INVALID_MESSAGE', 'red');
            }

            updateStatus('API_KEY_VALID_MESSAGE', 'green');
            await chrome.storage.local.set({ geminiApiKey: newApiKey });
            apiKey = newApiKey;
            elements.apiKeyInput.value = newApiKey;
            elements.apiKeyClearIcon.classList.add('active');
            elements.apiKeyStatusIcon.classList.add('valid');
        } catch (error) {
            console.error("Error during API key validation:", error);
            updateStatus(`Error: ${error.message}`, 'red');
        }
    });

    elements.translateTextButton.addEventListener('click', translateText);
    elements.textTargetLanguageSelect.addEventListener('change', async () => {
        await chrome.storage.local.set({ textTargetLanguage: elements.textTargetLanguageSelect.value });
    });

    elements.copyIcon.addEventListener('click', async () => {
        const textToCopy = elements.translatedTextTextarea.value;
        
        if (!textToCopy) {
            showCopyStatus(config.COPY_NO_TEXT_MESSAGE, 'var(--copy-error-color)');
            return;
        }
        
        try {
            await navigator.clipboard.writeText(textToCopy);
            showCopyStatus(config.COPY_SUCCESS_MESSAGE, 'var(--text-color)');
        } catch (err) {
            console.error('Failed to copy text:', err);
            showCopyStatus(config.COPY_FAILED_MESSAGE, 'var(--copy-error-color)');
        }
    });

    elements.copyIcon.title = config.COPY_ICON_TOOLTIP;

    elements.selectedTextLanguageSelect.addEventListener('change', async () => {
        const newValue = elements.selectedTextLanguageSelect.value;
        await chrome.storage.local.set({ selectedTextLanguage: newValue });
        
        // Zaktualizuj widok selecta
        initializeSelect(
            elements.selectedTextLanguageSelect, 
            config.LANGUAGES, 
            newValue
        );
    });

    chrome.storage.onChanged.addListener((changes, areaName) => {
        if (areaName === 'local') {
            if (changes.geminiApiKey) {
                elements.apiKeyInput.value = changes.geminiApiKey.newValue || '';
                elements.apiKeyClearIcon.classList.toggle('active', !!changes.geminiApiKey.newValue);
            }
            if (changes.textTargetLanguage) elements.textTargetLanguageSelect.value = changes.textTargetLanguage.newValue;
            if (changes.apiKeyStatus) {
                const icon = changes.apiKeyStatus.newValue === 'valid' 
                    ? 'valid'
                    : 'invalid';
                elements.apiKeyStatusIcon.classList.toggle('valid', icon === 'valid');
                elements.apiKeyStatusIcon.classList.toggle('invalid', icon === 'invalid');
            }
            if (changes.selectedTextLanguage) elements.selectedTextLanguageSelect.value = changes.selectedTextLanguage.newValue;
        }
    });

    // Timeout IDs for status messages
    let apiKeyStatusTimeoutId = null;
    let translationStatusTimeoutId = null;

    function updateStatus(messageKey, color) {
        elements.apiKeyStatus.textContent = config[messageKey];
        elements.apiKeyStatus.style.color = color;
        
        if (color === 'green') {
            elements.apiKeyStatusIcon.classList.add('valid');
            elements.apiKeyStatusIcon.classList.remove('invalid');
            elements.apiKeyClearIcon.style.display = 'block';
        } else {
            elements.apiKeyStatusIcon.classList.add('invalid');
            elements.apiKeyStatusIcon.classList.remove('valid');
            elements.apiKeyClearIcon.style.display = 'none';
        }
        
        // Automatyczne chowanie komunikatu tekstowego
        elements.apiKeyStatus.style.display = 'block';
        clearTimeout(apiKeyStatusTimeoutId);
        apiKeyStatusTimeoutId = setTimeout(() => {
            elements.apiKeyStatus.style.display = 'none';
        }, 5000);

        // Aktualizuj treść i kolor tooltipa
        const hasValidApiKey = color === 'green';
        elements.apiStatusTooltip.textContent = hasValidApiKey 
            ? config.API_STATUS_VALID_TOOLTIP 
            : config.API_STATUS_INVALID_TOOLTIP;
        elements.apiStatusTooltip.style.color = hasValidApiKey ? '#4CAF50' : '#F44336';
        
        // Aktualizuj klasę ikony statusu
        elements.apiKeyStatusIcon.classList.toggle('valid', hasValidApiKey);
        elements.apiKeyStatusIcon.classList.toggle('invalid', !hasValidApiKey);
    }

    function updateTranslationStatus(messageKey, color) {
        elements.textTranslationStatus.textContent = config[messageKey];
        elements.textTranslationStatus.style.color = color;
        elements.textTranslationStatus.style.display = 'block';
        
        clearTimeout(translationStatusTimeoutId);
        translationStatusTimeoutId = setTimeout(() => {
            elements.textTranslationStatus.style.display = 'none';
        }, color === 'green' ? 3000 : 5000);
    }

    async function translateText() {
        if (!apiKey) return updateTranslationStatus('API_KEY_NOT_SET_MESSAGE', 'red');

        const text = elements.textToTranslateTextarea.value.trim();
        const targetLanguage = elements.textTargetLanguageSelect.value;

        if (!text) return updateTranslationStatus('TEXT_TO_TRANSLATE_EMPTY_MESSAGE', 'red');

        updateTranslationStatus('TRANSLATION_IN_PROGRESS_MESSAGE', 'yellow');
        elements.translatedTextTextarea.value = '';

        try {
            const response = await fetch(`${API_URL}?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(translationRequest(text, targetLanguage))
            });

            if (!response.ok) {
                const errorData = await response.json();
                console.error("API Error:", errorData);
                return updateTranslationStatus(`${config.TRANSLATION_FAILED_MESSAGE}: ${errorData.error?.message || 'Unknown error'}`, 'red');
            }

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
            console.error("Error during text translation:", error);
            updateTranslationStatus(`${config.TRANSLATION_FAILED_MESSAGE}: ${error.message}`, 'red');
        }
    }

    elements.textToTranslateTextarea.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            translateText();
        }
    });

    // Na początku pliku dodaj zmienne CSS
    document.documentElement.style.setProperty('--valid-icon', `url("${config.VALID_ICON_SVG}")`);
    document.documentElement.style.setProperty('--invalid-icon', `url("${config.INVALID_ICON_SVG}")`);
    document.documentElement.style.setProperty('--copy-icon', `url("${config.COPY_ICON_SVG}")`);
    document.documentElement.style.setProperty('--copy-error-color', '#ff4444');

    // Dodaj nową funkcję statusu kopiowania
    function showCopyStatus(message, color) {
        const tooltip = document.querySelector('.aiGeminiTranslator_copy-tooltip');
        tooltip.textContent = message;
        tooltip.style.color = color;
        tooltip.classList.add('visible');
        
        setTimeout(() => {
            tooltip.classList.remove('visible');
        }, 2000);
    }

    // Zmodyfikuj funkcję initializeSelect
    const initializeSelect = (selectElement, languages, selectedValue) => {
        selectElement.innerHTML = languages.map(lang => 
            `<option value="${lang.value}" ${lang.value === selectedValue ? 'selected' : ''}>${lang.label}</option>`
        ).join('');
    };

    const initializeAllSelects = async () => {
        const { textTargetLanguage, selectedTextLanguage } = await chrome.storage.local.get([
            'textTargetLanguage', 
            'selectedTextLanguage'
        ]);
        
        const selectsConfig = [
            {
                element: elements.textTargetLanguageSelect,
                defaultValue: textTargetLanguage || config.DEFAULT_TARGET_LANGUAGE
            },
            {
                element: elements.selectedTextLanguageSelect,
                defaultValue: selectedTextLanguage || 'English'
            }
        ];
        
        selectsConfig.forEach(({ element, defaultValue }) => {
            initializeSelect(element, config.LANGUAGES, defaultValue);
        });
    };

    // Wywołanie w DOMContentLoaded
    await initializeAllSelects();

    const setupEventListeners = () => {
        const handlers = {
            'input #apiKeyInput': handleApiKeyInput,
            'click #saveButton': handleSaveApiKey,
            'change .language-select': handleLanguageChange
        };

        Object.entries(handlers).forEach(([event, handler]) => {
            const [eventType, selector] = event.split(' ');
            document.querySelector(selector).addEventListener(eventType, handler);
        });
    };

    const showStatus = (message, type = 'info') => {
        const colors = {
            error: '#ff4444',
            success: '#4CAF50',
            info: '#bb86fc'
        };
        
        elements.statusElement.textContent = message;
        elements.statusElement.style.color = colors[type];
        elements.statusElement.style.display = 'block';
        
        setTimeout(() => {
            elements.statusElement.style.display = 'none';
        }, 3000);
    };
}); 