import { smartShuffle, filterByDateRange } from "../utils/array.js";
import { fetchDiverseClips, getClipPlaybackUrl } from "../api/twitch.js";

/**
 * Playlist Manager class for handling clip playlists
 */
export class PlaylistManager {
  constructor() {
    this.playlist = [];
    this.currentIndex = 0;
    this.shuffleStrategy = "smart"; // Can be 'random', 'stratified', 'weighted', 'smart'
    this.maxClipsToFetch = 400; // Fetch more clips for better variety
  }

  /**
   * Load clips for a channel and create playlist
   * @param {string} channelName - Twitch channel name
   * @param {number} days - Number of days to filter clips
   * @param {number} minViews - Minimum view count filter
   * @param {string} shuffleStrategy - Shuffling strategy to use
   * @returns {Promise<void>}
   */
  async loadPlaylist(
    channelName,
    days = 900,
    minViews = 0,
    shuffleStrategy = "smart"
  ) {
    try {
      this.shuffleStrategy = shuffleStrategy;

      console.log(
        `Loading playlist with strategy: ${shuffleStrategy}, fetching up to ${this.maxClipsToFetch} clips`
      );

      // Fetch a diverse set of clips using pagination
      let clips = await fetchDiverseClips(channelName, this.maxClipsToFetch);

      if (clips.length === 0) {
        throw new Error(`No clips found for channel: ${channelName}`);
      }

      console.log(`Initial fetch: ${clips.length} clips`);

      // Filter clips by date range
      clips = filterByDateRange(clips, days);

      if (clips.length === 0) {
        throw new Error(
          `No clips found in the last ${days} days for channel: ${channelName}`
        );
      }

      console.log(`After date filtering: ${clips.length} clips`);

      // Filter clips by minimum view count
      if (minViews > 0) {
        clips = clips.filter((clip) => clip.viewCount >= minViews);

        if (clips.length === 0) {
          throw new Error(
            `No clips found with at least ${minViews} views for channel: ${channelName}`
          );
        }

        console.log(
          `After view filtering: ${clips.length} clips with at least ${minViews} views`
        );
      }

      // Apply smart shuffling for better variety
      this.playlist = smartShuffle(clips, this.shuffleStrategy);
      this.currentIndex = 0;

      console.log(
        `✨ Loaded ${this.playlist.length} clips into playlist using ${this.shuffleStrategy} shuffle strategy`
      );
      this.logPlaylistStats();
    } catch (error) {
      console.error("Failed to load playlist:", error);
      throw error;
    }
  }

  /**
   * Log playlist statistics for debugging
   */
  logPlaylistStats() {
    if (this.playlist.length === 0) return;

    const viewCounts = this.playlist
      .map((clip) => clip.viewCount)
      .sort((a, b) => b - a);
    const min = Math.min(...viewCounts);
    const max = Math.max(...viewCounts);
    const median = viewCounts[Math.floor(viewCounts.length / 2)];
    const avg = Math.round(
      viewCounts.reduce((sum, count) => sum + count, 0) / viewCounts.length
    );

    console.log(`📊 Playlist diversity stats:
      • Total clips: ${this.playlist.length}
      • View count range: ${min.toLocaleString()} - ${max.toLocaleString()}
      • Average views: ${avg.toLocaleString()}
      • Median views: ${median.toLocaleString()}
      • Shuffle strategy: ${this.shuffleStrategy}`);
  }

  /**
   * Set the shuffle strategy and reshuffle current playlist
   * @param {string} strategy - 'random', 'stratified', 'weighted', or 'smart'
   */
  setShuffleStrategy(strategy) {
    if (["random", "stratified", "weighted", "smart"].includes(strategy)) {
      this.shuffleStrategy = strategy;
      if (this.playlist.length > 0) {
        console.log(`🔄 Reshuffling playlist with ${strategy} strategy`);
        this.playlist = smartShuffle(this.playlist, strategy);
        this.currentIndex = 0;
        this.logPlaylistStats();
      }
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
      console.log("🔄 End of playlist reached, reshuffling...");
      this.playlist = smartShuffle(this.playlist, this.shuffleStrategy);
      this.currentIndex = 0;
      this.logPlaylistStats();
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
      shuffleStrategy: this.shuffleStrategy,
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
