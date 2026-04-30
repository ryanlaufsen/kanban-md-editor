const CARD_ID_PATTERN = "[A-Za-z]{1,4}-\\d+";
const CARD_ID = /^([A-Za-z]{1,4})-(\d+)$/;
const CARD_HEADING = new RegExp(`^###\\s+(${CARD_ID_PATTERN})\\s+-\\s+(.+?)\\s*$`);
const COLUMN_HEADING = /^##\s+(.+?)\s*$/;
const METADATA_ORDER = ["Status", "Priority", "Owner", "Conflict risk", "Last updated"];
const DEFAULT_METADATA = {
  Status: "Inbox",
  Priority: "Medium",
  Owner: "Unassigned",
  "Conflict risk": "Low",
  "Last updated": "2026-04-29"
};

export function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export function createEmptyBoard() {
  return {
    title: "TODO",
    preamble: "# TODO\n\n",
    columns: [
      { name: "Inbox", intro: "", cards: [] },
      { name: "Ready", intro: "", cards: [] },
      { name: "In Progress", intro: "", cards: [] },
      { name: "Blocked", intro: "", cards: [] },
      { name: "Done", intro: "", cards: [] }
    ],
    trailing: "",
    diagnostics: []
  };
}

export function parseMarkdown(markdown) {
  const text = stripHtmlComments(String(markdown ?? "").replace(/\r\n/g, "\n"));
  const lines = text.split("\n");
  const board = { title: "TODO", preamble: "", columns: [], trailing: "", diagnostics: [] };
  const ids = new Set();
  let cursor = 0;

  while (cursor < lines.length && !COLUMN_HEADING.test(lines[cursor])) {
    board.preamble += lines[cursor] + (cursor < lines.length - 1 ? "\n" : "");
    const titleMatch = /^#\s+(.+?)\s*$/.exec(lines[cursor]);
    if (titleMatch) board.title = titleMatch[1];
    cursor += 1;
  }

  while (cursor < lines.length) {
    const columnMatch = COLUMN_HEADING.exec(lines[cursor]);
    if (!columnMatch) {
      board.trailing += lines[cursor] + (cursor < lines.length - 1 ? "\n" : "");
      cursor += 1;
      continue;
    }

    const column = { name: columnMatch[1], intro: "", cards: [] };
    board.columns.push(column);
    cursor += 1;

    while (cursor < lines.length && !COLUMN_HEADING.test(lines[cursor])) {
      const cardMatch = CARD_HEADING.exec(lines[cursor]);
      if (!cardMatch) {
        column.intro += lines[cursor] + "\n";
        cursor += 1;
        continue;
      }

      const cardStartLine = cursor + 1;
      const id = cardMatch[1];
      if (ids.has(id)) {
        board.diagnostics.push({ type: "error", line: cardStartLine, message: `Duplicate card id ${id}.` });
      }
      ids.add(id);

      const card = {
        id,
        title: cardMatch[2],
        metadata: { ...DEFAULT_METADATA, Status: column.name, "Last updated": todayIso() },
        extraMetadata: [],
        body: "",
        line: cardStartLine
      };
      cursor += 1;

      while (cursor < lines.length && isBlank(lines[cursor]) && !COLUMN_HEADING.test(lines[cursor]) && !CARD_HEADING.test(lines[cursor])) {
        cursor += 1;
      }

      while (cursor < lines.length && !COLUMN_HEADING.test(lines[cursor]) && !CARD_HEADING.test(lines[cursor])) {
        const metadataMatch = /^-\s+([^:]+):\s*(.*)\s*$/.exec(lines[cursor]);
        if (!metadataMatch) break;

        const key = metadataMatch[1].trim();
        const value = metadataMatch[2].trim();
        if (METADATA_ORDER.includes(key)) {
          card.metadata[key] = value || DEFAULT_METADATA[key];
          if (key === "Last updated" && value && !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            board.diagnostics.push({ type: "warning", line: cursor + 1, message: `${id} has non-ISO Last updated value.` });
          }
        } else {
          card.extraMetadata.push({ key, value });
          board.diagnostics.push({ type: "warning", line: cursor + 1, message: `${id} has nonstandard metadata key "${key}".` });
        }
        cursor += 1;
      }

      while (cursor < lines.length && isBlank(lines[cursor]) && !COLUMN_HEADING.test(lines[cursor]) && !CARD_HEADING.test(lines[cursor])) {
        cursor += 1;
      }

      while (cursor < lines.length && !COLUMN_HEADING.test(lines[cursor]) && !CARD_HEADING.test(lines[cursor])) {
        card.body += lines[cursor] + "\n";
        cursor += 1;
      }

      for (const key of METADATA_ORDER) {
        if (!card.metadata[key]) {
          card.metadata[key] = key === "Status" ? column.name : DEFAULT_METADATA[key];
          board.diagnostics.push({ type: "warning", line: card.line, message: `${id} missing ${key}; using ${card.metadata[key]}.` });
        }
      }

      if (card.metadata.Status !== column.name) {
        board.diagnostics.push({ type: "warning", line: card.line, message: `${id} status "${card.metadata.Status}" differs from column "${column.name}".` });
        card.metadata.Status = column.name;
      }

      card.body = trimTrailingBlankLines(card.body);
      column.cards.push(card);
    }
  }

  if (!board.columns.length) {
    const empty = createEmptyBoard();
    empty.preamble = board.preamble || empty.preamble;
    empty.diagnostics.push({ type: "warning", line: 1, message: "No columns found; created a default board." });
    return empty;
  }

  return board;
}

