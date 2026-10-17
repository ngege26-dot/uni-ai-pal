import { createFileRoute } from "@tanstack/react-router";

import { json, options, verifyUser } from "@/lib/ai.server";

export const Route = createFileRoute("/api/public/delete-account")({
  server: {
    handlers: {
      OPTIONS: options,
      POST: async ({ request }) => {
        const userId = await verifyUser(request);
        if (!userId) return json({ error: "Please sign in again." }, 401);
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        await supabaseAdmin.from("class_schedule").delete().eq("user_id", userId);
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) return json({ error: "Could not delete the account. Please try again." }, 500);
        return json({ ok: true });
      },
    },
  },
});
