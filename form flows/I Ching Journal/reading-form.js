// Normalize changing lines from API into a clean array of line numbers.
// Accepts JSON arrays (e.g. ["3","6"]) or comma-separated strings ("3, 6").
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
  const typeInput = document.querySelector('input[name="casting_type"]');
  const variableValue = variableEl ? variableEl.textContent.trim() : "";
  const formValue = formEl ? formEl.textContent.trim() : "";
  const inputValue = typeInput ? String(typeInput.value || "").trim() : "";
  const castingType = (variableValue || formValue || inputValue).toLowerCase();
  const isStatic = castingType === "static";
  document.querySelectorAll("[transitioning-element]").forEach((el) => {
    el.hidden = isStatic;
  });
};

// Hide or show each line group based on the changing_lines array.
// To use: render a hidden element with data-variable="changing_lines"
// (JSON array string or comma-separated line numbers).
const applyChangingLines = () => {
  const changingLinesEl = document.querySelector("[data-variable='changing_lines']");
  const rawValue = changingLinesEl ? changingLinesEl.textContent : "";
  const lineValues = parseChangingLines(rawValue);
  const allowed = new Set(lineValues);

  document.querySelectorAll(".note-tabs[data-line]").forEach((groupEl) => {
    const lineNumber = groupEl.getAttribute("data-line");
    const shouldShow = allowed.has(lineNumber);
    groupEl.hidden = !shouldShow;
  });
};


// Close any note inputs that are still empty to reduce visual clutter.
const closeEmptyNoteFields = () => {
  document.querySelectorAll(".note-field").forEach((field) => {
    const value = field.value ? field.value.trim() : "";
    if (!value) {
      field.setAttribute("hidden", "");
    }
  });
};

// Auto-resize textareas to fit their content.
const autoResizeField = (field) => {
  if (!field) {
    return;
  }
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
};

// Toggle a note field open; close other empty note fields first.
// To use: place a textarea.note-field immediately after each .note-section.
const toggleNoteField = (sectionEl) => {
  const noteField = sectionEl.nextElementSibling;
  if (!noteField || !noteField.classList.contains("note-field")) {
    return;
  }
  const isHidden = noteField.hasAttribute("hidden");
  closeEmptyNoteFields();
  if (isHidden) {
    noteField.removeAttribute("hidden");
    noteField.focus();
    autoResizeField(noteField);
  }
};

// Read the shared state that app.js stores in localStorage.
const getStoredState = () => {
  try {
    const raw = localStorage.getItem("n8nFormDemoState");
    if (!raw) {
      return { variables: {}, form: {} };
    }
    const parsed = JSON.parse(raw);
    return {
      variables: parsed.variables || {},
      form: parsed.form || {},
    };
  } catch (error) {
    return { variables: {}, form: {} };
  }
};

// Wrap each note section into a tab group with Reading + Reference panels.
// To use: ensure each .note-section has data-note="key" and a following
// textarea.note-field. Hidden inputs with name="reference_<key>" should exist.
const buildTabGroup = (sectionEl, index) => {
  const noteField = sectionEl.nextElementSibling;
  if (!noteField || !noteField.classList.contains("note-field")) {
    return;
  }

  const sectionKey = sectionEl.getAttribute("data-note") || `section-${index}`;
  const normalizedSectionKey = sectionKey.replace(/-/g, "_");
  const referenceKey = `reference_${normalizedSectionKey}`;

  const group = document.createElement("div");
  group.className = "note-tabs";
  if (sectionEl.getAttribute("data-line")) {
    group.setAttribute("data-line", sectionEl.getAttribute("data-line"));
  }

  const readingPanel = document.createElement("div");
  readingPanel.className = "tab-panel";
  readingPanel.setAttribute("data-tab-panel", "reading");

  const referencePanel = document.createElement("div");
  referencePanel.className = "tab-panel";
  referencePanel.setAttribute("data-tab-panel", "reference");
  referencePanel.setAttribute("hidden", "");

  const referenceDisplay = document.createElement("div");
  referenceDisplay.className = "reference-display";
  referenceDisplay.setAttribute("data-reference-display", normalizedSectionKey);

  const referenceField = document.createElement("textarea");
  referenceField.className = "reference-field";
  referenceField.setAttribute("placeholder", "add notes here");
  referenceField.setAttribute("data-reference-section", normalizedSectionKey);
  referenceField.setAttribute("hidden", "");

  const referenceState = getStoredState();
  const referenceValue = referenceState.variables[referenceKey];
  if (referenceValue) {
    referenceField.value = String(referenceValue);
  }
  referenceDisplay.textContent =
    referenceField.value || referenceField.getAttribute("placeholder") || "";

  referencePanel.append(referenceDisplay, referenceField);

  group.append(readingPanel, referencePanel);

  sectionEl.parentNode.insertBefore(group, sectionEl);
  readingPanel.append(sectionEl, noteField);
};

// Build tab groups for all note sections except ones explicitly skipped.
// To use: update skipNotes to exclude sections that should not show reference tabs.
const initTabs = () => {
  const sections = Array.from(document.querySelectorAll(".note-section"));
  const skipNotes = new Set(["casting", "question-1", "question-2", "question-3"]);
  sections.forEach((section, index) => {
    const noteKey = section.getAttribute("data-note");
    if (noteKey && skipNotes.has(noteKey)) {
      return;
    }
    buildTabGroup(section, index);
  });
};