function stripHtmlComments(markdown) {
  let result = "";
  let cursor = 0;

  while (cursor < markdown.length) {
    const start = markdown.indexOf("<!--", cursor);
    if (start === -1) {
      result += markdown.slice(cursor);
      break;
    }

    result += markdown.slice(cursor, start);
    const end = markdown.indexOf("-->", start + 4);
    if (end === -1) {
      result += preserveLineBreaks(markdown.slice(start));
      break;
    }

    result += preserveLineBreaks(markdown.slice(start, end + 3));
    cursor = end + 3;
  }

  return result;
}

function preserveLineBreaks(text) {
  return text.replace(/[^\n]/g, "");
}

function isBlank(line) {
  return /^\s*$/.test(line);
}

function trimTrailingBlankLines(text) {
  return text.replace(/\n+$/g, "");
}

export function serializeMarkdown(board) {
  const chunks = [];
  const preamble = (board.preamble || `# ${board.title || "TODO"}\n\n`).replace(/\s*$/u, "\n\n");
  chunks.push(preamble);

  board.columns.forEach((column, columnIndex) => {
    chunks.push(`## ${column.name}\n\n`);
    const intro = normalizeColumnIntro(column.intro, column.cards.length);
    if (intro) chunks.push(`${intro}\n\n`);

    column.cards.forEach((card, cardIndex) => {
      const metadata = normalizeMetadata(card.metadata, column.name);
      chunks.push(`### ${card.id} - ${card.title.trim() || "Untitled"}\n\n`);
      for (const key of METADATA_ORDER) {
        chunks.push(`- ${key}: ${metadata[key]}\n`);
      }
      for (const item of card.extraMetadata || []) {
        chunks.push(`- ${item.key}: ${item.value}\n`);
      }
      const body = trimTrailingBlankLines(card.body || "");
      if (body) chunks.push(`\n${body}\n`);
      if (cardIndex < column.cards.length - 1) chunks.push("\n");
    });

    if (!column.cards.length && !intro) chunks.push("- None.\n");

    if (columnIndex < board.columns.length - 1) chunks.push("\n");
  });

  const trailing = (board.trailing || "").trim();
  if (trailing) chunks.push(`\n${trailing}\n`);
  return chunks.join("").replace(/\n{3,}(?=##\s)/g, "\n\n").trimEnd() + "\n";
}

function normalizeColumnIntro(intro, cardCount) {
  const trimmed = (intro || "").trim();
  if (trimmed === "- None.") return cardCount ? "" : "- None.";
  return trimmed;
}

export function normalizeMetadata(metadata, status) {
  return {
    ...DEFAULT_METADATA,
    ...metadata,
    Status: status || metadata?.Status || DEFAULT_METADATA.Status
  };
}

export function getNextTodoId(board) {
  const series = new Map();
  let order = 0;

  for (const column of board.columns) {
    for (const card of column.cards) {
      const match = CARD_ID.exec(card.id);
      if (!match) continue;

      const [, prefix, digits] = match;
      const value = BigInt(digits);
      if (!series.has(prefix)) {
        series.set(prefix, { count: 0, max: value, width: digits.length, order });
        order += 1;
      }

      const item = series.get(prefix);
      item.count += 1;
      if (value > item.max || (value === item.max && digits.length > item.width)) {
        item.max = value;
        item.width = digits.length;
      }
    }
  }

  let selectedPrefix = "TODO";
  let selected = { count: 0, max: 0n, width: 3, order: Number.MAX_SAFE_INTEGER };
  for (const [prefix, item] of series) {
    if (item.count > selected.count || (item.count === selected.count && item.order < selected.order)) {
      selectedPrefix = prefix;
      selected = item;
    }
  }

  return `${selectedPrefix}-${String(selected.max + 1n).padStart(selected.width, "0")}`;
}

export function createCard(board, columnName) {
  return {
    id: getNextTodoId(board),
    title: "New Task",
    metadata: {
      Status: columnName,
      Priority: "Medium",
      Owner: "Unassigned",
      "Conflict risk": "Low",
      "Last updated": todayIso()
    },
    extraMetadata: [],
    body: "Summary:\n- Describe the outcome.\n\nAcceptance criteria:\n- Define the completion check.",
    line: 0
  };
}

export { METADATA_ORDER, DEFAULT_METADATA };
