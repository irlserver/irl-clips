/**
 * URL Generator class for creating clip player URLs
 * Now uses the existing form in the HTML modal instead of creating a new one
 */
export class URLGenerator {
  constructor() {
    this.container = null;
    this.form = null;
    this.urlPreview = null;
    this.popularStreamers = [
      "extraemily",
      "robcdee",
      "hasanabi",
      "jakenbakeLIVE",
      "jinnytty",
      "esfandtv",
      "cyr",
      "greekgodx",
      "sodapoppin",
      "nmplol",
      "knut",
      "erobb221",
    ];
  }

  /**
   * Initialize the generator interface
   */
  initialize() {
    // Use existing elements from the HTML
    this.form = document.getElementById("clip-form");
    this.urlPreview = document.getElementById("generated-url");
    this.container = document.getElementById("generator-modal");

    // Populate streamer buttons
    this.populateStreamerButtons();

    // Setup event listeners
    this.setupEventListeners();

    // Initial URL update
    this.updateURLPreview();
  }

  /**
   * Populate the popular streamer buttons
   */
  populateStreamerButtons() {
    const container = document.getElementById("streamer-buttons");
    if (!container) return;

    // Shuffle and display streamers
    const shuffled = [...this.popularStreamers].sort(() => 0.5 - Math.random());
    container.innerHTML = shuffled
      .map(
        (streamer) =>
          `<button type="button" class="streamer-btn" data-streamer="${streamer}">${streamer}</button>`,
      )
      .join("");
  }

  /**
   * Set up event listeners for the form
   */
  setupEventListeners() {
    if (!this.form) return;

    // Form input changes
    this.form.addEventListener("input", () => this.updateURLPreview());
    this.form.addEventListener("change", () => this.updateURLPreview());

    // Popular streamer buttons
    const streamerButtons = document.querySelectorAll(".streamer-btn");
    streamerButtons.forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const streamer = e.target.dataset.streamer;
        const channelInput = document.getElementById("channel");
        if (channelInput) {
          // Append to existing value or set new
          const current = channelInput.value.trim();
          if (current) {
            // Check if already added
            const channels = current
              .split(",")
              .map((c) => c.trim().toLowerCase());
            if (!channels.includes(streamer.toLowerCase())) {
              channelInput.value = current + ", " + streamer;
            }
          } else {
            channelInput.value = streamer;
          }
          this.updateURLPreview();
        }
      });
    });

    // Volume slider display update
    const volumeSlider = document.getElementById("volume");
    const volumeDisplay = document.getElementById("volume-display");
    if (volumeSlider && volumeDisplay) {
      volumeSlider.addEventListener("input", (e) => {
        volumeDisplay.textContent = e.target.value + "%";
      });
    }

    // Action buttons
    const copyBtn = document.getElementById("copy-btn");
    const launchBtn = document.getElementById("launch-btn");
    const testBtn = document.getElementById("test-btn");

    if (copyBtn) copyBtn.addEventListener("click", () => this.copyURL());
    if (launchBtn)
      launchBtn.addEventListener("click", () => this.launchPlayer());
    if (testBtn) testBtn.addEventListener("click", () => this.testURL());
  }

  /**
   * Update the URL preview based on current form values
   */
  updateURLPreview() {
    if (!this.urlPreview) return;

    const params = new URLSearchParams();

    // Get channel value
    const channelInput = document.getElementById("channel");
    const channel = channelInput?.value.trim();
    if (channel) {
      params.set("channelName", channel);
    }

    // Days filter (time range)
    const daysInput = document.getElementById("days");
    const days = daysInput?.value || "900";
    if (days !== "900") {
      params.set("days", days);
    }

    // Minimum views filter
    const viewsInput = document.getElementById("views");
    const views = viewsInput?.value || "0";
    if (views !== "0") {
      params.set("views", views);
    }

    // Shuffle strategy
    const shuffleInput = document.getElementById("shuffle");
    const shuffle = shuffleInput?.value || "smart";
    if (shuffle !== "smart") {
      params.set("shuffle", shuffle);
    }

    // Volume (convert from 0-100 to 0-1)
    const volumeInput = document.getElementById("volume");
    const volume = volumeInput ? parseInt(volumeInput.value) / 100 : 0.5;
    if (volume !== 0.5) {
      params.set("volume", volume.toString());
    }

    // Show info checkbox
    const showInfoInput = document.getElementById("showInfo");
    if (showInfoInput && !showInfoInput.checked) {
      params.set("showInfo", "false");
    }

    // Show logo checkbox
    const showLogoInput = document.getElementById("showLogo");
    if (showLogoInput && !showLogoInput.checked) {
      params.set("showLogo", "false");
    }

    // Show timer toggle
    const showTimerInput = document.getElementById("showTimer");
    if (showTimerInput && showTimerInput.checked) {
      params.set("showTimer", "true");
    }

    const baseUrl = "https://brbscreen.com/";
    const fullUrl = params.toString()
      ? `${baseUrl}?${params.toString()}`
      : baseUrl;

    this.urlPreview.value = fullUrl;
  }

  /**
   * Copy the generated URL to clipboard
   */
  async copyURL() {
    if (!this.urlPreview) return;

    try {
      await navigator.clipboard.writeText(this.urlPreview.value);
      const copyBtn = document.getElementById("copy-btn");
      if (copyBtn) {
        const originalHTML = copyBtn.innerHTML;
        copyBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg> Copied!`;
        copyBtn.style.background = "#10b981";
        setTimeout(() => {
          copyBtn.innerHTML = originalHTML;
          copyBtn.style.background = "";
        }, 2000);
      }
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
    const channelInput = document.getElementById("channel");
    const channel = channelInput?.value.trim();

    if (!channel) {
      alert("Please enter a channel name first!");
      channelInput?.focus();
      return;
    }

    window.location.href = this.urlPreview.value;
  }

  /**
   * Open generated URL in new tab for testing
   */
  testURL() {
    const channelInput = document.getElementById("channel");
    const channel = channelInput?.value.trim();

    if (!channel) {
      alert("Please enter a channel name first!");
      channelInput?.focus();
      return;
    }

    window.open(this.urlPreview.value, "_blank");
  }

  /**
   * Show the generator modal (called externally if needed)
   */
  show() {
    if (this.container) {
      this.container.style.display = "flex";
      document.body.style.overflow = "hidden";
    }
  }

  /**
   * Hide the generator modal
   */
  hide() {
    if (this.container) {
      this.container.style.display = "none";
      document.body.style.overflow = "";
    }
  }
}
