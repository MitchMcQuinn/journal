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

  document.querySelectorAll(".line-item[data-line]").forEach((lineEl) => {
    const lineNumber = lineEl.getAttribute("data-line");
    const shouldShow = allowed.has(lineNumber);
    lineEl.hidden = !shouldShow;
    const noteField = lineEl.nextElementSibling;
    if (noteField && noteField.classList.contains("note-field")) {
      noteField.hidden = !shouldShow;
    }
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

const scheduleApply = () => {
  requestAnimationFrame(() => {
    applyChangingLines();
  });
};

document.addEventListener("DOMContentLoaded", scheduleApply);
document.addEventListener("n8n:hydrated", scheduleApply);

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

document.addEventListener("input", (event) => {
  const field = event.target;
  if (!field.classList || !field.classList.contains("note-field")) {
    return;
  }
  autoResizeField(field);
});

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".note-field").forEach((field) => {
    autoResizeField(field);
  });
});
