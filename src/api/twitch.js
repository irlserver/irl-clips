const CLIENT_ID = "kd1unb4b3q4t58fwlpcbzcbnm76a8fp";
const GRAPHQL_ENDPOINT = "https://gql.twitch.tv/gql";
const PERSISTED_QUERY_HASH =
	"9c0a5b51612a41b06bfb93065deb6fd7bb7e011db2beb6e5e5d7588ae7f3ff4b";

// New ClipsCards__User persisted query hash (more reliable)
const CLIPS_CARDS_QUERY_HASH =
	"1cd671bfa12cec480499c087319f26d21925e9695d1f80225aae6a4354f23088";

/**
 * Convert days parameter to appropriate filter value
 * @param {number} days - Number of days
 * @returns {string} Filter string for the API
 */
function getDynamicFilter(days) {
	if (days <= 1) {
		return "LAST_DAY";
	} else if (days <= 7) {
		return "LAST_WEEK";
	} else if (days <= 30) {
		return "LAST_MONTH";
	} else {
		return "ALL_TIME";
	}
}

/**
 * Fetch clips using the ClipsCards__User operation (more reliable method)
 * @param {string} channelName - Twitch channel name
 * @param {number} limit - Number of clips to fetch (max 100 per request)
 * @param {string} filter - Time filter (LAST_DAY, LAST_WEEK, LAST_MONTH, ALL_TIME)
 * @param {string} cursor - Pagination cursor (optional)
 * @returns {Promise<Object>} Object containing clips array and pagination info
 */
export async function fetchClipsCards(
	channelName,
	limit = 100,
	filter = "ALL_TIME",
	cursor = null,
) {
	console.log(
		`Fetching ${limit} clips for ${channelName} using ClipsCards (${filter})${
			cursor ? " (paginated)" : ""
		}...`,
	);

	try {
		// Build variables object
		const variables = {
			login: channelName,
			limit: Math.min(limit, 100), // Ensure we don't exceed GraphQL limit
			criteria: {
				filter: filter,
			},
		};

		// Add cursor for pagination if provided
		// According to the ClipsCards__User schema, the cursor parameter is named 'cursor', not 'after'
		// Reference: https://github.com/DmitryScaletta/twitch-gql-queries/blob/HEAD/src/queries/ClipsCards__User/schema.ts
		if (cursor) {
			variables.cursor = cursor;
			console.log(`📍 Using cursor: ${cursor.substring(0, 20)}...`);
			console.log(
				`📍 Full request variables:`,
				JSON.stringify(variables, null, 2),
			);
		}

		const response = await fetch(GRAPHQL_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Client-ID": CLIENT_ID,
			},
			body: JSON.stringify({
				operationName: "ClipsCards__User",
				variables: variables,
				extensions: {
					persistedQuery: {
						version: 1,
						sha256Hash: CLIPS_CARDS_QUERY_HASH,
					},
				},
			}),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const data = await response.json();

		// Debug: Log errors if any
		if (data.errors) {
			console.error(`❌ GraphQL errors:`, JSON.stringify(data.errors, null, 2));
		}

		if (!data.data?.user) {
			console.warn(`No user data found for channel: ${channelName}`);
			return { clips: [], hasNextPage: false, endCursor: null };
		}

		const clipsConnection = data.data.user.clips;
		const edges = clipsConnection?.edges || [];

		console.log(`📊 API returned ${edges.length} edges`);

		// Debug: Log the full pageInfo object
		// Note: According to the schema, pageInfo only has 'hasNextPage', no cursor field
		console.log(
			`📄 pageInfo:`,
			JSON.stringify(clipsConnection?.pageInfo, null, 2),
		);

		// Debug: Log edge cursors (only those that have values)
		// The cursor for pagination comes from the edges, not pageInfo
		if (edges.length > 0) {
			const edgesWithCursors = edges
				.map((e, idx) => ({ cursor: e.cursor, idx }))
				.filter((e) => e.cursor);

			if (edgesWithCursors.length > 0) {
				console.log(
					`🔍 Edges with cursors:`,
					edgesWithCursors
						.map(({ cursor, idx }) => {
							try {
								const decoded = atob(cursor);
								return `[${idx}]: offset ${decoded}`;
							} catch {
								return `[${idx}]: ${cursor.substring(0, 20)}...`;
							}
						})
						.join(", "),
				);
			} else {
				console.log(`⚠️ No cursors found in any edges`);
			}
		}

		const clips = edges.map((edge) => {
			const clip = edge.node;
			return {
				id: clip.id,
				slug: clip.slug,
				title: clip.title,
				viewCount: clip.viewCount,
				thumbnailURL: clip.thumbnailURL,
				createdAt: clip.createdAt,
				durationSeconds: clip.durationSeconds,
				url: `https://www.twitch.tv/${channelName}/clip/${clip.slug}`,
				curator: clip.curator
					? {
							displayName: clip.curator.displayName || clip.curator.login,
							login: clip.curator.login,
						}
					: null,
				game: clip.game ? { name: clip.game.name } : null,
				broadcaster: {
					displayName: channelName,
					login: channelName,
				},
			};
		});

		// Extract pagination info
		const pageInfo = clipsConnection?.pageInfo || { hasNextPage: false };

		// CRITICAL: According to Twitch's ClipsCards__User GraphQL schema:
		// - pageInfo only contains 'hasNextPage' (no cursor field)
		// - Each edge has a cursor field (base64 encoded offset: "100", "200", "300", etc.)
		// - We must use the cursor from the LAST EDGE for pagination
		// Reference: https://github.com/DmitryScaletta/twitch-gql-queries/blob/HEAD/src/queries/ClipsCards__User/schema.ts

		let endCursor = null;

		// Get cursor from the last edge (only source for pagination cursor)
		if (edges.length > 0) {
			for (let i = edges.length - 1; i >= 0; i--) {
				if (edges[i].cursor) {
					endCursor = edges[i].cursor;

					// Decode to verify it's incrementing correctly
					try {
						const decoded = atob(endCursor);
						console.log(
							`✅ Next cursor from edge[${i}]: ${endCursor.substring(0, 10)}... (offset: ${decoded})`,
						);
					} catch (e) {
						console.log(
							`✅ Next cursor from edge[${i}]: ${endCursor.substring(0, 10)}...`,
						);
					}
					break;
				}
			}
		}

		if (!endCursor) {
			console.log(
				`⚠️ No cursor found in edges (pagination may not be available)`,
			);
		}

		console.log(`📄 hasNextPage: ${pageInfo.hasNextPage}`);

		console.log(
			`ClipsCards fetch successful: ${clips.length} clips, hasNextPage: ${pageInfo.hasNextPage}`,
		);

		return {
			clips,
			hasNextPage: pageInfo.hasNextPage,
			endCursor: endCursor,
		};
	} catch (error) {
		console.error(
			`Error fetching clips with ClipsCards for ${channelName}:`,
			error,
		);
		throw error;
	}
}

