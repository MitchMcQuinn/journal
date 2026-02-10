(() => {
const CONFIG_PATH = "config.json"; // Same folder; keeps flow config co-located.

// Display an error message in the archive page UI.
const setError = (message) => {
  const errorEl = document.querySelector("[data-error]");
  if (errorEl) {
    errorEl.textContent = message;
  }
};

// Fetch the flow config so we can read the webhook URL.
const loadConfig = async () => {
  const response = await fetch(CONFIG_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load config.json");
  }
  return response.json();
};

// POST JSON payloads to the n8n webhook and return parsed JSON.
const postJson = async (url, payload) => {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }
  const text = await response.text();
  if (!text) {
    return {};
  }
  return JSON.parse(text);
};

// Normalize n8n webhook responses into a plain object.
// Supports arrays and `{ json: {...} }` wrappers.
const unwrapResponse = (response) => {
  let resolved = Array.isArray(response) ? response[0] : response;
  if (resolved && typeof resolved === "object" && resolved.json) {
    resolved = resolved.json;
  }
  return resolved && typeof resolved === "object" ? resolved : {};
};

// Locate the list of archive titles in common response shapes.
// Accepts `{ Titles: { titles: [...] } }` or other array-like keys.
const findTitles = (data) => {
  if (data.Titles && Array.isArray(data.Titles.titles)) {
    return data.Titles.titles;
  }
  const candidates = [
    data.titles,
    data.archive_titles,
    data.items,
    data.entries,
    data.results,
  ];
  const list = candidates.find((entry) => Array.isArray(entry));
  if (!list) {
    return [];
  }
  return list;
};

// Convert a title entry into a `{ title, id, subtitle }` object for rendering.
// Accepts strings or objects with title/name/label/id/subtitle.
const normalizeTitle = (item) => {
  if (typeof item === "string") {
    return { title: item, id: item, subtitle: "" };
  }
  if (item && typeof item === "object") {
    const title = item.title || item.name || item.label || item.id || "Untitled";
    const id = item.id || title;
    const subtitle = item.subtitle || item.sub_title || item.subTitle || "";
    return { title, id, subtitle, raw: item };
  }
  return { title: "Untitled", id: String(item), subtitle: "" };
};

// Render the list of titles and wire click handlers for selection.
const renderTitles = (titles) => {
  const listEl = document.querySelector("[data-archive-list]");
  if (!listEl) {
    return;
  }
  listEl.innerHTML = "";

  titles.forEach((item) => {
    const normalized = normalizeTitle(item);
    const li = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "archive-item";
    button.setAttribute("data-archive-title", normalized.title);
    button.setAttribute("data-archive-id", normalized.id);
    button.addEventListener("click", () => {
      loadArchiveEntry({ title: normalized.title, id: normalized.id });
    });

    const title = document.createElement("span");
    title.className = "archive-item-title";
    title.textContent = normalized.title;
    button.appendChild(title);

    if (normalized.subtitle) {
      const subtitle = document.createElement("span");
      subtitle.className = "archive-item-subtitle";
      subtitle.textContent = normalized.subtitle;
      button.appendChild(subtitle);
    }

    li.appendChild(button);
    listEl.appendChild(li);
  });
};

// Pull the casting data out of common payload shapes.
const extractEntryData = (payload) => {
  return payload.entry || payload.casting || payload.data || payload.details || payload;
};

// Store the selected entry in localStorage so summary.html can hydrate.
// It writes both variables and form data into the shared state blob.
const storeArchiveEntry = (payload) => {
  const data = extractEntryData(payload);
  const form = {};
  Object.keys(data).forEach((key) => {
    const value = data[key];
    if (typeof value === "object" && value !== null) {
      return;
    }
    form[key] = value;
  });
  const state = {
    variables: {
      ...(payload.variables || {}),
      ...data,
    },
    form,
    initialized: true,
  };
  localStorage.setItem("n8nFormDemoState", JSON.stringify(state));
};

// Request the archive list from the webhook and render it.
const loadArchiveList = async () => {
  const config = await loadConfig();
  const webhookUrl = config.initialization?.webhook_url;
  if (!webhookUrl) {
    throw new Error("Initialization webhook_url is missing in config.json");
  }

  const baseVariables = config.initialization?.request_variables || {};
  const response = await postJson(webhookUrl, {
    variables: {
      ...baseVariables,
      flow: baseVariables.flow || "i-ching-journal",
      step: "archive",
      archive: true,
    },
    form: {},
  });

  const payload = unwrapResponse(response);
  const titles = findTitles(payload);
  renderTitles(titles);
  document.dispatchEvent(new CustomEvent("page:data-ready"));
};

// Request one archive entry from the webhook, then redirect to summary.
const loadArchiveEntry = async ({ title, id }) => {
  const config = await loadConfig();
  const webhookUrl = config.initialization?.webhook_url;
  if (!webhookUrl) {
    throw new Error("Initialization webhook_url is missing in config.json");
  }

  const response = await postJson(webhookUrl, {
    variables: {
      flow: "i-ching-journal",
      step: "archive-selection",
      title,
      id,
    },
    form: {},
  });

  const payload = unwrapResponse(response);
  storeArchiveEntry(payload);
  window.location.href = "summary.html";
};

// Kick off loading once the DOM is ready.
document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadArchiveList();
  } catch (error) {
    setError(error.message || "Unable to load archive.");
  }
});
})();