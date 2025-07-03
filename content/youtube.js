class YouTubeSubtitleTranslator {
  constructor() {
    console.log("YouTubeSubtitleTranslator constructor called");
    this.isEnabled = false;
    this.targetLanguage = "vi"; // Default to Vietnamese
    this.originalSubtitles = new Map();
    this.translatedSubtitles = new Map();
    this.currentSubtitleElement = null;
    this.observer = null;
    this.subtitleObservers = new Set(); // Track all subtitle observers
    this.translationQueue = [];
    this.isTranslating = false;
    this.controlsAdded = false;
    this.toggleButton = null; // Store reference to toggle button
    this.initAttempts = 0;
    this.maxInitAttempts = 10;

    console.log("Constructor completed, calling init()");
    this.init();
  }

  async init() {
    console.log("YouTube Subtitle Translator init() started");
    try {
      // Wait for YouTube to load
      console.log("Waiting for YouTube to load...");
      await this.waitForYouTube();
      console.log("YouTube loaded successfully");

      // Load settings
      console.log("Loading settings...");
      await this.loadSettings();
      console.log("Settings loaded:", { isEnabled: this.isEnabled, targetLanguage: this.targetLanguage });

      // Add translation controls with retry
      console.log("Adding translation controls...");
      await this.addTranslationControlsWithRetry();

      // Start observing subtitle changes
      console.log("Starting subtitle observer...");
      this.startSubtitleObserver();

      console.log("YouTube Subtitle Translator initialized successfully");
    } catch (error) {
      console.error("Failed to initialize YouTube Subtitle Translator:", error);
      // Retry initialization after delay
      if (this.initAttempts < this.maxInitAttempts) {
        this.initAttempts++;
        console.log(`Retrying initialization (attempt ${this.initAttempts}/${this.maxInitAttempts})`);
        setTimeout(() => this.init(), 3000);
      }
    }
  }

  async addTranslationControlsWithRetry() {
    console.log("addTranslationControlsWithRetry() started");
    for (let attempt = 0; attempt < 5; attempt++) {
      try {
        console.log(`Attempt ${attempt + 1} to add controls`);
        this.addTranslationControls();
        if (this.controlsAdded) {
          console.log("Controls added successfully!");
          return; // Success
        }
      } catch (error) {
        console.warn(`Attempt ${attempt + 1} to add controls failed:`, error);
      }

      // Wait before retry
      console.log(`Waiting 1 second before retry...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    console.warn("Failed to add translation controls after multiple attempts");
  }

  async waitForYouTube() {
    return new Promise((resolve) => {
      const checkYouTube = () => {
        if (
          document.querySelector("#movie_player") ||
          document.querySelector(".html5-video-player")
        ) {
          console.log("waitForYouTube success");
          resolve();
        } else {
          console.log("waitForYouTube faild");
          setTimeout(checkYouTube, 1000);
        }
      };
      console.log("waitForYouTube outside");
      checkYouTube();
    });
  }

  async loadSettings() {
    try {
      const settings = await chrome.storage.local.get([
        "youtubeSubtitleTranslation",
        "textTargetLanguage",
      ]);
      this.isEnabled = settings.youtubeSubtitleTranslation || false;
      this.targetLanguage = settings.textTargetLanguage || "vi";
    } catch (error) {
      console.warn("Failed to load YouTube subtitle settings:", error);
    }
  }

  async saveSettings() {
    try {
      await chrome.storage.local.set({
        youtubeSubtitleTranslation: this.isEnabled,
      });
    } catch (error) {
      console.warn("Failed to save YouTube subtitle settings:", error);
    }
  }

  addTranslationControls() {
    console.log("addTranslationControls() called, controlsAdded:", this.controlsAdded);

    if (this.controlsAdded) {
      console.log("Controls already added, returning");
      return;
    }

    // Check if button already exists first
    if (document.querySelector(".youtube-translate-btn")) {
      console.log("Button already exists in DOM, marking as added");
      this.controlsAdded = true;
      return;
    }

    // Wait a bit more for YouTube to fully load controls
    const playerExists =
      document.querySelector("#movie_player") ||
      document.querySelector(".html5-video-player");

    console.log("Player exists:", !!playerExists);
    if (!playerExists) {
      console.log("Player not found, retrying in 2 seconds");
      setTimeout(() => this.addTranslationControls(), 2000);
      return;
    }

    console.log("Creating translation toggle button...");
    // Create translation toggle button first
    const toggleButton = document.createElement("button");
    this.toggleButton = toggleButton; // Store reference
    toggleButton.className = "ytp-button youtube-translate-btn";
    toggleButton.innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12.87 15.07l-2.54-2.51.03-.03A17.52 17.52 0 0 0 14.07 6H17V4h-7V2H8v2H1v2h11.17C11.5 7.92 10.44 9.75 9 11.35 8.07 10.32 7.3 9.19 6.69 8h-2c.73 1.63 1.73 3.17 2.98 4.56l-5.09 5.02L4 19l5-5 3.11 3.11.76-2.04zM18.5 10h-2L12 22h2l1.12-3h4.75L21 22h2l-4.5-12zm-2.62 7l1.62-4.33L19.12 17h-3.24z"/>
            </svg>
        `;
    toggleButton.title = "Toggle Subtitle Translation";
    toggleButton.style.cssText = `
            width: 48px;
            height: 48px;
            background: none;
            border: none;
            cursor: pointer;
            color: white;
            opacity: ${this.isEnabled ? "1" : "0.6"};
            transition: opacity 0.3s ease;
            margin-right: 8px;
            position: relative;
            z-index: 1000;
        `;

    console.log("Button created successfully");

    // Toggle functionality
    toggleButton.addEventListener("click", () => {
      console.log("Translation button clicked");
      this.isEnabled = !this.isEnabled;
      toggleButton.style.opacity = this.isEnabled ? "1" : "0.6";
      this.saveSettings();

      if (this.isEnabled) {
        this.showNotification("YouTube subtitle translation enabled");
      } else {
        this.showNotification("YouTube subtitle translation disabled");
        this.restoreOriginalSubtitles();
      }
    });

    console.log("Event listener added, attempting insertion...");

    // Smart insertion: try different strategies with better safety checks
    let insertionSuccessful = false;

    try {
      // Strategy 1: Try to find the exact right container for settings button
      const settingsButton = document.querySelector(".ytp-settings-button");
      console.log("Settings button found:", !!settingsButton);
      if (settingsButton) {
        const settingsParent = settingsButton.parentNode;
        console.log("Settings parent found:", !!settingsParent);
        if (settingsParent && settingsParent.contains(settingsButton)) {
          console.log("Attempting Strategy 1: insertBefore settings button");
          settingsParent.insertBefore(toggleButton, settingsButton);
          insertionSuccessful = true;
          console.log("Strategy 1 succeeded");
        }
      }
    } catch (error) {
      console.warn("Strategy 1 failed:", error);
    }

    if (!insertionSuccessful) {
      try {
        // Strategy 2: Try right controls container
        const rightControls = document.querySelector(".ytp-right-controls");
        console.log("Right controls found:", !!rightControls);
        if (rightControls) {
          console.log("Attempting Strategy 2: appendChild to right controls");
          rightControls.appendChild(toggleButton);
          insertionSuccessful = true;
          console.log("Strategy 2 succeeded");
        }
      } catch (error) {
        console.warn("Strategy 2 failed:", error);
      }
    }

    if (!insertionSuccessful) {
      try {
        // Strategy 3: Try chrome controls
        const chromeControls = document.querySelector(".ytp-chrome-controls");
        console.log("Chrome controls found:", !!chromeControls);
        if (chromeControls) {
          console.log("Attempting Strategy 3: appendChild to chrome controls");
          chromeControls.appendChild(toggleButton);
          insertionSuccessful = true;
          console.log("Strategy 3 succeeded");
        }
      } catch (error) {
        console.warn("Strategy 3 failed:", error);
      }
    }

    if (!insertionSuccessful) {
      try {
        // Strategy 4: Find any suitable parent container and create floating button
        const playerContainer =
          document.querySelector("#movie_player") ||
          document.querySelector(".html5-video-player");
        console.log("Player container found for floating button:", !!playerContainer);
        if (playerContainer) {
          console.log("Attempting Strategy 4: floating button");
          // Create a floating button
          toggleButton.style.position = "absolute";
          toggleButton.style.top = "10px";
          toggleButton.style.right = "60px";
          toggleButton.style.zIndex = "9999";
          toggleButton.style.backgroundColor = "rgba(0, 0, 0, 0.7)";
          toggleButton.style.borderRadius = "4px";
          playerContainer.style.position = "relative"; // Ensure container has position
          playerContainer.appendChild(toggleButton);
          insertionSuccessful = true;
          console.log("Strategy 4 succeeded - floating button created");
        }
      } catch (error) {
        console.warn("Strategy 4 failed:", error);
      }
    }

    if (!insertionSuccessful) {
      console.error(
        "All insertion strategies failed - YouTube layout may have changed"
      );
      return;
    }

    console.log("Button insertion successful, setting controlsAdded = true");
    this.controlsAdded = true;
  }

  updateControlsState() {
    if (this.toggleButton) {
      this.toggleButton.style.opacity = this.isEnabled ? "1" : "0.6";
    }
  }

  startSubtitleObserver() {
    // Observe subtitle container
    const subtitleSelectors = [
      ".caption-window", // YouTube captions
      ".ytp-caption-segment", // YouTube caption segments
      ".captions-text", // Alternative selector
      '[class*="caption"]', // Fallback
    ];

    const observeSubtitles = () => {
      subtitleSelectors.forEach((selector) => {
        const subtitleContainer = document.querySelector(selector);
        if (
          subtitleContainer &&
          !subtitleContainer.hasAttribute("data-translate-observed")
        ) {
          subtitleContainer.setAttribute("data-translate-observed", "true");
          this.observeSubtitleContainer(subtitleContainer);
        }
      });
    };

    // Initial observation
    observeSubtitles();

    // Re-observe periodically for dynamic content
    setInterval(observeSubtitles, 3000);

    // Observe DOM changes for new subtitle elements
    this.observer = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;

      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Check if new subtitle elements were added
            subtitleSelectors.forEach((selector) => {
              const subtitleElements = node.querySelectorAll
                ? node.querySelectorAll(selector)
                : [];
              subtitleElements.forEach((element) => {
                if (!element.hasAttribute("data-translate-observed")) {
                  element.setAttribute("data-translate-observed", "true");
                  this.observeSubtitleContainer(element);
                }
              });
            });

            // Check if the node itself is a subtitle element
            if (
              node.matches &&
              subtitleSelectors.some((sel) => node.matches(sel))
            ) {
              if (!node.hasAttribute("data-translate-observed")) {
                node.setAttribute("data-translate-observed", "true");
                this.observeSubtitleContainer(node);
              }
            }
          }
        });
      });
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  observeSubtitleContainer(container) {
    const subtitleObserver = new MutationObserver((mutations) => {
      if (!this.isEnabled) return;

      mutations.forEach((mutation) => {
        if (
          mutation.type === "childList" ||
          mutation.type === "characterData"
        ) {
          this.handleSubtitleChange(container);
        }
      });
    });

    subtitleObserver.observe(container, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Store observer reference for cleanup
    if (!this.subtitleObservers) {
      this.subtitleObservers = new Set();
    }
    this.subtitleObservers.add(subtitleObserver);
  }

  async handleSubtitleChange(subtitleElement) {
    if (!this.isEnabled || !subtitleElement) return;

    const text = subtitleElement.textContent?.trim();
    if (!text || text.length < 2) return;

    // Skip if already translated
    if (this.translatedSubtitles.has(text)) {
      const translatedText = this.translatedSubtitles.get(text);
      this.updateSubtitleDisplay(subtitleElement, translatedText);
      return;
    }

    // Store original text
    if (!this.originalSubtitles.has(subtitleElement)) {
      this.originalSubtitles.set(subtitleElement, text);
    }

    // Add to translation queue
    this.addToTranslationQueue(text, subtitleElement);
  }

  addToTranslationQueue(text, element) {
    // Avoid duplicate requests
    const existingRequest = this.translationQueue.find(
      (item) => item.text === text
    );
    if (existingRequest) {
      existingRequest.elements.push(element);
      return;
    }

    this.translationQueue.push({
      text,
      elements: [element],
      timestamp: Date.now(),
    });

    // Process queue
    this.processTranslationQueue();
  }

  async processTranslationQueue() {
    if (this.isTranslating || this.translationQueue.length === 0) return;

    this.isTranslating = true;

    while (this.translationQueue.length > 0) {
      const item = this.translationQueue.shift();

      try {
        const translatedText = await this.translateText(item.text);

        // Cache translation
        this.translatedSubtitles.set(item.text, translatedText);

        // Update all elements with this text
        item.elements.forEach((element) => {
          if (element.isConnected) {
            // Check if element is still in DOM
            this.updateSubtitleDisplay(element, translatedText);
          }
        });

        // Small delay to avoid overwhelming the API
        await new Promise((resolve) => setTimeout(resolve, 100));
      } catch (error) {
        console.warn("Failed to translate subtitle:", error);

        // If translation fails, keep original text
        item.elements.forEach((element) => {
          if (element.isConnected) {
            this.updateSubtitleDisplay(element, item.text);
          }
        });
      }
    }

    this.isTranslating = false;
  }

  async translateText(text) {
    return new Promise((resolve, reject) => {
      // Add timeout to prevent hanging
      const timeout = setTimeout(() => {
        reject(new Error("Translation timeout"));
      }, 15000); // 15 second timeout

      chrome.runtime.sendMessage(
        {
          action: "translateSelectedText",
          text: text,
          targetLanguage: this.targetLanguage,
        },
        (response) => {
          clearTimeout(timeout);

          if (chrome.runtime.lastError) {
            reject(new Error(chrome.runtime.lastError.message));
            return;
          }

          if (response && response.translatedText) {
            // Check if it's an error response
            if (response.translatedText.startsWith("Translation failed:")) {
              reject(new Error(response.translatedText));
            } else {
              resolve(response.translatedText);
            }
          } else {
            reject(new Error("No translation received"));
          }
        }
      );
    });
  }

  updateSubtitleDisplay(element, translatedText) {
    if (!element || !element.isConnected) return;

    // Create or update translation display
    let translationContainer = element.querySelector(".youtube-translation");

    if (!translationContainer) {
      translationContainer = document.createElement("div");
      translationContainer.className = "youtube-translation";
      translationContainer.style.cssText = `
                background-color: rgba(0, 0, 0, 0.8);
                color: #00ff00;
                padding: 4px 8px;
                border-radius: 4px;
                margin-top: 4px;
                font-size: inherit;
                line-height: inherit;
                text-align: center;
                border-left: 3px solid #00ff00;
            `;
      element.appendChild(translationContainer);
    }

    translationContainer.textContent = translatedText;
  }

  restoreOriginalSubtitles() {
    // Remove all translation displays
    document.querySelectorAll(".youtube-translation").forEach((element) => {
      element.remove();
    });
  }

  showNotification(message) {
    // Create notification
    const notification = document.createElement("div");
    notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            z-index: 10000;
            font-family: Arial, sans-serif;
            font-size: 14px;
            border-left: 4px solid #9c6ad0;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            transition: opacity 0.3s ease;
        `;
    notification.textContent = message;

    document.body.appendChild(notification);

    // Auto remove
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification);
        }
      }, 300);
    }, 3000);
  }

  destroy() {
    // Disconnect main observer
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    // Disconnect all subtitle observers
    if (this.subtitleObservers) {
      this.subtitleObservers.forEach((observer) => {
        observer.disconnect();
      });
      this.subtitleObservers.clear();
    }

    // Clear caches
    this.originalSubtitles.clear();
    this.translatedSubtitles.clear();
    this.translationQueue = [];

    // Restore original subtitles
    this.restoreOriginalSubtitles();

    // Remove translation button
    const button = document.querySelector(".youtube-translate-btn");
    if (button) {
      button.remove();
    }

    // Reset state
    this.controlsAdded = false;
    this.toggleButton = null;
    this.isTranslating = false;
  }
}

// Initialize on YouTube pages
console.log("YouTube content script loaded, hostname:", window.location.hostname);

if (window.location.hostname.includes("youtube.com")) {
  console.log("YouTube detected, initializing translator...");
  let youtubeTranslator = null;

  const initializeTranslator = () => {
    console.log("initializeTranslator() called");
    if (youtubeTranslator) {
      console.log("Destroying existing translator");
      youtubeTranslator.destroy();
    }
    console.log("Creating new YouTubeSubtitleTranslator instance");
    youtubeTranslator = new YouTubeSubtitleTranslator();
  };

  // Initialize immediately
  console.log("Document ready state:", document.readyState);
  if (document.readyState === "loading") {
    console.log("Document still loading, adding DOMContentLoaded listener");
    document.addEventListener("DOMContentLoaded", initializeTranslator);
  } else {
    console.log("Document already loaded, initializing immediately");
    initializeTranslator();
  }

  // Re-initialize on page navigation (YouTube SPA)
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      setTimeout(initializeTranslator, 2000); // Wait for page to load
    }
  }).observe(document, { subtree: true, childList: true });

  // Listen for messages from popup
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "updateYouTubeSettings" && youtubeTranslator) {
      youtubeTranslator.isEnabled = message.enabled;
      youtubeTranslator.targetLanguage = message.targetLanguage || "vi";
      youtubeTranslator.updateControlsState();

      // Save settings locally
      chrome.storage.local.set({
        youtubeSubtitleTranslation: message.enabled,
        textTargetLanguage: message.targetLanguage || "vi",
      });

      sendResponse({ success: true });
    }
  });
}
