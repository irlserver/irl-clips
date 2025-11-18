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
      "emiru",
      "summit1g",
      "sodapoppin",
      "lirik",
      "asmongold",
      "hasanabi",
      "extraemily",
      "ludwig",
      "robcdee"
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
        <div class="generator-layout">
          <section class="overview-panel">
            <div class="brand-lockup">
              <img src="/logo.webp" alt="IRLServer Logo" class="brand-mark">
              <div>
                <p class="eyebrow">For Live Creators</p>
                <h1>Twitch Clip Player Generator</h1>
                <p class="lede">
                  Generate custom clip players for your Twitch clips with our free tool. Perfect for showcasing highlights
                  on your BRB screen when the backpack hiccups.
                </p>
              </div>
            </div>

            <div class="metrics-grid">
              <div class="metric-card">
                <span>Downtime Coverage</span>
                <strong>Rolling intelligence</strong>
                <p>Auto-refreshes with your newest IRL clips so the BRB wall feels current even during long resets.</p>
              </div>
              <div class="metric-card">
                <span>Viewer Trust</span>
                <strong>Guardrails &amp; shuffle</strong>
                <p>Hold attention with weighted mixes that showcase your brand story instead of static screens.</p>
              </div>
              <div class="metric-card">
                <span>Recovery Speed</span>
                <strong>Instant link</strong>
                <p>Drop one URL into OBS, IRL backpack hubs, or venue switchers for an immediate BRB takeover.</p>
              </div>
            </div>

            <div class="streamer-focus">
              <article class="channel-spotlight">
                <div class="spotlight-label">Downtime Spotlight</div>
                <h3 id="spotlight-name">Keep viewers engaged</h3>
                <p id="spotlight-detail">
                  Enter your Twitch handle to see how the clip reel is configured while you reset gear. These stats mirror
                  the URL you hand to OBS or your backpack hub.
                </p>
                <div class="spotlight-meta" id="spotlight-meta">
                  Waiting for channel input • Stats refresh as soon as you set one
                </div>
                <div class="spotlight-tags">
                  <span>Zero dead air</span>
                  <span>Viewer context</span>
                  <span>Loads quickly</span>
                </div>
                <dl class="spotlight-stats">
                  <div>
                    <dt>Lookback</dt>
                    <dd id="spotlight-window">Rolling 900 days</dd>
                  </div>
                  <div>
                    <dt>View Floor</dt>
                    <dd id="spotlight-views">All clips welcomed</dd>
                  </div>
                  <div>
                    <dt>Shuffle</dt>
                    <dd id="spotlight-shuffle">Smart blend</dd>
                  </div>
                  <div>
                    <dt>Volume</dt>
                    <dd id="spotlight-volume">50%</dd>
                  </div>
                </dl>
              </article>

              <article class="brand-directives">
                <div class="brand-directives-header">
                  <p class="panel-eyebrow">Session guardrails</p>
                  <h3>On-stream presentation</h3>
                </div>
                <ul class="directive-list">
                  <li id="directive-logo">Subtle IRLServer watermark overlay is active</li>
                  <li id="directive-info">Clip info overlay keeps chat updated on what they’re watching</li>
                  <li id="directive-timer">Countdown timer signals when you expect to be back</li>
                </ul>
                <p class="directive-note">
                  Adjust any toggle here, then grab the refreshed URL; your BRB link always matches these settings.
                </p>
              </article>

            </div>

            <div class="compliance-card">
              <div class="compliance-header">
                <h3>Usage &amp; Attribution</h3>
                <p>IRLServer retains creative credit on every deployment of this player.</p>
              </div>
              <ul class="compliance-list">
                <li>Provide visible credit to <a href="https://irlserver.com" target="_blank" rel="noopener">IRLServer.com</a>.</li>
                <li>Link back to https://irlserver.com in documentation or marketing copy.</li>
                <li>Respect the <strong>CC BY 4.0</strong> license for any derivatives.</li>
              </ul>
              <div class="resource-links">
                <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">View License</a>
                <a href="https://github.com/irlserver/irl-clips" target="_blank" rel="noopener">Source Code</a>
              </div>
            </div>
          </section>

          <section class="form-panel">
            <div class="form-panel-header">
              <p class="panel-eyebrow">Configuration</p>
              <h2>Build your clip brief</h2>
              <p>Define sourcing, guardrails, and presentation standards for the automated player.</p>
            </div>

            <form id="generator-form" class="generator-form">
              <div class="form-section">
                <div class="section-heading">
                  <h3>Channel</h3>
                  <p>Set the Twitch handle you want to showcase.</p>
                </div>
                <div class="form-group">
                  <label for="channelName">Channel Name *</label>
                  <input
                    type="text"
                    id="channelName"
                    name="channelName"
                    placeholder="e.g., xqc, pokimane, shroud"
                    required
                  >
                  <small>Enter the Twitch username without the @ symbol.</small>
                </div>

                <div class="popular-streamers">
                  <div class="popular-header">
                    <p>Sample handles</p>
                    <span>Demo shortcuts only – not endorsements or confirmed users</span>
                  </div>
                  <div class="streamer-buttons">
                    ${this.popularStreamers
                      .sort(() => 0.5 - Math.random())
                      .map(
                        (streamer) =>
                          `<button type="button" class="streamer-btn" data-streamer="${streamer}">${streamer}</button>`
                      )
                      .join("")}
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-heading">
                  <h3>Filters</h3>
                  <p>Control the lookback window and baseline engagement.</p>
                </div>
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
                    <small>Limit how far back we scan for clips.</small>
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
                    <small>Only surface clips above this threshold.</small>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-heading">
                  <h3>Playback</h3>
                  <p>Choose how the experience sequences and sounds.</p>
                </div>
                <div class="form-row">
                  <div class="form-group">
                    <label for="shuffle">Shuffle Strategy</label>
                    <select id="shuffle" name="shuffle">
                      <option value="smart">Smart (Recommended)</option>
                      <option value="stratified">Stratified (Even distribution)</option>
                      <option value="weighted">Weighted (More hidden gems)</option>
                      <option value="random">Random (Classic shuffle)</option>
                    </select>
                    <small>Adjust for balance between hits and discovery.</small>
                  </div>

                  <div class="form-group range-group">
                    <label for="volume">Volume</label>
                    <div class="range-input">
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
                    </div>
                    <small>Default playback volume for embeds.</small>
                  </div>
                </div>
              </div>

              <div class="form-section">
                <div class="section-heading">
                  <h3>Display</h3>
                  <p>Determine which overlays appear on the player.</p>
                </div>
                <div class="form-row compact">
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
                      <input type="checkbox" id="showTimer" name="showTimer">
                      <span class="checkmark"></span>
                      Show Timer
                    </label>
                  </div>
                </div>
              </div>
            </form>

            <div class="url-preview">
              <div class="preview-header">
                <div>
                  <p class="panel-eyebrow">Shareable URL</p>
                  <h3>Ready for review</h3>
                </div>
                <button type="button" id="copy-url" class="copy-btn">Copy Link</button>
              </div>
              <div class="url-container">
                <input type="text" id="generated-url" readonly>
              </div>
              <div class="action-buttons">
                <button type="button" id="launch-player" class="launch-btn">Launch Player</button>
                <button type="button" id="test-url" class="test-btn">Open in New Tab</button>
              </div>
            </div>
          </section>
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

    // Handle checkboxes - only add to URL if different from default
    const checkboxDefaults = {
      showLogo: true,
      showInfo: true,
      showTimer: false
    };
    
    Object.entries(checkboxDefaults).forEach(([checkbox, defaultValue]) => {
      const element = document.getElementById(checkbox);
      if (element && element.checked !== defaultValue) {
        params.set(checkbox, element.checked.toString());
      }
    });

    const baseUrl = window.location.origin + window.location.pathname;
    const fullUrl = params.toString()
      ? `${baseUrl}?${params.toString()}`
      : baseUrl;

    this.urlPreview.value = fullUrl;
    this.updateChannelSpotlight(formData.get("channelName"));
    this.updateSpotlightDetails({
      days: formData.get("days"),
      views: formData.get("views"),
      shuffle: formData.get("shuffle"),
      volume: formData.get("volume"),
    });
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

  /**
   * Update spotlight card to reflect the active channel focus
   * @param {string} channelName - Current channel name input value
   */
  updateChannelSpotlight(channelName) {
    if (!this.container) return;

    const nameEl = this.container.querySelector("#spotlight-name");
    const detailEl = this.container.querySelector("#spotlight-detail");
    const metaEl = this.container.querySelector("#spotlight-meta");

    if (!nameEl || !detailEl || !metaEl) return;

    const trimmedName = (channelName || "").trim();
    const hasName = trimmedName.length > 0;

    nameEl.textContent = hasName ? `${trimmedName} downtime reel` : "Keep viewers engaged";
    detailEl.textContent = hasName
      ? `Routing ${trimmedName}'s clips into a downtime reel so chat has something to watch while you reconnect.`
      : "Enter your Twitch handle to outline exactly what plays while you troubleshoot.";
    metaEl.textContent = hasName
      ? "Preset ready • Fresh link generated"
      : "Waiting for channel input • Stats refresh when set";
  }

  /**
   * Update stats and directive copy to mirror current form settings
   * @param {Object} values - values from the generator form
   */
  updateSpotlightDetails(values) {
    if (!this.container) return;

    const days = Number(values?.days || 900);
    const views = Number(values?.views || 0);
    const shuffle = values?.shuffle || "smart";
    const volume = Number(values?.volume || 0.5);

    const shuffleCopy = {
      smart: "Smart blend",
      stratified: "Stratified mix",
      weighted: "Weighted discovery",
      random: "Classic random",
    };

    const windowEl = this.container.querySelector("#spotlight-window");
    const viewsEl = this.container.querySelector("#spotlight-views");
    const shuffleEl = this.container.querySelector("#spotlight-shuffle");
    const volumeEl = this.container.querySelector("#spotlight-volume");

    if (windowEl) {
      windowEl.textContent = `Rolling ${days.toLocaleString()} days`;
    }

    if (viewsEl) {
      viewsEl.textContent = views > 0 ? `${views.toLocaleString()}+ views` : "All clips welcomed";
    }

    if (shuffleEl) {
      shuffleEl.textContent = shuffleCopy[shuffle] || "Smart blend";
    }

    if (volumeEl) {
      volumeEl.textContent = `${Math.round(volume * 100)}%`;
    }

    const showLogo = document.getElementById("showLogo")?.checked ?? true;
    const showInfo = document.getElementById("showInfo")?.checked ?? true;
    const showTimer = document.getElementById("showTimer")?.checked ?? false;

    const directiveLogo = this.container.querySelector("#directive-logo");
    const directiveInfo = this.container.querySelector("#directive-info");
    const directiveTimer = this.container.querySelector("#directive-timer");

    if (directiveLogo) {
      directiveLogo.textContent = showLogo
        ? "Subtle IRLServer watermark overlay is active"
        : "IRLServer watermark hidden for a fully neutral BRB look";
    }

    if (directiveInfo) {
      directiveInfo.textContent = showInfo
        ? "Clip info overlay keeps chat updated on what they’re watching"
        : "Clip info overlay disabled for minimalist playback";
    }

    if (directiveTimer) {
      directiveTimer.textContent = showTimer
        ? "Countdown timer shows the remaining time of the current clip"
        : "Countdown timer is turned off for uninterrupted viewing";
    }
  }
}
