// lovable-skill: expo-backend-api@2. A newer skill release replaces this file; extend behavior in app code.
import { createFileRoute } from "@tanstack/react-router";

// Raise to answer installed builds below it with a 426. Only the numeric version
// parts compare, never the build number, so bump the app version to block a build.
const MIN_APP_VERSION = "0.0.0";
// Bump together with API_VERSION in <app>/lib/lovable-api-version.ts on an incompatible route change.
const API_VERSION = "1";

// Quick view calls this route from another origin. Methods list only GET because
// this route answers GET alone; a write route lists its own methods plus OPTIONS.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, API-Version, App-Version, App-Platform, App-Env",
};

// Build (+7) and prerelease (-beta) suffixes are dropped. A non-numeric or non-finite
// part has no order, so any difference then counts as older rather than failing open.
function isOlder(version: string, minimum: string): boolean {
  const left = version.split(/[+-]/)[0] ?? "";
  const right = minimum.split(/[+-]/)[0] ?? "";
  const a = left.split(".");
  const b = right.split(".");
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const x = Number(a[i] ?? "0");
    const y = Number(b[i] ?? "0");
    if (!Number.isFinite(x) || !Number.isFinite(y)) return left !== right;
    if (x !== y) return x < y;
  }
  return false;
}

// A request without version headers is never blocked, and neither is a build
// ahead of the published server: a store build can ship before a publish.
function versionAllowed(request: Request): boolean {
  const apiVersion = request.headers.get("API-Version");
  if (apiVersion !== null && isOlder(apiVersion, API_VERSION)) return false;
  const appVersion = request.headers.get("App-Version");
  return appVersion === null || !isOlder(appVersion, MIN_APP_VERSION);
}

export const Route = createFileRoute("/api/public/version")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: corsHeaders }),
      GET: async ({ request }) =>
        versionAllowed(request)
          ? Response.json({ allowed: true }, { headers: corsHeaders })
          : Response.json(
              { allowed: false, minimumAppVersion: MIN_APP_VERSION, apiVersion: API_VERSION },
              { status: 426, headers: corsHeaders },
            ),
    },
  },
});
