import {
	fetchClipsCards,
	fetchMultipleCriteriaClips,
	getClipPlaybackUrl,
} from "../api/twitch.js";
import { filterByDateRange, smartShuffle } from "../utils/array.js";

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
		shuffleStrategy = "smart",
	) {
		try {
			this.shuffleStrategy = shuffleStrategy;
			const channels = this.parseChannelNames(channelName);

			console.log(
				`🚀 Fast loading diverse clips for ${channels.length} channel(s): ${channels.join(", ")}...`,
			);

			// Fetch clips from all channels in parallel
			const results = await Promise.all(
				channels.map((ch) =>
					fetchMultipleCriteriaClips(ch, days)
						.then((result) => ({ channel: ch, ...result, success: true }))
						.catch((error) => {
							console.warn(`Failed to fetch clips for ${ch}:`, error.message);
							return {
								channel: ch,
								clips: [],
								hasNextPage: false,
								endCursor: null,
								primaryFilter: null,
								success: false,
							};
						}),
				),
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

			console.log(
				`Initial diverse batch: ${clips.length} clips from ${channels.length} channel(s)`,
			);

			// Apply filters to initial batch
			clips = this.applyFilters(clips, days, minViews);

			if (clips.length === 0) {
				clips = await this.searchForMatchingClips(
					results,
					seenIds,
					days,
					minViews,
				);
			}

			if (clips.length === 0) {
				throw new Error(
					`No clips found matching criteria for channel(s): ${channels.join(", ")}`,
				);
			}

			// Apply initial shuffling
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
			);

			return;
		} catch (error) {
			console.error("Failed to load initial clips:", error);
			throw error;
		}
	}


	/**
	 * Fetch the next page for every channel that still has one.
	 * Mutates each result's cursor so later calls continue where this one stopped.
	 * @param {Array<Object>} results - Per-channel results with {channel, success, hasNextPage, endCursor, primaryFilter}
	 * @param {Set<string>} seenIds - Clip IDs already fetched, updated in place
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @returns {Promise<Array>} New clips from this page round that pass the filters
	 */
	async fetchNextPages(results, seenIds, days, minViews) {
		const pageable = results.filter(
			(r) => r.success && r.hasNextPage && r.endCursor,
		);

		const pages = await Promise.all(
			pageable.map(async (result) => {
				try {
					const next = await fetchClipsCards(
						result.channel,
						100,
						result.primaryFilter,
						result.endCursor,
					);
					result.hasNextPage = next.hasNextPage;
					result.endCursor = next.endCursor;

					// Clips come sorted by views descending, so once a page dips below
					// minViews no later page can contain a match.
					const lastClip = next.clips[next.clips.length - 1];
					if (minViews > 0 && lastClip && lastClip.viewCount < minViews) {
						result.hasNextPage = false;
					}

					return next.clips;
				} catch (error) {
					console.warn(
						`Failed to page clips for ${result.channel}:`,
						error.message,
					);
					result.hasNextPage = false;
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
	 * Whether any channel still has pages left to fetch
	 * @param {Array<Object>} results - Per-channel results with pagination info
	 * @returns {boolean}
	 */
	hasMorePages(results) {
		return results.some((r) => r.success && r.hasNextPage && r.endCursor);
	}

	/**
	 * Page further into each channel's clips until some pass the filters.
	 * Twitch only offers LAST_DAY/LAST_WEEK/LAST_MONTH/ALL_TIME, and ALL_TIME is
	 * sorted by views, so for ranges like 250 days the first pages can be all
	 * older, more popular clips.
	 * @param {Array<Object>} results - Per-channel results with pagination info
	 * @param {Set<string>} seenIds - Clip IDs already fetched
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @returns {Promise<Array>} Filtered clips (empty if none found within the page limit)
	 */
	async searchForMatchingClips(results, seenIds, days, minViews) {
		const maxPages = 10;

		for (let page = 1; page <= maxPages && this.hasMorePages(results); page++) {
			console.log(
				`🔎 No clips matched filters yet, searching page ${page + 1}...`,
			);

			const matching = await this.fetchNextPages(
				results,
				seenIds,
				days,
				minViews,
			);
			if (matching.length > 0) return matching;
		}

		return [];
	}

	/**
	 * Keep paging every channel in the background until the playlist holds
	 * maxClipsToFetch matching clips or the channels run out of pages.
	 * The cap counts clips that pass the filters, so narrow date ranges on
	 * channels with many older popular clips still fill up.
	 * @param {Array<Object>} results - Per-channel results with pagination info
	 * @param {Set<string>} seenIds - Clip IDs already fetched
	 * @param {number} days - Number of days to filter clips
	 * @param {number} minViews - Minimum view count filter
	 * @returns {Promise<void>}
	 */
	async loadRemainingClips(results, seenIds, days, minViews) {
		// Safety net against paging forever through channels with huge clip archives
		const maxPages = 50;

		try {
			const newClips = [];
			let page = 0;

			console.log("📦 Loading additional clips in background...");

			while (
				page < maxPages &&
				this.playlist.length + newClips.length < this.maxClipsToFetch &&
				this.hasMorePages(results)
			) {
				page++;
				const matching = await this.fetchNextPages(
					results,
					seenIds,
					days,
					minViews,
				);
				newClips.push(...matching);

				if (this.hasMorePages(results)) {
					await new Promise((resolve) => setTimeout(resolve, 100));
				}
			}

			console.log(
				`Background fetch: ${newClips.length} matching clips across ${page} page(s)`,
			);

			if (newClips.length === 0) {
				console.log("✅ No additional clips found");
				return;
			}

			const allClips = [...this.playlist, ...newClips];
			const currentClip = this.playlist[this.currentIndex - 1];

			this.playlist = smartShuffle(allClips, this.shuffleStrategy);

			// Keep playback position by continuing after the clip we were just playing
			if (currentClip) {
				const currentClipIndex = this.playlist.findIndex(
					(clip) => clip.id === currentClip.id,
				);
				if (currentClipIndex >= 0) {
					this.currentIndex = currentClipIndex + 1;
				}
			}

			console.log(
				`✨ Expanded playlist to ${this.playlist.length} clips total (added ${newClips.length} new clips)`,
			);
			this.logPlaylistStats();
		} catch (error) {
			console.error("Background loading failed:", error);
		} finally {
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
