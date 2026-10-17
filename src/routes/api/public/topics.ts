import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authedPost, cached, cacheKey, generateStructured, options } from "@/lib/ai.server";

const body = z.object({ university: z.string().trim().min(2).max(150), subject: z.string().trim().min(2).max(150) });

const schema = z.object({
  topics: z.array(
    z.object({
      title: z.string(),
      summary: z.string(),
      keyPoints: z.array(z.string()),
      example: z.string(),
    }),
  ),
});

export const Route = createFileRoute("/api/public/topics")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: authedPost(body, async ({ request, body }) =>
        cached(cacheKey("topics-v1", body.university, body.subject), () =>
          generateStructured(
            request,
            schema,
            "You are a patient university tutor who explains topics clearly for students studying on their phone.",
            `Course: ${body.subject} at ${body.university}.\nCreate a study guide of 8 to 12 topics in the order they are usually taught. For each: a clear 3-5 sentence summary, 3-6 key points, and one short worked example.`,
          ),
        ),
      ),
    },
  },
});
