#!/usr/bin/env node
/**
 * 记事本 · 独立存储层（notes.js）
 *
 * 定位：独立于协作流程的轻量记事本——人和 AI 交互过程中，人（或 AI）随手记录、
 * 聚焦问题、逐条解决划掉。不驱动流程状态，不影响任务卡。
 *
 * 存储（每本三个文件，目录 notesRoot）：
 *   <id>.md             当前内容（markdown 原文，文件即数据，可被 AI/人直接读写）
 *   <id>.meta.json      元数据（name、创建/更新时间）
 *   <id>.history.jsonl  修订历史（追加写：每版全文 + 作者 + 时间 + 备注）
 *
 * 留痕规则（核心要求）：
 *   - 每次保存必须标明 author："human"（人工）或 "ai"（AI 修改）
 *   - 历史只追加不覆盖；可按 rev 回滚（回滚本身也是一次留痕保存）
 */

import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function nowIso() {
  return new Date().toISOString();
}

function newId() {
  return `nb-${Date.now().toString(36)}-${crypto.randomBytes(3).toString("hex")}`;
}

/** 统计 markdown 中的 checklist：未完成/已完成数量。 */
export function checklistStats(content) {
  const text = String(content ?? "");
  const done = (text.match(/- \[x\]/giu) ?? []).length;
  const open = (text.match(/- \[ \]/gu) ?? []).length;
  return { open, done, total: open + done };
}

/** 支持的皮肤色（页面便利贴底色）。 */
export const NOTE_COLORS = ["yellow", "blue", "green", "pink", "purple", "orange"];

export class NotebookStore {
  /**
   * @param {string} notesRoot 记事本根目录
   */
  constructor(notesRoot) {
    this.root = notesRoot;
  }

