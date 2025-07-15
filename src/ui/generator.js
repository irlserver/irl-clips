/**
 * URL Generator class for creating clip player URLs
 */
export class URLGenerator {
  constructor() {
    this.container = null;
    this.form = null;
    this.urlPreview = null;
    this.popularStreamers = [
      "xqc",
      "pokimane",
      "shroud",
      "ninja",
      "tfue",
      "summit1g",
      "sodapoppin",
      "lirik",
      "asmongold",
      "hasanabi",
      "mizkif",
      "ludwig",
    ];
  }

  /**
   * Initialize the generator interface
   */
  initialize() {
    this.createContainer();
    this.setupEventListeners();
    this.updateURLPreview();
  }

  /**
   * Create the main container for the generator
   */
  createContainer() {
    this.container = document.createElement("div");
    this.container.id = "url-generator";
    this.container.classList.add("hero-gradient");
    this.container.innerHTML = `
      <div class="generator-content">
        <div class="generator-header">
          <img src="/logo.webp" alt="IRLServer Logo" class="generator-logo">
          <h1>IRLServer Clip Player Generator</h1>
          <p>Create a custom clip player for your favorite Twitch streamer</p>
          <div class="powered-by">
            <span>Powered by <a href="https://irlserver.com" target="_blank" rel="noopener">IRLServer.com</a></span>
          </div>
        </div>
        <div class="generator-body">
          <form id="generator-form" class="generator-form">
            <div class="form-section">
              <h2>📺 Channel Settings</h2>
              <div class="form-group">
                <label for="channelName">Channel Name *</label>
                <input 
                  type="text" 
                  id="channelName" 
                  name="channelName" 
                  placeholder="e.g., xqc, pokimane, shroud"
                  required
                >
                <small>Enter the Twitch username (without @)</small>
              </div>
              
              <div class="popular-streamers">
                <p>Popular streamers:</p>
                <div class="streamer-buttons">
                  ${this.popularStreamers
                    .map(
                      (streamer) =>
                        `<button type="button" class="streamer-btn" data-streamer="${streamer}">${streamer}</button>`
                    )
                    .join("")}
                </div>
              </div>
            </div>

            <div class="form-section">
              <h2>⚙️ Filter Settings</h2>
              <div class="form-row">
                <div class="form-group">
                  <label for="days">Days Back</label>
                  <input 
                    type="number" 
                    id="days" 
                    name="days" 
                    value="900" 
                    min="1" 
                    max="9999"
                  >
                  <small>How many days back to search for clips</small>
                </div>
                
                <div class="form-group">
                  <label for="views">Minimum Views</label>
                  <input 
                    type="number" 
                    id="views" 
                    name="views" 
                    value="0" 
                    min="0"
                  >
                  <small>Filter out clips below this view count</small>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h2>🔀 Playback Settings</h2>
              <div class="form-row">
                <div class="form-group">
                  <label for="shuffle">Shuffle Strategy</label>
                  <select id="shuffle" name="shuffle">
                    <option value="smart">Smart (Recommended)</option>
                    <option value="stratified">Stratified (Even distribution)</option>
                    <option value="weighted">Weighted (More hidden gems)</option>
                    <option value="random">Random (Classic shuffle)</option>
                  </select>
                  <small>How clips are shuffled for variety</small>
                </div>
                
                <div class="form-group">
                  <label for="volume">Volume</label>
                  <input 
                    type="range" 
                    id="volume" 
                    name="volume" 
                    min="0" 
                    max="1" 
                    step="0.1" 
                    value="0.5"
                  >
                  <span class="volume-value">50%</span>
                  <small>Default video volume</small>
                </div>
              </div>
            </div>

            <div class="form-section">
              <h2>🎨 Display Settings</h2>
              <div class="form-row">
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" id="showLogo" name="showLogo" checked>
                    <span class="checkmark"></span>
                    Show Logo
                  </label>
                </div>
                
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" id="showInfo" name="showInfo" checked>
                    <span class="checkmark"></span>
                    Show Clip Info
                  </label>
                </div>
                
                <div class="form-group checkbox-group">
                  <label>
                    <input type="checkbox" id="showTimer" name="showTimer" checked>
                    <span class="checkmark"></span>
                    Show Timer
                  </label>
                </div>
              </div>
            </div>
          </form>

          <div class="url-preview">
            <h3>Generated URL:</h3>
            <div class="url-container">
              <input type="text" id="generated-url" readonly>
              <button type="button" id="copy-url" class="copy-btn">📋 Copy</button>
            </div>
            <div class="action-buttons">
              <button type="button" id="launch-player" class="launch-btn">🚀 Launch Player</button>
              <button type="button" id="test-url" class="test-btn">🧪 Test URL</button>
            </div>
          </div>
        </div>
        
        <div class="generator-footer">
          <div class="footer-content">
            <div class="footer-branding">
              <img src="/logo.webp" alt="IRLServer" class="footer-logo">
              <div class="footer-text">
                <h3><a href="https://irlserver.com" target="_blank" rel="noopener">IRLServer.com</a></h3>
                <p>Everything you need for IRL</p>
              </div>
            </div>
            
            <div class="footer-attribution">
              <div class="license-info">
                <h4>📋 License & Attribution</h4>
                <p>This software is licensed under <strong>CC BY 4.0</strong></p>
                <p class="attribution-text">
                  <strong>Required Attribution:</strong> When using or modifying this software, 
                  you must credit <a href="https://irlserver.com" target="_blank" rel="noopener">IRLServer.com</a> 
                  as the original creator.
                </p>
                <div class="license-links">
                  <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener" class="license-link">
                    📄 View Full License
                  </a>
                  <a href="https://github.com/irlserver/irl-clips" target="_blank" rel="noopener" class="license-link">
                    🔗 Source Code
                  </a>
                </div>
              </div>
            </div>
          </div>
          
          <div class="footer-bottom">
            <p>&copy; 2025 <a href="https://irlserver.com" target="_blank" rel="noopener">IRLServer.com</a> - Built with ❤️ for the Twitch community</p>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(this.container);
    this.form = document.getElementById("generator-form");
    this.urlPreview = document.getElementById("generated-url");
  }

  /**
   * Set up event listeners for the form
   */
  setupEventListeners() {
    // Form input changes
    this.form.addEventListener("input", () => this.updateURLPreview());
    this.form.addEventListener("change", () => this.updateURLPreview());

    // Popular streamer buttons
    const streamerButtons = this.container.querySelectorAll(".streamer-btn");
    streamerButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const streamer = e.target.dataset.streamer;
        document.getElementById("channelName").value = streamer;
        this.updateURLPreview();
      });
    });

    // Volume slider
    const volumeSlider = document.getElementById("volume");
    const volumeValue = this.container.querySelector(".volume-value");
    volumeSlider.addEventListener("input", (e) => {
      volumeValue.textContent = Math.round(e.target.value * 100) + "%";
    });

    // Action buttons
    document
      .getElementById("copy-url")
      .addEventListener("click", () => this.copyURL());
    document
      .getElementById("launch-player")
      .addEventListener("click", () => this.launchPlayer());
    document
      .getElementById("test-url")
      .addEventListener("click", () => this.testURL());
  }

  /**
   * Update the URL preview based on current form values
   */
  updateURLPreview() {
    const formData = new FormData(this.form);
    const params = new URLSearchParams();

    // Add non-default values to URL
    for (const [key, value] of formData.entries()) {
      if (key === "channelName" && value) {
        params.set(key, value);
      } else if (key === "days" && value !== "900") {
        params.set(key, value);
      } else if (key === "views" && value !== "0") {
        params.set(key, value);
      } else if (key === "shuffle" && value !== "smart") {
        params.set(key, value);
      } else if (key === "volume" && value !== "0.5") {
        params.set(key, value);
      }
    }

    // Handle checkboxes (they're only included if checked)
    const checkboxes = ["showLogo", "showInfo", "showTimer"];
    checkboxes.forEach((checkbox) => {
      const element = document.getElementById(checkbox);
      if (!element.checked) {
        params.set(checkbox, "false");
      }
    });

    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = params.toString()
      ? `${baseUrl}?${params.toString()}`
      : baseUrl;

    this.urlPreview.value = fullUrl;
  }

  /**
   * Copy the generated URL to clipboard
   */
  async copyURL() {
    try {
      await navigator.clipboard.writeText(this.urlPreview.value);
      const copyBtn = document.getElementById("copy-url");
      const originalText = copyBtn.textContent;
      copyBtn.textContent = "✅ Copied!";
      copyBtn.style.background = "#10b981";
      setTimeout(() => {
        copyBtn.textContent = originalText;
        copyBtn.style.background = "";
      }, 2000);
    } catch (err) {
      console.error("Failed to copy URL:", err);
      // Fallback: select the text
      this.urlPreview.select();
      this.urlPreview.setSelectionRange(0, 99999);
    }
  }

  /**
   * Launch the clip player with current settings
   */
  launchPlayer() {
    const channelName = document.getElementById("channelName").value.trim();
    if (!channelName) {
      alert("Please enter a channel name first!");
      document.getElementById("channelName").focus();
      return;
    }

    window.location.href = this.urlPreview.value;
  }

  /**
   * Open generated URL in new tab for testing
   */
  testURL() {
    const channelName = document.getElementById("channelName").value.trim();
    if (!channelName) {
      alert("Please enter a channel name first!");
      document.getElementById("channelName").focus();
      return;
    }

    window.open(this.urlPreview.value, "_blank");
  }

  /**
   * Show the generator interface
   */
  show() {
    this.container.style.display = "block";
    document.getElementById("channelName").focus();
  }

  /**
   * Hide the generator interface
   */
  hide() {
    if (this.container) {
      this.container.style.display = "none";
    }
  }

  /**
   * Clean up the generator
   */
  destroy() {
    if (this.container) {
      this.container.remove();
      this.container = null;
    }
  }
}
