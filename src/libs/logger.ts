import { APP_CONFIG } from "../configs/app.config.ts";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

const LOG_COLORS = {
  reset: "\x1b[0m",
  dim: "\x1b[2m",
  cyan: "\x1b[36m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  red: "\x1b[31m",
  magenta: "\x1b[35m",
};

function formatTimestamp(): string {
  return new Date().toISOString();
}

function getLevelBadge(level: LogLevel): string {
  const versionTag = `[v${APP_CONFIG.version}]`;
  const isTTY = process.stdout.isTTY;

  if (!isTTY) {
    return `${formatTimestamp()} [${level}] ${versionTag}`;
  }

  let color = LOG_COLORS.cyan;
  if (level === "ERROR") color = LOG_COLORS.red;
  else if (level === "WARN") color = LOG_COLORS.yellow;
  else if (level === "DEBUG") color = LOG_COLORS.magenta;

  return `${LOG_COLORS.dim}${formatTimestamp()}${LOG_COLORS.reset} ${color}[${level}]${LOG_COLORS.reset} ${LOG_COLORS.magenta}${versionTag}${LOG_COLORS.reset}`;
}

export const logger = {
  info(message: string, ...meta: unknown[]): void {
    console.log(`${getLevelBadge("INFO")} ${message}`, ...meta);
  },

  warn(message: string, ...meta: unknown[]): void {
    console.warn(`${getLevelBadge("WARN")} ${message}`, ...meta);
  },

  error(message: string, error?: unknown): void {
    if (error instanceof Error) {
      console.error(
        `${getLevelBadge("ERROR")} ${message}: ${error.message}\n${error.stack || ""}`,
      );
    } else if (error !== undefined) {
      console.error(`${getLevelBadge("ERROR")} ${message}`, error);
    } else {
      console.error(`${getLevelBadge("ERROR")} ${message}`);
    }
  },

  debug(message: string, ...meta: unknown[]): void {
    console.debug(`${getLevelBadge("DEBUG")} ${message}`, ...meta);
  },
};
