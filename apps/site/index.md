---
layout: home
title: synkd
titleTemplate: self-hosted realtime rooms
hero:
  name: synkd
  text: Realtime rooms you run yourself
  tagline: PartyKit-compatible WebSocket rooms on Node or a celld fleet. Build with partysocket. Operate with a Console and clear health signals.
  actions:
    - theme: brand
      text: Developer docs
      link: /developers/
    - theme: alt
      text: Operator docs
      link: /operators/
features:
  - title: Familiar party URLs
    details: Keep /parties/:party/:room and partysocket clients. Move off hosted PartyKit without rewriting your apps.
  - title: Local Node, fleet when ready
    details: Develop on the Node runtime. Deploy the same party code to a celld fleet with TLS at the edge.
  - title: Clear operator tools
    details: Use the Console and /v1 control API for rooms, health, metrics, and forced hibernation.
---

<div class="audience-split">
  <a class="panel" href="/developers/">
    <h2>For developers</h2>
    <p>Write parties, connect browsers, and add Yjs pads. Start on your laptop in minutes.</p>
    <span class="next">Go to developer docs</span>
  </a>
  <a class="panel" href="/operators/">
    <h2>For operators</h2>
    <p>Install a fleet, set tokens, watch health, and put TLS in front of sticky rooms.</p>
    <span class="next">Go to operator docs</span>
  </a>
</div>

<p class="gds-note">Need the shape of the system first? Read the <a href="/architecture/">architecture diagrams</a> — context, packages, request path, trust, control plane, and fleet topology.</p>

## What synkd is

synkd runs sticky realtime rooms. Each room is an actor with durable storage. Clients join over WebSockets using the same URL shape as PartyKit.

You host the process or fleet. There is no synkd cloud control plane in v1.

## What you need

- Node.js 22 or later to develop and run the Node runtime
- pnpm to install this monorepo
- Optional: Podman or Docker for celld fleets on Linux containers

## Try it locally

```sh
pnpm install
pnpm build
pnpm doctor
pnpm dev:all
```

Then open:

- Studio (guests): [http://127.0.0.1:5173](http://127.0.0.1:5173)
- Console (operators): [http://127.0.0.1:5174](http://127.0.0.1:5174) — admin token `dev-admin`

## Choose your path

If you are writing party code or a client app, read [Get started for developers](/developers/get-started). To scaffold a project, use the [CLI](/developers/cli).

If you are installing, securing, or monitoring a fleet, read [Get started for operators](/operators/get-started).
