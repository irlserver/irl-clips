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
 * Fetch clips for a specific channel
 * @param {string} channelName - Twitch channel name
 * @param {number} count - Number of clips to fetch (max 100)
 * @returns {Promise<Array>} Array of clip objects
 */
export async function fetchChannelClips(channelName, count = 100) {
  console.log(`Fetching ${count} clips for ${channelName}...`);

  const query = `query { 
    user(login: "${channelName}") { 
      clips(first: ${Math.min(count, 100)}) { 
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
      } 
    } 
  }`;

  const data = await makeGraphQLRequest(query);
  const clips = data?.data?.user?.clips?.edges.map((edge) => edge.node) || [];

  if (clips.length === 0) {
    console.warn("No clips found from API!");
  }

  return clips;
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
