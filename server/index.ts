import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";

const app = express();
log("Initializing Express application");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  try {
    log("Starting server initialization");
    const server = await registerRoutes(app);
    log("Routes registered successfully");

    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      log(`Error encountered: ${err.message}`);
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";

      res.status(status).json({ message });
      throw err;
    });

    if (app.get("env") === "development") {
      log("Setting up Vite in development mode");
      await setupVite(app, server);
      log("Vite setup completed");
    } else {
      log("Setting up static file serving");
      serveStatic(app);
    }

    const PORT = Number(process.env.PORT) || 5000;
    log(`Attempting to start server on port ${PORT}`);

    server.listen(PORT, "0.0.0.0")
      .on('error', (e: any) => {
        if (e.code === 'EADDRINUSE') {
          log(`Port ${PORT} is busy, trying ${PORT + 1}`);
          server.listen(PORT + 1, "0.0.0.0");
        } else {
          log(`Server failed to start: ${e.message}`);
          throw e;
        }
      })
      .on('listening', () => {
        const address = server.address();
        const port = typeof address === 'object' ? address?.port : PORT;
        log(`Server successfully started and listening on port ${port}`);
      });
  } catch (error) {
    log(`Fatal error during server startup: ${error}`);
    process.exit(1);
  }
})();