const ROUTES_PATH = "routes.json";

const getRouteSegment = () => {
  const parts = window.location.pathname.split("/").filter(Boolean);
  return parts[0] || "";
};

const setRouteError = (message) => {
  const errorEl = document.querySelector("[data-error]");
  if (errorEl) {
    errorEl.textContent = message;
  }
};

const resolveFlowPath = (configPath) => {
  if (!configPath) {
    return null;
  }
  const normalized = configPath.startsWith("/") ? configPath : `/${configPath}`;
  const withIndex = normalized.endsWith("config.json")
    ? normalized.replace(/config\.json$/, "index.html")
    : normalized;
  return withIndex.replace(/ /g, "-");
};

const loadRoutes = async () => {
  const response = await fetch(ROUTES_PATH, { cache: "no-store" });
  if (!response.ok) {
    return null;
  }
  return response.json();
};

const resolveConfigPath = async () => {
  const configPath = document.body.getAttribute("data-config-path");
  if (configPath) {
    return configPath;
  }

  const route = getRouteSegment();
  if (!route) {
    return null;
  }

  const routesData = await loadRoutes();
  const routes = routesData?.routes || {};
  return routes[route] || null;
};

const initRoute = async () => {
  try {
    const configPath = await resolveConfigPath();
    if (!configPath) {
      return;
    }

    const response = await fetch(configPath, { cache: "no-store" });
    if (!response.ok) {
      throw new Error("Unable to load flow config.");
    }
    const config = await response.json();
    const expectedRoute = config.route;
    const actualRoute = getRouteSegment();

    if (expectedRoute && expectedRoute !== actualRoute) {
      throw new Error(
        `Route mismatch: expected "${expectedRoute}" but opened "${actualRoute}".`,
      );
    }

    const flowPath = resolveFlowPath(configPath);
    if (!flowPath) {
      throw new Error("Unable to resolve flow path.");
    }
    window.location.href = encodeURI(flowPath);
  } catch (error) {
    setRouteError(error.message || "Unable to route to flow.");
  }
};

document.addEventListener("DOMContentLoaded", initRoute);
