const trimNoteText = (text) => {
  if (!text) {
    return "";
  }
  const normalized = text.replace(/\u2014/g, "").replace(/—/g, "");
  return normalized.trim();
};

const hideEmptyLineNotes = () => {
  document.querySelectorAll(".summary-line").forEach((line) => {
    const noteEl = line.querySelector("[data-form]");
    const noteText = noteEl ? trimNoteText(noteEl.textContent) : "";
    line.hidden = noteText.length === 0;
  });
};

const hideEmptySummaryBlocks = () => {
  document.querySelectorAll("[data-summary-block]").forEach((block) => {
    const noteEl = block.querySelector("[data-form]");
    const noteText = noteEl ? trimNoteText(noteEl.textContent) : "";
    block.hidden = noteText.length === 0;
  });

  const linesBlock = document.querySelector("[data-summary-lines]");
  if (linesBlock) {
    const visibleLines = linesBlock.querySelectorAll(".summary-line:not([hidden])");
    linesBlock.hidden = visibleLines.length === 0;
  }
};

document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => {
    hideEmptyLineNotes();
    hideEmptySummaryBlocks();
  });
});

document.addEventListener("n8n:hydrated", () => {
  requestAnimationFrame(() => {
    hideEmptyLineNotes();
    hideEmptySummaryBlocks();
  });
});
