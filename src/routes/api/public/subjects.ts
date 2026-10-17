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
        const result = await cached(cacheKey("subjects-v3", body.university, body.major), async () => {
          // Three smaller parallel calls finish much faster than one long list.
          const parts = [
            "25-30 core required courses of the major",
            "20-25 elective and advanced courses within or closely related to the major",
            "20-25 common general-education and other popular courses outside the major",
          ];
          const batches = await Promise.all(
            parts.map((part) =>
              generateStructured(
                request,
                schema,
                SYSTEM,
                `University: ${body.university}\nStudent's major: ${body.major}\n\nList ${part}. Mark relatedToMajor true for courses in or required by the major. Description: one short sentence.`,
              ),
            ),
          );
          const seen = new Set<string>();
          return {
            subjects: batches
              .flatMap((b) => b.subjects)
              .filter((x) => {
                const k = x.name.trim().toLowerCase();
                if (seen.has(k)) return false;
                seen.add(k);
                return true;
              }),
          };
        });
        const subjects = [...result.subjects].sort((a, b) => a.name.localeCompare(b.name));
        return { subjects };
      }),
    },
  },
});
