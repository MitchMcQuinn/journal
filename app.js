const CONFIG_PATH = "config.json";
const STORAGE_KEY = "n8nFormDemoState";
let isBusy = false;
const DEFAULT_STATUS_MESSAGE = "Waiting for response...";

const defaultState = () => ({ variables: {}, form: {} });

const readState = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return defaultState();
    }
    const parsed = JSON.parse(raw);
    return {
      variables: parsed.variables || {},
      form: parsed.form || {},
    };
  } catch (error) {
    return defaultState();
  }
};

const writeState = (state) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const mergeVariables = (state, variables) => {
  if (!variables || typeof variables !== "object") {
    return state;
  }
  return {
    ...state,
    variables: {
      ...state.variables,
      ...variables,
    },
  };
};

const normalizeResponseVariables = (response) => {
  if (!response || typeof response !== "object") {
    return {};
  }

  if (response.variables && typeof response.variables === "object") {
    return response.variables;
  }

  const collected = {};
  if (typeof response.variables === "string") {
    collected.message = response.variables;
  }

  Object.keys(response).forEach((key) => {
    if (key === "next_step" || key === "variables") {
      return;
    }
    collected[key] = response[key];
  });

  return collected;
};

const parseDataJson = (value, context) => {
  if (!value) {
    return {};
  }
  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON in ${context}`);
  }
};

const getRequestVariables = (configVariables, stateVariables) => {
  if (!configVariables || typeof configVariables !== "object") {
    return stateVariables || {};
  }
  return {
    ...(stateVariables || {}),
    ...configVariables,
  };
};

const buildRequestVariables = ({
  stateVariables,
  configVariables,
  formVariables,
  actionVariables,
}) => {
  return {
    ...(stateVariables || {}),
    ...(configVariables || {}),
    ...(formVariables || {}),
    ...(actionVariables || {}),
  };
};

const loadConfig = async () => {
  const response = await fetch(CONFIG_PATH, { cache: "no-store" });
  if (!response.ok) {
    throw new Error("Unable to load config.json");
  }
  return response.json();
};

const getCurrentPage = () => {
  const path = window.location.pathname;
  const parts = path.split("/").filter(Boolean);
  const file = parts[parts.length - 1] || "index.html";
  return file;
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

const setError = (message) => {
  const errorEl = document.querySelector("[data-error]");
  if (errorEl) {
    errorEl.textContent = message;
  }
};

const ensureStatusElement = () => {
  let statusEl = document.querySelector("[data-status]");
  if (!statusEl) {
    const main = document.querySelector("main") || document.body;
    statusEl = document.createElement("p");
    statusEl.setAttribute("data-status", "");
    statusEl.textContent = DEFAULT_STATUS_MESSAGE;
    main.appendChild(statusEl);
  }
  return statusEl;
};

const setBusy = (busy, message = DEFAULT_STATUS_MESSAGE) => {
  isBusy = busy;
  document.body.setAttribute("data-busy", busy ? "true" : "false");
  const statusEl = ensureStatusElement();
  statusEl.setAttribute("aria-live", "polite");
  statusEl.textContent = busy ? message : DEFAULT_STATUS_MESSAGE;

  document
    .querySelectorAll("button, input[type='submit'], [data-n8n-action]")
    .forEach((button) => {
      if (busy) {
        button.setAttribute("data-prev-disabled", button.disabled ? "true" : "false");
        button.disabled = true;
      } else {
        if (button.getAttribute("data-prev-disabled") === "true") {
          button.disabled = true;
        } else {
          button.disabled = false;
        }
        button.removeAttribute("data-prev-disabled");
      }
    });
};

const hydratePage = () => {
  const state = readState();

  document.querySelectorAll("[data-variable]").forEach((el) => {
    const key = el.getAttribute("data-variable");
    if (key && Object.prototype.hasOwnProperty.call(state.variables, key)) {
      el.textContent = state.variables[key];
    }
  });

  document.querySelectorAll("[data-form]").forEach((el) => {
    const key = el.getAttribute("data-form");
    if (key && Object.prototype.hasOwnProperty.call(state.form, key)) {
      el.textContent = state.form[key];
    }
  });

  document.querySelectorAll("input[name], textarea[name]").forEach((input) => {
    const key = input.getAttribute("name");
    if (key && Object.prototype.hasOwnProperty.call(state.form, key)) {
      input.value = state.form[key];
    }
  });
};

const handleInitialization = async (config) => {
  if (!config.initialization || !config.initialization.webhook_url) {
    throw new Error("Initialization webhook_url is missing in config.json");
  }

  const state = readState();
  const requestVariables = getRequestVariables(
    config.initialization.request_variables,
    state.variables,
  );
  const payload = {
    init: true,
    variables: requestVariables,
    form: state.form,
  };

  const response = await postJson(config.initialization.webhook_url, payload);
  const responseVariables = normalizeResponseVariables(response);
  let nextState = mergeVariables(state, responseVariables);
  writeState(nextState);

  const nextStep =
    (response && response.next_step) || config.initialization.start_page;
  if (!nextStep) {
    throw new Error("No next_step or start_page provided for initialization.");
  }
  window.location.href = nextStep;
};

const handleForm = async (config) => {
  const form = document.querySelector("[data-n8n-form]");
  if (!form) {
    return;
  }

  const currentPage = getCurrentPage();
  const stepConfig = config.steps_by_page?.[currentPage] || {};
  if (!config.initialization?.webhook_url) {
    throw new Error("Initialization webhook_url is missing in config.json");
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setError("");
    if (isBusy) {
      return;
    }

    const submitter = event.submitter || document.activeElement;
    const submitterVars = submitter?.getAttribute("data-request-variables");
    const submitterNextStep = submitter?.getAttribute("data-next-step-fallback");
    const submitterStatus = submitter?.getAttribute("data-waiting-message");
    const formVars = form.getAttribute("data-request-variables");
    const formNextStep = form.getAttribute("data-next-step-fallback");
    const formStatus = form.getAttribute("data-waiting-message");

    const formData = new FormData(form);
    const payloadData = {};
    formData.forEach((value, key) => {
      payloadData[key] = value;
    });

    const state = readState();
    const requestVariables = buildRequestVariables({
      stateVariables: state.variables,
      configVariables: stepConfig.request_variables,
      formVariables: parseDataJson(formVars, "form data-request-variables"),
      actionVariables: parseDataJson(
        submitterVars,
        "button data-request-variables",
      ),
    });
    const payload = {
      form: payloadData,
      variables: requestVariables,
    };

    try {
      setBusy(true, submitterStatus || formStatus || DEFAULT_STATUS_MESSAGE);
      const response = await postJson(
        config.initialization.webhook_url,
        payload,
      );
      const responseVariables = normalizeResponseVariables(response);
      let nextState = {
        ...state,
        form: {
          ...state.form,
          ...payloadData,
        },
      };
      nextState = mergeVariables(nextState, responseVariables);
      writeState(nextState);

      const nextStep =
        (response && response.next_step) ||
        submitterNextStep ||
        formNextStep ||
        stepConfig.next_step_fallback;
      if (!nextStep) {
        throw new Error("No next_step or fallback defined for this step.");
      }
      window.location.href = nextStep;
    } catch (error) {
      setError(error.message || "Unable to submit form.");
    } finally {
      setBusy(false);
    }
  });
};

const handleActionButtons = async (config) => {
  const actionButtons = document.querySelectorAll("[data-n8n-action]");
  if (!actionButtons.length) {
    return;
  }

  if (!config.initialization?.webhook_url) {
    throw new Error("Initialization webhook_url is missing in config.json");
  }

  const currentPage = getCurrentPage();
  const stepConfig = config.steps_by_page?.[currentPage] || {};

  actionButtons.forEach((button) => {
    button.addEventListener("click", async (event) => {
      event.preventDefault();
      setError("");
      if (isBusy) {
        return;
      }

      try {
        const buttonStatus = button.getAttribute("data-waiting-message");
        setBusy(true, buttonStatus || DEFAULT_STATUS_MESSAGE);
        const state = readState();
        const requestVariables = buildRequestVariables({
          stateVariables: state.variables,
          configVariables: stepConfig.request_variables,
          actionVariables: parseDataJson(
            button.getAttribute("data-request-variables"),
            "button data-request-variables",
          ),
        });

        const payload = {
          form: {},
          variables: requestVariables,
        };

        const response = await postJson(
          config.initialization.webhook_url,
          payload,
        );
        const responseVariables = normalizeResponseVariables(response);
        const nextState = mergeVariables(state, responseVariables);
        writeState(nextState);
        const nextStep =
          (response && response.next_step) ||
          button.getAttribute("data-next-step-fallback") ||
          stepConfig.next_step_fallback;
        if (!nextStep) {
          throw new Error("No next_step or fallback defined for this action.");
        }
        window.location.href = nextStep;
      } catch (error) {
        setError(error.message || "Unable to submit action.");
      } finally {
        setBusy(false);
      }
    });
  });
};

const init = async () => {
  hydratePage();
  ensureStatusElement();

  try {
    const config = await loadConfig();
    const currentPage = getCurrentPage();

    if (document.body.getAttribute("data-page") === "index") {
      await handleInitialization(config);
      return;
    }

    await handleForm(config);
    await handleActionButtons(config);
  } catch (error) {
    setError(error.message || "Something went wrong.");
  }
};

document.addEventListener("DOMContentLoaded", init);
