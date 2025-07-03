import config from "../background/config.js";
import translationRequest from "../background/translationRequest.js";

// Define text elements for dynamic content
const textElements = {
  "aiGeminiTranslator_select-label": "TEXT_TO_TRANSLATE_LABEL",
  "aiGeminiTranslator_translate-text-button": "TRANSLATE_TEXT_BUTTON_TEXT",
  "aiGeminiTranslator_save-api-key-button": "SAVE_API_KEY_BUTTON_TEXT",
  "aiGeminiTranslator_text-to-translate": "TEXT_TO_TRANSLATE_PLACEHOLDER",
  "aiGeminiTranslator_translated-text": "TRANSLATED_TEXT_PLACEHOLDER",
  "aiGeminiTranslator_text-translation-status":
    "TEXT_TRANSLATION_STATUS_MESSAGE",
  "aiGeminiTranslator_api-key-input": "API_KEY_PLACEHOLDER",
  "aiGeminiTranslator_translation-card-header-title":
    "TRANSLATION_CARD_HEADER_TITLE",
  "aiGeminiTranslator_settings-card-header-title": "SETTINGS_CARD_HEADER_TITLE",
  "aiGeminiTranslator_selected-text-language-label":
    "SELECTED_TEXT_LANGUAGE_LABEL",
  "aiGeminiTranslator_api-key-label": "API_KEY_LABEL",
  "aiGeminiTranslator_copy-icon": "COPY_ICON_TOOLTIP",
  "aiGeminiTranslator_history-card-header-title": "HISTORY_CARD_HEADER_TITLE",
  "aiGeminiTranslator_select-all-button": "HISTORY_SELECT_ALL_BUTTON_TEXT",
  "aiGeminiTranslator_delete-selected-button":
    "HISTORY_DELETE_SELECTED_BUTTON_TEXT",
};

const systemLanguage = chrome.i18n.getUILanguage().split("-")[0];

