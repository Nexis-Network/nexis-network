import { logger, task } from "@trigger.dev/sdk/v3";
import {
  fetchComments,
  type HNComment,
  type HNStory,
  searchStoriesByTopic,
} from "../lib/hacker-news";
import { runWithSentrySpan } from "@/lib/observability/sentry";
// Chain task result type
export interface ChainTaskResult {
  topic: string;
  stories: Array<{
    story: HNStory;
    stats: {
      score: number;
      commentCount: number;
      age: number; // in hours
    };
    topComments: HNComment[];
    summary: {
      popularity: "high" | "medium" | "low";
      engagement: "high" | "medium" | "low";
      ageCategory: "new" | "recent" | "old";
    };
  }>;
  topicSummary: {
    totalStories: number;
    avgScore: number;
    avgComments: number;
    trending: boolean;
  };
}

// Create a chain task that processes stories by topic
export const chainTask = task({
  id: "story-chain-task",
  run: async (payload: { topic: string }) => {
    return runWithSentrySpan(
      {
        name: "trigger.story-chain-task.run",
        op: "cron.job",
        tags: { trigger: "story-chain-task" },
        attributes: {
          "trigger.job.id": "story-chain-task",
          "trigger.payload.topic": payload.topic,
        },
      },
      async (span) => {
        logger.log("Starting topic chain analysis", { topic: payload.topic });

        const stories = await runWithSentrySpan(
          {
            name: "trigger.story-chain-task.fetch-stories",
            op: "cron.job.step",
            attributes: {
              "trigger.payload.topic": payload.topic,
            },
          },
          async () => {
            logger.log("Step 1: Searching stories");
            const fetchedStories = await searchStoriesByTopic(payload.topic);
            await new Promise((resolve) => setTimeout(resolve, 1000));
            return fetchedStories;
          },
        );

        span.setAttribute("trigger.stories.count", stories.length);

        const processedStories = await Promise.all(
          stories.map((story: HNStory) =>
            runWithSentrySpan(
              {
                name: "trigger.story-chain-task.process-story",
                op: "cron.job.step",
                attributes: {
                  "story.id": story.id,
                  "story.score": story.score,
                  "story.comment_count": story.descendants,
                },
              },
              async () => {
                logger.log("Step 2: Processing story", { storyId: story.id });
                const comments = await runWithSentrySpan(
                  {
                    name: "trigger.story-chain-task.fetch-comments",
                    op: "cron.job.step",
                    attributes: {
                      "story.id": story.id,
                    },
                  },
                  async () => {
                    const fetchedComments = await fetchComments(story.id);
                    await new Promise((resolve) => setTimeout(resolve, 500));
                    return fetchedComments;
                  },
                );

                const stats = {
                  score: story.score,
                  commentCount: story.descendants,
                  age: (Date.now() / 1000 - story.time) / 3600,
                };

                const summary = {
                  popularity:
                    story.score > 100 ? "high" : story.score > 50 ? "medium" : "low",
                  engagement:
                    story.descendants > 50
                      ? "high"
                      : story.descendants > 20
                        ? "medium"
                        : "low",
                  ageCategory:
                    stats.age < 24 ? "new" : stats.age < 72 ? "recent" : "old",
                } as const;

                return {
                  story,
                  stats,
                  topComments: comments,
                  summary,
                };
              },
            ),
          ),
        );

        logger.log("Step 3: Generating topic summary");
        const topicSummary = {
          totalStories: processedStories.length,
          avgScore: processedStories.length
            ? Math.round(
                processedStories.reduce(
                  (sum: number, item) => sum + item.stats.score,
                  0,
                ) / processedStories.length,
              )
            : 0,
          avgComments: processedStories.length
            ? Math.round(
                processedStories.reduce(
                  (sum: number, item) => sum + item.stats.commentCount,
                  0,
                ) / processedStories.length,
              )
            : 0,
          trending: processedStories.some(
            (item) =>
              item.summary.popularity === "high" && item.summary.ageCategory === "new",
          ),
        };

        span.setAttribute("trigger.topic.total_stories", topicSummary.totalStories);
        span.setAttribute("trigger.topic.avg_score", topicSummary.avgScore);
        span.setAttribute("trigger.topic.trending", topicSummary.trending);

        logger.log("Chain completed", {
          topic: payload.topic,
          storiesFound: processedStories.length,
        });

        return {
          topic: payload.topic,
          stories: processedStories,
          topicSummary,
        } satisfies ChainTaskResult;
      },
    );
  },
});
