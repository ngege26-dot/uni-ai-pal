<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- The phone app (expo/) calls AI through bearer-verified POST routes in src/routes/api/public/ that share src/lib/ai.server.ts; generated course content is cached in the service-role-only ai_cache table so each subject is generated once and reused.
