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
        const result = await cached(cacheKey("subjects-v2", body.university, body.major), () =>
          generateStructured(
            request,
            schema,
            "You are an academic catalog expert. List real courses taught at the given university, as they appear in its public course catalog. Use the university's real course codes when you know them. Credits must use the university's own credit system: ECTS for European and Georgian universities (most courses 5 or 6 ECTS, labs/seminars often 3-4, theses larger), US semester credit hours for US schools (most courses 3-4, labs 1), MIT units for MIT (most subjects 12), Stanford units (3-5), etc. Give each course the credit value its catalog lists; when unsure, use the most common value for that kind of course at that university rather than guessing randomly. Credits must vary realistically by course type. Never invent courses the university is unlikely to offer.",
            `University: ${body.university}\nStudent's major: ${body.major}\n\nList between 60 and 90 subjects taught at this university across departments, prioritising the major's core and elective courses plus common general-education courses. Mark relatedToMajor true for courses in or required by the major. Description: one sentence.`,
          ),
        );
        const subjects = [...result.subjects].sort((a, b) => a.name.localeCompare(b.name));
        return { subjects };
      }),
    },
  },
});
