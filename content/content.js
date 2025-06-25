// Memory management - użyj WeakMap dla DOM references
const elementReferences = new WeakMap();
let cleanupFunctions = [];

let icon;
let dialogBox;
let selectedText;
let targetLanguage;
let isScriptActive = true;
let isTranslationInProgress = false;
let imageOverlay = null;
let isImageSelectionMode = false;
let screenshotSelector = null;
let isScreenshotMode = false;
let selectionStart = null;
let selectionEnd = null;

// Cleanup function
function cleanup() {
    if (icon) {
        icon.removeEventListener('click', translateSelectedText);
        if (icon.parentNode) {
            icon.parentNode.removeChild(icon);
        }
        icon = null;
    }
    
    if (dialogBox) {
        if (dialogBox.parentNode) {
            dialogBox.parentNode.removeChild(dialogBox);
        }
        dialogBox = null;
    }
    
    if (imageOverlay) {
        if (imageOverlay.parentNode) {
            imageOverlay.parentNode.removeChild(imageOverlay);
        }
        imageOverlay = null;
    }
    
    if (screenshotSelector) {
        if (screenshotSelector.parentNode) {
            screenshotSelector.parentNode.removeChild(screenshotSelector);
        }
        screenshotSelector = null;
    }
    
    selectedText = null;
    targetLanguage = null;
    isImageSelectionMode = false;
    isScreenshotMode = false;
    selectionStart = null;
    selectionEnd = null;
    
    // Cleanup all registered functions
    cleanupFunctions.forEach(fn => fn());
    cleanupFunctions = [];
}

// Improved event handler functions
const handleMouseUp = async (event) => {
    if (!isScriptActive) return;

    if (isScreenshotMode && selectionStart) {
        event.preventDefault();
        selectionEnd = {
            x: event.clientX + window.scrollX,
            y: event.clientY + window.scrollY
        };
        await captureScreenshotArea();
        return;
    }

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
};

const handleMouseDown = (event) => {
    if (isScreenshotMode) {
        event.preventDefault();
        selectionStart = {
            x: event.clientX + window.scrollX,
            y: event.clientY + window.scrollY
        };
        return;
    }
    
    if (icon && !icon.contains(event.target)) {
        hideIcon();
    }
    if (dialogBox && !dialogBox.contains(event.target)) {
        removeDialogBox();
        return;
    }
};

const handleKeyEvents = (e) => {
    if (e.key === 'Escape') {
        if (dialogBox) {
            removeDialogBox();
            return;
        }
        if (isImageSelectionMode) {
            exitImageSelectionMode();
            return;
        }
        if (isScreenshotMode) {
            exitScreenshotMode();
            return;
        }
    }
    
    if (e.ctrlKey && e.key === 't' && selectedText) {
        e.preventDefault();
        translateSelectedText();
    }
    
    if (e.ctrlKey && e.shiftKey && e.key === 'T') {
        e.preventDefault();
        startScreenshotMode();
    }
};

const handleContextMenu = (e) => {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        showImageTranslationOption(e.target, e);
    }
};

const handleMouseMove = (event) => {
    if (isScreenshotMode && selectionStart) {
        updateSelectionRectangle(event);
    }
};

// Register event listeners with cleanup
document.addEventListener('mouseup', handleMouseUp);
document.addEventListener('mousedown', handleMouseDown);
document.addEventListener('mousemove', handleMouseMove);
document.addEventListener('keydown', handleKeyEvents);
document.addEventListener('contextmenu', handleContextMenu);

// Register cleanup functions
cleanupFunctions.push(() => {
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('keydown', handleKeyEvents);
    document.removeEventListener('contextmenu', handleContextMenu);
});

// Page unload cleanup
window.addEventListener('beforeunload', cleanup);
cleanupFunctions.push(() => {
    window.removeEventListener('beforeunload', cleanup);
});

