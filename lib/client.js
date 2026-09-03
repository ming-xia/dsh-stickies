window.__ModuleLoader__.load({
	id: "sticky-notes-plugin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;
		Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
		const { jsx, jsxs } = require("react/jsx-runtime");
		const { useEffect, useLayoutEffect, useRef, useState } = require("react");

		const css = `
.sticky-notes-plugin-action {
	min-height: 28px;
	color: #374151;
	cursor: pointer;
	background: #fff;
	border: 1px solid #d9dde5;
	border-radius: 6px;
	align-items: center;
	gap: 4px;
	padding: 3px 8px;
	font: inherit;
	font-size: 12px;
	line-height: 18px;
	font-weight: 600;
	text-decoration: none;
	display: inline-flex;
	box-shadow: 0 1px 2px rgba(15, 23, 42, .05);
}
.sticky-notes-plugin-action:hover,
.sticky-notes-plugin-action:focus-visible {
	color: #1f2937;
	background: #f9fafb;
	border-color: #c4c9d2;
	outline: none;
}
.sticky-notes-plugin-action:focus-visible { outline: 2px solid #9ca3af; outline-offset: 2px; }
.sticky-notes-plugin-action-icon { display: inline-flex; width: 14px; height: 14px; flex: 0 0 14px; }
.sticky-notes-plugin-action-icon svg { display: block; width: 100%; height: 100%; }
.sticky-notes-plugin-root { display: contents; }
.sticky-notes-plugin-drawer-backdrop {
	position: fixed;
	top: var(--sticky-notes-top, 0px);
	right: 0;
	left: 0;
	height: var(--sticky-notes-overlay-height, 376px);
	z-index: 999;
	pointer-events: none;
}
.sticky-notes-plugin-drawer {
	position: absolute;
	top: 0;
	right: var(--sticky-notes-card-right, 16px);
	height: 100%;
	width: var(--sticky-notes-panel-width, 420px);
	pointer-events: auto;
}
.sticky-notes-plugin-frame { display: block; width: 100%; height: 100%; border: 0; }
.sticky-notes-plugin-note-frame {
	position: fixed;
	width: 400px;
	height: min(520px, calc(100vh - 80px));
	min-width: 240px;
	min-height: 180px;
	border: 0;
	background: transparent;
	z-index: 1000;
	will-change: transform;
	contain: layout paint;
}
.sticky-notes-plugin-drag-capture {
	position: fixed;
	inset: 0;
	z-index: 1100;
	cursor: grabbing;
	background: transparent;
	pointer-events: none;
}
.sticky-notes-plugin-drag-capture-region {
	position: fixed;
	pointer-events: auto;
	background: transparent;
}
.sticky-notes-plugin-drag-ghost {
	position: fixed;
	z-index: 1101;
	pointer-events: none;
	display: flex;
	align-items: center;
	gap: 8px;
	padding: 6px 12px;
	background: #fff;
	border: 1px solid #c9d4e6;
	border-radius: 8px;
	box-shadow: 0 8px 24px rgba(30, 40, 60, .25);
	font-size: 13px;
	color: #1c2330;
	white-space: nowrap;
	will-change: transform;
}
.sticky-notes-plugin-drag-ghost-dot {
	width: 12px;
	height: 12px;
	border-radius: 4px;
	flex: 0 0 auto;
}
`;
		const tagId = "sticky-notes-plugin/client";
		if (typeof document !== "undefined" && document.querySelector("style[data-plugin-css=" + JSON.stringify(tagId) + "]") === null) {
			const tag = document.createElement("style");
			tag.dataset.plugin = "sticky-notes-plugin";
			tag.dataset.pluginCss = tagId;
			tag.textContent = css;
			document.head.appendChild(tag);
		}

		function StickyNotesAction() {
			const [open, setOpen] = useState(false);
			const [frame, setFrame] = useState(null);
			const rootRef = useRef(null);
			const directoryHeightRef = useRef(null);
			const close = () => setOpen(false);
		useEffect(() => {
			const noteFrames = new Map();
			let directoryDrag = null;
				const postTo = (source, data) => source?.postMessage(data, window.location.origin);
				const refreshDirectory = () => {
					const directoryFrame = document.querySelector('.sticky-notes-plugin-frame');
					postTo(directoryFrame?.contentWindow, { type: "sticky-notes-refresh" });
				};
				const removeNoteFrame = (id) => {
					const item = noteFrames.get(id);
					if (!item) return;
					item.el.remove();
					noteFrames.delete(id);
					refreshDirectory();
				};
			const createNoteFrame = (id, x, y) => {
					const width = 400;
					const height = Math.min(520, Math.max(240, window.innerHeight - 80));
					const left = Math.max(4, Math.min(window.innerWidth - width - 4, x - width / 2));
					const top = Math.max(4, Math.min(window.innerHeight - height - 4, y - 20));
					const existing = noteFrames.get(id);
					if (existing) {
						existing.el.style.left = "0px";
						existing.el.style.top = "0px";
						existing.el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
						existing.el.style.zIndex = String(1001 + noteFrames.size);
						return existing;
					}
					const el = document.createElement("iframe");
					el.className = "sticky-notes-plugin-note-frame";
					el.title = "便利贴";
					el.src = `/stickies/ui?embedded=note&note=${encodeURIComponent(id)}`;
					el.style.width = `${width}px`;
					el.style.height = `${height}px`;
					el.style.left = "0px";
					el.style.top = "0px";
					el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
					el.style.zIndex = String(1001 + noteFrames.size);
					document.body.appendChild(el);
					const item = { el, id, dragging: null };
					noteFrames.set(id, item);
					return item;
			};
			const finishDirectoryDrag = (event, cancelled = false) => {
				const drag = directoryDrag;
				if (!drag || (drag.pointerId !== null && event.pointerId !== drag.pointerId)) return;
				directoryDrag = null;
				if (drag.raf) window.cancelAnimationFrame(drag.raf);
				window.removeEventListener("pointermove", drag.onMove, true);
				window.removeEventListener("pointerup", drag.onUp, true);
				window.removeEventListener("pointercancel", drag.onCancel, true);
				drag.capture.remove();
				drag.ghost.remove();
				const frame = document.querySelector('.sticky-notes-plugin-frame');
				const rect = frame?.getBoundingClientRect();
				const insideDirectory = rect && event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
				if (cancelled || insideDirectory) {
					postTo(drag.source, { type: "sticky-notes-drag-finished", id: drag.id, cancelled: true });
					return;
				}
				createNoteFrame(drag.id, event.clientX, event.clientY);
				postTo(drag.source, { type: "sticky-notes-dragged", id: drag.id });
				postTo(drag.source, { type: "sticky-notes-drag-finished", id: drag.id });
			};
			const startDirectoryDrag = (data, source) => {
				if (directoryDrag) finishDirectoryDrag({ pointerId: directoryDrag.pointerId, clientX: 0, clientY: 0 }, true);
				const capture = document.createElement("div");
				capture.className = "sticky-notes-plugin-drag-capture";
				const frameRect = document.querySelector('.sticky-notes-plugin-frame')?.getBoundingClientRect();
				const regions = [
					{ left: 0, top: 0, right: window.innerWidth, bottom: frameRect?.top ?? 0 },
					{ left: 0, top: frameRect?.bottom ?? window.innerHeight, right: window.innerWidth, bottom: window.innerHeight },
					{ left: 0, top: frameRect?.top ?? 0, right: frameRect?.left ?? 0, bottom: frameRect?.bottom ?? window.innerHeight },
					{ left: frameRect?.right ?? 0, top: frameRect?.top ?? 0, right: window.innerWidth, bottom: frameRect?.bottom ?? window.innerHeight }
				];
				for (const region of regions) {
					const el = document.createElement("div");
					el.className = "sticky-notes-plugin-drag-capture-region";
					el.style.left = `${region.left}px`;
					el.style.top = `${region.top}px`;
					el.style.width = `${Math.max(0, region.right - region.left)}px`;
					el.style.height = `${Math.max(0, region.bottom - region.top)}px`;
					capture.appendChild(el);
				}
				const ghost = document.createElement("div");
				ghost.className = "sticky-notes-plugin-drag-ghost";
				ghost.innerHTML = `<span class="sticky-notes-plugin-drag-ghost-dot" style="background:${data.color ?? "#f5d76e"}"></span>${String(data.name ?? "便利贴").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]))}`;
				const moveGhost = (event) => {
					ghost.style.display = "flex";
					directoryDrag.pending = { x: event.clientX, y: event.clientY };
					if (directoryDrag.raf) return;
					directoryDrag.raf = window.requestAnimationFrame(() => {
						directoryDrag.raf = 0;
						if (!directoryDrag?.pending) return;
						const { x, y } = directoryDrag.pending;
						ghost.style.transform = `translate3d(${x + 10}px, ${y - 14}px, 0)`;
					});
				};
				const onMove = event => {
					if (directoryDrag?.pointerId !== null && event.pointerId !== directoryDrag.pointerId) return;
					moveGhost(event);
				};
				const onUp = event => finishDirectoryDrag(event);
				const onCancel = event => finishDirectoryDrag(event, true);
				directoryDrag = { id: data.id, source, pointerId: data.pointerId ?? null, capture, ghost, onMove, onUp, onCancel };
				capture.addEventListener("pointermove", onMove);
				capture.addEventListener("pointerup", onUp);
				capture.addEventListener("pointercancel", onCancel);
				document.body.append(capture, ghost);
				window.addEventListener("pointermove", onMove, true);
				window.addEventListener("pointerup", onUp, true);
				window.addEventListener("pointercancel", onCancel, true);
			};
			const applyPanelDrag = (item, dx, dy) => {
				const drag = item.dragging;
				if (!drag) return;
				drag.pending = { dx, dy };
				if (drag.raf) return;
				drag.raf = window.requestAnimationFrame(() => {
					drag.raf = 0;
					if (!drag.pending) return;
					const left = Math.max(4, Math.min(window.innerWidth - drag.width - 4, drag.left + drag.pending.dx));
					const top = Math.max(4, Math.min(window.innerHeight - drag.height - 4, drag.top + drag.pending.dy));
					item.el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
				});
			};
			const finishPanelDrag = (item, event, cancelled = false) => {
				const drag = item.dragging;
				if (!drag || (drag.pointerId !== null && event.pointerId !== drag.pointerId)) return;
				if (!cancelled) applyPanelDrag(item, event.clientX - drag.startX, event.clientY - drag.startY);
				if (drag.raf) window.cancelAnimationFrame(drag.raf);
				if (!cancelled && drag.pending) {
					const left = Math.max(4, Math.min(window.innerWidth - drag.width - 4, drag.left + drag.pending.dx));
					const top = Math.max(4, Math.min(window.innerHeight - drag.height - 4, drag.top + drag.pending.dy));
					item.el.style.transform = `translate3d(${left}px, ${top}px, 0)`;
				}
				window.removeEventListener("pointermove", drag.onMove, true);
				window.removeEventListener("pointerup", drag.onUp, true);
				window.removeEventListener("pointercancel", drag.onCancel, true);
				drag.capture?.remove();
				item.dragging = null;
			};
			const startPanelDragCapture = (item, data) => {
				if (item.dragging) finishPanelDrag(item, { pointerId: item.dragging.pointerId, clientX: 0, clientY: 0 }, true);
				const rect = item.el.getBoundingClientRect();
				const capture = document.createElement("div");
				capture.className = "sticky-notes-plugin-drag-capture";
				const region = document.createElement("div");
				region.className = "sticky-notes-plugin-drag-capture-region";
				region.style.inset = "0";
				capture.appendChild(region);
				const startX = data.x ?? rect.left + rect.width / 2;
				const startY = data.y ?? rect.top + 20;
				const onMove = event => {
					if (item.dragging?.pointerId !== null && event.pointerId !== item.dragging.pointerId) return;
					applyPanelDrag(item, event.clientX - startX, event.clientY - startY);
				};
				const onUp = event => finishPanelDrag(item, event);
				const onCancel = event => finishPanelDrag(item, event, true);
				item.dragging = { left: rect.left, top: rect.top, width: rect.width, height: rect.height, startX, startY, pointerId: data.pointerId ?? null, pending: null, raf: 0, capture, onMove, onUp, onCancel };
				item.el.style.zIndex = String(1101 + noteFrames.size);
				document.body.appendChild(capture);
				window.addEventListener("pointermove", onMove, true);
				window.addEventListener("pointerup", onUp, true);
				window.addEventListener("pointercancel", onCancel, true);
			};
			const onMessage = (event) => {
					if (event.origin !== window.location.origin) return;
					const data = event.data ?? {};
					if (data.type === "sticky-notes-close") { close(); return; }
					if (data.type === "sticky-notes-drag-cancel") {
						if (directoryDrag?.source === event.source) finishDirectoryDrag({ pointerId: data.pointerId ?? directoryDrag.pointerId, clientX: 0, clientY: 0 }, true);
						return;
					}
					if (data.type === "sticky-notes-note-close" || data.type === "sticky-notes-note-dock-back") {
						removeNoteFrame(data.id);
						return;
					}
				if (data.type === "sticky-notes-detach") {
						createNoteFrame(data.id, data.x, data.y);
						postTo(event.source, { type: "sticky-notes-dragged", id: data.id });
					return;
				}
					if (data.type === "sticky-notes-detach-start") {
						startDirectoryDrag(data, event.source);
						return;
					}
					if (data.type === "sticky-notes-directory-resize") {
						const directoryFrame = document.querySelector('.sticky-notes-plugin-frame');
						if (event.source !== directoryFrame?.contentWindow) return;
						const backdrop = directoryFrame?.parentElement?.parentElement;
						const rect = backdrop?.getBoundingClientRect();
						const requested = Number(data.height);
						if (!Number.isFinite(requested)) return;
						const minHeight = 240;
						const maxHeight = Math.max(minHeight, window.innerHeight - (rect?.top ?? 0) - 12);
						const height = Math.max(minHeight, Math.min(maxHeight, requested + 16));
						directoryHeightRef.current = height;
						if (backdrop) backdrop.style.height = `${height}px`;
						return;
					}
					const item = [...noteFrames.values()].find(value => value.el.contentWindow === event.source);
					if (!item) return;
					if (data.type === "sticky-notes-note-resize") {
						const rect = item.el.getBoundingClientRect();
						const requestedWidth = Number(data.width);
						const requestedHeight = Number(data.height);
						if (!Number.isFinite(requestedWidth) || !Number.isFinite(requestedHeight)) return;
						const width = Math.max(240, Math.min(window.innerWidth - rect.left - 8, requestedWidth));
						const height = Math.max(180, Math.min(window.innerHeight - rect.top - 8, requestedHeight));
						item.el.style.width = `${width}px`;
						item.el.style.height = `${height}px`;
						return;
					}
					if (data.type === "sticky-notes-panel-drag-start") {
						startPanelDragCapture(item, data);
					} else if (data.type === "sticky-notes-panel-drag") {
						const drag = item.dragging;
						if (!drag) return;
						applyPanelDrag(item, data.dx, data.dy);
					} else if (data.type === "sticky-notes-panel-drag-end") {
						finishPanelDrag(item, { pointerId: data.pointerId ?? item.dragging?.pointerId, clientX: item.dragging?.startX ?? 0, clientY: item.dragging?.startY ?? 0 }, true);
					}
				};
				window.addEventListener("message", onMessage);
				return () => {
					window.removeEventListener("message", onMessage);
					if (directoryDrag) finishDirectoryDrag({ pointerId: directoryDrag.pointerId, clientX: 0, clientY: 0 }, true);
					for (const item of noteFrames.values()) {
						if (item.dragging) finishPanelDrag(item, { pointerId: item.dragging.pointerId, clientX: 0, clientY: 0 }, true);
						item.el.remove();
					}
				};
			}, []);
			useLayoutEffect(() => {
				if (!open) {
					directoryHeightRef.current = null;
				}
				const action = rootRef.current?.querySelector('.sticky-notes-plugin-action');
				const actions = action?.closest('[class*="headerActions"]');
				const previousActionsStyle = actions ? {
					flex: actions.style.flex,
					minWidth: actions.style.minWidth
				} : null;
				const previousActionStyle = action ? { marginLeft: action.style.marginLeft } : null;
				if (actions) {
					actions.style.flex = "1 1 auto";
					actions.style.minWidth = "0";
				}
				if (action) action.style.marginLeft = "auto";
				if (!open) {
					return () => {
						if (actions && previousActionsStyle) Object.assign(actions.style, previousActionsStyle);
						if (action && previousActionStyle) Object.assign(action.style, previousActionStyle);
					};
				}
				const root = rootRef.current?.closest('[class*="centerCol"]');
				if (!root) return () => {
					if (actions && previousActionsStyle) Object.assign(actions.style, previousActionsStyle);
					if (action && previousActionStyle) Object.assign(action.style, previousActionStyle);
				};
				const layoutRoot = root.querySelector('[class*="_scrollBody"]')?.parentElement
					?? root.querySelector('[class*="_root"]');
				const previousLayout = layoutRoot ? {
					width: layoutRoot.style.width,
					maxWidth: layoutRoot.style.maxWidth,
					flex: layoutRoot.style.flex,
					minWidth: layoutRoot.style.minWidth
				} : null;
				const update = () => {
					const rect = root.getBoundingClientRect();
					const width = Math.min(380, Math.max(320, Math.floor(window.innerWidth * .30)));
					const topBar = root.querySelector('[role="banner"], header');
					const top = rect.top + (topBar ? topBar.getBoundingClientRect().height : 0) + 8;
					const maxHeight = Math.max(240, window.innerHeight - top - 12);
					const defaultHeight = Math.min(420, Math.max(280, Math.round(window.innerHeight * .5) + 16));
					const height = Math.min(maxHeight, Math.max(240, directoryHeightRef.current ?? defaultHeight));
					if (layoutRoot) {
						const available = Math.max(0, rect.width - width);
						layoutRoot.style.width = `${available}px`;
						layoutRoot.style.maxWidth = `${available}px`;
						layoutRoot.style.minWidth = "0";
					}
					setFrame({ top, width, height, right: Math.max(16, window.innerWidth - rect.right) });
				};
				update();
				const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(update);
				observer?.observe(root);
				window.addEventListener("resize", update);
				return () => {
					observer?.disconnect();
					window.removeEventListener("resize", update);
					if (layoutRoot && previousLayout) Object.assign(layoutRoot.style, previousLayout);
					if (actions && previousActionsStyle) Object.assign(actions.style, previousActionsStyle);
					if (action && previousActionStyle) Object.assign(action.style, previousActionStyle);
				};
			}, [open]);
			const drawerStyle = frame ? {
				"--sticky-notes-top": `${frame.top}px`,
				"--sticky-notes-panel-width": `${frame.width}px`,
				"--sticky-notes-overlay-height": `${frame.height}px`,
				"--sticky-notes-card-right": `${frame.right}px`
			} : undefined;
			return jsxs("div", {
				ref: rootRef,
				className: "sticky-notes-plugin-root",
				children: [jsx("button", {
					className: "sticky-notes-plugin-action",
					type: "button",
					"aria-expanded": open,
					"aria-label": "打开便利贴",
					title: "打开便利贴",
					onClick: () => setOpen((value) => !value),
					children: [jsx("span", {
						className: "sticky-notes-plugin-action-icon",
						"aria-hidden": true,
						children: jsx("svg", {
							viewBox: "0 0 16 16",
							fill: "none",
							"aria-hidden": true,
							children: jsx("path", {
								d: "M3 2.5h10v11H3zM5.5 5h5M5.5 7.5h5M5.5 10h3",
								stroke: "currentColor",
								strokeWidth: "1.35",
								strokeLinecap: "round",
								strokeLinejoin: "round"
							})
						})
					}), jsx("span", { children: "便利贴" })]
				}), open ? jsx("div", {
					className: "sticky-notes-plugin-drawer-backdrop",
					style: drawerStyle,
					role: "presentation",
					onClick: close,
					children: jsx("aside", {
						className: "sticky-notes-plugin-drawer",
						role: "dialog",
						"aria-label": "便利贴",
						onClick: (event) => event.stopPropagation(),
						children: jsx("iframe", {
							className: "sticky-notes-plugin-frame",
							src: "/stickies/ui?embedded=1",
							title: "便利贴",
							loading: "eager"
						})
					})
				}) : null]
			});
		}

		const inject = ["slots"];
		function apply(ctx) {
			ctx.slots.inject("conversation.session.header.actions", () => ctx.slots.register({
				name: "conversation.session.header.actions",
				id: "sticky-notes",
				order: 30
			}, StickyNotesAction));
		}

		exports.apply = apply;
		exports.inject = inject;
		return module.exports;
	}
});
