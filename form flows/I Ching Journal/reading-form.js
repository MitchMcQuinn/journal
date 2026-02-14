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
// (JSON array string or comma-separated line numbers) and mark each
// line container with data-line="1"..."6".
const applyChangingLines = () => {
  const changingLinesEl = document.querySelector("[data-variable='changing_lines']");
  const rawValue = changingLinesEl ? changingLinesEl.textContent : "";
  const lineValues = parseChangingLines(rawValue);
  const allowed = new Set(lineValues);

  document.querySelectorAll("[data-line]").forEach((groupEl) => {
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

// Batch UI updates that depend on hydrated data.
const scheduleApply = () => {
  requestAnimationFrame(() => {
    applyChangingLines();
    applyCastingTypeVisibility();
  });
};

// Read state from localStorage (scoped to this flow's storage key).
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

// Populate note textareas from state.variables (for edit mode).
// The endpoint returns notes as top-level keys (e.g., casting_notes, primary_hexagram_notes),
// which get stored in state.variables. This function copies them into the corresponding textareas.
const populateNoteFieldsFromVariables = () => {
  const state = getStoredState();
  document.querySelectorAll(".note-field").forEach((field) => {
    const fieldName = field.getAttribute("name");
    if (!fieldName) {
      return;
    }
    // Check if this field name exists in variables (from endpoint response).
    if (Object.prototype.hasOwnProperty.call(state.variables, fieldName)) {
      field.value = String(state.variables[fieldName] || "");
    }
  });
};

// Show note fields that already have content (for edit mode).
const showPopulatedNoteFields = () => {
  document.querySelectorAll(".note-field").forEach((field) => {
    const value = field.value ? field.value.trim() : "";
    if (value) {
      field.removeAttribute("hidden");
      autoResizeField(field);
    }
  });
};

// Initial setup: apply line visibility / casting type and size note fields.
document.addEventListener("DOMContentLoaded", () => {
  scheduleApply();
  // Populate note fields from variables (for edit mode) before sizing.
  populateNoteFieldsFromVariables();
  document.querySelectorAll(".note-field").forEach((field) => {
    autoResizeField(field);
  });
  // Show fields with content after hydration (for edit mode).
  requestAnimationFrame(() => {
    showPopulatedNoteFields();
  });
});
// Re-apply state-driven updates once variables are hydrated by app.js.
document.addEventListener("n8n:hydrated", () => {
  scheduleApply();
  // Populate note fields from variables (for edit mode) after hydration.
  populateNoteFieldsFromVariables();
  document.querySelectorAll(".note-field").forEach((field) => {
    autoResizeField(field);
  });
  // Show fields with content after hydration (for edit mode).
  showPopulatedNoteFields();
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

// Resize textareas as the user types.
document.addEventListener("input", (event) => {
  const field = event.target;
  if (!field.classList || !field.classList.contains("note-field")) {
    return;
  }
  autoResizeField(field);
});
