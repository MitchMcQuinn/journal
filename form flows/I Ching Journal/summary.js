// Normalize note text so empty placeholders (em dashes) don't count as content.
const trimNoteText = (text) => {
  if (!text) {
    return "";
  }
  const normalized = text.replace(/\u2014/g, "").replace(/—/g, "");
  return normalized.trim();
};

const getBlockNoteText = (block, selector) => {
  if (!block) {
    return "";
  }
  const noteEl = block.querySelector(selector);
  return noteEl ? trimNoteText(noteEl.textContent) : "";
};

const parseChangingLines = (rawValue) => {
  if (!rawValue) {
    return [];
  }
  const trimmed = rawValue.trim();
  if (!trimmed) {
    return [];
  }
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean);
    }
  } catch (error) {
    // Fall back to comma-separated parsing.
  }
  return trimmed
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

// Hide elements marked as transitioning-only when casting_type is static.
const applyCastingTypeVisibility = () => {
  const variableEl = document.querySelector("[data-variable='casting_type']");
  const formEl = document.querySelector("[data-form='casting_type']");
  const variableValue = variableEl ? variableEl.textContent.trim() : "";
  const formValue = formEl ? formEl.textContent.trim() : "";
  const castingType = (variableValue || formValue).toLowerCase();
  const isStatic = castingType === "static";
  document.querySelectorAll("[transitioning-element]").forEach((el) => {
    el.hidden = isStatic;
  });
};

// Show only the changing lines inside the Reading tab.
const applyReadingLineFilter = () => {
  const changingLinesEl = document.querySelector(
    "[data-variable='changing_lines']",
  );
  const rawValue = changingLinesEl ? changingLinesEl.textContent : "";
  const allowed = new Set(parseChangingLines(rawValue));
  const readingPanel = document.querySelector('[data-summary-panel="reading"]');
  if (!readingPanel) {
    return;
  }
  readingPanel.querySelectorAll(".summary-line[data-line]").forEach((line) => {
    const lineNumber = line.getAttribute("data-line");
    line.hidden = !allowed.has(lineNumber);
  });
};

// Hide line note blocks that have no user content.
// Scoped to the notes tab lines so reading-tab lines are unaffected.
const hideEmptyLineNotes = () => {
  const notesLines = document.querySelectorAll("[data-summary-lines] .summary-line");
  notesLines.forEach((line) => {
    const noteText = getBlockNoteText(line, "[data-form]");
    line.hidden = noteText.length === 0;
  });
};

// Hide summary blocks when empty; show [unhide] content as a fallback.
// Also collapse the lines section if no line notes are visible.
const hideEmptySummaryBlocks = () => {
  document.querySelectorAll("[data-summary-block]").forEach((block) => {
    const noteEl = block.querySelector("[data-form]");
    const noteText = noteEl ? trimNoteText(noteEl.textContent) : "";
    const unhideEls = block.querySelectorAll("[unhide]");
    const childEls = Array.from(block.children);
    if (!noteText.length) {
      const hasUnhide = Boolean(block.querySelector("[unhide]"));
      block.hidden = !hasUnhide;
      unhideEls.forEach((el) => {
        el.hidden = false;
      });
      childEls.forEach((el) => {
        const keepVisible =
          el.hasAttribute("unhide") || Boolean(el.querySelector("[unhide]"));
        el.hidden = !keepVisible;
      });
      return;
    }
    block.hidden = false;
    unhideEls.forEach((el) => {
      el.hidden = true;
    });
    childEls.forEach((el) => {
      el.hidden = false;
    });
  });

  const linesBlock = document.querySelector("[data-summary-lines]");
  const linesEmptyBlock = document.querySelector("[data-summary-lines-empty]");
  if (linesBlock) {
    const visibleLines = linesBlock.querySelectorAll(".summary-line:not([hidden])");
    linesBlock.hidden = visibleLines.length === 0;
    if (linesEmptyBlock) {
      linesEmptyBlock.hidden = visibleLines.length !== 0;
    }
  }

  const questionsEmptyBlock = document.querySelector("[data-summary-questions-empty]");
  if (questionsEmptyBlock) {
    const questionBlocks = document.querySelectorAll(
      ".question_1_block, .question_2_block, .question_3_block",
    );
    const allEmpty = Array.from(questionBlocks).every((block) => {
      const noteText = getBlockNoteText(block, '[data-form$="_notes"]');
      return noteText.length === 0;
    });
    const childEls = Array.from(questionsEmptyBlock.children);
    questionsEmptyBlock.hidden = false;
    childEls.forEach((el) => {
      const hasUnhide = el.hasAttribute("unhide") || Boolean(el.querySelector("[unhide]"));
      if (allEmpty) {
        el.hidden = !hasUnhide;
      } else {
        el.hidden = hasUnhide;
      }
    });
  }
};

