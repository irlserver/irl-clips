import { smartShuffle, filterByDateRange } from "../utils/array.js";
import {
  fetchDiverseClips,
  fetchMultipleCriteriaClips,
  fetchClipsCards,
  getClipPlaybackUrl,
} from "../api/twitch.js";

/**
 * Playlist Manager class for handling clip playlists
 */
export class PlaylistManager {
  constructor() {
    this.playlist = [];
    this.currentIndex = 0;
    this.shuffleStrategy = "smart"; // Can be 'random', 'stratified', 'weighted', 'smart'
    this.maxClipsToFetch = 400; // Fetch more clips for better variety
    this.isLoadingComplete = false;
    this.backgroundLoadingPromise = null;
  }

  /**
   * Parse channel name string into an array of trimmed, non-empty channel names
   * @param {string} channelName - Single channel or comma-separated channel names
   * @returns {string[]} Array of channel names
   */
  parseChannelNames(channelName) {
    return channelName
      .split(",")
      .map((ch) => ch.trim())
      .filter((ch) => ch.length > 0);
  }

  /**
   * Load initial clips for immediate playback (fast loading)
   * @param {string} channelName - Twitch channel name (comma-separated for multiple)
   * @param {number} days - Number of days to filter clips
   * @param {number} minViews - Minimum view count filter
   * @param {string} shuffleStrategy - Shuffling strategy to use
   * @returns {Promise<void>}
   */
  async loadInitialClips(
    channelName,
    days = 900,
    minViews = 0,
    shuffleStrategy = "smart"
  ) {
    try {
      this.shuffleStrategy = shuffleStrategy;
      const channels = this.parseChannelNames(channelName);

      console.log(
        `🚀 Fast loading diverse clips for ${channels.length} channel(s): ${channels.join(", ")}...`
      );

      // Fetch clips from all channels in parallel
      const results = await Promise.all(
        channels.map((ch) =>
          fetchMultipleCriteriaClips(ch, days)
            .then((result) => ({ channel: ch, ...result, success: true }))
            .catch((error) => {
              console.warn(`Failed to fetch clips for ${ch}:`, error.message);
              return { channel: ch, clips: [], hasNextPage: false, endCursor: null, primaryFilter: null, success: false };
            })
        )
      );

      // Merge clips from all channels and deduplicate
      const seenIds = new Set();
      let clips = [];
      for (const result of results) {
        for (const clip of result.clips) {
          if (!seenIds.has(clip.id)) {
            seenIds.add(clip.id);
            clips.push(clip);
          }
        }
      }

      if (clips.length === 0) {
        throw new Error(`No clips found for channel(s): ${channels.join(", ")}`);
      }

      console.log(`Initial diverse batch: ${clips.length} clips from ${channels.length} channel(s)`);

      // Apply filters to initial batch
      clips = this.applyFilters(clips, days, minViews);

      if (clips.length === 0) {
        throw new Error(
          `No clips found matching criteria for channel(s): ${channels.join(", ")}`
        );
      }

      // Apply initial shuffling
      this.playlist = smartShuffle(clips, this.shuffleStrategy);
      this.currentIndex = 0;

      console.log(
        `✨ Ready to play with ${this.playlist.length} clips! Loading more in background...`
      );

      // Build pagination info per channel for background loading
      const channelPagination = results
        .filter((r) => r.success && r.hasNextPage && r.endCursor)
        .map((r) => ({
          channel: r.channel,
          endCursor: r.endCursor,
          hasNextPage: r.hasNextPage,
          primaryFilter: r.primaryFilter,
        }));

      // Start background loading of remaining clips
      this.backgroundLoadingPromise = this.loadRemainingClips(
        channelPagination,
        days,
        minViews
      );

      return;
    } catch (error) {
      console.error("Failed to load initial clips:", error);
      throw error;
    }
  }

