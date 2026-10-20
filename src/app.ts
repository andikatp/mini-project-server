import express from "express";
import { APP_CONFIG } from "./configs/app.config.ts";
import { logger } from "./libs/logger.ts";
import { requestLogger } from "./middlewares/logger.middleware.ts";
import routes from "./routes/index.ts";

const app = express();

app.use(express.json());
app.use(requestLogger);

// Health check endpoint for Render and Docker healthcheck
app.get("/health", (_req, res) => {
  res.status(200).json({
    status: "ok",
    version: APP_CONFIG.version,
    environment: APP_CONFIG.nodeEnv,
    uptimeSeconds: Math.floor(process.uptime()),
    timestamp: new Date().toISOString(),
  });
});

app.get("/", (_req, res) => {
  res.status(200).json({
    message: "Mini Project Server is running",
    version: APP_CONFIG.version,
    environment: APP_CONFIG.nodeEnv,
  });
});

app.use("/api/v1", routes);

app.listen(APP_CONFIG.port, "0.0.0.0", () => {
  logger.info(
    `🚀 Server running on port ${APP_CONFIG.port} (Version: ${APP_CONFIG.version}, Env: ${APP_CONFIG.nodeEnv})`
  );
});

