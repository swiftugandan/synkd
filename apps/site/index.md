---
layout: home
title: synkd
titleTemplate: self-hosted realtime rooms
hero:
  name: synkd
  text: Realtime rooms you run yourself
  tagline: PartyKit-shaped WebSocket rooms on infrastructure you control. Build with partysocket. Operate with a Console and clear health signals.
  actions:
    - theme: brand
      text: Developer docs
      link: /developers/
    - theme: alt
      text: Operator docs
      link: /operators/
features:
  - title: Familiar party URLs
    details: Keep /parties/:party/:room and partysocket clients. Leave hosted PartyKit without rewriting your apps.
  - title: Develop locally, ship a fleet
    details: Run synkd up on Node. Deploy the same party code to a Durable Objects fleet with TLS at the edge.
  - title: Operator tools that match the runtime
    details: Use the Console and /v1 for rooms, health, metrics, and forced hibernation.
---

<div class="audience-split">
  <a class="panel" href="/developers/">
    <h2>For developers</h2>
    <p>Write parties, connect browsers, and add Yjs pads. Start on your laptop.</p>
    <span class="next">Go to developer docs</span>
  </a>
  <a class="panel" href="/operators/">
    <h2>For operators</h2>
    <p>Install a fleet, set tokens, watch health, and put TLS in front of sticky rooms.</p>
    <span class="next">Go to operator docs</span>
  </a>
</div>

<p class="gds-note">Need the shape of the system first? Read the <a href="/architecture/">architecture diagrams</a>: context, packages, request path, trust, control plane, and fleet topology.</p>

## What synkd is

synkd runs sticky realtime rooms. Each room is an actor with durable storage. Clients join over WebSockets using the same URL shape as PartyKit.

You host the process or fleet. There is no synkd cloud in v1.

## What you need

- Node.js 22 or later
- pnpm for this monorepo
- Podman or Docker only if you use local Durable Objects or a production fleet ([Deploy](/operators/deploy))

## Try it locally

```sh
pnpm install
pnpm build
pnpm doctor
pnpm up
```

Or run the full lab stack with `pnpm dev:all`.

Then open:

- Studio (guests): [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Console (operators): [http://127.0.0.1:5174](http://127.0.0.1:5174) with admin token `dev-admin`

## Configuration

Each project has a **`synkd.json`** file. It names the parties, auth tokens, and listen port. The CLI reads that file for `up`, `doctor`, and `deploy`. There is no YAML config in v1.

## Choose your path

Writing party code or a client? Start with [Get started for developers](/developers/get-started). To scaffold a project, use the [CLI](/developers/cli).

Installing or securing a fleet? Start with [Get started for operators](/operators/get-started).

Need Durable Objects locally or in production? Read [Deploy](/operators/deploy). Use `synkd up --durable` on your laptop and `synkd deploy` for a fleet.
