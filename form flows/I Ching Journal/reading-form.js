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

const closeEmptyNoteFields = () => {
  document.querySelectorAll(".note-field").forEach((field) => {
    const value = field.value ? field.value.trim() : "";
    if (!value) {
      field.setAttribute("hidden", "");
    }
  });
};

const autoResizeField = (field) => {
  if (!field) {
    return;
  }
  field.style.height = "auto";
  field.style.height = `${field.scrollHeight}px`;
};

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

  const menu = document.createElement("div");
  menu.className = "tab-menu";

  const readingButton = document.createElement("button");
  readingButton.type = "button";
  readingButton.className = "tab-button is-active";
  readingButton.setAttribute("data-tab-target", "reading");
  readingButton.textContent = "Reading";

  const referenceButton = document.createElement("button");
  referenceButton.type = "button";
  referenceButton.className = "tab-button";
  referenceButton.setAttribute("data-tab-target", "reference");
  referenceButton.textContent = "Reference";

  menu.append(readingButton, referenceButton);

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

  group.append(menu, readingPanel, referencePanel);

  sectionEl.parentNode.insertBefore(group, sectionEl);
  readingPanel.append(sectionEl, noteField);
};

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

const scheduleApply = () => {
  requestAnimationFrame(() => {
    applyChangingLines();
  });
};

document.addEventListener("DOMContentLoaded", () => {
  initTabs();
  updateReferenceFieldsFromState();
  syncReferenceFields();
  scheduleApply();
});
document.addEventListener("n8n:hydrated", () => {
  updateReferenceFieldsFromState();
  syncReferenceFields();
  scheduleApply();
});

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

document.addEventListener("click", (event) => {
  const button = event.target.closest(".tab-button");
  if (!button) {
    return;
  }
  const group = button.closest(".note-tabs");
  if (!group) {
    return;
  }
  const target = button.getAttribute("data-tab-target");
  group.querySelectorAll(".tab-button").forEach((btn) => {
    btn.classList.toggle("is-active", btn === button);
  });
  group.querySelectorAll("[data-tab-panel]").forEach((panel) => {
    const panelKey = panel.getAttribute("data-tab-panel");
    panel.toggleAttribute("hidden", panelKey !== target);
  });
  const activePanel = group.querySelector("[data-tab-panel]:not([hidden])");
  if (activePanel) {
    activePanel.querySelectorAll("textarea").forEach((field) => {
      autoResizeField(field);
    });
  }
});

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

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".note-field, .reference-field").forEach((field) => {
    autoResizeField(field);
  });
  syncReferenceFields();
});

document.addEventListener("n8n:hydrated", () => {
  document.querySelectorAll(".note-field, .reference-field").forEach((field) => {
    autoResizeField(field);
  });
  syncReferenceFields();
});
