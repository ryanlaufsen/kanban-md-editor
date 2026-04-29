import {
  createCard,
  createEmptyBoard,
  parseMarkdown,
  serializeMarkdown,
  todayIso
} from "./parser.js";

const els = {
  board: document.querySelector("#board"),
  boardTitle: document.querySelector("#boardTitle"),
  diagnostics: document.querySelector("#diagnostics"),
  markdownText: document.querySelector("#markdownText"),
  statusText: document.querySelector("#statusText"),
  fileInput: document.querySelector("#fileInput"),
  openFileButton: document.querySelector("#openFileButton"),
  saveFileButton: document.querySelector("#saveFileButton"),
  downloadButton: document.querySelector("#downloadButton"),
  copyButton: document.querySelector("#copyButton"),
  applyMarkdownButton: document.querySelector("#applyMarkdownButton"),
  autoRefreshToggle: document.querySelector("#autoRefreshToggle"),
  refreshStatus: document.querySelector("#refreshStatus"),
  loadSimpleButton: document.querySelector("#loadSimpleButton"),
  loadRichButton: document.querySelector("#loadRichButton"),
  addColumnButton: document.querySelector("#addColumnButton"),
  addCardButton: document.querySelector("#addCardButton"),
  cardDialog: document.querySelector("#cardDialog"),
  cardForm: document.querySelector("#cardForm"),
  editTitle: document.querySelector("#editTitle"),
  editStatus: document.querySelector("#editStatus"),
  editPriority: document.querySelector("#editPriority"),
  editOwner: document.querySelector("#editOwner"),
  editConflictRisk: document.querySelector("#editConflictRisk"),
  editBody: document.querySelector("#editBody"),
  saveCardButton: document.querySelector("#saveCardButton"),
  deleteCardButton: document.querySelector("#deleteCardButton")
};

const AUTO_REFRESH_INTERVAL_MS = 2000;
const DEFAULT_TODO_PATHS = ["./TODO.md", "./todo.md"];

let state = {
  board: createEmptyBoard(),
  dirty: false,
  boardDirty: false,
  markdownDirty: false,
  fileHandle: null,
  fileName: "TODO.md",
  source: null,
  autoRefresh: true,
  refreshTimer: null,
  refreshPending: false,
  refreshIssue: "",
  localRevision: 0,
  statusTimer: null,
  awaitingDefaultTodo: false,
  editing: null,
  dragged: null
};

const fallbackExamples = {
  "./examples/agent-designer-todo.md": `# TODO

Last updated: 2026-04-29

## Inbox

- None.

## Ready

### TODO-001 - Expand Archetypes And Custom Agent Capability

- Status: Ready
- Priority: High
- Owner: Unassigned
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Expand Agent Designer beyond the first three archetypes while building the foundation for capable custom agents.

Scope:
- Add role-specific defaults, approval gates, n8n workflow expectations, and evaluation scenarios.

Acceptance criteria:
- At least three new archetypes are implemented from the priority list.
- Custom-role flow can create a valid request without pretending a preset exists.

Verification:
- npm run validate

### TODO-002 - Harden And Operationalize Self-Host n8n Control Plane

- Status: Ready
- Priority: High
- Owner: Unassigned
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Implement a production-grade self-host n8n control-plane path for webhook intake, queueing, approval, and Codex execution.

Scope:
- Update docs, n8n templates, validation, and runner scripts.

Acceptance criteria:
- Docs identify intake queue and approval execution templates as the production path.
- npm run validate passes.

Verification:
- npm run validate

## In Progress

- None.

## Blocked

- None.

## Done

- None.
`,
  "./examples/operations-rich.md": `# Operations TODO

This board keeps coordination work visible while preserving Markdown for agents.

## Inbox

### TODO-010 - Triage Facilities Requests

- Status: Inbox
- Priority: Medium
- Owner: Casey
- Conflict risk: Low
- Last updated: 2026-04-29

Summary:
- Sort new facilities requests by urgency, owner, and approval needs.

Scope:
- Vendor calls, work orders, and safety escalations.

Acceptance criteria:
- Each request has an owner, priority, and next action.

Verification:
- Review exported Markdown.

## Ready

### TODO-011 - Add Approval Routing Module

- Status: Ready
- Priority: High
- Owner: Morgan
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Add a reusable module for approval requests and decision records.

Scope:
- UI defaults, exported request packet text, and tests.

Acceptance criteria:
- Money, access, legal, and policy exceptions require human approval.

Verification:
- npm run validate

## In Progress

### TODO-012 - Draft Runner Isolation Notes

- Status: In Progress
- Priority: High
- Owner: Riley
- Conflict risk: High
- Last updated: 2026-04-29

Summary:
- Document low-privilege runner host expectations.

Scope:
- Docker, WSL2, path mounts, and Codex CLI availability.

Acceptance criteria:
- A self-host operator can see exactly where Codex executes.

Verification:
- Read through deployment smoke test.

## Blocked

### TODO-013 - Confirm Proxy Standard

- Status: Blocked
- Priority: Medium
- Owner: Unassigned
- Conflict risk: Medium
- Last updated: 2026-04-29

Summary:
- Pick the first documented reverse proxy example.

Scope:
- Caddy, Nginx, or Traefik guidance.

Acceptance criteria:
- One concrete TLS path exists without implying it is the only supported proxy.

Verification:
- Manual docs review.

## Done

### TODO-009 - Add Queue Request Script

- Status: Done
- Priority: High
- Owner: Sam
- Conflict risk: Low
- Last updated: 2026-04-28

Summary:
- Add deterministic local queue write behavior.

Scope:
- scripts/queue-request.mjs

Acceptance criteria:
- Invalid packets fail before queue write.

Verification:
- npm run validate
`
};

