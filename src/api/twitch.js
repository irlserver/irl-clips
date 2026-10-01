const CLIENT_ID = "kd1unb4b3q4t58fwlpcbzcbnm76a8fp";
const GRAPHQL_ENDPOINT = "https://gql.twitch.tv/gql";
const PERSISTED_QUERY_HASH =
	"c5ca7c4143e42f257b91b97b37fbb19206460f42f564a02095bb504fd0a31af8";

// New ClipsCards__User persisted query hash (more reliable)
const CLIPS_CARDS_QUERY_HASH =
	"5e28057f6a6bb95f25474447baf2eea1609ba987dc819b1a537fb0f9e08309bd";

/**
 * Build the createdAt window for the last `days` days.
 * Twitch stops every clip listing at ~1100 clips sorted by views, so without a
 * window a range like 250 days only sees clips popular enough to rank in the
 * channel's all time top 1100.
 * @param {number} days - Number of days to look back
 * @returns {{startAt: string, endAt: string}|null} Window, or null for no limit
 */
export function clipDateRange(days) {
	if (!days || days <= 0) return null;

	const endAt = new Date();
	const startAt = new Date(endAt.getTime() - days * 24 * 60 * 60 * 1000);
	return { startAt: startAt.toISOString(), endAt: endAt.toISOString() };
}

/**
 * Fetch clips using the ClipsCards__User operation (more reliable method)
 * @param {string} channelName - Twitch channel name
 * @param {number} limit - Number of clips to fetch (max 100 per request)
 * @param {string} filter - Time filter (LAST_DAY, LAST_WEEK, LAST_MONTH, ALL_TIME)
 * @param {string} cursor - Pagination cursor (optional)
 * @param {{startAt: string, endAt: string}|null} range - Only return clips created in this window (optional)
 * @returns {Promise<Object>} Object containing clips array and pagination info
 */
export async function fetchClipsCards(
	channelName,
	limit = 100,
	filter = "ALL_TIME",
	cursor = null,
	range = null,
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
				shouldFilterByDiscoverySetting: false,
				// Not used by Twitch's own site, but the criteria input accepts it
				...(range && { startAt: range.startAt, endAt: range.endAt }),
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

			// A failed page must not look like the end of the list, or callers
			// stop paging and treat a partial pool as complete
			if (!data.data?.user?.clips) {
				throw new Error(`GraphQL error: ${data.errors[0]?.message}`);
			}
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
				url: clip.url || `https://www.twitch.tv/${channelName}/clip/${clip.slug}`,
				curator: clip.curator
					? {
							displayName: clip.curator.displayName || clip.curator.login,
							login: clip.curator.login,
						}
					: null,
				game: clip.game ? { name: clip.game.name } : null,
				broadcaster: {
					displayName:
						clip.broadcaster?.displayName ||
						clip.broadcaster?.login ||
						channelName,
					login: clip.broadcaster?.login || channelName,
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
				operationName: "VideoAccessToken_Clip",
				variables: {
					platform: "web",
					slug: clipSlug,
					supportedCodecs: ["AVC", "HEVC", "AV1"]

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
