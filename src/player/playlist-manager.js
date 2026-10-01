import {
	clipDateRange,
	fetchClipsCards,
	getClipPlaybackUrl,
} from "../api/twitch.js";
import { filterByDateRange, smartShuffle } from "../utils/array.js";
import {
	clipCacheKey,
	loadCachedClips,
	saveCachedClips,
} from "../utils/clip-cache.js";

/**
 * Playlist Manager class for handling clip playlists
 */
export class PlaylistManager {
	constructor() {
		this.playlist = [];
		this.currentIndex = 0;
		this.shuffleStrategy = "smart"; // Can be 'random', 'stratified', 'weighted', 'smart'
		this.minInitialClips = 50;
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
	 * Load initial clips for immediate playback. A cached clip list starts
	 * playing right away and gets refreshed in the background; otherwise
	 * playback starts on the first page of every channel.
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
		shuffleStrategy = "smart",
	) {
		try {
			this.shuffleStrategy = shuffleStrategy;
			const channels = this.parseChannelNames(channelName);
			const cacheKey = clipCacheKey(channels, days, minViews);

			// Filters are reapplied because the date window has moved since caching
			const cached = this.applyFilters(
				loadCachedClips(cacheKey),
				days,
				minViews,
			);
			if (cached.length > 0) {
				console.log(
					`⚡ Playing ${cached.length} cached clips, refreshing in background...`,
				);
				this.playlist = smartShuffle(cached, this.shuffleStrategy);
				this.currentIndex = 0;
				this.backgroundLoadingPromise = this.refreshClips(
					channels,
					days,
					minViews,
					cacheKey,
				);
				return;
			}

			const { clips, results, seenIds } = await this.fetchInitialPool(
				channels,
				days,
				minViews,
			);

			if (clips.length === 0) {
				throw new Error(
					`No clips found matching criteria for channel(s): ${channels.join(", ")}`,
				);
			}

			this.playlist = smartShuffle(clips, this.shuffleStrategy);
			this.currentIndex = 0;

			console.log(
				`✨ Ready to play with ${this.playlist.length} clips! Loading more in background...`,
			);

			this.backgroundLoadingPromise = this.loadRemainingClips(
				results,
				seenIds,
				days,
				minViews,
				cacheKey,
			);
		} catch (error) {
			console.error("Failed to load initial clips:", error);
			throw error;
		}
	}

	/**
	 * Fetch the first page of clips for every channel
	 * @param {string[]} channels - Channel names
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @returns {Promise<{clips: Array, results: Array<Object>, seenIds: Set<string>}>}
	 *   Matching clips plus the pagination state needed to keep paging
	 */
	async fetchInitialPool(channels, days, minViews) {
		console.log(
			`🚀 Loading clips for ${channels.length} channel(s): ${channels.join(", ")}...`,
		);

		// Every page shares one window so page offsets stay stable while paging
		const range = clipDateRange(days);
		const results = channels.map((channel) => ({
			channel,
			range,
			cursor: null,
			done: false,
			failed: false,
		}));
		const seenIds = new Set();

		const clips = await this.fetchNextPages(results, seenIds, days, minViews);

		// Only loops on the all time fallback listing, where the first pages can
		// be all older clips. Starting playback on the first handful of matches
		// would open every session with the same most viewed clips.
		while (clips.length < this.minInitialClips && this.hasMorePages(results)) {
			clips.push(
				...(await this.fetchNextPages(results, seenIds, days, minViews)),
			);
		}

		console.log(`Initial batch: ${clips.length} matching clips`);

		return { clips, results, seenIds };
	}

	/**
	 * Fetch the next page for every channel that still has one.
	 * Mutates each result's pagination state so later calls continue where
	 * this one stopped.
	 * @param {Array<Object>} results - Per-channel state {channel, range, cursor, done, failed}
	 * @param {Set<string>} seenIds - Clip IDs already fetched, updated in place
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @returns {Promise<Array>} New clips from this page round that pass the filters
	 */
	async fetchNextPages(results, seenIds, days, minViews) {
		const pending = results.filter((r) => !r.done);

		const pages = await Promise.all(
			pending.map(async (result) => {
				try {
					const next = await this.fetchPage(result);
					result.cursor = next.endCursor;
					result.done = !next.hasNextPage || !next.endCursor;

					// Clips come sorted by views descending, so once a page dips below
					// minViews no later page can contain a match.
					const lastClip = next.clips[next.clips.length - 1];
					if (minViews > 0 && lastClip && lastClip.viewCount < minViews) {
						result.done = true;
					}

					return next.clips;
				} catch (error) {
					console.warn(
						`Failed to page clips for ${result.channel}:`,
						error.message,
					);
					result.done = true;
					result.failed = true;
					return [];
				}
			}),
		);

		const newClips = pages.flat().filter((clip) => {
			if (seenIds.has(clip.id)) return false;
			seenIds.add(clip.id);
			return true;
		});

		return this.applyFilters(newClips, days, minViews);
	}

