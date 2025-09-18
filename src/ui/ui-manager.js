/**
 * UI Manager class for handling user interface elements
 */
export class UIManager {
  constructor() {
    this.elements = {
      loadingScreen: document.getElementById("loading-screen"),
      clipInfo: document.getElementById("clip-info"),
      logo: document.getElementById("logo"),
      logoText: document.getElementById("logo-text"),
      logoContainer: document.getElementById("logo-container"),
      countdownTimer: document.getElementById("countdown-timer"),
    };
    
    this.logoAnimationTimeout = null;
    this.clipCount = 0;
    this.logoShowInterval = 5; // Show logo every 5 clips
    this.logoDisplayDuration = 6000; // Show for 6 seconds (longer)
  }

  /**
   * Initialize UI based on configuration
   * @param {Object} config - UI configuration
   */
  initialize(config) {
    // For periodic logo display, we hide it initially but track the setting
    this.showLogo = config.showLogo;
    this.logoShowInterval = config.logoFreq || 5; // Configurable interval
    // Logo elements start hidden via CSS (visibility: hidden, opacity: 0)
    this.showElement("countdownTimer", config.showTimer);
    this.showElement("clipInfo", config.showInfo);
  }

  /**
   * Show or hide an element
   * @param {string} elementName - Element name
   * @param {boolean} show - Whether to show the element
   */
  showElement(elementName, show) {
    const element = this.elements[elementName];
    if (element) {
      element.style.display = show ? "block" : "none";
    }
  }

  /**
   * Hide the loading screen
   */
  hideLoadingScreen() {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.style.display = "none";
    }
  }

  /**
   * Show the loading screen with optional message
   * @param {string} message - Loading message
   */
  showLoadingScreen(message = "Loading Clips...") {
    if (this.elements.loadingScreen) {
      this.elements.loadingScreen.textContent = message;
      this.elements.loadingScreen.style.display = "flex";
    }
  }

  /**
   * Update clip information display
   * @param {Object} clip - Current clip object
   */
  updateClipInfo(clip) {
    if (!this.elements.clipInfo || !clip) return;

    const clipDate = new Date(clip.createdAt).toLocaleDateString();
    const views = clip.viewCount?.toLocaleString() || "0";

    this.elements.clipInfo.innerHTML = `
      <div><strong>${clip.title}</strong></div>
      <div>Views: ${views} | Created: ${clipDate}</div>
    `;
  }

  /**
   * Update countdown timer
   * @param {number} seconds - Seconds remaining
   */
  updateCountdownTimer(seconds) {
    if (!this.elements.countdownTimer) return;

    this.elements.countdownTimer.textContent = seconds > 0 ? seconds : "";
  }

  /**
   * Called when a new clip starts playing
   * Handles periodic logo display
   */
  onNewClip() {
    this.clipCount++;
    
    console.log(`📊 Clip count: ${this.clipCount}, Logo enabled: ${this.showLogo}, Interval: ${this.logoShowInterval}`);
    
    // Show logo every N clips if enabled (always show on first clip)
    if (this.showLogo && (this.clipCount === 1 || this.clipCount % this.logoShowInterval === 0)) {
      this.showPeriodicLogo();
    }
  }

  /**
   * Show the logo briefly with animation
   */
  showPeriodicLogo() {
    if (!this.elements.logoContainer) return;

    // Clear any existing timeout
    if (this.logoAnimationTimeout) {
      clearTimeout(this.logoAnimationTimeout);
    }

    console.log('🎨 Showing periodic logo animation');

    // Show the container and remove any existing animation classes
    this.elements.logoContainer.style.display = 'flex';
    this.elements.logoContainer.classList.remove('logo-animate-out');
    
    // Force a reflow to ensure display change takes effect
    this.elements.logoContainer.offsetHeight;
    
    // Add animation class for smooth fade-in
    this.elements.logoContainer.classList.add('logo-animate-in');

    // Hide after specified duration with fade-out
    this.logoAnimationTimeout = setTimeout(() => {
      this.elements.logoContainer.classList.remove('logo-animate-in');
      this.elements.logoContainer.classList.add('logo-animate-out');
      
      // Hide completely after animation completes
      setTimeout(() => {
        this.elements.logoContainer.classList.remove('logo-animate-out');
        this.elements.logoContainer.style.display = 'none';
      }, 500); // Match CSS transition duration
      
    }, this.logoDisplayDuration);
  }

  /**
   * Show error message
   * @param {string} message - Error message
   */
  showError(message) {
    const errorDiv = document.createElement("div");
    errorDiv.style.cssText = `
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      background: rgba(255, 0, 0, 0.9);
      color: white;
      padding: 20px;
      border-radius: 8px;
      font-family: Arial, sans-serif;
      font-size: 1.2rem;
      z-index: 1000;
      text-align: center;
      max-width: 80%;
    `;
    errorDiv.textContent = message;

    document.body.appendChild(errorDiv);

    // Remove error after 5 seconds
    setTimeout(() => {
      if (errorDiv.parentNode) {
        errorDiv.parentNode.removeChild(errorDiv);
      }
    }, 5000);
  }

  /**
   * Get all UI elements for external access
   * @returns {Object} UI elements object
   */
  getElements() {
    return this.elements;
  }
}