// Only show question blocks when a response note is present;
// show [unhide] content as a fallback when empty.
const hideEmptyQuestionBlocks = () => {
  document
    .querySelectorAll(".question_1_block, .question_2_block, .question_3_block")
    .forEach((block) => {
      const noteText = getBlockNoteText(block, '[data-form$="_notes"]');
      const unhideEls = block.querySelectorAll("[unhide]");
      const childEls = Array.from(block.children);
      if (!noteText.length) {
        const hasUnhide = Boolean(block.querySelector("[unhide]"));
        block.hidden = !hasUnhide;
        unhideEls.forEach((el) => {
          el.hidden = false;
        });
        childEls.forEach((el) => {
          const keepVisible =
            el.hasAttribute("unhide") || Boolean(el.querySelector("[unhide]"));
          el.hidden = !keepVisible;
        });
        return;
      }
      block.hidden = false;
      unhideEls.forEach((el) => {
        el.hidden = true;
      });
      childEls.forEach((el) => {
        el.hidden = false;
      });
    });
};

// Toggle between the Summary and Reading tabs.
const setSummaryTab = (mode) => {
  document.querySelectorAll("[data-summary-tab]").forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.getAttribute("data-summary-tab") === mode,
    );
  });
  document.querySelectorAll("[data-summary-panel]").forEach((panel) => {
    panel.toggleAttribute(
      "hidden",
      panel.getAttribute("data-summary-panel") !== mode,
    );
  });
};

// Initial setup: hide empty blocks and show the Summary tab.
document.addEventListener("DOMContentLoaded", () => {
  requestAnimationFrame(() => {
    hideEmptyLineNotes();
    hideEmptySummaryBlocks();
    hideEmptyQuestionBlocks();
    applyReadingLineFilter();
    applyCastingTypeVisibility();
  });
  setSummaryTab("notes");
});

// Re-apply visibility and tab state after hydration.
document.addEventListener("n8n:hydrated", () => {
  requestAnimationFrame(() => {
    hideEmptyLineNotes();
    hideEmptySummaryBlocks();
    hideEmptyQuestionBlocks();
    applyReadingLineFilter();
    applyCastingTypeVisibility();
  });
  setSummaryTab("notes");
});

// Handle tab button clicks.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-summary-tab]");
  if (!button) {
    return;
  }
  setSummaryTab(button.getAttribute("data-summary-tab"));
});

// Handle "Edit" button: redirect back to reading-form with casting_id and step query params.
// The step parameter tells app.js to use "reading-form" instead of the default "init" step
// when initializing the page, so the endpoint knows to load existing casting data.
document.addEventListener("click", (event) => {
  const editButton = event.target.closest("[data-edit-casting]");
  if (!editButton) {
    return;
  }
  const idEl = document.querySelector("[data-variable='id']");
  const castingId = idEl ? idEl.textContent.trim() : "";
  if (!castingId) {
    return;
  }
  // Check for optional step override from button attribute.
  const stepOverride = editButton.getAttribute("data-step-override");
  if (typeof clearState === "function") {
    clearState();
  }
  const url = new URL("reading-form.html", window.location.href);
  url.searchParams.set("casting_id", castingId);
  if (stepOverride) {
    url.searchParams.set("step", stepOverride);
  }
  window.location.href = url.toString();
});
