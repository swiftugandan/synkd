import { defineConfig } from "vitepress";

const base = process.env.SYNKD_SITE_BASE || "/";

export default defineConfig({
  title: "synkd",
  description:
    "Self-hosted PartyKit-compatible realtime rooms for developers and operators.",
  base,
  cleanUrls: true,
  lastUpdated: true,
  appearance: "force-dark",
  ignoreDeadLinks: "localhostLinks",
  head: [
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.googleapis.com",
      },
    ],
    [
      "link",
      {
        rel: "preconnect",
        href: "https://fonts.gstatic.com",
        crossorigin: "",
      },
    ],
    [
      "link",
      {
        href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=Manrope:wght@400;500;600;700&family=Syne:wght@600;700;800&display=swap",
        rel: "stylesheet",
      },
    ],
    ["meta", { name: "theme-color", content: "#041016" }],
  ],
  themeConfig: {
    logo: { light: "/mark.svg", dark: "/mark.svg" },
    siteTitle: "synkd",
    nav: [
      { text: "Developers", link: "/developers/" },
      { text: "Operators", link: "/operators/" },
      { text: "Architecture", link: "/architecture/" },
      {
        text: "Apps",
        items: [
          { text: "Studio", link: "http://127.0.0.1:5173/" },
          { text: "Console", link: "http://127.0.0.1:5174/" },
        ],
      },
    ],
    sidebar: {
      "/architecture/": [
        {
          text: "Architecture",
          items: [
            { text: "Overview", link: "/architecture/" },
            { text: "System context", link: "/architecture/system-context" },
            { text: "Package layers", link: "/architecture/package-layers" },
            { text: "Request path", link: "/architecture/request-path" },
            { text: "Trust boundaries", link: "/architecture/trust-boundaries" },
            { text: "Control plane", link: "/architecture/control-plane" },
            { text: "Fleet topology", link: "/architecture/fleet-topology" },
          ],
        },
      ],
      "/developers/": [
        {
          text: "Developers",
          items: [
            { text: "Overview", link: "/developers/" },
            { text: "Get started", link: "/developers/get-started" },
            { text: "Write a party", link: "/developers/write-a-party" },
            { text: "Connect clients", link: "/developers/connect-clients" },
            {
              text: "Collaborative docs",
              link: "/developers/collaborative-docs",
            },
            { text: "Packages", link: "/developers/packages" },
            { text: "Compatibility", link: "/developers/compatibility" },
          ],
        },
      ],
      "/operators/": [
        {
          text: "Operators",
          items: [
            { text: "Overview", link: "/operators/" },
            { text: "Get started", link: "/operators/get-started" },
            { text: "Configure a fleet", link: "/operators/configure" },
            { text: "Use the Console", link: "/operators/console" },
            { text: "Monitor health", link: "/operators/monitor" },
            { text: "Deploy with TLS", link: "/operators/deploy" },
            { text: "Security", link: "/operators/security" },
            { text: "celld fleets", link: "/operators/celld-fleets" },
          ],
        },
      ],
    },
    outline: { level: [2, 3] },
    socialLinks: [],
    footer: {
      message: "PartyKit-compatible rooms on infrastructure you run.",
      copyright: "synkd",
    },
    search: {
      provider: "local",
    },
  },
});
