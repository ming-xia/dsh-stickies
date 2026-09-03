import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStickyApi } from "./api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const name = "sticky-notes-plugin";
export const inject = ["webServer"];
export const Config = null;

function isTrusted(req) {
  const host = req.headers?.host ?? "";
  return /^(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/u.test(host);
}

export function apply(ctx, config = {}) {
  const notesRoot = config.notesRoot ?? process.env.STICKY_NOTES_ROOT ?? path.resolve(__dirname, "..", "..", "work", "notebooks");
  const api = createStickyApi({ notesRoot });
  ctx.effect(() => ctx.webServer.register({
    kind: "prefix", path: "/stickies",
    handler: async (req, res) => {
      if (!isTrusted(req)) { res.writeHead(403, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ error: "forbidden" })); return; }
      if (!(await api.handle(req, res))) { res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" }); res.end(JSON.stringify({ error: "not found" })); }
    }
  }), "sticky-notes-plugin: /stickies routes");
  ctx.logger?.info?.(`[sticky-notes-plugin] /stickies routes mounted, notes root: ${notesRoot}`);
}

export default { name, inject, Config, apply };
