const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT_DIR = process.cwd();
const PORT = Number(process.env.PORT) || 8080;

const MIME_TYPES = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".webp": "image/webp",
  ".svg": "image/svg+xml",
};

const getContentType = (filePath) => {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_TYPES[ext] || "application/octet-stream";
};

const safePathFromUrl = (urlPath) => {
  const clean = decodeURIComponent(urlPath.split("?")[0]);
  const normalized = path.normalize(clean).replace(/^(\.\.(\/|\\|$))+/, "");
  return normalized;
};

const toSpacePath = (urlPath) => {
  return urlPath
    .split("/")
    .map((segment) => segment.replace(/-/g, " "))
    .join("/");
};

const tryReadFile = (filePath) => {
  try {
    const stat = fs.statSync(filePath);
    if (stat.isDirectory()) {
      const indexPath = path.join(filePath, "index.html");
      if (fs.existsSync(indexPath)) {
        return { filePath: indexPath, content: fs.readFileSync(indexPath) };
      }
      return null;
    }
    return { filePath, content: fs.readFileSync(filePath) };
  } catch (error) {
    return null;
  }
};

const respondWithFile = (res, filePath, content) => {
  res.writeHead(200, {
    "Content-Type": getContentType(filePath),
  });
  res.end(content);
};

const respondNotFound = (res) => {
  res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
  res.end("Not found");
};

const server = http.createServer((req, res) => {
  const urlPath = req.url || "/";
  const safePath = safePathFromUrl(urlPath);
  const absolutePath = path.join(ROOT_DIR, safePath);

  const requested = tryReadFile(absolutePath);
  if (requested) {
    respondWithFile(res, requested.filePath, requested.content);
    return;
  }

  const spacedPath = toSpacePath(safePath);
  if (spacedPath !== safePath) {
    const altAbsolutePath = path.join(ROOT_DIR, spacedPath);
    const altRequested = tryReadFile(altAbsolutePath);
    if (altRequested) {
      respondWithFile(res, altRequested.filePath, altRequested.content);
      return;
    }
  }

  const fallbackPath = path.join(ROOT_DIR, "index.html");
  const fallback = tryReadFile(fallbackPath);
  if (fallback) {
    respondWithFile(res, fallback.filePath, fallback.content);
    return;
  }

  respondNotFound(res);
});

server.listen(PORT, () => {
  console.log(`Forms server running at http://localhost:${PORT}/`);
});
