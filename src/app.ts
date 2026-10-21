import express from "express";
import { APP_CONFIG } from "./configs/app.config.ts";
import { logger } from "./libs/logger.ts";
import { requestLogger } from "./middlewares/logger.middleware.ts";
import routes from "./routes/index.ts";
import { errorHandler } from "./middleware/errorHandler";
import cors from "cors";
import { swaggerMiddleware, getSwaggerSpec } from "./docs/swagger.ts";

const app = express();

app.use(express.json());
app.use(cors());
app.use(requestLogger);

// Serve raw JSON specs for the definition dropdown
app.get("/api-docs/:name/swagger.json", (req, res) => {
  const spec = getSwaggerSpec(decodeURIComponent(req.params.name));
  if (!spec) return res.status(404).json({ error: "Definition not found" });
  res.json(spec);
});
app.use("/api-docs", ...swaggerMiddleware);
// Health check endpoint for Render and Docker healthcheck
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: APP_CONFIG.version,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Mini Project Server is running",
    version: APP_CONFIG.version,
  });
});

app.use("/api/v1", routes);
app.use(errorHandler);

app.listen(APP_CONFIG.port, "0.0.0.0", () => {
  logger.info(
    `🚀 Server running on http://localhost:${APP_CONFIG.port} (Version: ${APP_CONFIG.version})`
  );
});