/**
 * Fetch clips with multiple simultaneous requests using the more reliable ClipsCards method
 * @param {string} channelName - Twitch channel name
 * @param {number} days - Number of days to consider for filter selection
 * @returns {Promise<Object>} Object containing clips array and pagination info for the primary filter
 */
export async function fetchMultipleCriteriaClips(channelName, days = 900) {
	console.log(
		`Fetching clips with multiple filters using ClipsCards for ${channelName} (${days} days)...`,
	);

	// Get the primary filter based on days parameter
	const primaryFilter = getDynamicFilter(days);

	// Define different filters to try for variety
	const filters = [
		primaryFilter, // Primary filter based on days parameter
		"ALL_TIME", // Always include all-time clips for variety
		"LAST_WEEK", // Recent popular clips
		"LAST_MONTH", // Monthly clips
	];

	// Remove duplicates while preserving order
	const uniqueFilters = [...new Set(filters)];
	let primaryFilterPagination = null;

	try {
		// Execute all fetches simultaneously using ClipsCards
		const fetchPromises = uniqueFilters.map((filter) =>
			fetchClipsCards(channelName, 100, filter)
				.then((result) => ({
					clips: result.clips,
					filter,
					success: true,
					hasNextPage: result.hasNextPage,
					endCursor: result.endCursor,
				}))
				.catch((error) => {
					console.warn(`Failed ClipsCards fetch for ${filter}:`, error.message);
					return {
						clips: [],
						filter,
						success: false,
						hasNextPage: false,
						endCursor: null,
					};
				}),
		);

		const results = await Promise.all(fetchPromises);

		// Combine all clips and remove duplicates
		const allClips = [];
		const seenIds = new Set();

		results.forEach(({ clips, filter, success, hasNextPage, endCursor }) => {
			console.log(`${filter}: ${clips.length} clips ${success ? "✓" : "✗"}`);

			// Store pagination info for the primary filter for background loading
			if (filter === primaryFilter && success) {
				primaryFilterPagination = {
					hasNextPage,
					endCursor,
					filter: primaryFilter,
				};
			}

			clips.forEach((clip) => {
				if (!seenIds.has(clip.id)) {
					seenIds.add(clip.id);
					allClips.push(clip);
				}
			});
		});

		console.log(
			`Combined ${allClips.length} unique clips from ${uniqueFilters.length} ClipsCards fetches`,
		);

		// If we didn't get many clips, try a fallback with pagination
		if (allClips.length < 20) {
			console.log("Low clip count, trying paginated fallback to ALL_TIME...");
			try {
				let cursor = null;
				let pageCount = 0;
				const maxPages = 3;
				const currentSeenIds = new Set(allClips.map((clip) => clip.id));

				while (pageCount < maxPages) {
					const fallbackResult = await fetchClipsCards(
						channelName,
						100,
						"ALL_TIME",
						cursor,
					);
					const newClips = fallbackResult.clips.filter(
						(clip) => !currentSeenIds.has(clip.id),
					);

					newClips.forEach((clip) => {
						currentSeenIds.add(clip.id);
						allClips.push(clip);
					});

					pageCount++;

					if (!fallbackResult.hasNextPage || !fallbackResult.endCursor) break;
					cursor = fallbackResult.endCursor;

					if (pageCount < maxPages) {
						await new Promise((resolve) => setTimeout(resolve, 100));
					}
				}

				console.log(
					`Added ${newClips?.length || 0} additional clips from paginated fallback`,
				);
			} catch (fallbackError) {
				console.warn("Fallback fetch failed:", fallbackError.message);
			}
		}

		return {
			clips: allClips,
			hasNextPage: primaryFilterPagination?.hasNextPage || false,
			endCursor: primaryFilterPagination?.endCursor || null,
			primaryFilter: primaryFilter,
		};
	} catch (error) {
		console.error("Error in ClipsCards multiple criteria fetch:", error);
		console.log("Falling back to single ALL_TIME ClipsCards fetch...");

		// Final fallback to single fetch
		try {
			const fallback = await fetchClipsCards(channelName, 100, "ALL_TIME");
			return {
				clips: fallback.clips,
				hasNextPage: fallback.hasNextPage,
				endCursor: fallback.endCursor,
				primaryFilter: "ALL_TIME",
			};
		} catch (fallbackError) {
			console.error("All ClipsCards fetches failed:", fallbackError);
			return {
				clips: [],
				hasNextPage: false,
				endCursor: null,
				primaryFilter: primaryFilter,
			};
		}
	}
}

