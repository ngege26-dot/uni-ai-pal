import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authedPost, cached, cacheKey, generateStructured, options } from "@/lib/ai.server";

const body = z.object({
  university: z.string().trim().min(2).max(150),
  subject: z.string().trim().min(2).max(150),
  // Set when the student picked a similar university because their own had no material.
  similar: z.boolean(),
});

const schema = z.object({
  available: z.boolean(),
  note: z.string(),
  exams: z.array(
    z.object({
      year: z.string(),
      title: z.string(),
      questions: z.array(z.object({ prompt: z.string(), points: z.number() })),
    }),
  ),
});

export const Route = createFileRoute("/api/public/past-exams")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: authedPost(body, async ({ request, body }) =>
        cached(cacheKey("past-v1", body.university, body.subject, String(body.similar)), async () => {
          const result = await generateStructured(
            request,
            schema,
            "You help students prepare for exams. Be honest about what you know: only claim a university's past exam material is available if that university is known to publish past exams or problem sets for this kind of course (for example MIT OpenCourseWare).",
            `University: ${body.university}\nCourse: ${body.subject}\n\n${
              body.similar
                ? "Set available to true. "
                : "Set available to true only if this university is known to publicly share past exams or problem sets for this course; otherwise false and return an empty exams list. "
            }When available, recreate 3 past-exam-style papers for recent years (e.g. 2023, 2024, 2025) that follow this university's known exam format and difficulty, each with 5 open-ended questions and point values. In note, say in one sentence that the papers are modelled on the university's past exams.`,
          );
          return result.available ? result : { available: false, note: result.note, exams: [] };
        }),
      ),
    },
  },
});