  /**
   * Load remaining clips in the background for all channels
   * @param {Array<Object>} channelPagination - Array of {channel, endCursor, hasNextPage, primaryFilter}
   * @param {number} days - Number of days to filter clips
   * @param {number} minViews - Minimum view count filter
   * @returns {Promise<void>}
   */
  async loadRemainingClips(
    channelPagination,
    days,
    minViews
  ) {
    if (!channelPagination || channelPagination.length === 0) {
      console.log("✅ All clips already loaded");
      this.isLoadingComplete = true;
      return;
    }

    try {
      const clipsPerChannel = Math.max(
        100,
        Math.floor((this.maxClipsToFetch - this.playlist.length) / channelPagination.length)
      );

      console.log(`📦 Loading additional clips in background for ${channelPagination.length} channel(s)...`);

      // Fetch remaining clips from all channels in parallel
      const fetchResults = await Promise.all(
        channelPagination.map(({ channel, endCursor, primaryFilter }) =>
          fetchDiverseClips(
            channel,
            clipsPerChannel,
            endCursor,
            days,
            primaryFilter
          ).catch((error) => {
            console.warn(`Background loading failed for ${channel}:`, error.message);
            return [];
          })
        )
      );

      // Merge all results
      const remainingClips = fetchResults.flat();

      if (remainingClips.length === 0) {
        console.log("✅ No additional clips found");
        this.isLoadingComplete = true;
        return;
      }

      console.log(
        `Background fetch: ${remainingClips.length} additional clips`
      );

      // Apply filters to new clips
      const filteredClips = this.applyFilters(remainingClips, days, minViews);

      if (filteredClips.length > 0) {
        // Remove duplicates before merging
        const existingIds = new Set(this.playlist.map(clip => clip.id));
        const newClips = filteredClips.filter(clip => !existingIds.has(clip.id));

        if (newClips.length > 0) {
          // Merge new clips into existing playlist (reshuffled)
          const allClips = [...this.playlist, ...newClips];
          const currentClip = this.playlist[this.currentIndex - 1]; // Remember current position

          // Reshuffle the combined playlist
          this.playlist = smartShuffle(allClips, this.shuffleStrategy);

          // Try to maintain current position (find the clip we were just playing)
          if (currentClip) {
            const currentClipIndex = this.playlist.findIndex(
              (clip) => clip.id === currentClip.id
            );
            if (currentClipIndex >= 0) {
              this.currentIndex = currentClipIndex + 1;
            }
          }

          console.log(
            `✨ Expanded playlist to ${this.playlist.length} clips total (added ${newClips.length} new clips)`
          );
          this.logPlaylistStats();
        } else {
          console.log("No new unique clips found in background fetch");
        }
      }

      this.isLoadingComplete = true;
    } catch (error) {
      console.error("Background loading failed:", error);
      this.isLoadingComplete = true;
    }
  }

  /**
   * Apply date and view filters to clips
   * @param {Array} clips - Array of clip objects
   * @param {number} days - Number of days to filter
   * @param {number} minViews - Minimum view count
   * @returns {Array} Filtered clips
   */
  applyFilters(clips, days, minViews) {
    // Filter clips by date range
    let filteredClips = filterByDateRange(clips, days);

    // Filter clips by minimum view count
    if (minViews > 0) {
      filteredClips = filteredClips.filter(
        (clip) => clip.viewCount >= minViews
      );
    }

    return filteredClips;
  }

  /**
   * Load clips for a channel and create playlist (legacy method for backward compatibility)
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
    // Use the new optimized loading approach
    await this.loadInitialClips(channelName, days, minViews, shuffleStrategy);
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
    // Use slug directly if available, otherwise extract from URL
    const clipSlug = clip.slug || clip.url.split("/").pop();
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
   * Check if background loading is complete
   * @returns {boolean} True if all clips have been loaded
   */
  isBackgroundLoadingComplete() {
    return this.isLoadingComplete;
  }

  /**
   * Wait for background loading to complete
   * @returns {Promise<void>}
   */
  async waitForBackgroundLoading() {
    if (this.backgroundLoadingPromise) {
      await this.backgroundLoadingPromise;
    }
  }

  /**
   * Clear the current playlist
   */
  clear() {
    this.playlist = [];
    this.currentIndex = 0;
    this.isLoadingComplete = false;
    this.backgroundLoadingPromise = null;
  }
}
