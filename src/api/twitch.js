const CLIENT_ID = "kd1unb4b3q4t58fwlpcbzcbnm76a8fp";
const GRAPHQL_ENDPOINT = "https://gql.twitch.tv/gql";
const PERSISTED_QUERY_HASH =
  "6e465bb8446e2391644cf079851c0cb1b96928435a240f07ed4b240f0acc6f1b";

// More comprehensive clip fields
const CLIP_FIELDS = `
  id
  slug
  title
  createdAt
  viewCount
  durationSeconds
  url
  thumbnailURL
  videoQualities {
    frameRate
    quality
    sourceURL
  }
  game {
    id
    name
  }
  broadcaster {
    displayName
    login
  }
`;

/**
 * Make GraphQL request to Twitch API
 * @param {string} query - GraphQL query string
 * @param {Object} variables - GraphQL variables (optional)
 * @returns {Promise<any>} API response data
 */
async function makeGraphQLRequest(query, variables = {}) {
  try {
    const body = { query };
    if (Object.keys(variables).length > 0) {
      body.variables = variables;
    }

    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-ID": CLIENT_ID,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.errors) {
      throw new Error(`GraphQL errors: ${JSON.stringify(data.errors)}`);
    }

    return data;
  } catch (error) {
    console.error("GraphQL request failed:", error);
    throw error;
  }
}

/**
 * Fetch clips for a specific channel with pagination support
 * @param {string} channelName - Twitch channel name
 * @param {number} count - Number of clips to fetch (max 100 per request)
 * @param {string} cursor - Pagination cursor (optional)
 * @returns {Promise<Object>} Object containing clips array and pagination info
 */
export async function fetchChannelClips(
  channelName,
  count = 100,
  cursor = null
) {
  console.log(
    `Fetching ${count} clips for ${channelName}${
      cursor ? " (paginated)" : ""
    }...`
  );

  if (cursor) {
    console.log("Using cursor:", cursor.substring(0, 50) + "...");
  }

  // Use GraphQL variables for proper parameter handling
  const query = `query($after: Cursor) { 
    user(login: "${channelName}") { 
      clips(first: ${Math.min(count, 100)}, after: $after, criteria: { 
        sort: VIEWS_DESC, 
        period: ALL_TIME,
        isFeatured: false 
      }) { 
        edges { 
          cursor
          node { 
            ${CLIP_FIELDS}
          } 
        }
        pageInfo {
          hasNextPage
          hasPreviousPage
          endCursor
        }
      } 
    } 
  }`;

  const variables = cursor ? { after: cursor } : {};

  try {
    const data = await makeGraphQLRequest(query, variables);

    // Log cursor issues for debugging
    if (cursor && data?.errors) {
      console.error("Pagination failed with cursor:", cursor);
    }

    const clipsConnection = data?.data?.user?.clips;
    const clips = clipsConnection?.edges?.map((edge) => edge.node) || [];
    const pageInfo = clipsConnection?.pageInfo || {
      hasNextPage: false,
      endCursor: null,
    };

    if (clips.length === 0 && !cursor) {
      console.warn("No clips found from API!");
    }

    return {
      clips,
      hasNextPage: pageInfo.hasNextPage,
      endCursor: pageInfo.endCursor,
    };
  } catch (error) {
    if (cursor) {
      console.error(
        "Paginated request failed, cursor may be invalid:",
        error.message
      );
      throw error;
    }
    throw error;
  }
}

/**
 * Fetch a diverse set of clips using multiple strategies
 * @param {string} channelName - Twitch channel name
 * @param {number} totalClips - Total number of clips to attempt to fetch
 * @param {string} startCursor - Starting cursor for pagination (optional)
 * @returns {Promise<Array>} Array of clip objects
 */
export async function fetchDiverseClips(
  channelName,
  totalClips = 300,
  startCursor = null
) {
  console.log(
    `Fetching diverse set of clips for ${channelName}${
      startCursor ? " (continuing from cursor)" : ""
    }...`
  );

  let allClips = [];
  let cursor = startCursor;
  let requestCount = 0;
  const maxRequests = Math.ceil(totalClips / 100); // Limit API calls

  try {
    // Fetch multiple pages to get beyond just the top clips
    while (allClips.length < totalClips && requestCount < maxRequests) {
      const result = await fetchChannelClips(channelName, 100, cursor);

      if (result.clips.length === 0) break;

      allClips.push(...result.clips);
      requestCount++;

      if (!result.hasNextPage || !result.endCursor) break;
      cursor = result.endCursor;

      // Small delay between requests to be respectful
      if (requestCount < maxRequests) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    console.log(
      `Fetched ${allClips.length} clips across ${requestCount} API calls`
    );
    return allClips;
  } catch (error) {
    console.error("Error fetching diverse clips:", error);
    // Fallback to original method if pagination fails
    const fallback = await fetchChannelClips(channelName, 100);
    return fallback.clips;
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
