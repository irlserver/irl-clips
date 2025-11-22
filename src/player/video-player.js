/**
 * Video Player class for managing clip playback
 */
export class VideoPlayer {
  constructor(videoElement, options = {}) {
    this.videoElement = videoElement;
    this.preloadElement = options.preloadElement || null;
    this.volume = options.volume || 0.5;
    this.onClipEnd = options.onClipEnd || (() => {});
    this.onVideoStart = options.onVideoStart || (() => {});
    this.onTimeUpdate = options.onTimeUpdate || (() => {});
    this.onPreloadReady = options.onPreloadReady || (() => {});

    this.countdownInterval = null;
    this.preloadedUrl = null;
    this.isPreloading = false;

    this.setupEventListeners();
    if (this.preloadElement) {
      this.setupPreloadListeners();
    }
  }

  /**
   * Setup video element event listeners
   */
  setupEventListeners() {
    this.videoElement.addEventListener("ended", () => {
      console.log("Clip ended, triggering next clip");
      this.stopCountdown();
      this.onClipEnd();
    });

    this.videoElement.addEventListener("error", (error) => {
      console.error("Video playback error:", error);
      this.stopCountdown();
      // Retry after a short delay
      setTimeout(() => {
        this.onClipEnd();
      }, 1000);
    });

    this.videoElement.addEventListener("loadstart", () => {
      console.log("Started loading video");
    });

    this.videoElement.addEventListener("canplay", () => {
      console.log("Video can start playing");
    });

    this.videoElement.addEventListener("playing", () => {
      console.log("Video is now playing");
      this.startCountdown();
      this.onVideoStart();
    });

    this.videoElement.addEventListener("pause", () => {
      this.stopCountdown();
    });

    this.videoElement.addEventListener("seeking", () => {
      this.stopCountdown();
    });

    this.videoElement.addEventListener("seeked", () => {
      if (!this.videoElement.paused) {
        this.startCountdown();
      }
    });
  }

  /**
   * Setup preload element event listeners
   */
  setupPreloadListeners() {
    this.preloadElement.addEventListener("canplaythrough", () => {
      if (this.isPreloading) {
        console.log("✅ Next clip preloaded and ready:", this.preloadedUrl);
        this.onPreloadReady();
      }
    });

    this.preloadElement.addEventListener("error", (error) => {
      if (this.isPreloading) {
        console.warn("⚠️ Preload failed for:", this.preloadedUrl, error);
        this.isPreloading = false;
        this.preloadedUrl = null;
      }
    });
  }

  /**
   * Start the countdown timer
   */
  startCountdown() {
    this.stopCountdown(); // Clear any existing interval

    this.countdownInterval = setInterval(() => {
      if (!this.videoElement.paused && !this.videoElement.ended) {
        const remaining = Math.ceil(this.videoElement.duration - this.videoElement.currentTime);
        this.onTimeUpdate(remaining);
      }
    }, 100); // Update every 100ms for smooth countdown
  }

  /**
   * Stop the countdown timer
   */
  stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  /**
   * Preload the next clip in the background
   * @param {string} playbackUrl - Video playback URL to preload
   */
  preloadNextClip(playbackUrl) {
    if (!this.preloadElement || !playbackUrl) {
      return;
    }

    // Don't preload if already preloading or if it's the same URL
    if (this.isPreloading || this.preloadedUrl === playbackUrl) {
      return;
    }

    console.log("🔄 Preloading next clip in background:", playbackUrl);
    this.isPreloading = true;
    this.preloadedUrl = playbackUrl;
    this.preloadElement.src = playbackUrl;
    this.preloadElement.volume = this.volume;
    this.preloadElement.load(); // Start loading
  }

  /**
   * Play a clip with the given URL
   * @param {string} playbackUrl - Video playback URL
   * @param {boolean} usePreloaded - Whether to try using the preloaded clip
   * @returns {Promise<void>}
   */
  async playClip(playbackUrl, usePreloaded = true) {
    try {
      // Check if we can use the preloaded video
      if (usePreloaded && this.preloadElement && this.preloadedUrl === playbackUrl && this.preloadElement.readyState >= 3) {
        console.log("🚀 Using preloaded clip (instant playback)");
        
        // Swap the video elements by swapping their sources and states
        const currentSrc = this.videoElement.src;
        this.videoElement.src = this.preloadElement.src;
        this.videoElement.volume = this.volume;
        
        // Clear the preload element
        this.preloadElement.src = "";
        this.preloadedUrl = null;
        this.isPreloading = false;

        // Play the video
        await this.videoElement.play();
        console.log("Video started playing (from preload)");
      } else {
        // Normal playback without preload
        if (usePreloaded && this.preloadedUrl === playbackUrl) {
          console.log("⏳ Preload not ready yet, loading normally");
        }
        
        this.videoElement.src = playbackUrl;
        this.videoElement.volume = this.volume;

        // Clear preload state if we're loading a different video
        if (this.preloadedUrl !== playbackUrl && this.preloadElement) {
          this.preloadElement.src = "";
          this.preloadedUrl = null;
          this.isPreloading = false;
        }

        // Wait for the video to be ready and then play
        await this.videoElement.play();
        console.log("Video started playing");
      }
    } catch (error) {
      console.error("Failed to play video:", error);
      // Retry after a short delay
      setTimeout(async () => {
        try {
          await this.videoElement.play();
        } catch (retryError) {
          console.error("Retry failed, skipping clip:", retryError);
          this.onClipEnd();
        }
      }, 500);
    }
  }

  /**
   * Set the volume of the video player
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.videoElement.volume = this.volume;
  }

  /**
   * Get current volume
   * @returns {number} Current volume level
   */
  getVolume() {
    return this.volume;
  }

  /**
   * Check if video is currently playing
   * @returns {boolean} True if playing
   */
  isPlaying() {
    return !this.videoElement.paused && !this.videoElement.ended;
  }
}