boot();

async function boot() {
  bindEvents();
  await loadDefaultMarkdown();
  startAutoRefresh();
}

function bindEvents() {
  els.openFileButton.addEventListener("click", openFile);
  els.fileInput.addEventListener("change", onFileInput);
  els.saveFileButton.addEventListener("click", saveFile);
  els.downloadButton.addEventListener("click", downloadMarkdown);
  els.copyButton.addEventListener("click", copyMarkdown);
  els.applyMarkdownButton.addEventListener("click", () => {
    applyMarkdownText();
  });
  els.markdownText.addEventListener("input", markMarkdownDirty);
  els.autoRefreshToggle.addEventListener("change", onAutoRefreshToggle);
  els.loadSimpleButton.addEventListener("click", () => loadExample("./examples/agent-designer-todo.md"));
  els.loadRichButton.addEventListener("click", () => loadExample("./examples/operations-rich.md"));
  els.addColumnButton.addEventListener("click", addColumn);
  els.addCardButton.addEventListener("click", addCardToFirstColumn);
  els.cardForm.addEventListener("submit", onCardFormSubmit);
  els.cardDialog.addEventListener("close", onCardDialogClose);
  els.deleteCardButton.addEventListener("click", deleteEditingCard);
}

async function loadDefaultMarkdown() {
  if (await loadFirstAvailableTodo()) return;
  state.awaitingDefaultTodo = true;
  await loadExample("./examples/agent-designer-todo.md", { keepDefaultTodoWatch: true });
}

async function loadFirstAvailableTodo() {
  for (const path of DEFAULT_TODO_PATHS) {
    const text = await fetchMarkdown(path);
    if (text !== null) {
      loadMarkdown(text, path.split("/").pop(), {
        source: { kind: "url", path, lastText: text }
      });
      state.awaitingDefaultTodo = false;
      return true;
    }
  }
  return false;
}

async function loadExample(path, options = {}) {
  let text = fallbackExamples[path];
  let source = null;
  try {
    const response = await fetch(path);
    if (response.ok) {
      text = await response.text();
      source = { kind: "url", path, lastText: text };
    }
  } catch {
    // File URLs often block fetch; embedded examples keep the standalone page usable.
  }
  if (!options.keepDefaultTodoWatch) state.awaitingDefaultTodo = false;
  loadMarkdown(text, path.split("/").pop(), { source });
}

function loadMarkdown(markdown, fileName, options = {}) {
  state.board = parseMarkdown(markdown);
  state.fileName = fileName || "TODO.md";
  state.source = options.source || null;
  state.fileHandle = state.source?.kind === "fileHandle" ? state.source.handle : null;
  markClean();
  state.refreshIssue = "";
  state.localRevision += 1;
  syncMarkdown();
  render();
  setStatus(`Loaded ${state.fileName}`);
  queueRefreshCheck();
}

