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

When served locally, the app opens `TODO.md`/`todo.md` from the project root if present and auto-refreshes it every two seconds when the file changes. Auto-refresh also works for files opened through the browser File System Access picker, and pauses while the board has unsaved local edits.

## Verify

```bash
npm test
```

## Examples

- `examples/agent-designer-todo.md`: source board matching the Agent Designer TODO style.
- `examples/agent-designer-after-move.md`: expected Markdown after moving `TODO-002` to `In Progress`.
- `examples/operations-rich.md`: richer board with all columns populated.
- `examples/operations-after-edit.md`: expected Markdown after moving `TODO-011` to `In Progress`.
