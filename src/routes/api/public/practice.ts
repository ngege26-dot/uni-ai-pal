import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authedPost, cached, cacheKey, generateStructured, options } from "@/lib/ai.server";

const body = z.object({
  university: z.string().trim().min(2).max(150),
  subject: z.string().trim().min(2).max(150),
  difficulty: z.enum(["easy", "medium", "hard"]),
});

const schema = z.object({
  questions: z.array(
    z.object({
      question: z.string(),
      options: z.array(z.string()),
      correctIndex: z.number(),
      optionFeedback: z.array(z.string()),
      explanation: z.string(),
    }),
  ),
});

const BATCHES = 3;
const PER_BATCH = 10;

export const Route = createFileRoute("/api/public/practice")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: authedPost(body, async ({ request, body }) =>
        cached(cacheKey("practice-v1", body.university, body.subject, body.difficulty), async () => {
          const batches = await Promise.all(
            Array.from({ length: BATCHES }, (_, i) =>
              generateStructured(
                request,
                schema,
                "You write excellent university exam practice questions with precise feedback.",
                `Course: ${body.subject} at ${body.university}. Difficulty: ${body.difficulty}.\nWrite exactly ${PER_BATCH} multiple-choice questions (part ${i + 1} of ${BATCHES}; cover ${["the first third", "the middle third", "the final third"][i]} of the course syllabus so parts do not overlap). Each has 4 options, correctIndex (0-3), optionFeedback with one sentence per option saying why it is right or wrong, and a detailed explanation of the correct reasoning.`,
              ),
            ),
          );
          const questions = batches
            .flatMap((b) => b.questions)
            .filter((q) => q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length);
          return { questions };
        }),
      ),
    },
  },
});