async function fetchMarkdown(path) {
  try {
    const separator = path.includes("?") ? "&" : "?";
    const response = await fetch(`${path}${separator}refresh=${Date.now()}`, { cache: "no-store" });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}

function startAutoRefresh() {
  if (state.refreshTimer) window.clearInterval(state.refreshTimer);
  state.refreshTimer = window.setInterval(() => {
    void checkForExternalRefresh();
  }, AUTO_REFRESH_INTERVAL_MS);
}

function onAutoRefreshToggle(event) {
  state.autoRefresh = event.currentTarget.checked;
  state.refreshIssue = "";
  render();
  setStatus(state.autoRefresh ? "Auto-refresh on" : "Auto-refresh paused");
  if (state.autoRefresh) queueRefreshCheck();
}

async function checkForExternalRefresh() {
  if (!state.autoRefresh || state.refreshPending) return;
  if (!hasWatchableSource()) {
    renderRefreshStatus();
    return;
  }
  if (hasRefreshBlocker()) {
    renderRefreshStatus();
    return;
  }

  state.refreshPending = true;
  const revision = state.localRevision;
  try {
    if (state.awaitingDefaultTodo && await loadFirstAvailableTodo()) return;

    const source = state.source;
    if (!source) {
      renderRefreshStatus();
      return;
    }

    if (source.kind === "url") {
      const text = await fetchMarkdown(source.path);
      if (text === null) {
        state.refreshIssue = "Source unavailable";
        renderRefreshStatus();
        return;
      }
      if (text === source.lastText) return;
      if (!canApplyRefresh(source, revision)) {
        renderRefreshStatus();
        return;
      }
      source.lastText = text;
      applyExternalMarkdown(text, `Refreshed ${state.fileName}`);
      return;
    }

    if (source.kind === "fileHandle") {
      const file = await source.handle.getFile();
      const text = await file.text();
      if (text === source.lastText) return;
      if (!canApplyRefresh(source, revision)) {
        renderRefreshStatus();
        return;
      }
      source.lastModified = file.lastModified;
      source.lastSize = file.size;
      source.lastText = text;
      applyExternalMarkdown(text, `Refreshed ${state.fileName}`);
    }
  } catch (error) {
    handleRefreshError(error);
  } finally {
    state.refreshPending = false;
    renderRefreshStatus();
  }
}

function applyExternalMarkdown(markdown, message) {
  state.board = parseMarkdown(markdown);
  markClean();
  state.refreshIssue = "";
  state.localRevision += 1;
  syncMarkdown();
  render();
  setStatus(message);
}

function hasWatchableSource() {
  if (location.protocol === "file:" && !state.source) return false;
  return state.awaitingDefaultTodo || Boolean(state.source);
}

function hasRefreshBlocker() {
  return state.dirty || state.dragged || state.editing || els.cardDialog.open;
}

function canApplyRefresh(source, revision) {
  return state.source === source && state.localRevision === revision && !hasRefreshBlocker();
}

function queueRefreshCheck() {
  window.setTimeout(() => {
    void checkForExternalRefresh();
  }, 0);
}

function handleRefreshError(error) {
  if (error?.name === "NotAllowedError") {
    state.autoRefresh = false;
    state.refreshIssue = "Permission lost; reopen file";
  } else if (error?.name === "NotFoundError") {
    state.autoRefresh = false;
    state.refreshIssue = "File moved or replaced; reopen file";
  } else {
    state.refreshIssue = "Auto-refresh unavailable";
  }
  render();
  setStatus(state.refreshIssue);
}

async function rememberSourceText(text) {
  const source = state.source;
  if (!source) return;
  source.lastText = text;
  if (source.kind !== "fileHandle") return;
  try {
    const file = await source.handle.getFile();
    source.lastModified = file.lastModified;
    source.lastSize = file.size;
  } catch {
    // Saving succeeded; refresh metadata can be repaired on the next poll.
  }
}

async function openFile() {
  state.awaitingDefaultTodo = false;
  if ("showOpenFilePicker" in window) {
    const [handle] = await window.showOpenFilePicker({
      types: [{ description: "Markdown", accept: { "text/markdown": [".md"], "text/plain": [".txt"] } }]
    });
    const file = await handle.getFile();
    const text = await file.text();
    loadMarkdown(text, file.name, {
      source: {
        kind: "fileHandle",
        handle,
        lastModified: file.lastModified,
        lastSize: file.size,
        lastText: text
      }
    });
    return;
  }
  els.fileInput.click();
}

async function onFileInput(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  loadMarkdown(await file.text(), file.name);
  state.refreshIssue = "Snapshot only; reopen to refresh";
  render();
  event.target.value = "";
}

async function saveFile() {
  const markdown = getCurrentMarkdownForSave();
  if (state.fileHandle && "createWritable" in state.fileHandle) {
    const writable = await state.fileHandle.createWritable();
    await writable.write(markdown);
    await writable.close();
    await rememberSourceText(markdown);
    markClean();
    state.localRevision += 1;
    render();
    setStatus("Saved to file");
    queueRefreshCheck();
    return;
  }
  downloadMarkdown();
}

function downloadMarkdown() {
  const markdown = getCurrentMarkdownForSave();
  const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = state.fileName || "TODO.md";
  anchor.click();
  URL.revokeObjectURL(url);
  markClean();
  state.localRevision += 1;
  render();
  setStatus("Downloaded markdown");
  queueRefreshCheck();
}

async function copyMarkdown() {
  await navigator.clipboard.writeText(getCurrentMarkdownForCopy());
  setStatus("Copied markdown");
}

function applyMarkdownText() {
  state.board = parseMarkdown(els.markdownText.value);
  if (!state.source) state.awaitingDefaultTodo = false;
  state.refreshIssue = state.source ? "" : "No live source";
  state.boardDirty = true;
  state.markdownDirty = false;
  state.dirty = true;
  state.localRevision += 1;
  render();
  setStatus(state.source ? "Applied text; save to update file" : "Applied text; no live source");
}

function getCurrentMarkdownForSave() {
  if (state.markdownDirty) {
    const markdown = els.markdownText.value;
    state.board = parseMarkdown(markdown);
    state.boardDirty = true;
    state.markdownDirty = false;
    return markdown;
  }
  syncMarkdown();
  return els.markdownText.value;
}

function getCurrentMarkdownForCopy() {
  if (!state.markdownDirty) syncMarkdown();
  return els.markdownText.value;
}

function syncMarkdown() {
  els.markdownText.value = serializeMarkdown(state.board);
  state.markdownDirty = false;
}

function render() {
  els.boardTitle.textContent = state.board.title || "TODO Board";
  els.statusText.textContent = state.dirty ? "Unsaved changes" : "Ready";
  renderRefreshStatus();
  renderDiagnostics();
  renderBoard();
}

function renderRefreshStatus() {
  els.autoRefreshToggle.checked = state.autoRefresh;
  els.autoRefreshToggle.disabled = !hasWatchableSource();
  els.refreshStatus.textContent = getRefreshStatus();
}

function getRefreshStatus() {
  if (state.refreshIssue) return state.refreshIssue;
  if (!hasWatchableSource()) {
    return location.protocol === "file:" ? "No live source; use local server" : "No live source";
  }
  if (!state.autoRefresh) return "Auto-refresh off";
  if (state.dirty) return "Paused: local edits";
  if (state.dragged) return "Paused: dragging";
  if (state.editing || els.cardDialog.open) return "Paused: editing card";
  if (state.refreshPending) return "Checking for changes";
  if (state.source) return `Watching ${state.fileName}`;
  return "Waiting for TODO.md";
}

function renderDiagnostics() {
  const messages = state.board.diagnostics || [];
  els.diagnostics.hidden = messages.length === 0;
  els.diagnostics.innerHTML = messages.map((item) => {
    const level = item.type === "error" ? "Error" : "Note";
    return `<div><strong>${level}</strong> line ${item.line}: ${escapeHtml(item.message)}</div>`;
  }).join("");
}

function renderBoard() {
  els.board.innerHTML = "";
  state.board.columns.forEach((column, columnIndex) => {
    const columnEl = document.createElement("section");
    columnEl.className = "column";
    columnEl.dataset.columnIndex = String(columnIndex);
    columnEl.innerHTML = `
      <div class="column-header">
        <input class="column-name" value="${escapeAttr(column.name)}" aria-label="Column name">
        <span>${column.cards.length}</span>
      </div>
      <div class="card-list" data-column-index="${columnIndex}"></div>
      <button class="add-card" type="button">Add card</button>
    `;

    const nameInput = columnEl.querySelector(".column-name");
    nameInput.addEventListener("change", () => renameColumn(columnIndex, nameInput.value));
    columnEl.querySelector(".add-card").addEventListener("click", () => addCard(columnIndex));

    const list = columnEl.querySelector(".card-list");
    list.addEventListener("dragover", onDragOver);
    list.addEventListener("drop", onDrop);
    list.addEventListener("dragleave", clearDropTarget);

    column.cards.forEach((card, cardIndex) => {
      list.appendChild(renderCard(card, columnIndex, cardIndex));
    });

    els.board.appendChild(columnEl);
  });
}

function renderCard(card, columnIndex, cardIndex) {
  const cardEl = document.createElement("article");
  cardEl.className = "card";
  cardEl.draggable = true;
  cardEl.dataset.columnIndex = String(columnIndex);
  cardEl.dataset.cardIndex = String(cardIndex);
  cardEl.tabIndex = 0;
  cardEl.innerHTML = `
    <div class="card-topline">
      <span class="card-id">${escapeHtml(card.id)}</span>
      <span class="priority ${priorityClass(card.metadata.Priority)}">${escapeHtml(card.metadata.Priority)}</span>
    </div>
    <button class="card-title" type="button">${escapeHtml(card.title)}</button>
    <div class="card-meta">
      <span>${escapeHtml(card.metadata.Owner)}</span>
      <span>${escapeHtml(card.metadata["Conflict risk"])} risk</span>
      <span>${escapeHtml(card.metadata["Last updated"])}</span>
    </div>
  `;

  cardEl.addEventListener("dragstart", onDragStart);
  cardEl.addEventListener("dragend", onDragEnd);
  cardEl.addEventListener("keydown", onCardKeydown);
  cardEl.querySelector(".card-title").addEventListener("click", () => openCardDialog(columnIndex, cardIndex));
  return cardEl;
}

function addColumn() {
  const name = prompt("Column name", "New Column");
  if (!name?.trim()) return;
  state.board.columns.push({ name: name.trim(), intro: "", cards: [] });
  markDirty();
}

function renameColumn(columnIndex, nextName) {
  const column = state.board.columns[columnIndex];
  const previousName = column.name;
  column.name = nextName.trim() || previousName;
  for (const card of column.cards) {
    if (card.metadata.Status === previousName) {
      card.metadata.Status = column.name;
      card.metadata["Last updated"] = todayIso();
    }
  }
  markDirty();
}

function addCardToFirstColumn() {
  addCard(0);
}

function addCard(columnIndex) {
  const column = state.board.columns[columnIndex];
  column.cards.unshift(createCard(state.board, column.name));
  markDirty();
}

function openCardDialog(columnIndex, cardIndex) {
  const column = state.board.columns[columnIndex];
  const card = column.cards[cardIndex];
  state.editing = { columnIndex, cardIndex };
  els.editStatus.innerHTML = state.board.columns.map((item) => (
    `<option ${item.name === column.name ? "selected" : ""}>${escapeHtml(item.name)}</option>`
  )).join("");
  els.editTitle.value = card.title;
  els.editPriority.value = card.metadata.Priority || "Medium";
  els.editOwner.value = card.metadata.Owner || "Unassigned";
  els.editConflictRisk.value = card.metadata["Conflict risk"] || "Low";
  els.editBody.value = card.body || "";
  els.cardDialog.showModal();
}

function onCardFormSubmit(event) {
  event.preventDefault();
  if (!state.editing || event.submitter?.value === "cancel") {
    els.cardDialog.close();
    return;
  }

  const { columnIndex, cardIndex } = state.editing;
  const currentColumn = state.board.columns[columnIndex];
  const card = currentColumn.cards[cardIndex];
  const nextStatus = els.editStatus.value;
  card.title = els.editTitle.value.trim() || card.title;
  card.metadata.Priority = els.editPriority.value;
  card.metadata.Owner = els.editOwner.value.trim() || "Unassigned";
  card.metadata["Conflict risk"] = els.editConflictRisk.value;
  card.body = els.editBody.value.replace(/\r\n/g, "\n").trimEnd();

  if (nextStatus !== currentColumn.name) {
    currentColumn.cards.splice(cardIndex, 1);
    const nextColumn = state.board.columns.find((item) => item.name === nextStatus);
    nextColumn.cards.push(card);
    card.metadata.Status = nextColumn.name;
  } else {
    card.metadata.Status = currentColumn.name;
  }
  card.metadata["Last updated"] = todayIso();
  state.editing = null;
  els.cardDialog.close();
  markDirty();
}

function onCardDialogClose() {
  const hadEditingState = Boolean(state.editing);
  state.editing = null;
  render();
  if (hadEditingState) queueRefreshCheck();
}

function deleteEditingCard() {
  if (!state.editing) return;
  const { columnIndex, cardIndex } = state.editing;
  state.board.columns[columnIndex].cards.splice(cardIndex, 1);
  state.editing = null;
  els.cardDialog.close();
  markDirty();
}

function onDragStart(event) {
  const cardEl = event.currentTarget;
  state.dragged = {
    columnIndex: Number(cardEl.dataset.columnIndex),
    cardIndex: Number(cardEl.dataset.cardIndex)
  };
  cardEl.classList.add("dragging");
  event.dataTransfer.effectAllowed = "move";
  event.dataTransfer.setData("text/plain", JSON.stringify(state.dragged));
}

function onDragEnd(event) {
  event.currentTarget.classList.remove("dragging");
  clearDropTarget();
  state.dragged = null;
  renderRefreshStatus();
  queueRefreshCheck();
}

function onDragOver(event) {
  event.preventDefault();
  const list = event.currentTarget;
  clearDropTarget();
  list.classList.add("drop-target");
  const after = getCardAfter(list, event.clientY);
  list.querySelectorAll(".card").forEach((card) => card.classList.remove("drop-before"));
  if (after) after.classList.add("drop-before");
}

function onDrop(event) {
  event.preventDefault();
  if (!state.dragged) return;
  const list = event.currentTarget;
  const toColumnIndex = Number(list.dataset.columnIndex);
  const after = getCardAfter(list, event.clientY);
  const toCardIndex = after ? Number(after.dataset.cardIndex) : state.board.columns[toColumnIndex].cards.length;
  moveCard(state.dragged.columnIndex, state.dragged.cardIndex, toColumnIndex, toCardIndex);
  clearDropTarget();
}

function getCardAfter(list, y) {
  return [...list.querySelectorAll(".card:not(.dragging)")].find((card) => {
    const box = card.getBoundingClientRect();
    return y < box.top + box.height / 2;
  });
}

function moveCard(fromColumnIndex, fromCardIndex, toColumnIndex, rawToCardIndex) {
  const fromColumn = state.board.columns[fromColumnIndex];
  const toColumn = state.board.columns[toColumnIndex];
  const [card] = fromColumn.cards.splice(fromCardIndex, 1);
  let toCardIndex = rawToCardIndex;
  if (fromColumnIndex === toColumnIndex && fromCardIndex < rawToCardIndex) toCardIndex -= 1;
  toColumn.cards.splice(Math.max(0, toCardIndex), 0, card);
  card.metadata.Status = toColumn.name;
  card.metadata["Last updated"] = todayIso();
  markDirty();
}

function onCardKeydown(event) {
  if (!["Enter", "ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(event.key)) return;
  const cardEl = event.currentTarget;
  const columnIndex = Number(cardEl.dataset.columnIndex);
  const cardIndex = Number(cardEl.dataset.cardIndex);
  if (event.key === "Enter") {
    openCardDialog(columnIndex, cardIndex);
    return;
  }
  event.preventDefault();
  if (event.key === "ArrowUp" && cardIndex > 0) moveCard(columnIndex, cardIndex, columnIndex, cardIndex - 1);
  if (event.key === "ArrowDown") moveCard(columnIndex, cardIndex, columnIndex, cardIndex + 2);
  if (event.key === "ArrowLeft" && columnIndex > 0) moveCard(columnIndex, cardIndex, columnIndex - 1, state.board.columns[columnIndex - 1].cards.length);
  if (event.key === "ArrowRight" && columnIndex < state.board.columns.length - 1) moveCard(columnIndex, cardIndex, columnIndex + 1, state.board.columns[columnIndex + 1].cards.length);
}

function clearDropTarget() {
  document.querySelectorAll(".drop-target").forEach((item) => item.classList.remove("drop-target"));
  document.querySelectorAll(".drop-before").forEach((item) => item.classList.remove("drop-before"));
}

function markMarkdownDirty() {
  state.markdownDirty = true;
  state.boardDirty = false;
  state.dirty = true;
  state.localRevision += 1;
  render();
}

function markDirty() {
  state.boardDirty = true;
  state.markdownDirty = false;
  state.dirty = true;
  state.localRevision += 1;
  syncMarkdown();
  render();
}

function markClean() {
  state.dirty = false;
  state.boardDirty = false;
  state.markdownDirty = false;
}

function setStatus(message) {
  els.statusText.textContent = message;
  if (state.statusTimer) window.clearTimeout(state.statusTimer);
  state.statusTimer = window.setTimeout(() => {
    els.statusText.textContent = state.dirty ? "Unsaved changes" : "Ready";
    state.statusTimer = null;
  }, 1200);
}

function priorityClass(priority) {
  return String(priority || "").toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("'", "&#39;");
}