// Toggle all tab panels between Reading and Reference globally.
// To use: include .global-tabs buttons with data-global-tab="reading|reference".
const setGlobalTab = (mode) => {
  const isReference = mode === "reference";
  document.querySelectorAll(".global-tabs .tab-button").forEach((button) => {
    button.classList.toggle(
      "is-active",
      button.getAttribute("data-global-tab") === mode,
    );
  });
  document.querySelectorAll("[data-tab-panel='reading']").forEach((panel) => {
    panel.toggleAttribute("hidden", isReference);
  });
  document.querySelectorAll("[data-tab-panel='reference']").forEach((panel) => {
    panel.toggleAttribute("hidden", !isReference);
  });
  const visiblePanels = document.querySelectorAll("[data-tab-panel]:not([hidden])");
  visiblePanels.forEach((panel) => {
    panel.querySelectorAll("textarea").forEach((field) => {
      autoResizeField(field);
    });
  });
};

// Populate reference inputs from stored variables.
// To use: store reference_<key> values in localStorage under n8nFormDemoState.variables.
const updateReferenceFieldsFromState = () => {
  const referenceState = getStoredState();
  document.querySelectorAll(".reference-field").forEach((field) => {
    const sectionKey = field.getAttribute("data-reference-section");
    if (!sectionKey) {
      return;
    }
    const referenceKey = `reference_${sectionKey}`;
    const storedValue = referenceState.variables[referenceKey];
    if (typeof storedValue === "string" || typeof storedValue === "number") {
      field.value = String(storedValue);
    }
    const display = document.querySelector(
      `[data-reference-display="${sectionKey}"]`,
    );
    if (display) {
      display.textContent = field.value || field.getAttribute("placeholder") || "";
    }
  });
};

// Sync reference textareas into hidden form inputs for submission.
// To use: add hidden inputs with data-reference-field and name="reference_<key>".
const syncReferenceFields = () => {
  document.querySelectorAll(".reference-field").forEach((field) => {
    const sectionKey = field.getAttribute("data-reference-section");
    if (!sectionKey) {
      return;
    }
    const hiddenInput = document.querySelector(
      `[data-reference-field][name="reference_${sectionKey}"]`,
    );
    if (!hiddenInput) {
      return;
    }
    hiddenInput.value = field.value || "";
  });
};

// Batch UI updates that depend on hydrated data.
const scheduleApply = () => {
  requestAnimationFrame(() => {
    applyChangingLines();
    applyCastingTypeVisibility();
  });
};

// Initial setup: build tabs, populate reference fields, show Reading view.
document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  updateReferenceFieldsFromState();
  syncReferenceFields();
  setGlobalTab("reading");
  scheduleApply();
});
// Re-apply state-driven updates once variables are hydrated by app.js.
document.addEventListener("n8n:hydrated", () => {
  updateReferenceFieldsFromState();
  syncReferenceFields();
  setGlobalTab("reading");
  scheduleApply();
});

// Clicking a reading section opens its note field (if present).
document.addEventListener("click", (event) => {
  if (event.target.closest(".note-field")) {
    return;
  }
  const section = event.target.closest(".note-section");
  if (!section) {
    return;
  }
  toggleNoteField(section);
});

// Global tab toggle (Reading/Reference).
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-global-tab]");
  if (!button) {
    return;
  }
  setGlobalTab(button.getAttribute("data-global-tab"));
});

// Clicking the reference display swaps it into an editable textarea.
// To use: render a .reference-display element paired with a hidden
// textarea.reference-field that shares the same data-reference-section value.
document.addEventListener("click", (event) => {
  const display = event.target.closest(".reference-display");
  if (!display) {
    return;
  }
  const sectionKey = display.getAttribute("data-reference-display");
  const field = sectionKey
    ? document.querySelector(`.reference-field[data-reference-section="${sectionKey}"]`)
    : null;
  if (!field) {
    return;
  }
  display.setAttribute("hidden", "");
  field.removeAttribute("hidden");
  field.focus();
  autoResizeField(field);
});

// Resize textareas as the user types and keep hidden inputs in sync.
document.addEventListener("input", (event) => {
  const field = event.target;
  if (
    !field.classList ||
    (!field.classList.contains("note-field") &&
      !field.classList.contains("reference-field"))
  ) {
    return;
  }
  autoResizeField(field);
  if (field.classList.contains("reference-field")) {
    syncReferenceFields();
    const sectionKey = field.getAttribute("data-reference-section");
    const display = sectionKey
      ? document.querySelector(`[data-reference-display="${sectionKey}"]`)
      : null;
    if (display) {
      display.textContent = field.value || field.getAttribute("placeholder") || "";
    }
  }
});

// When leaving a reference textarea, collapse back to static display.
document.addEventListener(
  "blur",
  (event) => {
    const field = event.target;
    if (!field.classList || !field.classList.contains("reference-field")) {
      return;
    }
    const sectionKey = field.getAttribute("data-reference-section");
    const display = sectionKey
      ? document.querySelector(`[data-reference-display="${sectionKey}"]`)
      : null;
    if (!display) {
      return;
    }
    field.setAttribute("hidden", "");
    display.removeAttribute("hidden");
  },
  true,
);

// Ensure all visible textareas are sized correctly after layout.
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".note-field, .reference-field").forEach((field) => {
    autoResizeField(field);
  });
  syncReferenceFields();
});

// Re-size textareas when hydrated content arrives.
document.addEventListener("n8n:hydrated", () => {
  document.querySelectorAll(".note-field, .reference-field").forEach((field) => {
    autoResizeField(field);
  });
  syncReferenceFields();
});
