# Easy iOS previews and release operation

Outcome: Cris can request a signed iPhone preview with one GitHub action, find its install page, and understand the remaining production steps without Terminal commands.

## Acceptance bar

1. Manual-only, main-only iOS preview action uses existing protected production environment and existing CI; serializes with production builds and never submits an artifact.
2. Exact source/project/platform/profile/distribution and successful physical-device artifact are validated before a success install link is reported. Invalid results fail closed.
3. Failures produce a plain next step without publishing raw credential-bearing JSON or signed artifact URLs. Retry does not imply cancellation of an existing remote build.
4. Existing production readiness gates and deployment ordering remain unchanged. Correct only the project identity field in the production artifact validator to match actual EAS 24 output (`app.id`); tests must reject missing/wrong identity. Android remains deferred.
5. Short operator guide explains preview, merge-to-TestFlight after qualification, safe fresh-dispatch retry and public App Store release distinction.
6. Focused validator tests, lint, type-check and app/tooling tests pass; independent read-only Claude review has no unresolved blocking findings.

## Scope decisions

Retain production runtime environment for preview, as already configured. Restrict action to main to match production environment branch protection and reuse reviewed source. No arbitrary branch credential access. No extra dashboard, new dependency, public release automation or speculative performance rewrite.

Fable advisory recommended a small preview action and operator card. Its suggestion to allow any branch was rejected because the existing production environment permits main only. Its claim that delayed AI initialization cannot overlap is not established by timing alone; no optimization claim relies on it.

Performance: default to biggest measured bottleneck. Build 37 is the baseline binary. Record repeated cold launch, first routine interaction, timer background/resume, chat-open and first-response behavior under comparable device/network conditions before changing app code. Existing JS render markers do not measure the full native cold start. No user-visible speedup is claimed yet.

## Discovered production blocker

Build 37 result has `app.id` equal to the configured EAS project UUID and no `project` property. Current production validator reads `project.id`, so a valid real EAS result would fail. Correct this field and fixtures without relaxing source/profile/distribution checks. This narrow change is required for the requested working automation.
