# Stickies

A local-first Markdown sticky notes plugin for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness).

Stickies keeps lightweight notes beside the current conversation, so you can capture requirements, questions, checklists, and working context without leaving the Harness page.

## Highlights

- Inline sticky-note directory that stays alongside the conversation.
- Drag notes out into resizable floating cards.
- Markdown editing and preview, including headings, lists, task lists, links, images, code blocks, quotes, tables, and emphasis.
- Task-list checkboxes that write changes back to Markdown.
- Note colors, ordering, resizing, revision history, and rollback.
- Local-first storage through the Harness web server; no cloud account or external data service is required.

## Install

From a DeepSeek Harness environment with the DSH CLI available:

```bash
dsh plugin install https://github.com/ming-xia/stickies
```

Restart the web profile when prompted, then open the Harness web interface. The `🗒️ 便利贴` action appears in the conversation header.

## Development

The plugin is a standard DSH bundle. Its entry point is declared through `dsh.bundle` in `package.json`, and `cordis.patch.yml` registers the runtime plugin.

For a local UI preview:

```bash
node scripts/serve-local.mjs --port 3401
```

Then open `http://localhost:3401/stickies/ui`.

The local preview stores notes under the sibling project workspace's `work/notebooks` directory by default. Use `--notes <path>` to choose another local data directory.

## Privacy

Notes are stored locally by the plugin's configured `notesRoot`. The repository contains source code only and does not include personal note data.

## License

MIT. See [LICENSE](LICENSE).

