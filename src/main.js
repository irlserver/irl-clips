import "./styles/main.css";
import { getQueryParam, validateRequiredParams } from "./utils/url.js";
import { VideoPlayer } from "./player/video-player.js";
import { PlaylistManager } from "./player/playlist-manager.js";
import { UIManager } from "./ui/ui-manager.js";

/**
 * Main Application class
 */
class ClipPlayerApp {
  constructor() {
    this.config = this.loadConfiguration();
    this.uiManager = new UIManager();
    this.playlistManager = new PlaylistManager();
    this.videoPlayer = null;
    this.isInitialized = false;
  }

  /**
   * Load configuration from URL parameters
   * @returns {Object} Configuration object
   */
  loadConfiguration() {
    try {
      // Validate required parameters
      validateRequiredParams(["channelName"]);

      return {
        channelName: getQueryParam("channelName"),
        days: getQueryParam("days", 900),
        volume: getQueryParam("volume", 0.5),
        showLogo: getQueryParam("showLogo", true),
        showInfo: getQueryParam("showInfo", true),
        showTimer: getQueryParam("showTimer", true),
      };
    } catch (error) {
      console.error("Configuration error:", error);
      throw error;
    }
  }

  /**
   * Initialize the application
   */
  async initialize() {
    try {
      console.log(
        "🎬 Initializing IRLServer clip player for channel:",
        this.config.channelName
      );

      // Initialize UI
      this.uiManager.initialize(this.config);
      this.uiManager.showLoadingScreen("Loading Clips...");

      // Get video element and setup video player
      const videoElement = document.getElementById("clip-player");
      if (!videoElement) {
        throw new Error("Video element not found");
      }

      this.videoPlayer = new VideoPlayer(videoElement, {
        volume: this.config.volume,
        onClipEnd: () => this.playNextClip(),
      });

      // Load playlist
      await this.playlistManager.loadPlaylist(
        this.config.channelName,
        this.config.days
      );

      // Start playing clips
      await this.playNextClip();

      this.isInitialized = true;
      console.log("✅ Application initialized successfully");
    } catch (error) {
      console.error("❌ Failed to initialize application:", error);
      this.uiManager.showError(`Failed to load clips: ${error.message}`);
      throw error;
    }
  }

  /**
   * Play the next clip in the playlist
   */
  async playNextClip() {
    try {
      const clip = this.playlistManager.getNextClip();

      if (!clip) {
        console.warn("No clips available to play");
        this.uiManager.showError("No clips available");
        return;
      }

      console.log(`🎥 Playing: ${clip.title}`);

      // Get playback URL
      const playbackUrl = await this.playlistManager.getClipPlaybackUrl(clip);

      if (!playbackUrl) {
        console.error("Failed to get playback URL, skipping clip");
        // Try next clip
        setTimeout(() => this.playNextClip(), 1000);
        return;
      }

      // Update UI with clip info
      if (this.config.showInfo) {
        this.uiManager.updateClipInfo(clip);
      }

      // Play the clip
      await this.videoPlayer.playClip(playbackUrl);

      // Hide loading screen after first successful play
      this.uiManager.hideLoadingScreen();

      // Log playlist stats
      const stats = this.playlistManager.getStats();
      console.log(
        `📊 Playlist: ${stats.currentIndex}/${stats.totalClips} (${stats.remainingClips} remaining)`
      );
    } catch (error) {
      console.error("Error playing clip:", error);
      // Try next clip after a delay
      setTimeout(() => this.playNextClip(), 2000);
    }
  }

  /**
   * Get current application state
   * @returns {Object} Application state
   */
  getState() {
    return {
      isInitialized: this.isInitialized,
      config: this.config,
      playlistStats: this.playlistManager.getStats(),
      isPlaying: this.videoPlayer?.isPlaying() || false,
    };
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
