import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { NotebookStore } from "./notes.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PLUGIN_ROOT = path.resolve(__dirname, "..");
const DEFAULT_WEB_HTML = path.join(PLUGIN_ROOT, "web", "index.html");

export function createStickyApi(options = {}) {
  const notes = new NotebookStore(options.notesRoot ?? path.resolve(PLUGIN_ROOT, "..", "work", "notebooks"));
  const webHtmlPath = options.webHtmlPath ?? DEFAULT_WEB_HTML;
  const json = (res, status, data) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type"
    });
    res.end(JSON.stringify(data, null, 2));
  };
  async function readBody(req) {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    if (!chunks.length) return {};
    try { return JSON.parse(Buffer.concat(chunks).toString("utf8")); }
    catch { throw new Error("请求体不是有效 JSON"); }
  }
  return {
    async handle(req, res) {
      const url = new URL(req.url ?? "/", "http://sticky.local");
      const pathname = url.pathname;
      try {
        if (req.method === "OPTIONS") {
          res.writeHead(204, {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type"
          });
          res.end();
          return true;
        }
        if (pathname === "/stickies/ui" || pathname === "/stickies/ui/") {
          res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
            "Access-Control-Allow-Origin": "*"
          });
          res.end(fs.readFileSync(webHtmlPath, "utf8"));
          return true;
        }
        const rest = pathname.startsWith("/stickies/api")
          ? pathname.slice("/stickies/api".length)
          : pathname.startsWith("/notes/api") ? pathname.slice("/notes/api".length) : null;
        if (rest === null) return false;
        if (req.method === "GET" && rest === "/list") return json(res, 200, { notes: notes.list() }), true;
        if (req.method === "POST" && rest === "/create") {
          const body = await readBody(req);
          return json(res, 200, notes.create({ name: body.name, author: body.author ?? "human", content: body.content ?? "", color: body.color ?? "yellow" })), true;
        }
        if (req.method === "GET" && rest === "/get") return json(res, 200, notes.get(url.searchParams.get("id"))), true;
        if (req.method === "POST" && rest === "/save") {
          const body = await readBody(req);
          return json(res, 200, notes.save({ id: body.id, content: body.content, author: body.author ?? "human", actor: body.actor ?? null, note: body.note ?? null })), true;
        }
        if (req.method === "GET" && rest === "/history") return json(res, 200, { id: url.searchParams.get("id"), history: notes.history(url.searchParams.get("id")) }), true;
        if (req.method === "GET" && rest === "/revision") {
          const id = url.searchParams.get("id");
          return json(res, 200, { id, rev: Number(url.searchParams.get("rev")), content: notes.getRevision(id, url.searchParams.get("rev")) }), true;
        }
        if (req.method === "POST" && rest === "/restore") { const b = await readBody(req); return json(res, 200, notes.restore({ id: b.id, rev: b.rev, author: b.author ?? "human", actor: b.actor ?? null })), true; }
        if (req.method === "POST" && rest === "/rename") { const b = await readBody(req); return json(res, 200, notes.rename({ id: b.id, name: b.name })), true; }
        if (req.method === "POST" && rest === "/color") { const b = await readBody(req); return json(res, 200, notes.setColor({ id: b.id, color: b.color })), true; }
        if (req.method === "POST" && rest === "/reorder") { const b = await readBody(req); return json(res, 200, notes.reorder(b.ids ?? [])), true; }
        if (req.method === "POST" && rest === "/delete") { const b = await readBody(req); return json(res, 200, notes.delete(b.id)), true; }
        return json(res, 404, { error: `便利贴 API 未找到: ${rest}` }), true;
      } catch (error) { return json(res, 500, { error: error.message }), true; }
    }
  };
}
