const config = {
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    DEFAULT_TARGET_LANGUAGE: 'English',
    API_KEY_VALIDATION_MESSAGE: 'Validating API key...',
    API_KEY_VALID_MESSAGE: 'API key is valid',
    API_KEY_INVALID_MESSAGE: 'Invalid API key.',
    API_KEY_EMPTY_MESSAGE: 'API key cannot be empty',
    API_KEY_INVALID_FORMAT_MESSAGE: 'Invalid API key format.',
    TRANSLATION_FAILED_MESSAGE: 'Translation failed.',
    TRANSLATION_IN_PROGRESS_MESSAGE: 'Translating text...',
    TRANSLATION_COMPLETE_MESSAGE: 'Translation complete',
    API_KEY_NOT_SET_MESSAGE: 'Please set your API key first',
    TEXT_TO_TRANSLATE_EMPTY_MESSAGE: 'Please enter text to translate',
    TEXT_TO_TRANSLATE_LABEL: 'Language:',
    TRANSLATE_TEXT_BUTTON_TEXT: 'Translate',
    SAVE_API_KEY_BUTTON_TEXT: 'Save API Key',
    TEXT_TO_TRANSLATE_PLACEHOLDER: 'Enter text to translate',
    TRANSLATED_TEXT_PLACEHOLDER: 'Translation',
    TEXT_TRANSLATION_STATUS_MESSAGE: 'Text translation status',
    API_KEY_PLACEHOLDER: 'Enter your Gemini-2.0-flash API Key',
    API_KEY_CARD_HEADER_TITLE: 'API Key',
    SETTINGS_CARD_HEADER_TITLE: 'Settings',
    TRANSLATION_CARD_HEADER_TITLE: 'Translation',
    TEST_MESSAGE_REQUEST_BODY: {
        contents: [{
            parts: [{
                text: "Translate the word 'test' to English. Respond only with the translated word, nothing else."
            }]
        }],
        generationConfig: {
            maxOutputTokens: 5,
            temperature: 0.0,
            topP: 0.1
        }
    },
    CLEAR_ICON_SVG: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23e0e0e0'%3E%3Cpath d='M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z'/%3E%3C/svg%3E`,
    VALID_ICON_SVG: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%234caf50'%3E%3Cpath d='M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z'/%3E%3C/svg%3E`,
    INVALID_ICON_SVG: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23f44336'%3E%3Cpath d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z'/%3E%3C/svg%3E`,
    COPY_ICON_SVG: `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23bb86fc'%3E%3Cpath d='M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z'/%3E%3C/svg%3E`,
    COPY_SUCCESS_MESSAGE: 'Text copied to clipboard!',
    COPY_FAILED_MESSAGE: 'Failed to copy text',
    COPY_NO_TEXT_MESSAGE: 'No text to copy',
    API_STATUS_VALID_TOOLTIP: 'API key status: Valid',
    API_STATUS_INVALID_TOOLTIP: 'API key status: Invalid',
    SELECTED_TEXT_LANGUAGE_LABEL: 'Selected Text Translation Language',
    API_KEY_LABEL: 'API Key',
    COPY_ICON_TOOLTIP: 'Copy translation to clipboard',
    LANGUAGES: [
        { value: 'English', label: 'English' },
        { value: 'Polish', label: 'Polski' },
        { value: 'German', label: 'Deutsch' },
        { value: 'Spanish', label: 'Español' },
        { value: 'French', label: 'Français' },
        { value: 'Italian', label: 'Italiano' },
        { value: 'Portuguese', label: 'Português' },
        { value: 'Russian', label: 'Русский' },
        { value: 'Chinese', label: '中文' },
        { value: 'Japanese', label: '日本語' },
        { value: 'Korean', label: '한국어' }
    ]
};

export default config;