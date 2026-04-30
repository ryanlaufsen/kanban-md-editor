import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { getNextTodoId, parseMarkdown, serializeMarkdown } from "../src/parser.js";

const root = dirname(dirname(fileURLToPath(import.meta.url)));

const source = await readFile(join(root, "examples", "agent-designer-todo.md"), "utf8");
const board = parseMarkdown(source);

assert.equal(board.columns.length, 5);
assert.equal(board.columns[1].name, "Ready");
assert.equal(board.columns[1].cards.length, 2);
assert.equal(board.columns[1].cards[0].id, "TODO-001");
assert.equal(board.columns[1].cards[0].metadata.Status, "Ready");

const [moved] = board.columns[1].cards.splice(1, 1);
board.columns[2].cards.push(moved);
moved.metadata.Status = board.columns[2].name;
moved.metadata["Last updated"] = "2026-04-29";

const expected = await readFile(join(root, "examples", "agent-designer-after-move.md"), "utf8");
assert.equal(serializeMarkdown(board), expected);

const rich = await readFile(join(root, "examples", "operations-rich.md"), "utf8");
const richBoard = parseMarkdown(rich);
assert.equal(richBoard.columns[3].cards[0].metadata.Status, "Blocked");
assert.equal(parseMarkdown(serializeMarkdown(richBoard)).columns[4].cards[0].id, "TODO-009");

const customIds = parseMarkdown(`## Ready

### AAAA-000 - Four Letter Prefix

- Status: Ready

### AAA-0000 - Three Letter Prefix

- Status: Ready

### AA-000000000 - Long Numeric Suffix

- Status: Ready

### A-7 - Single Letter Prefix

- Status: Ready
`);
assert.deepEqual(customIds.columns[0].cards.map((card) => card.id), ["AAAA-000", "AAA-0000", "AA-000000000", "A-7"]);
assert.equal(parseMarkdown(serializeMarkdown(customIds)).columns[0].cards[2].id, "AA-000000000");
assert.equal(getNextTodoId(customIds), "AAAA-001");

const longDigits = parseMarkdown(`## Ready

### AA-999999999999999999999999999999 - Huge ID

- Status: Ready
`);
assert.equal(getNextTodoId(longDigits), "AA-1000000000000000000000000000000");

const invalidPrefix = parseMarkdown("## Ready\n\n### ABCDE-001 - Too Long\n\n- Status: Ready\n");
assert.equal(invalidPrefix.columns[0].cards.length, 0);

const duplicate = parseMarkdown("## Ready\n\n### TODO-001 - A\n\n- Status: Ready\n\n### TODO-001 - B\n\n- Status: Ready\n");
assert.equal(duplicate.diagnostics.some((item) => item.message.includes("Duplicate")), true);

const duplicateCustom = parseMarkdown("## Ready\n\n### ABC-001 - A\n\n- Status: Ready\n\n### ABC-001 - B\n\n- Status: Ready\n");
assert.equal(duplicateCustom.diagnostics.some((item) => item.message.includes("Duplicate")), true);

const commentedCard = parseMarkdown(`# TODO

## Ready

<!--
### TODO-999 - Hidden Card

- Status: Ready
- Priority: High
- Owner: Hidden
- Conflict risk: High
- Last updated: 2026-04-29
-->

### TODO-001 - Visible Card

- Status: Ready
`);
assert.equal(commentedCard.columns[0].cards.length, 1);
assert.equal(commentedCard.columns[0].cards[0].id, "TODO-001");

const commentedColumn = parseMarkdown(`# TODO

## Ready

- None.

<!--
## Hidden

### TODO-999 - Hidden Card

- Status: Hidden
-->

## Done

- None.
`);
assert.deepEqual(commentedColumn.columns.map((column) => column.name), ["Ready", "Done"]);

console.log("parser tests passed");
