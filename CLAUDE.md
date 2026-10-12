# Project: synkd

@import ./ENGINEERING_DISCIPLINE.md

## Overview

synkd is a self-hosted PartyKit-compatible realtime room server. It exposes the PartyServer programming model (`Server`, `/parties/:party/:room`, `partysocket`) on a Node runtime for local and self-hosted use, with a first-class deploy path onto Deno celld (self-hosted Durable Objects) for multi-node fleets.

## Current phase

Trunk: Node path + celld adapter live-verified (incl. getTags / hibernation caps on 0.6.2). Prefer Podman (`pnpm celld:spike` / `./scripts/compose.sh`).

## Quick status

```sh
git tag --list 'spec/*' 'sad/*' 'contracts/*' 'plan/*'
git tag --list 'module/*'
git tag --list 'module/*/live-verified'
```

## Key documents

- `ENGINEERING_DISCIPLINE.md` — engineering rules (imported above)
- `VISION.md` — problem statement and definition of done
- `SPEC.md` — requirements with citations
- `SAD.md` — architecture
- `CONTRACTS.md` — contract prose
- `packages/contracts/` — frozen TypeScript contracts
- `PLAN.md` — module DAG and acceptance criteria

## Notes for future sessions

- Darwin x86_64 has no celld prebuilt binary; local DX uses `@synkd/runtime` (Node). Fleet path is Linux/ARM64 celld via Docker/`celld deploy`.
- Compatibility target is **PartyServer** (`partyserver` + `partysocket`), not the dying `*.partykit.dev` cloud.
- Do not invent a second actor cluster kernel; celld owns that when deployed.