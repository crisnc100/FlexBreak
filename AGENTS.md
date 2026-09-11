# Working on FlexBreak

Read [CLAUDE.md](CLAUDE.md) for the project overview and [docs/RELEASING.md](docs/RELEASING.md) for deployment steps. These project rules supplement the operator's global doctrine.

- For requested implementation work, Cris authorizes committing the completed, validated changes to a task branch, pushing that branch, and opening or updating its PR without another confirmation. A request to investigate or review alone does not authorize changes. Explicit instructions to stop before commit take precedence.
- Only Cris merges. Never push to protected branches or work in the trunk checkout. Use the project's `.worktrees.conf` and worktree tooling; keep one worktree per goal.
- Keep changes within the request. Run relevant checks and obtain independent review for substantive code changes; report evidence and anything unverified.
- Never weaken tests or release checks to get green CI. A TestFlight upload is not public release approval.
- Keep credentials out of source, logs, PRs and chat. Provider secrets stay on the backend. Do not close secret alerts without evidence supporting their resolution, or rotate/revoke live credentials without authorization.
- Keep agent instructions brief. Put product context in CLAUDE.md, contributor guidance in README.md, and operational detail in docs/.
