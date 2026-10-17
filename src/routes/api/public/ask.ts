import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { authedPost, generateChat, options } from "@/lib/ai.server";

const body = z.object({
  university: z.string().trim().min(2).max(150),
  subject: z.string().trim().min(2).max(150),
  messages: z
    .array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(4000) }))
    .min(1)
    .max(40),
});

export const Route = createFileRoute("/api/public/ask")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: authedPost(body, async ({ request, body }) => {
        const answer = await generateChat(
          request,
          `You are a friendly study assistant for the course "${body.subject}" at ${body.university}. Answer any question about this course: its content, credits, prerequisites, typical workload, exams and study tips. For facts like credits or prerequisites, give your best knowledge of this university's catalog and say briefly when the student should confirm with the official catalog. Keep answers clear and well structured, using short paragraphs and lists. Use plain text, not markdown headings.`,
          body.messages,
        );
        return { answer };
      }),
    },
  },
});
