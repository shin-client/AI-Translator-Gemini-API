const config = {
    API_URL: 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent',
    DEFAULT_TARGET_LANGUAGE: 'English',
    API_KEY_VALIDATION_MESSAGE: 'Validating API key...',
    API_KEY_VALID_MESSAGE: 'API key is valid',
    API_KEY_INVALID_MESSAGE: 'Invalid API key. Please check your key and try again.',
    API_KEY_EMPTY_MESSAGE: 'API key cannot be empty',
    API_KEY_INVALID_FORMAT_MESSAGE: 'Invalid API key format',
    TRANSLATION_FAILED_MESSAGE: 'Translation failed.',
    TRANSLATION_IN_PROGRESS_MESSAGE: 'Translating text...',
    TRANSLATION_COMPLETE_MESSAGE: 'Text translation complete',
    API_KEY_NOT_SET_MESSAGE: 'Please set your API key first',
    TEXT_TO_TRANSLATE_EMPTY_MESSAGE: 'Please enter text to translate',
    TRANSLATION_REQUEST_BODY: (text, targetLanguage) => ({
        contents: [{
            parts: [{
                text: `Translate the following text to ${targetLanguage}. 
                If it's necessary, modify the text to sound natural for the ${targetLanguage}, use the appropriate grammar, do not translate proper names. 
                In the response, provide only the translation text without any additional descriptions or explanations. Following text:\n${text}`
            }]
        }]
    }),
    TEST_MESSAGE_REQUEST_BODY: {
        contents: [{
            parts: [{
                text: 'Test message'
            }]
        }]
    }
};

export default config;