function showTranslationIcon(event) {
    if (!icon) {
        icon = document.createElement('div');
        icon.className = 'aiGeminiTranslator_translation-selected-text-icon';
        icon.innerHTML = `<img class="aiGeminiTranslator_translation-selected-text-icon-image" src="${chrome.runtime.getURL('icons/icon48.png')}" alt="Translate">`;
        icon.addEventListener('click', translateSelectedText);
        document.body.appendChild(icon);
        
        // Store reference in WeakMap for proper memory management
        elementReferences.set(icon, { type: 'translation-icon', created: Date.now() });
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
        // Clear any pending references
        selectedText = null;
    }
}

async function translateSelectedText() {
    if (!selectedText || isTranslationInProgress) return;
    
    isTranslationInProgress = true;
    const originalIcon = icon.innerHTML;
    icon.innerHTML = '<div class="aiGeminiTranslator_loadingGeminiTranslation"></div>';
    icon.style.cursor = 'wait';

    // Add timeout to prevent hanging
    const timeoutId = setTimeout(() => {
        isTranslationInProgress = false;
        if (icon) {
            icon.innerHTML = originalIcon;
            icon.style.cursor = 'pointer';
        }
        showDialogBox(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE') + ': Timeout');
    }, 30000); // 30 second timeout

    chrome.runtime.sendMessage({
        action: 'translateSelectedText',
        text: selectedText,
        targetLanguage: targetLanguage
    }, (response) => {
        clearTimeout(timeoutId); // Clear the timeout
        isTranslationInProgress = false;
        
        if (chrome.runtime.lastError) {
            if (icon) {
                icon.innerHTML = originalIcon;
                icon.style.cursor = 'pointer';
            }
            showDialogBox(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE'));
            return;
        }
        
        if (response?.translatedText) {
            hideIcon();
            showDialogBox(response.translatedText);
        } else {
            if (icon) {
                icon.innerHTML = originalIcon;
                icon.style.cursor = 'pointer';
            }
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
    
    // Store reference in WeakMap
    elementReferences.set(dialogBox, { type: 'translation-dialog', created: Date.now() });

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
        // Proper cleanup before removal
        elementReferences.delete(dialogBox);
        dialogBox.remove();
        dialogBox = null;
    }
    
    if (icon) {
        icon.removeEventListener('click', translateSelectedText);
        elementReferences.delete(icon);
        icon.remove();
        icon = null;
    }
    
    selectedText = null;
    targetLanguage = null;
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

// Screenshot translation functions
function startScreenshotMode() {
    if (isScreenshotMode) return;
    
    isScreenshotMode = true;
    document.body.style.cursor = 'crosshair';
    
    // Create overlay
    screenshotSelector = document.createElement('div');
    screenshotSelector.className = 'aiGeminiTranslator_screenshot-overlay';
    screenshotSelector.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: rgba(0, 0, 0, 0.3);
        z-index: 10000;
        cursor: crosshair;
        pointer-events: auto;
    `;
    
    // Create selection rectangle
    const selectionRect = document.createElement('div');
    selectionRect.className = 'aiGeminiTranslator_selection-rect';
    selectionRect.style.cssText = `
        position: absolute;
        border: 2px solid #4CAF50;
        background: rgba(76, 175, 80, 0.1);
        display: none;
        pointer-events: none;
    `;
    
    screenshotSelector.appendChild(selectionRect);
    document.body.appendChild(screenshotSelector);
    
    // Store reference in WeakMap
    elementReferences.set(screenshotSelector, { type: 'screenshot-selector', created: Date.now() });
    
    // Show instructions
    showScreenshotInstructions();
}

function updateSelectionRectangle(event) {
    if (!screenshotSelector || !selectionStart) return;
    
    const rect = screenshotSelector.querySelector('.aiGeminiTranslator_selection-rect');
    if (!rect) return;
    
    const currentX = event.clientX;
    const currentY = event.clientY;
    
    const left = Math.min(selectionStart.x - window.scrollX, currentX);
    const top = Math.min(selectionStart.y - window.scrollY, currentY);
    const width = Math.abs(currentX - (selectionStart.x - window.scrollX));
    const height = Math.abs(currentY - (selectionStart.y - window.scrollY));
    
    rect.style.cssText += `
        display: block;
        left: ${left}px;
        top: ${top}px;
        width: ${width}px;
        height: ${height}px;
    `;
}

function showScreenshotInstructions() {
    const instructions = document.createElement('div');
    instructions.className = 'aiGeminiTranslator_screenshot-instructions';
    instructions.style.cssText = `
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #333;
        color: white;
        padding: 10px 20px;
        border-radius: 5px;
        z-index: 10001;
        font-family: Arial, sans-serif;
        font-size: 14px;
        box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    instructions.textContent = 'Drag to select area for translation • ESC to cancel • Ctrl+Shift+T to start';
    
    screenshotSelector.appendChild(instructions);
    
    // Auto-hide instructions after 3 seconds
    setTimeout(() => {
        if (instructions && instructions.parentNode) {
            instructions.remove();
        }
    }, 3000);
}

async function captureScreenshotArea() {
    if (!selectionStart || !selectionEnd) return;
    
    const left = Math.min(selectionStart.x, selectionEnd.x);
    const top = Math.min(selectionStart.y, selectionEnd.y);
    const width = Math.abs(selectionEnd.x - selectionStart.x);
    const height = Math.abs(selectionEnd.y - selectionStart.y);
    
    // Minimum size check
    if (width < 10 || height < 10) {
        exitScreenshotMode();
        return;
    }
    
    try {
        // Show loading state
        showLoadingOverlay();
        
        // Get target language
        const { selectedTextLanguage } = await chrome.storage.local.get(['selectedTextLanguage']);
        const targetLang = selectedTextLanguage || 'English';
        
        // Send screenshot request to background script
        chrome.runtime.sendMessage({
            action: 'captureAndTranslateScreenshot',
            area: { left, top, width, height },
            targetLanguage: targetLang
        }, (response) => {
            exitScreenshotMode();
            
            if (chrome.runtime.lastError) {
                console.error('Runtime error:', chrome.runtime.lastError);
                showDialogBox(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE'));
                return;
            }
            
            if (response?.translatedText) {
                showDialogBox(response.translatedText);
            } else {
                showDialogBox(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE') + 
                           (response?.error ? ': ' + response.error : ''));
            }
        });
        
    } catch (error) {
        console.error('Screenshot capture error:', error);
        exitScreenshotMode();
        showDialogBox(chrome.i18n.getMessage('TRANSLATION_FAILED_MESSAGE'));
    }
}

function showLoadingOverlay() {
    const loading = document.createElement('div');
    loading.className = 'aiGeminiTranslator_screenshot-loading';
    loading.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: #333;
        color: white;
        padding: 20px;
        border-radius: 10px;
        z-index: 10002;
        font-family: Arial, sans-serif;
        text-align: center;
        box-shadow: 0 4px 20px rgba(0,0,0,0.5);
    `;
    loading.innerHTML = `
        <div style="margin-bottom: 10px;">📸 Capturing & Translating...</div>
        <div class="aiGeminiTranslator_loadingGeminiTranslation"></div>
    `;
    
    if (screenshotSelector) {
        screenshotSelector.appendChild(loading);
    }
}

function exitScreenshotMode() {
    isScreenshotMode = false;
    document.body.style.cursor = '';
    selectionStart = null;
    selectionEnd = null;
    
    if (screenshotSelector) {
        elementReferences.delete(screenshotSelector);
        screenshotSelector.remove();
        screenshotSelector = null;
    }
}

function exitImageSelectionMode() {
    // Placeholder for image selection mode exit
    isImageSelectionMode = false;
}

function showImageTranslationOption(img, event) {
    // Placeholder for image translation option
    console.log('Image translation not implemented yet');
}
