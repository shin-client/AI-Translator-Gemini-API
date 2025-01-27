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
    }
};

export default config;