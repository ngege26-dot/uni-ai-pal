import { createFileRoute } from "@tanstack/react-router";

// No head() here: the home route inherits its meta from __root.tsx and ships no
// og:image, so serve-time hosting can inject the project's social preview.
export const Route = createFileRoute("/")({
  component: Index,
});

// Status page for the phone app's backend: it renders no app data. See
// ./README.md for where the phone API lives.
function Index() {
  return (
    <main className="bg-background flex min-h-screen items-center justify-center px-4">
      <div className="max-w-md text-center">
        <h1 className="text-foreground text-xl font-semibold">Backend for the phone app</h1>
        <p className="text-muted-foreground mt-2 text-sm">
          This web app serves the phone app's API from routes under <code>/api/public</code>. It has no pages of its
          own.
        </p>
      </div>
    </main>
  );
}
