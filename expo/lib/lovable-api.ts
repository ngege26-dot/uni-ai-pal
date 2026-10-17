// lovable-skill: expo-backend-api@2. A newer skill release replaces this file; extend behavior in app code.
import Constants from "expo-constants";
import { Platform } from "react-native";

import { API_VERSION } from "./lovable-api-version";
// Re-exported so app code that imported it from a first-release client keeps compiling.
export { API_VERSION };

const VERSION_CHECK_PATH = "/api/public/version";

export type TokenProvider = () => string | null | Promise<string | null>;

export class UpdateRequiredError extends Error {
  constructor() {
    super("This version of the app is no longer supported. Update the app to continue.");
    this.name = "UpdateRequiredError";
  }
}

export class ApiError extends Error {
  readonly status: number;
  readonly body: unknown;

  constructor(status: number, body: unknown) {
    super("Request failed with status " + status);
    this.name = "ApiError";
    this.status = status;
    this.body = body;
  }
}

export class BackendUnavailableError extends Error {
  constructor() {
    super(
      "This preview has no backend address: EXPO_PUBLIC_LOVABLE_API_URL is unset. A draft preview cannot reach the backend; run the main project or a device build.",
    );
    this.name = "BackendUnavailableError";
  }
}

let tokenProvider: TokenProvider | null = null;
let updateRequired = false;
let checkSeq = 0;
let blockedAtSeq = 0;
let lastOkSeq = 0;
const updateRequiredListeners = new Set<(required: boolean) => void>();

export function setTokenProvider(provider: TokenProvider | null): void {
  tokenProvider = provider;
}

export function isUpdateRequired(): boolean {
  return updateRequired;
}

export function onUpdateRequiredChange(listener: (required: boolean) => void): () => void {
  updateRequiredListeners.add(listener);
  return () => {
    updateRequiredListeners.delete(listener);
  };
}

function setUpdateRequired(required: boolean): void {
  if (updateRequired === required) return;
  updateRequired = required;
  for (const listener of updateRequiredListeners) listener(required);
}

export function appVersion(): string {
  const version = Constants.expoConfig?.version ?? "0.0.0";
  let build: string | number | null | undefined;
  if (Platform.OS === "ios") {
    build = Constants.platform?.ios?.buildNumber ?? Constants.expoConfig?.ios?.buildNumber;
  } else if (Platform.OS === "android") {
    build = Constants.platform?.android?.versionCode ?? Constants.expoConfig?.android?.versionCode;
  }
  return build == null ? version : version + "+" + build;
}

export function isBackendAvailable(): boolean {
  return Boolean(process.env.EXPO_PUBLIC_LOVABLE_API_URL);
}

export function apiBaseUrl(): string {
  const baseUrl = process.env.EXPO_PUBLIC_LOVABLE_API_URL;
  if (!baseUrl) throw new BackendUnavailableError();
  return baseUrl.replace(/\/+$/, "");
}

async function send(path: string, init: RequestInit, versionCheckSeq?: number): Promise<Response> {
  const headers = new Headers(init.headers);
  // Lovable's default before setup is ""; a missing header passes the version route, an empty one would not.
  if (API_VERSION) headers.set("API-Version", API_VERSION);
  headers.set("App-Version", appVersion());
  headers.set("App-Platform", Platform.OS);
  // No default: a missing label must stay distinguishable from device, store and preview.
  const buildKind = process.env.EXPO_PUBLIC_LOVABLE_BUILD_KIND;
  if (buildKind) headers.set("App-Env", buildKind);
  else headers.delete("App-Env");
  const token = tokenProvider ? await tokenProvider() : null;
  if (token) headers.set("Authorization", "Bearer " + token);
  // A path without a leading slash would parse as URL userinfo and send the token to another host.
  const response = await fetch(apiBaseUrl() + (path.startsWith("/") ? path : "/" + path), { ...init, headers });
  if (response.status === 426) {
    // A version check that started before the last successful one answers for an older server state.
    if (versionCheckSeq !== undefined && versionCheckSeq < lastOkSeq) return response;
    blockedAtSeq = checkSeq;
    setUpdateRequired(true);
  }
  return response;
}

export async function apiFetch(path: string, init: RequestInit = {}): Promise<Response> {
  if (updateRequired) throw new UpdateRequiredError();
  const response = await send(path, init);
  if (response.status === 426) throw new UpdateRequiredError();
  return response;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const init: RequestInit = { method };
  if (body !== undefined) {
    init.headers = { "Content-Type": "application/json" };
    init.body = JSON.stringify(body);
  }
  const response = await apiFetch(path, init);
  const text = await response.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  if (!response.ok) throw new ApiError(response.status, data);
  return data as T;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body?: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body?: unknown) => request<T>("PATCH", path, body),
  delete: <T>(path: string) => request<T>("DELETE", path),
};

// Only a 426 blocks the app; a failed check (offline, server error) lets it continue. Checks are
// numbered so a slow older answer can neither reopen the app after a newer 426 nor block it after a newer 2xx.
export async function checkApiVersion(): Promise<void> {
  const seq = ++checkSeq;
  try {
    const response = await send(VERSION_CHECK_PATH, { method: "GET" }, seq);
    if (!response.ok) return;
    if (seq > lastOkSeq) lastOkSeq = seq;
    if (seq > blockedAtSeq) setUpdateRequired(false);
  } catch {
    return;
  }
}
