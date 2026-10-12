/**
 * celld Worker entry — export Chat as the Main Durable Object binding.
 * Local DX uses `sinkd dev`; fleets use `celld deploy` on Linux/ARM64 or Docker.
 */
export { Chat, default } from "./chat.js";