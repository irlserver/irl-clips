/**
 * Video Player class for managing clip playback
 */
export class VideoPlayer {
  constructor(videoElement, options = {}) {
    this.videoElement = videoElement;
    this.volume = options.volume || 0.5;
    this.onClipEnd = options.onClipEnd || (() => {});

    this.setupEventListeners();
  }

  /**
   * Setup video element event listeners
   */
  setupEventListeners() {
    this.videoElement.addEventListener("ended", () => {
      console.log("Clip ended, triggering next clip");
      this.onClipEnd();
    });

    this.videoElement.addEventListener("error", (error) => {
      console.error("Video playback error:", error);
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