  #ensureDir() {
    fs.mkdirSync(this.root, { recursive: true });
  }

  #mdPath(id) { return path.join(this.root, `${id}.md`); }
  #metaPath(id) { return path.join(this.root, `${id}.meta.json`); }
  #historyPath(id) { return path.join(this.root, `${id}.history.jsonl`); }

  #validId(id) {
    // 防路径穿越：只允许安全字符
    return /^nb-[a-z0-9-]+$/u.test(String(id ?? ""));
  }

  #assertValid(id) {
    if (!this.#validId(id)) throw new Error(`记事本 ID 无效: ${id}`);
  }

  /** 列出全部记事本（按 order 排序；未设置 order 的按更新时间排在后面）。 */
  list() {
    this.#ensureDir();
    const notes = [];
    for (const file of fs.readdirSync(this.root)) {
      if (!file.endsWith(".md")) continue;
      const id = file.slice(0, -3);
      try {
        const meta = JSON.parse(fs.readFileSync(this.#metaPath(id), "utf8"));
        const content = fs.readFileSync(this.#mdPath(id), "utf8");
        notes.push({
          id,
          name: meta.name ?? id,
          color: meta.color ?? "yellow",
          order: meta.order ?? null,
          created_at: meta.created_at ?? null,
          updated_at: meta.updated_at ?? null,
          revision: meta.revision ?? 0,
          stats: checklistStats(content)
        });
      } catch {
        notes.push({ id, name: id, broken: true, stats: { open: 0, done: 0, total: 0 } });
      }
    }
    return notes.sort((a, b) => {
      const oa = a.order ?? Number.MAX_SAFE_INTEGER;
      const ob = b.order ?? Number.MAX_SAFE_INTEGER;
      if (oa !== ob) return oa - ob;
      return String(b.updated_at ?? "").localeCompare(String(a.updated_at ?? ""));
    });
  }

  /** 目录排序（拖动调整上下顺序后持久化）。 */
  reorder(ids) {
    this.#ensureDir();
    const list = Array.isArray(ids) ? ids : [];
    list.forEach((id, index) => {
      if (!this.#validId(id)) return;
      const metaPath = this.#metaPath(id);
      try {
        const meta = JSON.parse(fs.readFileSync(metaPath, "utf8"));
        meta.order = index;
        fs.writeFileSync(metaPath, `${JSON.stringify(meta, null, 2)}\n`, "utf8");
      } catch { /* 单个失败不影响整体 */ }
    });
    return { ok: true, count: list.length };
  }

  /** 新建记事本，可带初始内容与皮肤色。 */
  create({ name, author = "human", content = "", color = "yellow" }) {
    this.#ensureDir();
    const id = newId();
    const at = nowIso();
    const safeColor = NOTE_COLORS.includes(color) ? color : "yellow";
    const meta = {
      name: String(name ?? "未命名").slice(0, 60) || "未命名",
      color: safeColor,
      created_at: at,
      updated_at: at,
      revision: 1
    };
    fs.writeFileSync(this.#metaPath(id), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    fs.writeFileSync(this.#mdPath(id), String(content), "utf8");
    fs.writeFileSync(this.#historyPath(id), `${JSON.stringify({
      rev: 1, author, actor: author === "ai" ? "ai" : (meta.name || "human"), at, note: "创建", content: String(content)
    })}\n`, "utf8");
    return { id, name: meta.name, color: meta.color, revision: meta.revision };
  }

  /** 读取：内容 + 元数据 + 统计。 */
  get(id) {
    this.#assertValid(id);
    const meta = JSON.parse(fs.readFileSync(this.#metaPath(id), "utf8"));
    const content = fs.readFileSync(this.#mdPath(id), "utf8");
    return {
      id,
      name: meta.name ?? id,
      color: meta.color ?? "yellow",
      content,
      revision: meta.revision ?? 0,
      created_at: meta.created_at,
      updated_at: meta.updated_at,
      stats: checklistStats(content)
    };
  }

  /**
   * 保存（核心：强制留痕）。
   * @param {object} p { id, content, author: "human"|"ai", actor?, note? }
   */
  save({ id, content, author = "human", actor = null, note = null }) {
    this.#assertValid(id);
    if (!["human", "ai"].includes(author)) {
      throw new Error(`保存必须标明 author（human/ai），收到: ${author}`);
    }
    const meta = JSON.parse(fs.readFileSync(this.#metaPath(id), "utf8"));
    const rev = (meta.revision ?? 0) + 1;
    const at = nowIso();
    // 原子写内容
    const tmp = `${this.#mdPath(id)}.tmp-${crypto.randomBytes(3).toString("hex")}`;
    fs.writeFileSync(tmp, String(content ?? ""), "utf8");
    fs.renameSync(tmp, this.#mdPath(id));
    // 元数据
    meta.revision = rev;
    meta.updated_at = at;
    fs.writeFileSync(this.#metaPath(id), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    // 历史（追加，只增不改）
    fs.appendFileSync(this.#historyPath(id), `${JSON.stringify({
      rev, author, actor, at, note, content: String(content ?? "")
    })}\n`, "utf8");
    return { id, revision: rev, author, at, stats: checklistStats(content) };
  }

  /** 修订历史（只返回摘要，不含全文，避免大响应；需要全文用 getRevision）。 */
  history(id) {
    this.#assertValid(id);
    try {
      return fs.readFileSync(this.#historyPath(id), "utf8")
        .split("\n").filter(Boolean)
        .map(line => {
          const rec = JSON.parse(line);
          return { rev: rec.rev, author: rec.author, actor: rec.actor, at: rec.at, note: rec.note ?? null };
        });
    } catch {
      return [];
    }
  }

  /** 取某一版全文（回滚用）。 */
  getRevision(id, rev) {
    this.#assertValid(id);
    const records = fs.readFileSync(this.#historyPath(id), "utf8")
      .split("\n").filter(Boolean).map(line => JSON.parse(line));
    const hit = records.find(r => r.rev === Number(rev));
    if (!hit) throw new Error(`版本不存在: rev ${rev}`);
    return hit.content;
  }

  /** 回滚到某版：作为一次新的留痕保存。 */
  restore({ id, rev, author = "human", actor = null }) {
    const content = this.getRevision(id, rev);
    return this.save({ id, content, author, actor, note: `回滚到 rev ${rev}` });
  }

  rename({ id, name }) {
    this.#assertValid(id);
    const meta = JSON.parse(fs.readFileSync(this.#metaPath(id), "utf8"));
    meta.name = String(name ?? "").slice(0, 60) || meta.name;
    fs.writeFileSync(this.#metaPath(id), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    return { id, name: meta.name };
  }

  /** 换皮肤色。 */
  setColor({ id, color }) {
    this.#assertValid(id);
    if (!NOTE_COLORS.includes(color)) throw new Error(`不支持的皮肤色: ${color}（可用: ${NOTE_COLORS.join(", ")}）`);
    const meta = JSON.parse(fs.readFileSync(this.#metaPath(id), "utf8"));
    meta.color = color;
    fs.writeFileSync(this.#metaPath(id), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
    return { id, color: meta.color };
  }

  delete(id) {
    this.#assertValid(id);
    // 注意：不用 fs.rmSync —— 当前环境（沙箱文件监控层）下 rmSync 会触发 native crash（0xC0000409）
    for (const p of [this.#mdPath(id), this.#metaPath(id), this.#historyPath(id)]) {
      try { fs.unlinkSync(p); } catch { /* 文件不存在则跳过 */ }
    }
    return { id, deleted: true };
  }
}

export default NotebookStore;
