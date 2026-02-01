const CONFIG_PATH = "config.json";

const setError = (message) => {
  const errorEl = document.querySelector("[data-error]");
  if (errorEl) {
    errorEl.textContent = message;
  }
};

const loadConfig = async () => {
  const response = await fetch(CONFIG_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load config.json");
  }
  return response.json();
};

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

const unwrapResponse = (response) => {
  let resolved = Array.isArray(response) ? response[0] : response;
  if (resolved && typeof resolved === "object" && resolved.json) {
    resolved = resolved.json;
  }
  return resolved && typeof resolved === "object" ? resolved : {};
};

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

const normalizeTitle = (item) => {
  if (typeof item === "string") {
    return { title: item, id: item };
  }
  if (item && typeof item === "object") {
    const title = item.title || item.name || item.label || item.id || "Untitled";
    const id = item.id || title;
    return { title, id, raw: item };
  }
  return { title: "Untitled", id: String(item) };
};

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
    button.textContent = normalized.title;
    button.setAttribute("data-archive-title", normalized.title);
    button.setAttribute("data-archive-id", normalized.id);
    button.addEventListener("click", () => {
      loadArchiveEntry({ title: normalized.title, id: normalized.id });
    });
    li.appendChild(button);
    listEl.appendChild(li);
  });
};

const extractEntryData = (payload) => {
  return payload.entry || payload.casting || payload.data || payload.details || payload;
};

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
    variables: payload.variables || {},
    form,
    initialized: true,
  };
  localStorage.setItem("n8nFormDemoState", JSON.stringify(state));
};

const loadArchiveList = async () => {
  const config = await loadConfig();
  const webhookUrl = config.initialization?.webhook_url;
  if (!webhookUrl) {
    throw new Error("Initialization webhook_url is missing in config.json");
  }

  const response = await postJson(webhookUrl, {
    variables: {
      flow: "i-ching-journal",
      step: "archive",
      archive: true,
    },
    form: {},
  });

  const payload = unwrapResponse(response);
  const titles = findTitles(payload);
  renderTitles(titles);
};

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

document.addEventListener("DOMContentLoaded", async () => {
  try {
    await loadArchiveList();
  } catch (error) {
    setError(error.message || "Unable to load archive.");
  }
});