/**
 * Fetch a diverse set of clips using the ClipsCards method with pagination
 * @param {string} channelName - Twitch channel name
 * @param {number} totalClips - Total number of clips to attempt to fetch
 * @param {string} startCursor - Starting cursor for pagination (optional)
 * @param {number} days - Number of days to consider for filter selection
 * @param {string} specificFilter - Specific filter to use (overrides days-based filter)
 * @returns {Promise<Array>} Array of clip objects
 */
export async function fetchDiverseClips(
	channelName,
	totalClips = 300,
	startCursor = null,
	days = 900,
	specificFilter = null,
) {
	console.log(
		`Fetching diverse set of clips for ${channelName} using ClipsCards${
			startCursor ? " (continuing from cursor)" : ""
		}...`,
	);

	try {
		const allClips = [];
		let cursor = startCursor;
		let requestCount = 0;
		const maxRequests = Math.ceil(totalClips / 100); // Limit API calls

		// Use specific filter if provided (for cursor continuation), otherwise determine from days
		const filter = specificFilter || getDynamicFilter(days);

		console.log(
			`Using filter: ${filter}${cursor ? ` with initial cursor: ${cursor.substring(0, 10)}...` : ""}`,
		);

		// Fetch multiple pages to get beyond just the top clips
		while (allClips.length < totalClips && requestCount < maxRequests) {
			console.log(
				`Request ${requestCount + 1}: Using cursor: ${cursor ? cursor.substring(0, 10) + "..." : "null"}`,
			);

			const result = await fetchClipsCards(channelName, 100, filter, cursor);

			if (result.clips.length === 0) {
				console.log(
					`No clips returned on request ${requestCount + 1}, breaking`,
				);
				break;
			}

			allClips.push(...result.clips);
			requestCount++;

			console.log(
				`Request ${requestCount} completed: ${result.clips.length} clips, hasNextPage: ${result.hasNextPage}, newCursor: ${result.endCursor ? result.endCursor.substring(0, 10) + "..." : "null"}`,
			);

			if (!result.hasNextPage || !result.endCursor) {
				console.log(
					`No more pages available for ${filter} (hasNextPage: ${result.hasNextPage}, endCursor: ${result.endCursor ? "exists" : "null"})`,
				);
				break;
			}

			// CRITICAL: Update cursor for next iteration
			const previousCursor = cursor;
			cursor = result.endCursor;

			// Verify cursor actually changed
			if (previousCursor && cursor === previousCursor) {
				console.error(
					`🚨 CURSOR DID NOT CHANGE! Previous: ${previousCursor.substring(0, 10)}..., New: ${cursor.substring(0, 10)}...`,
				);
				break; // Prevent infinite loop
			}

			// Small delay between requests to be respectful
			if (requestCount < maxRequests) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}

		console.log(
			`Fetched ${allClips.length} clips across ${requestCount} ClipsCards API calls (${filter})`,
		);

		// If we need more clips and didn't get enough, try ALL_TIME as well (but only if not already using it and no cursor was provided)
		if (allClips.length < totalClips && filter !== "ALL_TIME" && !startCursor) {
			console.log("Getting additional clips from ALL_TIME...");
			try {
				let additionalCursor = null;
				let additionalRequests = 0;
				const maxAdditionalRequests = Math.ceil(
					(totalClips - allClips.length) / 100,
				);
				const seenIds = new Set(allClips.map((clip) => clip.id));

				while (
					allClips.length < totalClips &&
					additionalRequests < maxAdditionalRequests
				) {
					const additionalResult = await fetchClipsCards(
						channelName,
						100,
						"ALL_TIME",
						additionalCursor,
					);

					if (additionalResult.clips.length === 0) break;

					// Only add clips we haven't seen before
					const newClips = additionalResult.clips.filter(
						(clip) => !seenIds.has(clip.id),
					);
					newClips.forEach((clip) => seenIds.add(clip.id));
					allClips.push(...newClips);
					additionalRequests++;

					if (!additionalResult.hasNextPage || !additionalResult.endCursor)
						break;
					additionalCursor = additionalResult.endCursor;

					if (additionalRequests < maxAdditionalRequests) {
						await new Promise((resolve) => setTimeout(resolve, 100));
					}
				}

				console.log(
					`Added ${newClips?.length || 0} additional unique clips from ALL_TIME`,
				);
			} catch (error) {
				console.warn("Failed to get additional ALL_TIME clips:", error.message);
			}
		}

		return allClips;
	} catch (error) {
		console.error("Error fetching diverse clips with ClipsCards:", error);
		console.log("Trying fallback to ALL_TIME...");

		// Fallback to ALL_TIME (only if we weren't already using a cursor)
		if (!startCursor) {
			try {
				const fallbackResult = await fetchClipsCards(
					channelName,
					100,
					"ALL_TIME",
				);
				return fallbackResult.clips;
			} catch (fallbackError) {
				console.error("All ClipsCards fetches failed:", fallbackError);
			}
		}

		return []; // Return empty array to prevent total failure
	}
}

