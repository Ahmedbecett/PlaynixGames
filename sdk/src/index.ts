/**
 * playnix-sdk — browser-safe entrypoint.
 *
 * Everything exported here runs in the browser and on the server. The bot-side
 * helpers (initData validation, Bot API, webhook handler) live behind
 * `playnix-sdk/server` because they need `node:crypto`.
 */
export { PlaynixClient, createClient, type ClientOptions, type FetchLike } from "./client.js";
export { PlaynixError, TelegramError, type PlaynixErrorCode } from "./errors.js";
export * from "./types.js";
export * from "./links.js";
export * from "./mini-app.js";
