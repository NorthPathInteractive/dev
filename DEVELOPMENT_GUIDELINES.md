# North Path Interactive — Development Guidelines

## Repository structure
- GitHub organization: `NorthPathInteractive`.
- Primary development repository: `NorthPathInteractive/dev`.
- Start new projects in their own directories inside `dev`; inspect existing folders before creating a new project.
- Keep in-progress projects in `dev`. When a project is production-ready, graduate it to its own repository in the organization, preserving code, assets, and history where feasible.
- Continue maintenance and versioning in the dedicated repository after graduation.

## Hosting
- Use GitHub Pages for static projects that do not need a backend.
- Use InfinityFree when server-side components are required, such as PHP, databases, shared persistent state, or server-side authentication.
- InfinityFree site: https://northpathinteractive.infinityfree.io/
- Keep source code under GitHub version control regardless of hosting provider.
- Verify hosting credentials and deployment permissions before attempting changes; GitHub access does not imply InfinityFree access.

## Workflow
1. Locate and inspect the existing project and its data sources.
2. Plan the smallest safe change, with a backup or rollback approach for sensitive changes.
3. Implement and test without disrupting existing functionality or data.
4. Deploy to the appropriate host and verify the live result before claiming success.
5. Graduate completed projects to dedicated repositories when appropriate.

## Versioning
- `0.x`: development
- `1.x`: production and compatible improvements
- `2.x`: major releases

## Assistant collaboration preferences
- Prefer improving existing code over unnecessary rewrites.
- Preserve working design, features, task history, and user data.
- Confirm before destructive changes or production-data replacement.
- Do not use Astra Pro unless the user explicitly approves; if a task appears to require it, warn and ask first, to the extent model selection is detectable or controllable.
- Report what was actually inspected, changed, tested, and deployed; distinguish plans from completed work.

**Principle:** Develop centrally. Graduate independently. Host according to technical needs.
