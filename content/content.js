let icon;
let dialogBox;
let selectedText;
let targetLanguage;
let isScriptActive = true;
let isTranslationInProgress = false;

// Handle text selection
document.addEventListener('mouseup', async (event) => {
    if (!isScriptActive) return;

    setTimeout(async () => {
        // Sprawdź czy zaznaczenie jest w okienku dialogowym
        const selection = window.getSelection();
        if (dialogBox && dialogBox.contains(selection.anchorNode)) {
            return;
        }

        // Reszta istniejącej logiki
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA';
        
        if (isInput) {
            hideIcon();
            return;
        }
        
        selectedText = selection.toString().trim();
        if (selectedText) {
            if (selection && selection.rangeCount > 0) {
                const { selectedTextLanguage } = await chrome.storage.local.get(['selectedTextLanguage']);
                targetLanguage = selectedTextLanguage || 'English';
                showTranslationIcon(event);
            }
        }
    }, 10);
});

// Hide icon and dialog when clicking outside
document.addEventListener('mousedown', (event) => {
    if (icon && !icon.contains(event.target)) {
        hideIcon();
    }
    if (dialogBox && !dialogBox.contains(event.target)) {
        removeDialogBox();
        return;
    }
});

function showTranslationIcon(event) {
    if (!icon) {
        icon = document.createElement('div');
        icon.className = 'aiGeminiTranslator_translation-selected-text-icon';
        icon.innerHTML = `<img class="aiGeminiTranslator_translation-selected-text-icon-image" src="${chrome.runtime.getURL('icons/icon48.png')}" alt="Translate">`;
        icon.addEventListener('click', translateSelectedText);
        document.body.appendChild(icon);
    }

    const iconRect = icon.getBoundingClientRect();
    const viewportWidth = document.documentElement.clientWidth;
    const viewportHeight = document.documentElement.clientHeight;
    
    // Nowe obliczenia pozycji uwzględniające scroll
    let posX = event.clientX + window.scrollX;
    let posY = event.clientY + window.scrollY;
    
    // Dopasowanie pozycji do widocznego obszaru
    posX = Math.min(posX + 10, viewportWidth + window.scrollX - iconRect.width);
    posY = Math.min(posY - iconRect.height/2, viewportHeight + window.scrollY - iconRect.height);

    icon.style.left = `${posX}px`;
    icon.style.top = `${posY}px`;
    icon.style.display = 'block';
    icon.title = chrome.i18n.getMessage('translate_button');
}

function hideIcon() {
    if (icon) {
        icon.style.display = 'none';
    }
}

async function translateSelectedText() {
    if (!selectedText || isTranslationInProgress) return;
    
    isTranslationInProgress = true;
    const originalIcon = icon.innerHTML;
    icon.innerHTML = '<div class="aiGeminiTranslator_loadingGeminiTranslation"></div>';
    icon.style.pursor = 'wait';

    chrome.runtime.sendMessage({
        action: 'translateSelectedText',
        text: selectedText,
        targetLanguage: targetLanguage
    }, (response) => {
        isTranslationInProgress = false;
        if (chrome.runtime.lastError) {
            showDialogBox(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE'));
            return;
        }
        
        if (response?.translatedText) {
            hideIcon();
            showDialogBox(response.translatedText);
        } else {
            icon.innerHTML = originalIcon;
            icon.style.padding = '4px';
            showDialogBox(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE'));
        }
    });
}

function showDialogBox(translatedText) {
    if (dialogBox) {
        removeDialogBox();
    }

    // Store icon position before hiding it
    const iconRect = icon.getBoundingClientRect();
    const iconLeft = parseInt(icon.style.left);
    const iconTop = parseInt(icon.style.top);

    dialogBox = document.createElement('div');
    dialogBox.className = 'aiGeminiTranslator_translation-dialog';

    // Position dialog at the icon's location
    dialogBox.style.left = `${iconLeft}px`;
    dialogBox.style.top = `${iconTop}px`;

    // Create content container
    const content = document.createElement('div');
    content.className = 'aiGeminiTranslator_translation-content';
    content.textContent = translatedText;

    const isError = translatedText.includes(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE'));
    
    if (isError) {
        dialogBox.classList.add('error');
        content.classList.add('error');
    }

    dialogBox.appendChild(content);

    document.body.appendChild(dialogBox);

    // Adjust position if dialog would go outside viewport
    const dialogRect = dialogBox.getBoundingClientRect();
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;

    if (dialogRect.right > viewportWidth) {
        dialogBox.style.left = `${iconLeft - dialogRect.width}px`;
    }
    if (dialogRect.bottom > viewportHeight) {
        dialogBox.style.top = `${iconTop - dialogRect.height}px`;
    }
}

function removeDialogBox() {
    if (dialogBox) {
        dialogBox.remove();
        dialogBox = null;
        icon = null;
        selectedText = null;
    }
}

const createDOMElement = (type, classes, attributes) => {
    const el = document.createElement(type);
    if (classes) el.className = classes;
    if (attributes) {
        Object.entries(attributes).forEach(([key, value]) => {
            el.setAttribute(key, value);
        });
    }
    return el;
};

// Uproszczona obsługa zdarzeń
const handleKeyEvents = (e) => {
    if (e.key === 'Escape' && dialogBox) {
        removeDialogBox();
        return;
    }
    
    if (e.ctrlKey && e.key === 't' && selectedText) {
        e.preventDefault();
        translateSelectedText();
    }
};

document.addEventListener('keydown', handleKeyEvents);
