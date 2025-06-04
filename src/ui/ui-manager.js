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
      countdownTimer: document.getElementById("countdown-timer"),
    };
  }

  /**
   * Initialize UI based on configuration
   * @param {Object} config - UI configuration
   */
  initialize(config) {
    this.showElement("logo", config.showLogo);
    this.showElement("logoText", config.showLogo);
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
