import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authedPost, cached, cacheKey, generateStructured, options } from "@/lib/ai.server";

const body = z.object({
  subject: z.string().trim().min(2).max(150),
  candidates: z.array(z.string().trim().min(2).max(150)).min(1).max(40),
});

const schema = z.object({ universities: z.array(z.string()) });

export const Route = createFileRoute("/api/public/similar-unis")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: authedPost(body, async ({ request, body }) => {
        const result = await cached(cacheKey("similar-v1", body.subject, ...body.candidates), () =>
          generateStructured(
            request,
            schema,
            "You help students find past exam material. Be honest: include a university only if it is known to teach this course and publicly share past exams, problem sets or practice material for it (for example MIT OpenCourseWare, Stanford course sites).",
            `Course: ${body.subject}\nCandidates:\n${body.candidates.join("\n")}\n\nReturn only the candidates (exact names, same order) that have such material for this course.`,
          ),
        );
        // Keep only names from the candidate list, in its order.
        const set = new Set(result.universities);
        return { universities: body.candidates.filter((c) => set.has(c)) };
      }),
    },
  },
});
