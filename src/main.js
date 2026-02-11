import "./styles/main.css";
import { getQueryParam } from "./utils/url.js";
import { VideoPlayer } from "./player/video-player.js";
import { PlaylistManager } from "./player/playlist-manager.js";
import { UIManager } from "./ui/ui-manager.js";
import { URLGenerator } from "./ui/generator.js";

// Display attribution information in console
console.log(
  "%c🎬 BRB Screen",
  "color: #dc2626; font-size: 20px; font-weight: bold;"
);
console.log(
  "%cPowered by IRLServer.com",
  "color: #f87171; font-size: 14px; font-weight: bold;"
);
console.log(
  "%c📋 License: CC BY 4.0 - Attribution Required",
  "color: #fbbf24; font-size: 12px;"
);
console.log(
  "%c🔗 https://brbscreen.com | https://irlserver.com",
  "color: #60a5fa; font-size: 12px; text-decoration: underline;"
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
      logoFreq: getQueryParam("logoFreq", 5), // Show logo every N clips
      showInfo: getQueryParam("showInfo", true),
      showTimer: getQueryParam("showTimer", false),
    };
  }

  /**
   * Initialize the application
   */
  async initialize() {
    // Check if we have a channel name
    if (!this.channelName || this.channelName.trim() === "") {
      console.log("🎬 No channel specified, showing landing page...");
      this.showLandingPage();
      return;
    }

    // We have a channel name, show player mode
    this.showPlayer();

    // Proceed with normal initialization
    this.config = this.loadConfiguration();

    try {
      console.log(
        "🎬 Initializing BRB Screen clip player for channel:",
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
        "✅ Ready to play with",
        this.playlistManager.playlist.length,
        "clips for",
        this.config.channelName.includes(",")
          ? this.config.channelName.split(",").map((ch) => ch.trim()).join(", ")
          : this.config.channelName,
        "(loading more in background)"
      );

      // Initialize video player
      const videoElement = document.getElementById("clip-player");
      const preloadElement = document.getElementById("clip-preloader");
      if (!videoElement) {
        throw new Error("Video element not found");
      }

      this.videoPlayer = new VideoPlayer(videoElement, {
        preloadElement: preloadElement,
        volume: this.config.volume,
        onClipEnd: () => this.playNextClip(),
        onVideoStart: () => {
          this.uiManager.hideLoadingScreen();
          // Start preloading the next clip when current one starts playing
          this.preloadNextClip();
        },
        onTimeUpdate: (seconds) => this.uiManager.updateCountdownTimer(seconds),
        onPreloadReady: () => console.log("✅ Next clip ready for instant playback"),
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
   * Preload the next clip in the background
   */
  async preloadNextClip() {
    try {
      // Peek at the next clip without advancing the playlist
      const nextClipIndex = this.playlistManager.currentIndex;
      if (nextClipIndex >= this.playlistManager.playlist.length) {
        // Would need to reshuffle, skip preloading
        return;
      }

      const nextClip = this.playlistManager.playlist[nextClipIndex];
      if (!nextClip) {
        return;
      }

      console.log("📥 Preparing to preload next clip:", nextClip.title);

      // Get playback URL for next clip
      const playbackUrl = await this.playlistManager.getClipPlaybackUrl(nextClip);
      if (playbackUrl && this.videoPlayer) {
        this.videoPlayer.preloadNextClip(playbackUrl);
      }
    } catch (error) {
      console.warn("Failed to preload next clip:", error);
      // Non-fatal error, just continue without preloading
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

      // Notify UI manager that a new clip is starting (for periodic logo display)
      this.uiManager.onNewClip();

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
   * Show the landing page with modal generator
   */
  showLandingPage() {
    // Show landing page, hide player mode
    const landingPage = document.getElementById("landing-page");
    const playerMode = document.getElementById("player-mode");

    if (landingPage) landingPage.style.display = "block";
    if (playerMode) playerMode.style.display = "none";

    // Initialize the generator in the modal
    this.urlGenerator = new URLGenerator();
    this.urlGenerator.initialize();

    // Setup modal open/close handlers
    this.setupModalHandlers();
  }

  /**
   * Setup modal open/close event handlers
   */
  setupModalHandlers() {
    const modal = document.getElementById("generator-modal");
    const openBtn = document.getElementById("open-generator-btn");
    const closeBtn = document.getElementById("close-generator-btn");
    const openBtns = document.querySelectorAll(".open-generator-btn");

    // Open modal
    const openModal = () => {
      if (modal) {
        modal.style.display = "flex";
        document.body.style.overflow = "hidden";
      }
    };

    // Close modal
    const closeModal = () => {
      if (modal) {
        modal.style.display = "none";
        document.body.style.overflow = "";
      }
    };

    // Attach event listeners
    if (openBtn) openBtn.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    openBtns.forEach((btn) => btn.addEventListener("click", openModal));

    // Close on backdrop click
    if (modal) {
      modal.addEventListener("click", (e) => {
        if (e.target === modal) closeModal();
      });
    }

    // Close on escape key
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && modal && modal.style.display === "flex") {
        closeModal();
      }
    });
  }

  /**
   * Show the video player (hide landing page)
   */
  showPlayer() {
    const landingPage = document.getElementById("landing-page");
    const playerMode = document.getElementById("player-mode");

    if (landingPage) landingPage.style.display = "none";
    if (playerMode) playerMode.style.display = "block";
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
