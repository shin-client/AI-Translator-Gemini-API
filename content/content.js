let icon;
let dialogBox;
let selectedText;
let targetLanguage;
let isScriptActive = true;

// Handle text selection
document.addEventListener('mouseup', async (event) => {
    if (!isScriptActive) return;

    setTimeout(async () => {
        // Check if selection is within an input element
        const activeElement = document.activeElement;
        const isInput = activeElement.tagName === 'INPUT' || 
        activeElement.tagName === 'TEXTAREA';
        
        if (isInput) {
            hideIcon();
            return;
        }

        selectedText = window.getSelection().toString().trim();
        if (selectedText) {
            const selection = window.getSelection();
            if (selection && selection.rangeCount > 0) {
                const { textTargetLanguage } = await chrome.storage.local.get(['textTargetLanguage']);
                targetLanguage = textTargetLanguage || 'English';
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
        icon.innerHTML = `<img class="aiGeminiTranslator_translation-selected-text-icon-image" src="${chrome.runtime.getURL('images/icon48.png')}" alt="Translate">`;
        icon.addEventListener('click', translateSelectedText);
        document.body.appendChild(icon);
    }

    const iconSize = 28; // 20px icon + 8px padding
    const viewportWidth = window.innerWidth || document.documentElement.clientWidth;
    const viewportHeight = window.innerHeight || document.documentElement.clientHeight;
    
    // Use mouse position for icon placement
    let left = event.pageX + 5;
    let top = event.pageY - (iconSize / 2);

    // Adjust position if icon would be outside viewport
    if (left + iconSize > viewportWidth + window.pageXOffset) {
        left = event.pageX - iconSize - 5;
    }
    if (top < window.pageYOffset) {
        top = window.pageYOffset;
    } else if (top + iconSize > viewportHeight + window.pageYOffset) {
        top = window.pageYOffset + viewportHeight - iconSize;
    }

    icon.style.left = `${left}px`;
    icon.style.top = `${top}px`;
    icon.style.display = 'block';
}

function hideIcon() {
    if (icon) {
        icon.style.display = 'none';
    }
}

async function translateSelectedText() {
    if (!selectedText) return;

    // Show loading state
    const originalIcon = icon.innerHTML;
    icon.innerHTML = '<div class="aiGeminiTranslator_loadingGeminiTranslation"></div>';
    icon.style.padding = '8px';

    chrome.runtime.sendMessage({
        action: 'translateSelectedText',
        text: selectedText,
        targetLanguage: targetLanguage
    }, (response) => {
        if (response && response.translatedText) {
            hideIcon(); // Hide icon after successful translation
            showDialogBox(response.translatedText);
        } else {
            // Restore icon if translation failed
            icon.innerHTML = originalIcon;
            icon.style.padding = '4px';
            showDialogBox(('translationFailed'));
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