	/**
	 * Fetch one page for a channel. The startAt/endAt window is undocumented,
	 * so if Twitch ever rejects it the channel falls back to the plain all time
	 * listing; applyFilters still enforces the date range on that.
	 * @param {Object} result - Per-channel pagination state, range is cleared on fallback
	 * @returns {Promise<Object>} Page from fetchClipsCards
	 */
	async fetchPage(result) {
		try {
			return await fetchClipsCards(
				result.channel,
				100,
				"ALL_TIME",
				result.cursor,
				result.range,
			);
		} catch (error) {
			if (!result.range || result.cursor) throw error;

			console.warn(
				`Date range query failed for ${result.channel}, falling back to all time listing:`,
				error.message,
			);
			result.range = null;
			return fetchClipsCards(result.channel, 100, "ALL_TIME");
		}
	}

	/**
	 * Whether any channel still has pages left to fetch
	 * @param {Array<Object>} results - Per-channel pagination state
	 * @returns {boolean}
	 */
	hasMorePages(results) {
		return results.some((r) => !r.done);
	}

	/**
	 * Whether every channel was paged to its end without errors. A pool cut
	 * short by a failed page must not be cached, or every load for the next
	 * week would start from that partial pool.
	 * @param {Array<Object>} results - Per-channel pagination state
	 * @returns {boolean}
	 */
	isPoolComplete(results) {
		return !results.some((r) => r.failed);
	}

	/**
	 * Keep paging every channel until Twitch runs out of clips in the window
	 * @param {Array<Object>} results - Per-channel pagination state
	 * @param {Set<string>} seenIds - Clip IDs already fetched
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @returns {Promise<Array>} Additional filtered clips
	 */
	async fetchRemainingClips(results, seenIds, days, minViews) {
		// Twitch ends every listing around 1100 clips (11 pages); this only guards
		// against a cursor that never reports the end
		const maxPages = 50;
		const newClips = [];
		let page = 0;

		while (page < maxPages && this.hasMorePages(results)) {
			page++;
			newClips.push(
				...(await this.fetchNextPages(results, seenIds, days, minViews)),
			);

			if (this.hasMorePages(results)) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		console.log(
			`Background fetch: ${newClips.length} matching clips across ${page} page(s)`,
		);
		return newClips;
	}

	/**
	 * Grow the playlist that started from a freshly fetched initial pool
	 * @param {Array<Object>} results - Per-channel pagination state
	 * @param {Set<string>} seenIds - Clip IDs already fetched
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @param {string} cacheKey - Key to cache the complete pool under
	 * @returns {Promise<void>}
	 */
	async loadRemainingClips(results, seenIds, days, minViews, cacheKey) {
		try {
			console.log("📦 Loading additional clips in background...");

			const newClips = await this.fetchRemainingClips(
				results,
				seenIds,
				days,
				minViews,
			);

			if (newClips.length > 0) {
				this.replaceUpcoming([...this.playlist, ...newClips]);
				console.log(
					`✨ Expanded playlist to ${this.playlist.length} clips total (added ${newClips.length} new clips)`,
				);
				this.logPlaylistStats();
			} else {
				console.log("✅ No additional clips found");
			}

			if (this.isPoolComplete(results)) {
				saveCachedClips(cacheKey, this.playlist);
			} else {
				console.warn("Some pages failed, not caching this clip pool");
			}
		} catch (error) {
			console.error("Background loading failed:", error);
		} finally {
			this.isLoadingComplete = true;
		}
	}

	/**
	 * Refetch the full pool while a cached playlist plays, so new clips show up
	 * and deleted ones drop out
	 * @param {string[]} channels - Channel names
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @param {string} cacheKey - Key to cache the fresh pool under
	 * @returns {Promise<void>}
	 */
	async refreshClips(channels, days, minViews, cacheKey) {
		try {
			const { clips, results, seenIds } = await this.fetchInitialPool(
				channels,
				days,
				minViews,
			);
			const remaining = await this.fetchRemainingClips(
				results,
				seenIds,
				days,
				minViews,
			);
			const fresh = [...clips, ...remaining];

			if (!this.isPoolComplete(results) || fresh.length === 0) {
				console.warn("Refresh incomplete, keeping cached playlist");
				return;
			}

			this.replaceUpcoming(fresh);
			saveCachedClips(cacheKey, fresh);

			console.log(
				`✨ Refreshed playlist from Twitch: ${fresh.length} clips in pool`,
			);
			this.logPlaylistStats();
		} catch (error) {
			console.error("Background refresh failed:", error);
		} finally {
			this.isLoadingComplete = true;
		}
	}

	/**
	 * Replace everything after the current position with a shuffle of the given
	 * pool. Clips already played this cycle are kept out, so they can't come
	 * back before the rest of the pool has had a turn.
	 * @param {Array} pool - All clips that should be in the playlist
	 */
	replaceUpcoming(pool) {
		const played = this.playlist.slice(0, this.currentIndex);
		const playedIds = new Set(played.map((clip) => clip.id));
		const upcoming = pool.filter((clip) => !playedIds.has(clip.id));

		this.playlist = [
			...played,
			...smartShuffle(upcoming, this.shuffleStrategy),
		];
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
				(clip) => clip.viewCount >= minViews,
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
		shuffleStrategy = "smart",
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
			viewCounts.reduce((sum, count) => sum + count, 0) / viewCounts.length,
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
