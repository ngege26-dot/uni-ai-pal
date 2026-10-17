import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authedPost, cached, cacheKey, generateStructured, options } from "@/lib/ai.server";

const body = z.object({ university: z.string().trim().min(2).max(150), major: z.string().trim().min(2).max(120) });

const schema = z.object({
  subjects: z.array(
    z.object({
      name: z.string(),
      code: z.string(),
      credits: z.number(),
      description: z.string(),
      relatedToMajor: z.boolean(),
    }),
  ),
});

export const Route = createFileRoute("/api/public/subjects")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: authedPost(body, async ({ request, body }) => {
        const result = await cached(cacheKey("subjects-v1", body.university, body.major), () =>
          generateStructured(
            request,
            schema,
            "You are an academic catalog expert. List real courses taught at the given university, as they appear in its public course catalog. Use the university's real course codes and credit values when you know them; otherwise use plausible ones. Never invent courses the university is unlikely to offer.",
            `University: ${body.university}\nStudent's major: ${body.major}\n\nList between 60 and 90 subjects taught at this university across departments, prioritising the major's core and elective courses plus common general-education courses. Mark relatedToMajor true for courses in or required by the major. Description: one sentence.`,
          ),
        );
        const subjects = [...result.subjects].sort((a, b) => a.name.localeCompare(b.name));
        return { subjects };
      }),
    },
  },
});
