// Server-only helpers for the phone app's API routes: auth check, CORS, AI calls, caching.
import { createOpenAI } from "@ai-sdk/openai";
import { createClient } from "@supabase/supabase-js";
import { NoObjectGeneratedError, Output, streamText, type ModelMessage } from "ai";
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

function provider() {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) throw new AiError(500, "AI is not configured.");
  return createOpenAI({
    baseURL: GATEWAY_URL,
    apiKey,
    headers: { "Lovable-API-Key": apiKey, "X-Lovable-AIG-SDK": "vercel-ai-sdk" },
  });
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
  const status = (error as { statusCode?: number })?.statusCode;
  if (status === 429) return new AiError(429, "Too many requests right now. Please try again in a minute.");
  if (status === 402) return new AiError(402, "AI credits have run out. Please try again later.");
  if (status === 403) return new AiError(403, "AI access is currently blocked for this app.");
  console.error("AI call failed", error);
  return new AiError(500, "The AI could not answer right now. Please try again.");
}

const reasoningOptions = {
  openai: {
    store: false,
    forceReasoning: true,
    reasoningEffort: "low",
    reasoningSummary: "auto",
    include: ["reasoning.encrypted_content"],
  },
} as const;

/** Streams a structured-output call and returns the parsed object. */
export async function generateStructured<T>(
  request: Request,
  schema: z.ZodType<T>,
  instructions: string,
  prompt: string,
): Promise<T> {
  try {
    const result = streamText({
      model: provider().responses(MODEL),
      instructions,
      prompt,
      output: Output.object({ schema }),
      abortSignal: request.signal,
      providerOptions: reasoningOptions,
    } as Parameters<typeof streamText>[0]);
    try {
      return (await result.output) as T;
    } catch (error) {
      if (NoObjectGeneratedError.isInstance(error) && error.text) {
        const parsed = schema.safeParse(JSON.parse(error.text));
        if (parsed.success) return parsed.data;
      }
      throw error;
    }
  } catch (error) {
    throw mapError(error);
  }
}

/** Streams a text call server-side and returns the final text. */
export async function generateChat(request: Request, instructions: string, messages: ModelMessage[]) {
  try {
    const result = streamText({
      model: provider().responses(MODEL),
      instructions,
      messages,
      abortSignal: request.signal,
      providerOptions: reasoningOptions,
    } as Parameters<typeof streamText>[0]);
    const text = await result.text;
    if (!text.trim()) throw new AiError(500, "The AI returned an empty answer. Please try again.");
    return text;
  } catch (error) {
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
