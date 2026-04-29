# Kanban Markdown Editor

A lightweight, zero-dependency Kanban editor for agent-readable `TODO.md` files.

## Format

- Columns are level-two headings: `## Ready`.
- Cards are level-three headings: `### TODO-001 - Short Title`.
- Card metadata uses these exact keys:
  - `Status`
  - `Priority`
  - `Owner`
  - `Conflict risk`
  - `Last updated`
- Card body is normal Markdown until the next `### TODO-` card or `##` column.
- Sections wrapped in HTML comments are ignored by the board.

Dragging a card into another column updates the card's `Status` and `Last updated` fields.

## Run

Open `index.html` directly in a browser, or use the tiny local server:

```bash
npm run serve
```

Then open `http://localhost:4173`.

When served locally, the app opens `TODO.md`/`todo.md` from the project root if present and checks it for changes every two seconds. Clean boards update automatically in both the Kanban view and Markdown pane when agents write the file.

Auto-refresh pauses instead of overwriting local edits while a card dialog is open, a drag is active, or the board/Markdown pane has unsaved changes. The toolbar shows the current refresh state, including `Watching`, `Paused`, `Snapshot only`, and permission or missing-file errors.

Files opened through the browser File System Access picker can also refresh while permission remains valid. The fallback file input and direct `file://` usage are snapshot-only; use `npm run serve` for root `TODO.md` polling.

## Verify

```bash
npm test
```

## Examples

- `examples/agent-designer-todo.md`: source board matching the Agent Designer TODO style.
- `examples/agent-designer-after-move.md`: expected Markdown after moving `TODO-002` to `In Progress`.
- `examples/operations-rich.md`: richer board with all columns populated.
- `examples/operations-after-edit.md`: expected Markdown after moving `TODO-011` to `In Progress`.
