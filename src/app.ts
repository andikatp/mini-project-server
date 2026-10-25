import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { APP_CONFIG } from "./configs/app.config.ts";
import { SESSION_CONFIG } from "./configs/session.config.ts";
import { swaggerRouter } from "./docs/swagger.ts";
import { NotFoundError } from "./errors";
import { logger } from "./libs/logger.ts";
import { errorHandler } from "./middlewares/errorHandler.ts";
import { requestLogger } from "./middlewares/logger.middleware.ts";
import routes from "./routes/index.ts";

const app = express();

app.use(express.json());

const configuredOrigins = (process.env.CLIENT_ORIGIN || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim());

const allowedOrigins = new Set([
  ...configuredOrigins,
  `http://localhost:${APP_CONFIG.port}`,
  `http://127.0.0.1:${APP_CONFIG.port}`,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.has(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Not allowed by CORS: ${origin}`));
      }
    },
    credentials: true,
  }),
);
app.use(cookieParser(SESSION_CONFIG.secret));
app.use(requestLogger);

app.use("/docs", swaggerRouter);

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

// Fallback 404 handler for any unmatched route
app.use((req) => {
  throw new NotFoundError(
    `Endpoint ${req.method} ${req.originalUrl} not found`,
  );
});

app.use(errorHandler);

if (import.meta.main) {
  const server = app.listen(APP_CONFIG.port, "0.0.0.0", () => {
    logger.info(
      `🚀 Server running on http://localhost:${APP_CONFIG.port} (Version: ${APP_CONFIG.version})`,
    );
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down gracefully…`);
    server.close(async () => {
      const { prisma } = await import("./db/index.ts");
      await prisma.$disconnect();
      logger.info("Server closed. Bye 👋");
      process.exit(0);
    });
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled promise rejection:", reason);
    void shutdown("unhandledRejection");
  });
}


export default app;