/**
 * Get playback URL for a specific clip using persisted query
 * @param {string} clipSlug - Clip slug from URL
 * @returns {Promise<string|null>} Playback URL or null if failed
 */
export async function getClipPlaybackUrl(clipSlug) {
	console.log(`Fetching playback URL for clip: ${clipSlug}`);

	try {
		// Use persisted query for better reliability
		const data = [
			{
				operationName: "ClipsDownloadButton",
				variables: {
					slug: clipSlug,
				},
				extensions: {
					persistedQuery: {
						version: 1,
						sha256Hash: PERSISTED_QUERY_HASH,
					},
				},
			},
		];

		const response = await fetch(GRAPHQL_ENDPOINT, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"Client-ID": CLIENT_ID,
			},
			body: JSON.stringify(data),
		});

		if (!response.ok) {
			throw new Error(`HTTP error! status: ${response.status}`);
		}

		const result = await response.json();
		const clipData = result[0]?.data?.clip;

		if (!clipData) {
			console.warn(`No clip data found for slug: ${clipSlug}`);
			return null;
		}

		let clipUrl = clipData.videoQualities?.[0]?.sourceURL;
		if (!clipUrl) {
			console.warn(`No video quality found for clip: ${clipSlug}`);
			return null;
		}

		const signature = clipData.playbackAccessToken?.signature;
		const token = clipData.playbackAccessToken?.value;

		if (!signature || !token) {
			console.warn(`Missing access token data for clip: ${clipSlug}`);
			return null;
		}

		clipUrl = `${clipUrl}?sig=${signature}&token=${encodeURIComponent(token)}`;
		return clipUrl;
	} catch (error) {
		console.error(`Error fetching playback URL for ${clipSlug}:`, error);
		return null;
	}
}
