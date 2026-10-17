import { useCallback, useEffect, useRef, useState } from "react";

import { ApiError, BackendUnavailableError, api } from "./lovable-api";

export type Subject = { name: string; code: string; credits: number; description: string; relatedToMajor: boolean };
export type Topic = { title: string; summary: string; keyPoints: string[]; example: string };
export type PracticeQuestion = {
  question: string;
  options: string[];
  correctIndex: number;
  optionFeedback: string[];
  explanation: string;
};
export type Exam = { year: string; title: string; questions: { prompt: string; points: number }[] };
export type PastExams = { available: boolean; note: string; exams: Exam[] };
export type Grade = { score: number; didRight: string[]; didWrong: string[]; modelAnswer: string };
export type ChatMessage = { role: "user" | "assistant"; content: string };

export const backend = {
  subjects: (university: string, major: string) =>
    api.post<{ subjects: Subject[] }>("/api/public/subjects", { university, major }),
  topics: (university: string, subject: string) =>
    api.post<{ topics: Topic[] }>("/api/public/topics", { university, subject }),
  practice: (university: string, subject: string, difficulty: string) =>
    api.post<{ questions: PracticeQuestion[] }>("/api/public/practice", { university, subject, difficulty }),
  pastExams: (university: string, subject: string, similar: boolean) =>
    api.post<PastExams>("/api/public/past-exams", { university, subject, similar }),
  grade: (subject: string, question: string, answer: string, points: number) =>
    api.post<Grade>("/api/public/grade", { subject, question, answer, points }),
  ask: (university: string, subject: string, messages: ChatMessage[]) =>
    api.post<{ answer: string }>("/api/public/ask", { university, subject, messages }),
  deleteAccount: () => api.post<{ ok: true }>("/api/public/delete-account", {}),
};

/** Plain-language message for a failed request. */
export function friendlyError(error: unknown): string {
  if (error instanceof BackendUnavailableError) return "The study server isn't available in this preview.";
  if (error instanceof ApiError) {
    const body = error.body as { error?: string } | null;
    if (body && typeof body === "object" && typeof body.error === "string") return body.error;
  }
  return "Something went wrong. Check your connection and try again.";
}

export function useRequest<T>(load: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loadRef = useRef(load);
  loadRef.current = load;

  const run = useCallback(() => {
    let active = true;
    setLoading(true);
    setError(null);
    loadRef
      .current()
      .then((d) => active && setData(d))
      .catch((e) => active && setError(friendlyError(e)))
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  useEffect(() => run(), [run]);
  return { data, error, loading, retry: run };
}
