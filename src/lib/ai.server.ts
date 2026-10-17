// Server-only helpers for the phone app's API routes: auth check, CORS, AI calls, caching.
import { createClient } from "@supabase/supabase-js";
import { zodSchema, type ModelMessage } from "ai";
import type { z } from "zod";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1";
const MODEL = "openai/gpt-6-astra";

export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, API-Version, App-Version, App-Platform, App-Env",
};

export function json(body: unknown, status = 200) {
  return Response.json(body, { status, headers: corsHeaders });
}

export function options() {
  return new Response(null, { status: 204, headers: corsHeaders });
}

/** Returns the verified user id, or null when the bearer token is missing/invalid. */
export async function verifyUser(request: Request): Promise<string | null> {
  const auth = request.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) return null;
  const supabase = createClient(url, key, {
    global: { headers: { Authorization: auth } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data?.claims?.sub) return null;
  return data.claims.sub as string;
}

export class AiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

function mapError(error: unknown): AiError {
  if (error instanceof AiError) return error;
  console.error("AI call failed", error);
  return new AiError(500, "The AI could not answer right now. Please try again.");
}

function statusError(status: number, body: string): AiError {
  console.error(`AI gateway request failed [${status}]: ${body}`);
  if (status === 429) return new AiError(429, "Too many requests right now. Please try again in a minute.");
  if (status === 402) return new AiError(402, "AI credits have run out. Please try again later.");
  if (status === 403) return new AiError(403, "AI access is currently blocked for this app.");
  return new AiError(500, "The AI could not answer right now. Please try again.");
}

type ChatMsg = { role: "system" | "user" | "assistant"; content: string };

/**
 * Streams a Chat Completions call on the priority serving tier (roughly twice as fast as
 * standard, at premium pricing) and returns the full text.
 */
async function priorityCompletion(
  messages: ChatMsg[],
  extra: Record<string, unknown> = {},
  signal?: AbortSignal,
): Promise<string> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(500, "AI is not configured.");
  const res = await fetch(`${GATEWAY_URL}/chat/completions`, {
    method: "POST",
    signal,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "X-Lovable-AIG-SDK": "fetch",
    },
    body: JSON.stringify({
      model: MODEL,
      stream: true,
      reasoning_effort: "low",
      service_tier: "priority",
      messages,
      ...extra,
    }),
  });
  if (!res.ok || !res.body) throw statusError(res.status, await res.text());
  const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
  let buffer = "";
  let text = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += value;
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const data = line.slice(6).trim();
      if (!data || data === "[DONE]") continue;
      const chunk = JSON.parse(data) as {
        choices?: { delta?: { content?: string; refusal?: string } }[];
        error?: { message?: string };
      };
      if (chunk.error) throw new AiError(500, "The AI could not answer right now. Please try again.");
      if (chunk.choices?.[0]?.delta?.refusal) throw new AiError(422, "The AI declined to answer this request.");
      text += chunk.choices?.[0]?.delta?.content ?? "";
    }
  }
  return text;
}

/** Streams a structured-output call and returns the parsed object. */
export async function generateStructured<T>(
  _request: Request,
  schema: z.ZodType<T>,
  instructions: string,
  prompt: string,
): Promise<T> {
  try {
    const jsonSchema = await zodSchema(schema).jsonSchema;
    // No abort: if the phone's connection drops on a slow first load, finish and cache the result anyway.
    const text = await priorityCompletion(
      [
        { role: "system", content: instructions },
        { role: "user", content: prompt },
      ],
      { response_format: { type: "json_schema", json_schema: { name: "result", strict: true, schema: jsonSchema } } },
    );
    const parsed = schema.safeParse(JSON.parse(text));
    if (!parsed.success) throw new AiError(500, "The AI returned an unexpected answer. Please try again.");
    return parsed.data;
  } catch (error) {
    throw mapError(error);
  }
}

/** Streams a text call server-side and returns the final text. */
export async function generateChat(request: Request, instructions: string, messages: ModelMessage[]) {
  try {
    const text = await priorityCompletion(
      [
        { role: "system", content: instructions },
        ...messages.map((m) => ({
          role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
          content: typeof m.content === "string" ? m.content : JSON.stringify(m.content),
        })),
      ],
      {},
      request.signal,
    );
    if (!text.trim()) throw new AiError(500, "The AI returned an empty answer. Please try again.");
    return text;
  } catch (error) {
    if ((error as Error)?.name === "AbortError") throw new AiError(499, "Request cancelled.");
    throw mapError(error);
  }
}

export async function cached<T>(key: string, produce: () => Promise<T>): Promise<T> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin.from("ai_cache").select("value").eq("key", key).maybeSingle();
  if (data?.value) return data.value as T;
  const value = await produce();
  await supabaseAdmin.from("ai_cache").upsert({ key, value: value as never });
  return value;
}

export function cacheKey(...parts: string[]) {
  return parts.map((p) => p.trim().toLowerCase()).join("|");
}

/** Wraps a POST handler with auth, body validation and error mapping. */
export function authedPost<B>(
  bodySchema: z.ZodType<B>,
  handler: (args: { request: Request; body: B; userId: string }) => Promise<unknown>,
) {
  return async ({ request }: { request: Request }) => {
    const userId = await verifyUser(request);
    if (!userId) return json({ error: "Please sign in again." }, 401);
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return json({ error: "Invalid request." }, 400);
    }
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success) return json({ error: "Invalid request." }, 400);
    try {
      return json(await handler({ request, body: parsed.data, userId }));
    } catch (error) {
      const e = mapError(error);
      return json({ error: e.message }, e.status);
    }
  };
}
