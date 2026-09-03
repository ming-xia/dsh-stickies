#!/usr/bin/env node
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createStickyApi } from "../lib/api.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const defaultNotes = path.resolve(__dirname, "..", "..", "work", "notebooks");
const args = process.argv.slice(2);
const portIndex = args.indexOf("--port");
const port = portIndex >= 0 ? Number(args[portIndex + 1]) : 3401;
const notesIndex = args.indexOf("--notes");
const notesRoot = notesIndex >= 0 ? path.resolve(args[notesIndex + 1]) : defaultNotes;
const api = createStickyApi({ notesRoot });

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url ?? "/", "http://sticky.local");
    if (url.pathname === "/") req.url = "/stickies/ui";
    if (!(await api.handle(req, res))) {
      res.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
      res.end(JSON.stringify({ error: "not found" }));
    }
  } catch (error) {
    res.writeHead(500, { "Content-Type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: error.message }));
  }
});
server.listen(port, () => console.log(`便利贴本地预览: http://localhost:${port}/stickies/ui`));
