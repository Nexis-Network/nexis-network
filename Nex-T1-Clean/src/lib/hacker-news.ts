import { logger } from "@/lib/logger";

export interface HNStory {
  id: number;
  title: string;
  url: string;
  score: number;
  by: string;
  time: number;
  descendants: number; // number of comments
}

export interface HNComment {
  id: number;
  text: string;
  by: string;
  time: number;
  parent: number;
}

// API Endpoints
const HN_BASE = "https://news.ycombinator.com";
const HN_API_BASE = "https://hacker-news.firebaseio.com/v0";
const ALGOLIA_API_BASE = "https://hn.algolia.com/api/v1";

// Search stories by topic using Algolia API
export async function searchStoriesByTopic(
  topic: string,
  limit = 5,
): Promise<HNStory[]> {
  logger.debug(
    `[HN Search] Starting search for topic: "${topic}" with limit: ${limit}`,
  );

  try {
    // Use Algolia API to search for stories with enhanced relevance
    const searchUrl = `${ALGOLIA_API_BASE}/search?query=${encodeURIComponent(
      topic,
    )}&tags=story&numericFilters=points>50&hitsPerPage=${
      limit * 2
    }&restrictSearchableAttributes=title,url,author&typoTolerance=strict`;
    logger.debug(`[HN Search] Fetching URL: ${searchUrl}`);

    const response = await fetch(searchUrl);
    if (!response.ok) {
      logger.error(`[HN Search] HTTP error! status: ${response.status}`);
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    logger.debug(`[HN Search] Found ${data.hits.length} stories`);

    // Convert Algolia hits to HNStory format and filter for relevance
    const stories: HNStory[] = data.hits
      .filter((hit: UntypedJson) => {
        // Check if the title contains the search topic (case-insensitive)
        const topicRegex = new RegExp(topic, "i");
        return (
          topicRegex.test(hit.title) ||
          (hit.url && topicRegex.test(hit.url)) ||
          hit.points > 500
        ); // Include very high-scoring stories even if less relevant
      })
      .map((hit: UntypedJson) => ({
        id: Number.parseInt(hit.objectID),
        title: hit.title,
        url: hit.url || `${HN_BASE}/item?id=${hit.objectID}`,
        score: hit.points,
        by: hit.author,
        time: new Date(hit.created_at).getTime() / 1000,
        descendants: hit.num_comments,
      }))
      .sort((a: HNStory, b: HNStory) => b.score - a.score) // Sort by points descending
      .slice(0, limit); // Take only the requested number of stories

    if (stories.length === 0) {
      logger.warn(
        `[HN Search] No stories found for topic "${topic}". Falling back to top stories.`,
      );
      const topStories = await fetchTopStories(limit);
      const fallbackStories = await fetchStories(topStories);
      return fallbackStories;
    }

    // Log the results
    stories.forEach((story, index) => {
      logger.debug(`[HN Search] Story ${index + 1}:`, {
        id: story.id,
        title: story.title,
        score: story.score,
        comments: story.descendants,
      });
    });

    return stories;
  } catch (error) {
    logger.error("[HN Search] Fatal error:", error);
    // Fallback to top stories if search fails
    logger.debug("[HN Search] Falling back to top stories due to error");
    try {
      const topStories = await fetchTopStories(limit);
      return await fetchStories(topStories);
    } catch (fallbackError) {
      logger.error("[HN Search] Fallback also failed:", fallbackError);
      throw error; // Throw original error if fallback fails
    }
  }
}

// Fetch top stories
export async function fetchTopStories(limit = 10): Promise<number[]> {
  const response = await fetch(`${HN_API_BASE}/topstories.json`);
  const ids = await response.json();
  return ids.slice(0, limit);
}

// Fetch story by ID
export async function fetchStory(id: number): Promise<HNStory> {
  const response = await fetch(`${HN_API_BASE}/item/${id}.json`);
  return response.json();
}

// Fetch multiple stories in parallel
export async function fetchStories(ids: number[]): Promise<HNStory[]> {
  const stories = await Promise.all(ids.map(fetchStory));
  return stories.filter((story): story is HNStory => story !== null);
}

// Fetch story comments using Cheerio for better HTML parsing
export async function fetchComments(
  storyId: number,
  limit = 5,
): Promise<HNComment[]> {
  const response = await fetch(`${HN_BASE}/item?id=${storyId}`);
  const html = await response.text();

  const cheerio = require("cheerio");
  const $ = cheerio.load(html);
  const comments: HNComment[] = [];

  $(".comment-tree .comtr").each((i: number, elem: unknown) => {
    if (i >= limit) return false;

    const commentSpan = $(elem).find(".commtext");
    const id = Number.parseInt($(elem).attr("id"));
    const by = $(elem).find(".hnuser").text();
    const timeAgo = $(elem).find(".age").attr("title") || "";
    const time = timeAgo
      ? new Date(timeAgo).getTime() / 1000
      : Date.now() / 1000;
    const text = commentSpan.text().trim();
    const parent = storyId; // Parent is the story ID

    if (text && by) {
      comments.push({ id, text, by, time, parent });
    }
  });

  return comments;
}
