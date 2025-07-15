import "./styles/main.css";
import { getQueryParam } from "./utils/url.js";
import { VideoPlayer } from "./player/video-player.js";
import { PlaylistManager } from "./player/playlist-manager.js";
import { UIManager } from "./ui/ui-manager.js";
import { URLGenerator } from "./ui/generator.js";

// Display attribution information in console
// Note: IRLServer.com branding appears prominently in the generator interface
// but NOT in the actual clip player to keep the viewing experience clean
console.log(
  "%c🎬 IRLServer Clip Player",
  "color: #667eea; font-size: 20px; font-weight: bold;"
);
console.log(
  "%cCreated by IRLServer.com",
  "color: #764ba2; font-size: 14px; font-weight: bold;"
);
console.log(
  "%c📋 License: CC BY 4.0 - Attribution Required",
  "color: #fbbf24; font-size: 12px;"
);
console.log(
  "%c🔗 https://irlserver.com",
  "color: #60a5fa; font-size: 12px; text-decoration: underline;"
);
console.log(
  "%cWhen using this software, you must credit IRLServer.com as the original creator.",
  "color: #6b7280; font-size: 11px;"
);

/**
 * Main Application class
 */
class ClipPlayerApp {
  constructor() {
    this.channelName = getQueryParam("channelName", null);
    this.config = null;
    this.uiManager = new UIManager();
    this.playlistManager = new PlaylistManager();
    this.videoPlayer = null;
    this.urlGenerator = null;
    this.isInitialized = false;
  }

  /**
   * Load configuration from URL parameters
   * @returns {Object} Configuration object
   */
  loadConfiguration() {
    return {
      channelName: this.channelName,
      days: getQueryParam("days", 900),
      views: getQueryParam("views", 0),
      shuffle: getQueryParam("shuffle", "smart"),
      volume: getQueryParam("volume", 0.5),
      showLogo: getQueryParam("showLogo", true),
      showInfo: getQueryParam("showInfo", true),
      showTimer: getQueryParam("showTimer", true),
    };
  }

  /**
   * Initialize the application
   */
  async initialize() {
    // Check if we have a channel name
    if (!this.channelName || this.channelName.trim() === "") {
      console.log("🎬 No channel specified, showing URL generator...");
      this.showGenerator();
      return;
    }

    // We have a channel name, proceed with normal initialization
    this.config = this.loadConfiguration();

    try {
      console.log(
        "🎬 Initializing IRLServer clip player for channel:",
        this.config.channelName
      );

      // Initialize UI with configuration
      this.uiManager.initialize(this.config);

      // Load playlist
      await this.playlistManager.loadPlaylist(
        this.config.channelName,
        this.config.days,
        this.config.views,
        this.config.shuffle
      );

      console.log(
        "✅ Loaded",
        this.playlistManager.playlist.length,
        "clips for",
        this.config.channelName
      );

      // Initialize video player
      const videoElement = document.getElementById("clip-player");
      if (!videoElement) {
        throw new Error("Video element not found");
      }

      this.videoPlayer = new VideoPlayer(videoElement, {
        volume: this.config.volume,
        onClipEnd: () => this.playNextClip(),
        onVideoStart: () => this.uiManager.hideLoadingScreen(),
      });

      // Start playing the first clip
      await this.playNextClip();

      this.isInitialized = true;
      console.log("🚀 Application ready!");
    } catch (error) {
      console.error("❌ Failed to initialize clip player:", error);
      this.handleError(error);
    }
  }

  /**
   * Play the next clip in the playlist
   */
  async playNextClip() {
    try {
      const clip = this.playlistManager.getNextClip();
      if (!clip) {
        console.error("No clips available to play");
        return;
      }

      console.log("Playing clip:", clip.title);

      // Update UI with clip info
      this.uiManager.updateClipInfo(clip);

      // Get playback URL and play the clip
      const playbackUrl = await this.playlistManager.getClipPlaybackUrl(clip);
      if (playbackUrl) {
        await this.videoPlayer.playClip(playbackUrl);
      } else {
        console.error("Failed to get playback URL, skipping to next clip");
        // Try the next clip
        setTimeout(() => this.playNextClip(), 1000);
      }
    } catch (error) {
      console.error("Error playing clip:", error);
      // Try the next clip after a delay
      setTimeout(() => this.playNextClip(), 2000);
    }
  }

  /**
   * Show the URL generator interface
   */
  showGenerator() {
    // Hide all normal player elements
    this.hidePlayerElements();

    // Initialize and show the generator
    this.urlGenerator = new URLGenerator();
    this.urlGenerator.initialize();
    this.urlGenerator.show();
  }

  /**
   * Hide player elements when showing generator
   */
  hidePlayerElements() {
    const elementsToHide = [
      "#loading-screen",
      "#clip-player",
      "#clip-info",
      "#logo",
      "#logo-text",
      "#countdown-timer",
    ];

    elementsToHide.forEach((selector) => {
      const element = document.querySelector(selector);
      if (element) {
        element.style.display = "none";
      }
    });
  }

  /**
   * Handle application errors
   * @param {Error} error - The error that occurred
   */
  handleError(error) {
    const loadingScreen = document.getElementById("loading-screen");
    if (loadingScreen) {
      loadingScreen.textContent = `Error: ${error.message}`;
      loadingScreen.style.color = "#ff4444";
      loadingScreen.style.display = "flex";
    }
  }
}

/**
 * Application error handler
 */
function handleGlobalError(error) {
  console.error("💥 Global error:", error);

  const errorMessage = error.message || "An unexpected error occurred";

  // Show error in UI if possible
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
    z-index: 9999;
    text-align: center;
    max-width: 80%;
  `;
  errorDiv.innerHTML = `
    <div style="font-weight: bold; margin-bottom: 10px;">⚠️ Error</div>
    <div>${errorMessage}</div>
    <div style="font-size: 0.8rem; margin-top: 10px; opacity: 0.8;">
      Please check the console for more details
    </div>
  `;

  document.body.appendChild(errorDiv);
}

/**
 * Initialize application when DOM is ready
 */
async function initializeApp() {
  try {
    // Wait for DOM to be fully loaded
    if (document.readyState === "loading") {
      await new Promise((resolve) => {
        document.addEventListener("DOMContentLoaded", resolve);
      });
    }

    console.log("🚀 Starting IRLServer clip player...");

    const app = new ClipPlayerApp();
    await app.initialize();

    // Make app globally accessible for debugging
    window.clipPlayerApp = app;
  } catch (error) {
    handleGlobalError(error);
  }
}

// Global error handlers
window.addEventListener("error", (event) => {
  handleGlobalError(event.error);
});

window.addEventListener("unhandledrejection", (event) => {
  handleGlobalError(event.reason);
});

// Start the application
initializeApp();
