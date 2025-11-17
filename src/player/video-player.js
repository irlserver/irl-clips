/**
 * Video Player class for managing clip playback
 */
export class VideoPlayer {
  constructor(videoElement, options = {}) {
    this.videoElement = videoElement;
    this.volume = options.volume || 0.5;
    this.onClipEnd = options.onClipEnd || (() => {});
    this.onVideoStart = options.onVideoStart || (() => {});
    this.onTimeUpdate = options.onTimeUpdate || (() => {});

    this.countdownInterval = null;

    this.setupEventListeners();
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
   * Play a clip with the given URL
   * @param {string} playbackUrl - Video playback URL
   * @returns {Promise<void>}
   */
  async playClip(playbackUrl) {
    try {
      this.videoElement.src = playbackUrl;
      this.videoElement.volume = this.volume;

      // Wait for the video to be ready and then play
      await this.videoElement.play();
      console.log("Video started playing");
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
