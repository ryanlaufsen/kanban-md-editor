import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseMarkdown, serializeMarkdown } from "../src/parser.js";

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

const duplicate = parseMarkdown("## Ready\n\n### TODO-001 - A\n\n- Status: Ready\n\n### TODO-001 - B\n\n- Status: Ready\n");
assert.equal(duplicate.diagnostics.some((item) => item.message.includes("Duplicate")), true);

console.log("parser tests passed");
