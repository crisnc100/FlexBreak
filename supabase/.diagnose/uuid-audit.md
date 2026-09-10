# Deno uuid audit diagnosis

Stuck, not misread. Required outcome: eliminate genuine vulnerable dependency through a supported pinned resolution, no audit suppression.

Symptom: `npm exec --yes --package=deno@2.9.6 -- deno audit` from supabase returns1: uuid Missing buffer bounds check in v3/v5/v6 when buf is provided, vulnerable<11.1.1 (GHSA-w5hq-g745-h8pq).

Observed path: deno.json imports firebase-admin14.3.0 -> gaxios6.7.1/gcp-metadata6.1.1/teeny-request9 -> uuid^9.0.0/9.0.1. Installed and lockfile contain uuid9.0.1. New package.json override uuid11.1.1 recorded in lock workspace but install and reload retained uuid9; adding pinned direct package deps did not change audit.

Hypotheses:
1. Literally vulnerable uuid9 remains: confirmed by lock and installed package. Cannot treat this as audit false positive.
2. Model of Deno override support wrong: official docs say package.json overrides supported since2.7; need empirical fresh-lock resolution / installed graph evidence. Alive.
3. Old lock retains stale dependency graph despite updated override: fresh external lock should resolve11.1.1 if true. Alive.

Speculative package.json moved out of active resolution pending experiment. No runtime source edited by diagnosis.

Experiment result: fresh baseline lock without override resolves uuid9.0.1; fresh isolated /tmp/flexbreak-uuid-experiment using same Deno config plus override package resolves uuid11.1.1. Confirmed cause: prior lock retained stale graph when override changed, even after install --reload. Override semantics themselves work (hypothesis2 eliminated). Parent received concrete fresh lock/manifest paths for authorized fix; diagnosis itself did not apply it.
