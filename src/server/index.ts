import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const parsedPort = Number(process.env.PORT);
const PORT =
  Number.isInteger(parsedPort) && parsedPort >= 0 && parsedPort <= 65535
    ? parsedPort
    : 3000;
const HOST = process.env.HOST || "127.0.0.1";
const CLIENT_DIR = path.resolve(process.cwd(), "dist", "client");

const MIME_TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".ico": "image/x-icon"
};

const server = http.createServer((req, res) => {
  const urlPath = req.url ?? "/";
  const requestedPath = urlPath === "/" ? "/index.html" : urlPath;
  const filePath = path.join(CLIENT_DIR, requestedPath);

  if (!filePath.startsWith(CLIENT_DIR)) {
    res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Forbidden");
    return;
  }

  fs.readFile(filePath, (error, data) => {
    if (error) {
      if (error.code === "ENOENT") {
        res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
        res.end("Not Found");
        return;
      }

      res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Server Error");
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || "application/octet-stream";

    res.writeHead(200, { "Content-Type": contentType });
    res.end(data);
  });
});

server.listen(PORT, HOST, () => {
  console.log(`
--------------------------------------------------
Server started successfully
Environment : ${process.env.NODE_ENV || 'development'}
Host        : ${HOST}
Port        : ${PORT}
URL         : http://${HOST}:${PORT}
Started at  : ${new Date().toISOString()}
--------------------------------------------------
`);
});
