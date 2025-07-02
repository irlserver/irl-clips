import { shuffle, filterByDateRange } from "../utils/array.js";
import { fetchChannelClips, getClipPlaybackUrl } from "../api/twitch.js";

/**
 * Playlist Manager class for handling clip playlists
 */
export class PlaylistManager {
  constructor() {
    this.playlist = [];
    this.currentIndex = 0;
  }

  /**
   * Load clips for a channel and create playlist
   * @param {string} channelName - Twitch channel name
   * @param {number} days - Number of days to filter clips
   * @param {number} minViews - Minimum view count filter
   * @returns {Promise<void>}
   */
  async loadPlaylist(channelName, days = 900, minViews = 0) {
    try {
      let clips = await fetchChannelClips(channelName, 100);

      if (clips.length === 0) {
        throw new Error(`No clips found for channel: ${channelName}`);
      }

      // Filter clips by date range
      clips = filterByDateRange(clips, days);

      if (clips.length === 0) {
        throw new Error(
          `No clips found in the last ${days} days for channel: ${channelName}`
        );
      }

      // Filter clips by minimum view count
      if (minViews > 0) {
        clips = clips.filter((clip) => clip.viewCount >= minViews);

        if (clips.length === 0) {
          throw new Error(
            `No clips found with at least ${minViews} views for channel: ${channelName}`
          );
        }

        console.log(
          `Filtered to ${clips.length} clips with at least ${minViews} views`
        );
      }

      // Shuffle the clips
      this.playlist = shuffle(clips);
      this.currentIndex = 0;

      console.log(`Loaded ${this.playlist.length} clips into playlist`);
    } catch (error) {
      console.error("Failed to load playlist:", error);
      throw error;
    }
  }

  /**
   * Get the next clip in the playlist
   * @returns {Object|null} Next clip object or null if no clips
   */
  getNextClip() {
    if (this.playlist.length === 0) {
      console.warn("No clips in playlist");
      return null;
    }

    // If we've reached the end, reshuffle and start over
    if (this.currentIndex >= this.playlist.length) {
      console.log("End of playlist reached, reshuffling...");
      this.playlist = shuffle(this.playlist);
      this.currentIndex = 0;
    }

    const clip = this.playlist[this.currentIndex];
    this.currentIndex++;

    return clip;
  }

  /**
   * Get playback URL for a clip
   * @param {Object} clip - Clip object
   * @returns {Promise<string|null>} Playback URL or null if failed
   */
  async getClipPlaybackUrl(clip) {
    const clipSlug = clip.url.split("/").pop();
    return await getClipPlaybackUrl(clipSlug);
  }

  /**
   * Get current playlist stats
   * @returns {Object} Playlist statistics
   */
  getStats() {
    return {
      totalClips: this.playlist.length,
      currentIndex: this.currentIndex,
      remainingClips: Math.max(0, this.playlist.length - this.currentIndex),
    };
  }

  /**
   * Check if playlist is empty
   * @returns {boolean} True if playlist is empty
   */
  isEmpty() {
    return this.playlist.length === 0;
  }

  /**
   * Clear the current playlist
   */
  clear() {
    this.playlist = [];
    this.currentIndex = 0;
  }
}