document.addEventListener("DOMContentLoaded", async () => {
  // Get API URL from config
  const API_URL =
    "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";
  let apiKey = "";

  // Get DOM elements
  const elements = {
    apiKeyInput: document.getElementById("aiGeminiTranslator_api-key-input"),
    saveApiKeyButton: document.getElementById(
      "aiGeminiTranslator_save-api-key-button"
    ),
    showApiStatusButton: document.getElementById(
      "aiGeminiTranslator_show-api-status-button"
    ),
    textToTranslateTextarea: document.getElementById(
      "aiGeminiTranslator_text-to-translate"
    ),
    translatedTextTextarea: document.getElementById(
      "aiGeminiTranslator_translated-text"
    ),
    textTargetLanguageSelect: document.getElementById(
      "aiGeminiTranslator_text-target-language"
    ),
    translateTextButton: document.getElementById(
      "aiGeminiTranslator_translate-text-button"
    ),
    apiKeyStatus: document.getElementById("aiGeminiTranslator_api-key-status"),
    textTranslationStatus: document.getElementById(
      "aiGeminiTranslator_text-translation-status"
    ),
    settingsCard: document.querySelector(".aiGeminiTranslator_card.collapsed"),
    settingsHeader: document.querySelector("#settingsHeader"),
    apiKeyStatusIcon: document.querySelector(
      ".aiGeminiTranslator_api-key-status-icon"
    ),
    apiKeyClearIcon: document.querySelector(
      ".aiGeminiTranslator_api-key-clear-icon"
    ),
    copyIcon: document.querySelector(".aiGeminiTranslator_copy-icon"),
    apiStatusTooltip: document.querySelector(
      ".aiGeminiTranslator_api-status-tooltip"
    ),
    selectedTextLanguageSelect: document.getElementById(
      "aiGeminiTranslator_selected-text-language"
    ),
    statusElement: document.getElementById("aiGeminiTranslator_status"),
    historyList: document.getElementById("aiGeminiTranslator_history-list"),
    selectAllButton: document.getElementById(
      "aiGeminiTranslator_select-all-button"
    ),
    deleteSelectedButton: document.getElementById(
      "aiGeminiTranslator_delete-selected-button"
    ),
  };

  // Initialize text content and placeholders
  Object.entries(textElements).forEach(([id, key]) => {
    const element = document.getElementById(id);
    if (!element) return;

    if (
      element instanceof HTMLInputElement ||
      element instanceof HTMLTextAreaElement
    ) {
      element.placeholder = chrome.i18n.getMessage(key);
    } else {
      element.textContent = chrome.i18n.getMessage(key);
    }
  });

  // Load API key, target language, and last translation session from storage
  const {
    geminiApiKey,
    textTargetLanguage,
    selectedTextLanguage,
    lastTranslationSession,
  } = await chrome.storage.local.get([
    "geminiApiKey",
    "textTargetLanguage",
    "selectedTextLanguage",
    "lastTranslationSession",
  ]);
  if (geminiApiKey) {
    apiKey = geminiApiKey;
    elements.apiKeyInput.value = geminiApiKey;
    elements.apiKeyClearIcon.classList.add("active");
    elements.apiKeyStatusIcon.classList.add("valid");
    elements.apiStatusTooltip.textContent = chrome.i18n.getMessage(
      "API_STATUS_VALID_TOOLTIP"
    );
    elements.apiStatusTooltip.style.color = "#4CAF50";
  } else {
    elements.apiStatusTooltip.textContent = chrome.i18n.getMessage(
      "API_STATUS_INVALID_TOOLTIP"
    );
    elements.apiStatusTooltip.style.color = "#F44336";
  }

  elements.textTargetLanguageSelect.value =
    textTargetLanguage || config.DEFAULT_TARGET_LANGUAGE;
  elements.selectedTextLanguageSelect.value = selectedTextLanguage || "English";

  // Restore last translation session if available
  if (lastTranslationSession) {
    elements.textToTranslateTextarea.value =
      lastTranslationSession.originalText || "";
    elements.translatedTextTextarea.value =
      lastTranslationSession.translatedText || "";
    if (lastTranslationSession.targetLanguage) {
      elements.textTargetLanguageSelect.value =
        lastTranslationSession.targetLanguage;
    }
  }

  // Timeout IDs for status messages and session saving
  let apiKeyStatusTimeoutId = null;
  let translationStatusTimeoutId = null;
  let sessionSaveTimeoutId = null;

  // Debounced function to save translation session
  const saveTranslationSession = () => {
    clearTimeout(sessionSaveTimeoutId);
    sessionSaveTimeoutId = setTimeout(async () => {
      try {
        await chrome.storage.local.set({
          lastTranslationSession: {
            originalText: elements.textToTranslateTextarea.value,
            translatedText: elements.translatedTextTextarea.value,
            targetLanguage: elements.textTargetLanguageSelect.value,
            timestamp: Date.now(),
          },
        });
      } catch (error) {
        console.warn("Failed to save translation session:", error);
      }
    }, 500); // 500ms debounce
  };

  // History management functions
  async function loadTranslationHistory() {
    try {
      const { translationHistory = [] } = await chrome.storage.local.get([
        "translationHistory",
      ]);
      renderHistoryList(translationHistory);
    } catch (error) {
      console.warn("Failed to load translation history:", error);
    }
  }

  async function addToHistory(
    originalText,
    translatedText,
    targetLanguage,
    sourceLanguage = null
  ) {
    try {
      const { translationHistory = [] } = await chrome.storage.local.get([
        "translationHistory",
      ]);

      // Detect source language if not provided
      if (!sourceLanguage) {
        sourceLanguage = elements.selectedTextLanguageSelect.value || "auto";
      }

      // Check if identical translation already exists (avoid duplicates)
      const isDuplicate = translationHistory.some(
        (item) =>
          item.originalText === originalText &&
          item.translatedText === translatedText &&
          item.targetLanguage === targetLanguage &&
          item.sourceLanguage === sourceLanguage
      );

      if (isDuplicate) return;

      const newHistoryItem = {
        id: Date.now().toString(),
        originalText,
        translatedText,
        sourceLanguage,
        targetLanguage,
        timestamp: Date.now(),
      };

      // Add to beginning and limit to 20 items
      const updatedHistory = [newHistoryItem, ...translationHistory].slice(
        0,
        20
      );

      await chrome.storage.local.set({ translationHistory: updatedHistory });
      renderHistoryList(updatedHistory);
    } catch (error) {
      console.warn("Failed to add to history:", error);
    }
  }

  // Selected history items tracking
  let selectedHistoryItems = new Set();

  function renderHistoryList(history) {
    if (!elements.historyList) return;

    elements.historyList.innerHTML = "";

    if (history.length === 0) {
      const emptyMessage = document.createElement("div");
      emptyMessage.className = "aiGeminiTranslator_history-empty";
      emptyMessage.textContent = chrome.i18n.getMessage(
        "HISTORY_EMPTY_MESSAGE"
      );
      elements.historyList.appendChild(emptyMessage);
      updateSelectionButtons();
      return;
    }

    history.forEach((item) => {
      const historyCard = document.createElement("div");
      historyCard.className = "aiGeminiTranslator_history-card";
      historyCard.dataset.itemId = item.id;

      // Add selection checkbox
      const checkbox = document.createElement("div");
      checkbox.className = "aiGeminiTranslator_history-checkbox";
      checkbox.addEventListener("click", (e) => {
        e.stopPropagation();
        toggleHistoryItemSelection(item.id);
      });

      // Content container
      const contentDiv = document.createElement("div");
      contentDiv.className = "aiGeminiTranslator_history-content";

      const originalDiv = document.createElement("div");
      originalDiv.className = "aiGeminiTranslator_history-original";
      originalDiv.textContent =
        item.originalText.length > 25
          ? item.originalText.substring(0, 25) + "..."
          : item.originalText;
      originalDiv.title = item.originalText;

      const translatedDiv = document.createElement("div");
      translatedDiv.className = "aiGeminiTranslator_history-translated";
      translatedDiv.textContent =
        item.translatedText.length > 25
          ? item.translatedText.substring(0, 25) + "..."
          : item.translatedText;
      translatedDiv.title = item.translatedText;

      // Language direction display
      const langDiv = document.createElement("div");
      langDiv.className = "aiGeminiTranslator_history-languages";

      // Get language labels from config
      const getLanguageLabel = (langCode) => {
        const lang = config.LANGUAGES.find((l) => l.value === langCode);
        return lang ? lang.label : langCode;
      };

      const sourceLanguage = item.sourceLanguage || "auto";
      const sourceLangLabel =
        sourceLanguage === "auto" ? "Auto" : getLanguageLabel(sourceLanguage);
      const targetLangLabel = getLanguageLabel(item.targetLanguage);

      langDiv.innerHTML = `
                <span class="aiGeminiTranslator_source-lang">${sourceLangLabel}</span>
                <span class="aiGeminiTranslator_lang-arrow">→</span>
                <span class="aiGeminiTranslator_target-lang">${targetLangLabel}</span>
            `;

      contentDiv.appendChild(originalDiv);
      contentDiv.appendChild(translatedDiv);
      contentDiv.appendChild(langDiv);

      historyCard.appendChild(checkbox);
      historyCard.appendChild(contentDiv);

      // Add click handler for content restoration
      contentDiv.addEventListener("click", () => restoreFromHistory(item));

      // Apply selection state
      if (selectedHistoryItems.has(item.id)) {
        historyCard.classList.add("selected");
        checkbox.classList.add("checked");
      }

      elements.historyList.appendChild(historyCard);
    });

    updateSelectionButtons();
  }

  function restoreFromHistory(historyItem) {
    elements.textToTranslateTextarea.value = historyItem.originalText;
    elements.translatedTextTextarea.value = historyItem.translatedText;
    elements.textTargetLanguageSelect.value = historyItem.targetLanguage;

    // Save restored session
    saveTranslationSession();
  }

  function toggleHistoryItemSelection(itemId) {
    if (selectedHistoryItems.has(itemId)) {
      selectedHistoryItems.delete(itemId);
    } else {
      selectedHistoryItems.add(itemId);
    }

    // Update visual state
    const card = document.querySelector(`[data-item-id="${itemId}"]`);
    if (card) {
      const checkbox = card.querySelector(
        ".aiGeminiTranslator_history-checkbox"
      );
      card.classList.toggle("selected");
      checkbox.classList.toggle("checked");
    }

    updateSelectionButtons();
  }

  function updateSelectionButtons() {
    const hasSelection = selectedHistoryItems.size > 0;
    const historyCards = elements.historyList.querySelectorAll(
      ".aiGeminiTranslator_history-card[data-item-id]"
    );
    const totalItems = historyCards.length;
    const hasItems = totalItems > 0;

    elements.deleteSelectedButton.disabled = !hasSelection;
    elements.selectAllButton.disabled = !hasItems;

    // Update select all button text
    if (hasItems) {
      const allSelected =
        selectedHistoryItems.size === totalItems && totalItems > 0;
      elements.selectAllButton.textContent = allSelected
        ? chrome.i18n.getMessage("HISTORY_DESELECT_ALL_BUTTON_TEXT")
        : chrome.i18n.getMessage("HISTORY_SELECT_ALL_BUTTON_TEXT");
    }
  }

  function selectAllHistoryItems() {
    const historyCards = elements.historyList.querySelectorAll(
      ".aiGeminiTranslator_history-card[data-item-id]"
    );
    const allSelected =
      selectedHistoryItems.size === historyCards.length &&
      historyCards.length > 0;

    if (allSelected) {
      // Deselect all
      selectedHistoryItems.clear();
      historyCards.forEach((card) => {
        card.classList.remove("selected");
        const checkbox = card.querySelector(
          ".aiGeminiTranslator_history-checkbox"
        );
        if (checkbox) checkbox.classList.remove("checked");
      });
    } else {
      // Select all
      historyCards.forEach((card) => {
        const itemId = card.dataset.itemId;
        if (itemId) {
          selectedHistoryItems.add(itemId);
          card.classList.add("selected");
          const checkbox = card.querySelector(
            ".aiGeminiTranslator_history-checkbox"
          );
          if (checkbox) checkbox.classList.add("checked");
        }
      });
    }

    updateSelectionButtons();
  }

  async function deleteSelectedHistoryItems() {
    if (selectedHistoryItems.size === 0) return;

    try {
      const { translationHistory = [] } = await chrome.storage.local.get([
        "translationHistory",
      ]);

      // Filter out selected items
      const updatedHistory = translationHistory.filter(
        (item) => !selectedHistoryItems.has(item.id)
      );

      await chrome.storage.local.set({ translationHistory: updatedHistory });

      // Clear selection
      selectedHistoryItems.clear();

      // Re-render list
      renderHistoryList(updatedHistory);
    } catch (error) {
      console.warn("Failed to delete selected history items:", error);
    }
  }

  function updateStatus(messageKey, color) {
    elements.apiKeyStatus.textContent = chrome.i18n.getMessage(messageKey);
    elements.apiKeyStatus.style.color = color;

    if (color === "green") {
      elements.apiKeyStatusIcon.classList.add("valid");
      elements.apiKeyStatusIcon.classList.remove("invalid");
      elements.apiKeyClearIcon.style.display = "block";
    } else {
      elements.apiKeyStatusIcon.classList.add("invalid");
      elements.apiKeyStatusIcon.classList.remove("valid");
      elements.apiKeyClearIcon.style.display = "none";
    }

    // Automatyczne chowanie komunikatu tekstowego
    elements.apiKeyStatus.style.display = "block";
    clearTimeout(apiKeyStatusTimeoutId);
    apiKeyStatusTimeoutId = setTimeout(() => {
      elements.apiKeyStatus.style.display = "none";
    }, 5000);

    // Aktualizuj treść i kolor tooltipa
    const hasValidApiKey = color === "green";
    elements.apiStatusTooltip.textContent = hasValidApiKey
      ? chrome.i18n.getMessage("API_STATUS_VALID_TOOLTIP")
      : chrome.i18n.getMessage("API_STATUS_INVALID_TOOLTIP");
    elements.apiStatusTooltip.style.color = hasValidApiKey
      ? "#4CAF50"
      : "#F44336";

    // Aktualizuj klasę ikony statusu
    elements.apiKeyStatusIcon.classList.toggle("valid", hasValidApiKey);
    elements.apiKeyStatusIcon.classList.toggle("invalid", !hasValidApiKey);
  }

  function updateTranslationStatus(messageKey, color) {
    elements.textTranslationStatus.textContent =
      chrome.i18n.getMessage(messageKey);
    elements.textTranslationStatus.style.color = color;
    elements.textTranslationStatus.style.display = "block";

    clearTimeout(translationStatusTimeoutId);
    translationStatusTimeoutId = setTimeout(
      () => {
        elements.textTranslationStatus.style.display = "none";
      },
      color === "green" ? 3000 : 5000
    );
  }

  async function translateText() {
    if (!apiKey)
      return updateTranslationStatus("API_KEY_NOT_SET_MESSAGE", "red");

    const text = elements.textToTranslateTextarea.value.trim();
    const targetLanguage = elements.textTargetLanguageSelect.value;

    if (!text)
      return updateTranslationStatus("TEXT_TO_TRANSLATE_EMPTY_MESSAGE", "red");

    updateTranslationStatus("TRANSLATION_IN_PROGRESS_MESSAGE", "yellow");
    elements.translatedTextTextarea.value = "";

    try {
      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(translationRequest(text, targetLanguage)),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        return updateTranslationStatus(
          `${chrome.i18n.getMessage("TRANSLATION_FAILED_MESSAGE")}: ${
            errorData.error?.message || "Unknown error"
          }`,
          "red"
        );
      }

      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const translatedText = data.candidates[0].content.parts[0].text
          .replace(/^["']|["']$/g, "")
          .replace(/^Translate to.*?: /i, "");
        elements.translatedTextTextarea.value = translatedText;
        updateTranslationStatus("TRANSLATION_COMPLETE_MESSAGE", "green");

        // Save session after successful translation
        saveTranslationSession();

        // Add to history after successful translation
        await addToHistory(
          elements.textToTranslateTextarea.value,
          translatedText,
          elements.textTargetLanguageSelect.value,
          elements.selectedTextLanguageSelect.value
        );
      } else {
        updateTranslationStatus("TRANSLATION_FAILED_MESSAGE", "red");
      }
    } catch (error) {
      console.error("Translation error:", error);
      updateTranslationStatus("TRANSLATION_FAILED_MESSAGE", "red");
    }
  }

  async function translateSelectedTextInPopup(selectedText) {
    if (!apiKey)
      return updateTranslationStatus("API_KEY_NOT_SET_MESSAGE", "red");

    const targetLanguage = elements.textTargetLanguageSelect.value;

    if (!selectedText) return;

    // Show that translation is in progress for selected text
    updateTranslationStatus("TRANSLATION_IN_PROGRESS_MESSAGE", "yellow");

    try {
      const response = await fetch(`${API_URL}?key=${apiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(translationRequest(selectedText, targetLanguage)),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error:", errorData);
        return updateTranslationStatus(
          `${chrome.i18n.getMessage("TRANSLATION_FAILED_MESSAGE")}: ${
            errorData.error?.message || "Unknown error"
          }`,
          "red"
        );
      }

      const data = await response.json();
      if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
        const translatedText = data.candidates[0].content.parts[0].text
          .replace(/^["']|["']$/g, "")
          .replace(/^Translate to.*?: /i, "");

        // Replace the current translated text with selection translation
        elements.translatedTextTextarea.value = translatedText;
        updateTranslationStatus("TRANSLATION_COMPLETE_MESSAGE", "green");

        // Add to history
        await addToHistory(
          selectedText,
          translatedText,
          targetLanguage,
          elements.selectedTextLanguageSelect.value
        );
      } else {
        updateTranslationStatus("TRANSLATION_FAILED_MESSAGE", "red");
      }
    } catch (error) {
      console.error("Translation error:", error);
      updateTranslationStatus("TRANSLATION_FAILED_MESSAGE", "red");
    }
  }

  function showCopyStatus(message, color) {
    const tooltip = document.querySelector(".aiGeminiTranslator_copy-tooltip");
    if (!tooltip) {
      console.error("Tooltip element not found!");
      return;
    }
    tooltip.textContent = message;
    tooltip.style.color = color;
    tooltip.classList.add("visible");

    setTimeout(() => {
      tooltip.classList.remove("visible");
    }, 2000);
  }

  const initializeSelects = async () => {
    const {
      textTargetLanguage = systemLanguage,
      selectedTextLanguage = systemLanguage,
    } = await chrome.storage.local.get([
      "textTargetLanguage",
      "selectedTextLanguage",
    ]);

    [
      elements.textTargetLanguageSelect,
      elements.selectedTextLanguageSelect,
    ].forEach((select, index) => {
      select.innerHTML = config.LANGUAGES.map(
        (lang) =>
          `<option value="${lang.value}" ${
            lang.value === (index ? selectedTextLanguage : textTargetLanguage)
              ? "selected"
              : ""
          }>
                    ${lang.label}
                </option>`
      ).join("");
    });
  };

  const setupEventListeners = () => {
    const handlers = {
      "input #apiKeyInput": handleApiKeyInput,
      "click #saveButton": handleSaveApiKey,
      "change .language-select": handleLanguageChange,
    };

    Object.entries(handlers).forEach(([event, handler]) => {
      const [eventType, selector] = event.split(" ");
      document.querySelector(selector).addEventListener(eventType, handler);
    });
  };

  function updateLanguageSwitcher() {
    const langSelect = document.getElementById("language-switcher");
    langSelect.innerHTML = Object.keys(chrome.i18n.getAcceptLanguages())
      .map((lang) => `<option value="${lang}">${lang}</option>`)
      .join("");

    langSelect.addEventListener("change", () => {
      chrome.storage.local.set({ preferredLanguage: langSelect.value });
      window.location.reload();
    });
  }

  // API Keys Management Functions
  function showStatus(element, message, type = "info") {
    element.textContent = message;
    element.style.display = "block";

    // Set color based on type
    switch (type) {
      case "success":
        element.style.color = "#4caf50";
        break;
      case "error":
        element.style.color = "#f44336";
        break;
      case "warning":
        element.style.color = "#ff9800";
        break;
      default:
        element.style.color = "#2196f3";
    }

    // Auto hide after 3 seconds
    setTimeout(() => {
      element.style.display = "none";
    }, 3000);
  }

  async function removeApiKey(index) {
    if (!confirm("Are you sure you want to remove this API key?")) {
      return;
    }

    try {
      const { geminiApiKeys = [] } = await chrome.storage.local.get([
        "geminiApiKeys",
      ]);
      const updatedKeys = geminiApiKeys.filter((_, i) => i !== index);

      await chrome.storage.local.set({ geminiApiKeys: updatedKeys });
      await loadApiKeys();

      showStatus(
        elements.apiKeyStatus,
        `API key removed. Remaining: ${updatedKeys.length}`,
        "success"
      );
    } catch (error) {
      console.error("Failed to remove API key:", error);
      showStatus(elements.apiKeyStatus, "Failed to remove API key", "error");
    }
  }

  async function loadApiKeys() {
    try {
      const { geminiApiKeys = [] } = await chrome.storage.local.get([
        "geminiApiKeys",
      ]);
      renderApiKeysList(geminiApiKeys);
      return geminiApiKeys;
    } catch (error) {
      console.warn("Failed to load API keys:", error);
      return [];
    }
  }

  function renderApiKeysList(apiKeys) {
    elements.apiKeysContainer.innerHTML = "";

    if (apiKeys.length === 0) {
      const emptyState = document.createElement("div");
      emptyState.className = "aiGeminiTranslator_empty-state";
      emptyState.innerHTML = `
                <div style="color: #888; font-size: 0.8rem; text-align: center; padding: 20px; border: 1px dashed #424242; border-radius: 4px; background-color: #252525;">
                    <div style="margin-bottom: 8px;">🔑</div>
                    <div>No API keys added yet</div>
                    <div style="font-size: 0.7rem; color: #666; margin-top: 4px;">Add your first API key above</div>
                </div>
            `;
      elements.apiKeysContainer.appendChild(emptyState);
      return;
    }

    apiKeys.forEach((key, index) => {
      const keyItem = createApiKeyItem(key, index);
      elements.apiKeysContainer.appendChild(keyItem);
    });
  }

  function createApiKeyItem(apiKey, index) {
    const item = document.createElement("div");
    item.className = "aiGeminiTranslator_api-key-item healthy";
    item.dataset.index = index;

    const maskedKey =
      apiKey.substring(0, 8) + "..." + apiKey.substring(apiKey.length - 4);

    item.innerHTML = `
            <div class="aiGeminiTranslator_api-key-info">
                <div class="aiGeminiTranslator_api-key-display">${maskedKey}</div>
                <div class="aiGeminiTranslator_api-key-status-text healthy">Ready</div>
            </div>
            <button class="aiGeminiTranslator_api-key-remove" title="Remove API Key">×</button>
        `;

    // Add remove functionality
    const removeButton = item.querySelector(
      ".aiGeminiTranslator_api-key-remove"
    );
    removeButton.addEventListener("click", () => removeApiKey(index));

    return item;
  }

  async function addApiKey() {
    const newKey = elements.apiKeyInput.value.trim();

    if (!newKey) {
      showStatus(
        elements.apiKeyStatus,
        chrome.i18n.getMessage("API_KEY_EMPTY_MESSAGE"),
        "error"
      );
      return;
    }

    // Validate API key format (basic check)
    if (!newKey.startsWith("AIza") && !newKey.match(/^[A-Za-z0-9_-]{39}$/)) {
      showStatus(elements.apiKeyStatus, "Invalid API key format", "error");
      return;
    }

    try {
      const { geminiApiKeys = [] } = await chrome.storage.local.get([
        "geminiApiKeys",
      ]);

      // Check if key already exists
      if (geminiApiKeys.includes(newKey)) {
        showStatus(elements.apiKeyStatus, "API key already exists", "error");
        return;
      }

      // Add new key
      const updatedKeys = [...geminiApiKeys, newKey];
      await chrome.storage.local.set({ geminiApiKeys: updatedKeys });

      // Clear input and refresh list
      elements.apiKeyInput.value = "";
      await loadApiKeys();

      showStatus(
        elements.apiKeyStatus,
        `API key added successfully! Total: ${updatedKeys.length}`,
        "success"
      );
    } catch (error) {
      console.error("Failed to add API key:", error);
      showStatus(elements.apiKeyStatus, "Failed to add API key", "error");
    }
  }

  function showApiStatusModal(statusList) {
    // Create modal if it doesn't exist
    let modal = document.getElementById("aiGeminiTranslator_api-status-modal");
    if (!modal) {
      modal = document.createElement("div");
      modal.id = "aiGeminiTranslator_api-status-modal";
      modal.className = "aiGeminiTranslator_api-status-modal";

      modal.innerHTML = `
                <div class="aiGeminiTranslator_api-status-content">
                    <div class="aiGeminiTranslator_api-status-header">
                        <h3>API Keys Status</h3>
                        <button class="aiGeminiTranslator_api-status-close">×</button>
                    </div>
                    <div id="aiGeminiTranslator_api-status-body"></div>
                </div>
            `;

      document.body.appendChild(modal);

      // Add close functionality
      modal
        .querySelector(".aiGeminiTranslator_api-status-close")
        .addEventListener("click", () => {
          modal.classList.add("hidden");
        });

      modal.addEventListener("click", (e) => {
        if (e.target === modal) {
          modal.classList.add("hidden");
        }
      });
    }

    // Update content
    const body = modal.querySelector("#aiGeminiTranslator_api-status-body");
    body.innerHTML = "";

    if (statusList.length === 0) {
      body.innerHTML =
        '<div style="text-align: center; color: #666; padding: 20px;">No API keys configured</div>';
    } else {
      statusList.forEach((status) => {
        const statusItem = document.createElement("div");
        statusItem.className = `aiGeminiTranslator_api-key-item ${
          status.healthy
            ? "healthy"
            : status.isRateLimited
            ? "rate-limited"
            : "error"
        }`;

        let statusText = "Ready";
        if (status.isRateLimited) {
          statusText = `Rate limited (${status.rateLimitEndsIn}s)`;
        } else if (!status.healthy) {
          statusText = `Error (${status.errorCount} failures)`;
        }

        statusItem.innerHTML = `
                    <div class="aiGeminiTranslator_api-key-info">
                        <div class="aiGeminiTranslator_api-key-display">Key #${
                          status.index
                        }: ${status.key}</div>
                        <div class="aiGeminiTranslator_api-key-status-text ${
                          status.healthy
                            ? "healthy"
                            : status.isRateLimited
                            ? "rate-limited"
                            : "error"
                        }">
                            ${statusText}
                        </div>
                    </div>
                `;

        body.appendChild(statusItem);
      });
    }

    modal.classList.remove("hidden");
  }

  async function showApiKeysStatus() {
    try {
      const response = await chrome.runtime.sendMessage({
        action: "getApiKeyStatus",
      });

      if (response.error) {
        showStatus(elements.apiKeyStatus, response.error, "error");
        return;
      }

      showApiStatusModal(response.status);
    } catch (error) {
      console.error("Failed to get API key status:", error);
      showStatus(
        elements.apiKeyStatus,
        "Failed to get API key status",
        "error"
      );
    }
  }

  // Event listeners
  elements.settingsHeader.addEventListener("click", (e) => {
    e.preventDefault();
    elements.settingsCard.classList.toggle("collapsed");
  });

  elements.apiKeyInput.addEventListener("input", () => {
    elements.apiKeyClearIcon.classList.toggle(
      "active",
      !!elements.apiKeyInput.value.trim()
    );
  });

  elements.apiKeyClearIcon.addEventListener("click", async () => {
    elements.apiKeyClearIcon.classList.remove("active");
    setTimeout(async () => {
      await chrome.storage.local.remove("geminiApiKey");
      elements.apiKeyInput.value = "";
      elements.apiKeyStatusIcon.classList.remove("valid");
    }, 300);
  });

  elements.saveApiKeyButton.addEventListener("click", addApiKey);

  elements.showApiStatusButton.addEventListener("click", showApiKeysStatus);

  elements.translateTextButton.addEventListener("click", translateText);

  elements.textTargetLanguageSelect.addEventListener("change", async () => {
    await chrome.storage.local.set({
      textTargetLanguage: elements.textTargetLanguageSelect.value,
    });
    saveTranslationSession(); // Save session when target language changes
  });

  // Add auto-save event listeners for textareas
  elements.textToTranslateTextarea.addEventListener(
    "input",
    saveTranslationSession
  );
  elements.translatedTextTextarea.addEventListener(
    "input",
    saveTranslationSession
  );

  // History event listeners
  elements.selectAllButton.addEventListener("click", selectAllHistoryItems);
  elements.deleteSelectedButton.addEventListener(
    "click",
    deleteSelectedHistoryItems
  );

  elements.copyIcon.addEventListener("click", async () => {
    const textToCopy = elements.translatedTextTextarea.value;

    if (!textToCopy) {
      showCopyStatus(
        chrome.i18n.getMessage("COPY_NO_TEXT_MESSAGE"),
        "var(--copy-error-color)"
      );
      return;
    }

    try {
      await navigator.clipboard.writeText(textToCopy);
      showCopyStatus(
        chrome.i18n.getMessage("COPY_SUCCESS_MESSAGE"),
        "var(--text-color)"
      );
    } catch (err) {
      console.error("Failed to copy text:", err);
      showCopyStatus(
        chrome.i18n.getMessage("COPY_FAILED_MESSAGE"),
        "var(--copy-error-color)"
      );
    }
  });

  elements.copyIcon.title = chrome.i18n.getMessage("COPY_ICON_TOOLTIP");

  elements.selectedTextLanguageSelect.addEventListener("change", async () => {
    const newValue = elements.selectedTextLanguageSelect.value;
    await chrome.storage.local.set({ selectedTextLanguage: newValue });

    // Zaktualizuj widok selecta
    initializeSelects();
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName === "local") {
      if (changes.geminiApiKey) {
        elements.apiKeyInput.value = changes.geminiApiKey.newValue || "";
        elements.apiKeyClearIcon.classList.toggle(
          "active",
          !!changes.geminiApiKey.newValue
        );
      }
      if (changes.textTargetLanguage)
        elements.textTargetLanguageSelect.value =
          changes.textTargetLanguage.newValue;
      if (changes.apiKeyStatus) {
        const icon =
          changes.apiKeyStatus.newValue === "valid" ? "valid" : "invalid";
        elements.apiKeyStatusIcon.classList.toggle("valid", icon === "valid");
        elements.apiKeyStatusIcon.classList.toggle(
          "invalid",
          icon === "invalid"
        );
      }
      if (changes.selectedTextLanguage)
        elements.selectedTextLanguageSelect.value =
          changes.selectedTextLanguage.newValue;
    }
  });

  elements.textToTranslateTextarea.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      translateText();
    }
  });

  // Add selection translation functionality
  elements.textToTranslateTextarea.addEventListener("mouseup", (e) => {
    const selection = elements.textToTranslateTextarea.value
      .substring(
        elements.textToTranslateTextarea.selectionStart,
        elements.textToTranslateTextarea.selectionEnd
      )
      .trim();

    if (
      selection &&
      selection !== elements.textToTranslateTextarea.value.trim()
    ) {
      // Only translate selection if it's different from full text
      translateSelectedTextInPopup(selection);
    }
  });

  elements.textToTranslateTextarea.addEventListener("keyup", (e) => {
    // Handle keyboard selection (Shift + arrows, Ctrl+A, etc.)
    if (e.shiftKey || e.ctrlKey) {
      const selection = elements.textToTranslateTextarea.value
        .substring(
          elements.textToTranslateTextarea.selectionStart,
          elements.textToTranslateTextarea.selectionEnd
        )
        .trim();

      if (
        selection &&
        selection !== elements.textToTranslateTextarea.value.trim()
      ) {
        translateSelectedTextInPopup(selection);
      }
    }
  });

  // Initialize UI components
  await Promise.all([
    initializeSelects(),
    loadApiKeys(),
    loadTranslationHistory(),
  ]);

  // Set up CSS variables
  document.documentElement.style.setProperty(
    "--valid-icon",
    `url("${config.VALID_ICON_SVG}")`
  );
  document.documentElement.style.setProperty(
    "--invalid-icon",
    `url("${config.INVALID_ICON_SVG}")`
  );
  document.documentElement.style.setProperty(
    "--copy-icon",
    `url("${config.COPY_ICON_SVG}")`
  );
  document.documentElement.style.setProperty("--copy-error-color", "#ff4444");
});
