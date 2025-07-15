const CLIENT_ID = "kimne78kx3ncx6brgo4mv6wki5h1ko";
const GRAPHQL_ENDPOINT = "https://gql.twitch.tv/gql";

/**
 * Make GraphQL request to Twitch API
 * @param {string} query - GraphQL query string
 * @returns {Promise<any>} API response data
 */
async function makeGraphQLRequest(query) {
  try {
    const response = await fetch(GRAPHQL_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Client-ID": CLIENT_ID,
      },
      body: JSON.stringify({ query }),
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

  const cursorParam = cursor ? `, after: "${cursor}"` : "";
  const query = `query { 
    user(login: "${channelName}") { 
      clips(first: ${Math.min(count, 100)}${cursorParam}) { 
        edges { 
          node { 
            id 
            title 
            url 
            thumbnailURL 
            createdAt 
            viewCount 
          } 
        }
        pageInfo {
          hasNextPage
          endCursor
        }
      } 
    } 
  }`;

  const data = await makeGraphQLRequest(query);
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
}

/**
 * Fetch a diverse set of clips using multiple strategies
 * @param {string} channelName - Twitch channel name
 * @param {number} totalClips - Total number of clips to attempt to fetch
 * @returns {Promise<Array>} Array of clip objects
 */
export async function fetchDiverseClips(channelName, totalClips = 300) {
  console.log(`Fetching diverse set of clips for ${channelName}...`);

  let allClips = [];
  let cursor = null;
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
 * Get playback URL for a specific clip
 * @param {string} clipSlug - Clip slug from URL
 * @returns {Promise<string|null>} Playback URL or null if failed
 */
export async function getClipPlaybackUrl(clipSlug) {
  console.log(`Fetching playback URL for clip: ${clipSlug}`);

  const query = `query { 
    clip(slug: "${clipSlug}") { 
      videoQualities { 
        sourceURL 
      } 
      playbackAccessToken(params: { platform: "web", playerType: "embed" }) { 
        signature 
        value 
      } 
    } 
  }`;

  try {
    const data = await makeGraphQLRequest(query);
    const clipData = data?.data?.clip;

    if (!clipData) {
      console.warn(`No clip data found for slug: ${clipSlug}`);
      return null;
    }

    const baseUrl = clipData.videoQualities[0]?.sourceURL;
    const signature = clipData.playbackAccessToken?.signature;
    const token = clipData.playbackAccessToken?.value;

    if (!baseUrl || !signature || !token) {
      console.warn(`Missing required data for clip: ${clipSlug}`);
      return null;
    }

    return `${baseUrl}?sig=${signature}&token=${encodeURIComponent(token)}`;
  } catch (error) {
    console.error(`Error fetching playback URL for ${clipSlug}:`, error);
    return null;
  }
}
